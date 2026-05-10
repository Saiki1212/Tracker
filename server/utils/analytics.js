const mongoose = require('mongoose');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const LearningTopic = require('../models/LearningTopic');
const WeeklyReview = require('../models/WeeklyReview');
const Resume = require('../models/Resume');
const Project = require('../models/Project');

const oid = (id) => new mongoose.Types.ObjectId(id);

async function overview(userId) {
  const uid = oid(userId);
  const [appsByStatus, monthInterviews, projects, learningStreak] = await Promise.all([
    Application.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Interview.countDocuments({
      userId: uid,
      scheduledAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
    Project.find({ userId: uid }).select('title progressPct deploymentStatus').lean(),
    LearningTopic.aggregate([
      { $match: { userId: uid, lastRevisedAt: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastRevisedAt' } },
        },
      },
      { $count: 'days' },
    ]),
  ]);

  const counts = Object.fromEntries(appsByStatus.map((r) => [r._id, r.n]));
  const total = appsByStatus.reduce((s, r) => s + r.n, 0);
  const rejected = counts.Rejected || 0;
  const active = (counts.Applied || 0) + (counts.OA || 0) + (counts.Interviewing || 0);

  return {
    activeApplications: active,
    interviewsThisMonth: monthInterviews,
    rejectionRatio: total ? +(rejected / total * 100).toFixed(1) : 0,
    learningDays: learningStreak[0]?.days || 0,
    statusCounts: counts,
    projects,
  };
}

async function applicationsTimeline(userId) {
  return Application.aggregate([
    { $match: { userId: oid(userId) } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $ifNull: ['$appliedAt', '$createdAt'] },
          },
        },
        n: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', n: 1 } },
  ]);
}

async function rejectionReasons(userId) {
  return Application.aggregate([
    { $match: { userId: oid(userId), status: 'Rejected' } },
    { $unwind: { path: '$rejectionTags', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$rejectionTags', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $project: { _id: 0, tag: '$_id', n: 1 } },
  ]);
}

async function interviewPerformance(userId) {
  return Interview.aggregate([
    { $match: { userId: oid(userId) } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m',
            date: { $ifNull: ['$scheduledAt', '$createdAt'] },
          },
        },
        avgConfidence: { $avg: '$confidence' },
        passed: { $sum: { $cond: [{ $eq: ['$outcome', 'passed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$outcome', 'failed'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: '$_id',
        avgConfidence: { $round: ['$avgConfidence', 2] },
        passed: 1,
        failed: 1,
        total: 1,
      },
    },
  ]);
}

async function resumePerformance(userId) {
  const uid = oid(userId);
  const resumes = await Resume.find({ userId: uid }).select('version targetRole').lean();
  const apps = await Application.aggregate([
    { $match: { userId: uid, resumeId: { $ne: null } } },
    { $group: { _id: { resumeId: '$resumeId', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const byResume = {};
  apps.forEach((r) => {
    const k = String(r._id.resumeId);
    if (!byResume[k]) byResume[k] = { total: 0, counts: {} };
    byResume[k].total += r.n;
    byResume[k].counts[r._id.status] = r.n;
  });
  return resumes.map((r) => {
    const stat = byResume[String(r._id)] || { total: 0, counts: {} };
    const callbacks =
      (stat.counts.OA || 0) + (stat.counts.Interviewing || 0) + (stat.counts.Offer || 0);
    const interviews = (stat.counts.Interviewing || 0) + (stat.counts.Offer || 0);
    const offers = stat.counts.Offer || 0;
    const rate = (n) => (stat.total ? +(n / stat.total * 100).toFixed(1) : 0);
    return {
      resumeId: r._id,
      version: r.version,
      targetRole: r.targetRole,
      total: stat.total,
      callbackRate: rate(callbacks),
      interviewRate: rate(interviews),
      offerRate: rate(offers),
    };
  });
}

/**
 * Failure Intelligence: aggregate weak concepts, mistakes, and rejection tags
 * across interviews and applications to surface recurring failure patterns.
 */
async function weakConcepts(userId) {
  const uid = oid(userId);
  const [weak, mistakes, rejTags] = await Promise.all([
    Interview.aggregate([
      { $match: { userId: uid } },
      { $unwind: '$weakConcepts' },
      { $group: { _id: '$weakConcepts', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, tag: '$_id', n: 1, kind: { $literal: 'weak' } } },
    ]),
    Interview.aggregate([
      { $match: { userId: uid } },
      { $unwind: '$mistakes' },
      { $group: { _id: '$mistakes', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, tag: '$_id', n: 1, kind: { $literal: 'mistake' } } },
    ]),
    Application.aggregate([
      { $match: { userId: uid, status: 'Rejected' } },
      { $unwind: '$rejectionTags' },
      { $group: { _id: '$rejectionTags', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, tag: '$_id', n: 1, kind: { $literal: 'rejection' } } },
    ]),
  ]);

  // Combined ranking by total occurrences across all sources.
  const merged = {};
  [...weak, ...mistakes, ...rejTags].forEach((row) => {
    const key = row.tag;
    if (!merged[key]) merged[key] = { tag: key, total: 0, weak: 0, mistake: 0, rejection: 0 };
    merged[key][row.kind] = row.n;
    merged[key].total += row.n;
  });
  const top = Object.values(merged).sort((a, b) => b.total - a.total).slice(0, 30);

  return { weak, mistakes, rejTags, top };
}

async function consistency(userId) {
  const uid = oid(userId);
  const [learning, weekly] = await Promise.all([
    LearningTopic.aggregate([
      { $match: { userId: uid, lastRevisedAt: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastRevisedAt' } },
          n: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: '$_id', n: 1 } },
    ]),
    WeeklyReview.find({ userId: uid }).select('weekStart goals').lean(),
  ]);
  const weeks = weekly.map((w) => ({
    weekStart: w.weekStart,
    goalsTotal: w.goals.length,
    goalsDone: w.goals.filter((g) => g.done).length,
  }));
  return { learning, weeks };
}

module.exports = {
  overview,
  applicationsTimeline,
  rejectionReasons,
  interviewPerformance,
  resumePerformance,
  weakConcepts,
  consistency,
};
