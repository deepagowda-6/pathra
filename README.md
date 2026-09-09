# Pathra API — Backend, Database & Login

A small Express REST API backed by MongoDB, with real password-based login (bcrypt + JWT). This is the
real backend + database + auth layer: the frontend (`index.html`) talks to this over HTTP; this server
is the only thing that talks to MongoDB, and the only thing that ever sees a plaintext password (which
it immediately hashes and never stores or returns).

```
Frontend (Netlify, static)  →  HTTPS  →  Pathra API (Render, Node/Express)  →  MongoDB Atlas (database)
```

## Endpoints

| Method | Path | Auth required? | Purpose |
|--------|------|-----------------|---------|
| POST | `/api/auth/register` | No | Create an account: `{ phone, password, email?, username? }` → `{ token, profile, activity, chat }` |
| POST | `/api/auth/login` | No | Log in: `{ identifier, password }` (identifier = phone, email, or username) → `{ token, profile, activity, chat }` |
| POST | `/api/auth/change-password` | Yes | `{ currentPassword, newPassword }` |
| GET | `/api/users/me` | Yes | Fetch profile + activity + chat for the logged-in account |
| PUT | `/api/users/me/profile` | Yes | Create or update the profile (upsert) |
| POST | `/api/users/me/activity` | Yes | Append one activity log entry |
| PUT | `/api/users/me/chat` | Yes | Replace the stored chat history |
| DELETE | `/api/users/me` | Yes | Permanently delete the logged-in account's data |
| GET | `/api/health` | No | Health check for the "Backend connection" status in Settings |

"Auth required" means the request needs an `Authorization: Bearer <token>` header. The token comes back
from `/register` or `/login` and is what the frontend stores in `localStorage`.

Data model: one MongoDB document per account (see `models/User.js`) — `phone` (required, unique),
`email` and `username` (optional, unique if set), `passwordHash` (bcrypt, never the plaintext password),
plus the profile, emergency contacts, activity log, and chat history all together.

## 1. Create a free MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new **free M0 cluster** (any cloud provider/region is fine).
3. Under **Database Access**, add a database user with a username and password (save these).
4. Under **Network Access**, add IP address `0.0.0.0/0` (allow access from anywhere) — simplest for a
   student project; a production app would restrict this to the backend host's IP.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Add a database name into that string before the `?`, e.g. `.../pathra?retryWrites=...` — this becomes
   your `MONGODB_URI`.

## 2. Generate a JWT secret

This is a long random string used to sign login tokens — anyone who has it could forge a valid login for
any account, so treat it like a password and never commit it to a public repo.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output — this is your `JWT_SECRET`.

## 3. Run it locally first (optional but recommended)

```bash
cd server
cp .env.example .env
# paste your real MONGODB_URI and JWT_SECRET into .env
npm install
npm run dev
```

Visit `http://localhost:4000` — you should see `{"status":"Pathra API is running"}`. Test the auth flow:

```bash
# Create an account
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999","password":"testpass123"}'
# → { "token": "...", "profile": { ... }, "activity": [], "chat": [] }

# Log in with that same account
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"+919999999999","password":"testpass123"}'
# → { "token": "...", ... }

# Use the token to fetch the profile (replace TOKEN with the value from above)
curl http://localhost:4000/api/users/me -H "Authorization: Bearer TOKEN"
# → { "exists": true, "profile": { ... }, "activity": [], "chat": [] }
```

If registering the same phone number twice returns a 409 error, and fetching `/api/users/me` without a
token (or with a wrong one) returns 401, the auth system is working correctly.

## 4. Deploy it for free on Render

1. Push this `server` folder to a GitHub repo (or the whole Pathra project — Render can build from a
   subdirectory).
2. Go to https://render.com, sign up free, click **New → Web Service**, connect your repo.
3. Set:
   - **Root directory**: `server` (if it's part of a larger repo)
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. Under **Environment**, add both `MONGODB_URI` and `JWT_SECRET` with your real values from steps 1–2.
5. Deploy. Render gives you a URL like `https://pathra-api.onrender.com`.

**Free-tier note:** Render's free web services sleep after ~15 minutes of no traffic and take 20–50
seconds to wake back up on the next request. The frontend shows a "Connecting…" / "Reconnecting…"
message during login and app launch to account for this — it's a real limitation of free hosting, not a
bug.

## 5. Point the frontend at your backend

Open `index.html`, find this line near the top of the `<script>` block:

```js
const API_ROOT = 'https://YOUR-BACKEND-URL.onrender.com';
```

Replace it with your actual Render URL (no trailing slash, and don't add `/api/...` — the code appends
that itself), then redeploy the frontend (drag the updated file into Netlify again, or push to GitHub
Pages/Vercel). That's the only edit needed to connect the two.

## 6. Test the full flow once deployed

This is the part I couldn't do myself (no network access in the environment I built this in) — please
run through this checklist once both pieces are live:

1. Open the hosted frontend on your phone → **Get started** → sign up with a real mobile number and a
   password → complete onboarding → confirm you land on the Dashboard.
2. Close the browser tab entirely, reopen the URL → confirm it goes **straight to the Dashboard**, not
   back to login (this is the "log in once" behavior).
3. Open the same URL in a **different browser or a different device** → tap **Log in** → enter the same
   mobile number (or email/username, if you set one) and password → confirm your exact profile, contacts,
   and activity history appear.
4. In Settings, tap **Change password**, set a new one, sign out, then log back in with the *new*
   password to confirm it took effect.
5. Try registering a second account with the *same* mobile number → confirm it's rejected with "already
   has an account."
6. Try logging in with a wrong password → confirm it's rejected and your existing session (if any) isn't
   disturbed.

## Security notes for a real (non-coursework) deployment

This setup is solid for a project submission but a production app would go further:
- Restrict CORS to the exact frontend origin instead of allowing all.
- Add a real "forgot password" flow via a transactional email service (SendGrid, Postmark, AWS SES all
  have small free tiers) or SMS OTP (Twilio) — not included here since both need a paid/verified
  third-party account to actually send anything.
- Add real phone number verification (OTP) if proving SIM ownership matters for your use case — the
  password now proves "knows the secret," not "currently holds this exact SIM."
- Add stronger input validation/sanitisation on all fields before they reach MongoDB.
- Rotate `JWT_SECRET` periodically and consider shorter token lifetimes with a refresh-token flow.
