# Deploying Forge to Vercel

This guide assumes you have never deployed to Vercel before. Follow it top to bottom.

---

## 1. MongoDB Atlas (one-time)

1. Sign up at https://cloud.mongodb.com.
2. **Create a Cluster** → free **M0** tier → any region near you. Wait ~3 min.
3. **Database Access** → Add New Database User
   - Authentication Method: Password
   - Username: `forge_app`
   - Password: generate a strong one and **save it somewhere safe**
   - Role: **Read and write to any database**
4. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`).
   Vercel functions have no fixed egress IP, so this is required.
5. **Database** → Connect → **Drivers** → copy the connection string. Looks like:
   ```
   mongodb+srv://forge_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with the one you set, and add `forge` as the database name before the `?`:
   ```
   mongodb+srv://forge_app:YOURPASS@cluster0.xxxxx.mongodb.net/forge?retryWrites=true&w=majority
   ```
   Save this — it goes into the `MONGO_URI` env var.

---

## 2. Generate the secrets you'll need

Run these locally (Node 20+ installed). Save each output.

**JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Password hash for your single login:**
```bash
node -e "console.log(require('bcryptjs').hashSync('YOUR_PLAINTEXT_PASSWORD', 10))"
```

(You will use the *plaintext* password to log in via the UI later. Only the *hash* is stored as an env var.)

---

## 3. Local sanity check before pushing to Vercel

```bash
cd D:\MY_PROJECTS\Tracker
npm install
copy .env.example .env       # PowerShell: cp .env.example .env
```

Open `.env` and fill in:
- `MONGO_URI` — the Atlas string from step 1
- `JWT_SECRET` — from step 2
- `AUTH_EMAIL` — your login email
- `AUTH_PASSWORD_HASH` — the bcrypt hash from step 2
- `AUTH_NAME` — display name (e.g. your name)

Then:
```bash
npm run seed     # creates the single user document in Atlas
npm run dev      # starts http://localhost:5174
```

Open http://localhost:5174 and log in with `AUTH_EMAIL` + your *plaintext* password. If this works locally, the Vercel deploy will work.

---

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "init forge"
```

Create an empty repo at https://github.com/new (private is fine). Then:
```bash
git remote add origin https://github.com/<you>/forge.git
git branch -M main
git push -u origin main
```

---

## 5. Import in Vercel

1. https://vercel.com → **Add New… → Project**.
2. Import the GitHub repo you just pushed.
3. **Framework Preset:** Other.
4. **Root Directory:** `./` (the default).
5. **Build & Output Settings:** leave everything default. `vercel.json` is the source of truth.
6. Expand **Environment Variables** and add the same values you put in `.env` (do NOT add `PORT` — Vercel manages that):

| Key | Value |
|---|---|
| `MONGO_URI` | from step 1 |
| `JWT_SECRET` | from step 2 |
| `AUTH_EMAIL` | your login email |
| `AUTH_PASSWORD_HASH` | from step 2 |
| `AUTH_NAME` | display name |

Apply each to **Production, Preview, and Development**.

7. Click **Deploy**. First build takes ~30–60 seconds.

---

## 6. Verify the deploy

1. Open the assigned URL: `https://<project>.vercel.app/`.
2. Log in with `AUTH_EMAIL` + plaintext password.
3. You should land on the Dashboard.
4. Open browser devtools → Network tab → confirm `/api/auth/login` returned 200 and a JWT.

---

## 7. Subsequent deploys

`git push` to the connected branch → Vercel auto-deploys. Pull requests get preview deploys with the same env vars.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MongooseServerSelectionError` on every Vercel request | Atlas IP allowlist | Atlas → Network Access → add `0.0.0.0/0` |
| `Function exceeded the maximum execution duration` | Cold start + slow Atlas region | Bump `maxDuration` in `vercel.json`; pick an Atlas region near your Vercel region |
| Login returns 500: `JWT_SECRET undefined` | Env var not set for the right environment | Vercel → Settings → Env Vars → confirm Production checkbox is on |
| 404 for `/api/anything` in prod | `vercel.json` rewrite missing/wrong | Confirm `vercel.json` is committed at repo root |
| Static page loads but `/api/auth/login` 404 in dev | Wrong port / dev server not running | `npm run dev` and check console output |
| Login returns 401 with correct password | Hash mismatch — `.env` and Vercel env diverged | Re-generate hash and update both places |
| iOS Safari zooms when focusing inputs | Input font-size < 16px | Already handled in `components.css`; do not override |

---

## 9. Updating the password later

1. Generate a new hash with the bcryptjs one-liner from step 2.
2. Update `AUTH_PASSWORD_HASH` in **both** Vercel env vars and your local `.env`.
3. Run `npm run seed` again locally — it updates the existing user document.
4. Redeploy Vercel (`git commit --allow-empty -m "rotate password" && git push`).
