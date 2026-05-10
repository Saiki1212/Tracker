# Forge

Personal engineering career operating system. Tracks job applications, CV/resume versions, projects, interviews, learning, and weekly execution — with a "Failure Intelligence" analytics layer that turns rejections into weakness patterns.

## Stack

- Frontend: HTML, CSS, vanilla JS, GSAP, AOS, Chart.js
- Backend: Node 20+, Express, Mongoose, JWT
- Database: MongoDB Atlas (free tier)
- Hosting: Vercel (single project — frontend + serverless Express under `/api`)

## Layout

```
api/         Vercel serverless adapter
server/      Express app, models, routes, controllers, middleware
public/      Static frontend (HTML/CSS/JS)
dev-server.js  Local launcher that mirrors prod
vercel.json  Vercel routing
```

## Quickstart (local)

```bash
npm install
cp .env.example .env             # fill in values, see .env.example for help
npm run seed                     # one-time: creates the single user in Atlas
npm run dev                      # http://localhost:5174
```

`dev-server.js` serves both the API (`/api/*`) and the static `public/` folder, so a single URL works exactly like the Vercel deploy.

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Vercel + MongoDB Atlas walkthrough.

## Modules

Dashboard · Projects · Applications · Interviews · Resume Vault · Learning Hub · Weekly Execution · Notes · Analytics · Settings
