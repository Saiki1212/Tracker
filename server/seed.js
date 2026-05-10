/**
 * Creates or updates the single user from environment variables.
 * Run locally with `npm run seed`.
 */
const env = require('./config/env');
const connectDB = require('./config/db');
const User = require('./models/User');

(async () => {
  if (!env.AUTH_EMAIL || !env.AUTH_PASSWORD_HASH) {
    console.error('AUTH_EMAIL and AUTH_PASSWORD_HASH must be set in .env');
    process.exit(1);
  }
  await connectDB();
  const email = env.AUTH_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.passwordHash = env.AUTH_PASSWORD_HASH;
    existing.name = env.AUTH_NAME;
    await existing.save();
    console.log(`[seed] Updated user ${email}`);
  } else {
    await User.create({
      email,
      passwordHash: env.AUTH_PASSWORD_HASH,
      name: env.AUTH_NAME,
    });
    console.log(`[seed] Created user ${email}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('[seed] failed', e);
  process.exit(1);
});
