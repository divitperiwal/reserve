# ReServe

Surplus food, rescued before it expires. Donors post leftover food, a nearby kitchen (NGO) accepts what it needs, and a volunteer picks it up and delivers it to that kitchen, tracked live.

- `backend/`: Java 21, Spring Boot 3, PostgreSQL, Flyway, JWT, Server-Sent Events
- `frontend/`: React 19, TypeScript, Vite, Leaflet
- `SPEC.md`: the API contract and domain rules both sides follow
- `docs/demo.md`: a 5 to 7 minute classroom demo script
- `docs/bolna.md`: setting up the donation hotline

## Run it

```bash
# 1. Database
docker compose up -d

# 2. Backend (http://localhost:8080)
cd backend
mvn spring-boot:run

# 3. Frontend (http://localhost:5173, proxies /api to 8080)
cd frontend
npm install
npm run dev
```

On first start the backend seeds demo data around Tambaram. All demo passwords are `reserve123`.

| Role | Mobile | Name |
| --- | --- | --- |
| Donor | 9840100001 | Kalyan Mahal |
| Volunteer | 9840100002 | Krrish Pandey |
| NGO | 9840100003 | Hope Kitchen Trust |
| Volunteer | 9840100004 | Ravi Kumar |

OTP sign-in runs in dev mode: the code is printed in the backend log and shown in the UI.

## How it works

1. **Post.** A donor lists food with quantity, pickup window, best-before time and a 4-point safety checklist. They can fill the form from a photo or by describing the food, or just phone the hotline.
2. **Accept.** Kitchens see open food nearby, each with a rescue-risk badge, and accept all of a post or only the amount they need. A partial accept splits the post, and the rest stays open for other kitchens.
3. **Deliver.** Volunteers are only offered food a kitchen has accepted. A claim is one atomic update, so two people never get the same pickup.
4. **Track.** While on a pickup, the volunteer's browser shares its location every few seconds. The backend pushes it over SSE to the donor and the NGO, and the map shows the road route and an ETA.
5. **Verify.** The donor confirms pickup and the NGO confirms delivery, each with a 4-digit code the volunteer shows them, or a QR code the other side scans.

Food that nobody has collected expires when its pickup window closes.

### Features

- **Rescue risk.** A Safe, Tight or At risk badge on food, based on the time left after the trip to the donor and on to the kitchen. It shows for kitchens, volunteers and on the tracking page.
- **Road routing.** Routes and ETAs come from OSRM. If it is unreachable the app falls back to straight lines and a flat speed.
- **QR handover.** The volunteer's phone shows a QR code next to the 4-digit code. The donor or kitchen can scan it with the camera or type the digits.
- **Photo and voice autofill.** Claude reads a food photo, or a spoken or typed description in Tamil, Hindi or English, and fills the post form. Needs `ANTHROPIC_API_KEY`, otherwise the controls are hidden.
- **Donation hotline.** A donor phones a Bolna voice agent and the food is posted while they talk, marked "By phone". Needs `VOICE_SECRET`, see `docs/bolna.md`.
- **Push alerts.** Critical food (under 2 hours to best before) alerts nearby kitchens, an accept alerts the donor and nearby volunteers. The app is installable. Needs the VAPID keys.
- **Insights.** Kitchens get a surplus history overlay on the map and an "Expected surplus" forecast on Insights, built from eight weeks of donor patterns.
- **Impact.** A public leaderboard at `/leaderboard`, all-time impact cards with badges, and a printable certificate at `/certificate` (use Save as PDF).
- **Languages.** English, Tamil and Hindi, switchable from the landing page, sign-in and profiles.

## Configuration

Everything below is optional. The optional integrations are off when their variable is unset: the app still starts, the endpoint answers that the feature is off, and the matching control is hidden.

Backend environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/reserve` | Database URL |
| `DB_USER` | `reserve` | Database user |
| `DB_PASSWORD` | `reserve` | Database password |
| `JWT_SECRET` | a dev value | Signs sign-in tokens, set your own outside dev |
| `APP_OTP_DEV` | `true` | Print the OTP in the log and return it to the UI |
| `APP_UPLOAD_DIR` | `./uploads` | Where donation photos are stored |
| `APP_CORS_ORIGINS` | `http://localhost:*,http://127.0.0.1:*` | Allowed browser origins |
| `APP_TASK_POOL_SIZE` | `2` | Threads for background work such as push sends |
| `ANTHROPIC_API_KEY` | unset, drafting off | Enables photo and voice autofill |
| `AI_MODEL` | `claude-opus-5-5` | Model used for autofill |
| `VOICE_SECRET` | unset, hotline off | Shared secret Bolna sends in `X-Voice-Secret` |
| `VAPID_PUBLIC_KEY` | unset, push off | Web push public key |
| `VAPID_PRIVATE_KEY` | unset, push off | Web push private key |
| `VAPID_SUBJECT` | `mailto:admin@reserve.local` | Push contact, a `mailto:` or `https:` URL |

Frontend (read by Vite at start):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_OSRM_URL` | `https://router.project-osrm.org` | OSRM server for road routes. Point it at your own for heavy use, the public one is rate limited |

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Browsers allow push, the camera and location only on `https` or `localhost`.

Example with everything on:

```bash
cd backend
ANTHROPIC_API_KEY=sk-ant-... VOICE_SECRET=change-me-to-something-long VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... mvn spring-boot:run
```

## Phones and the hotline: expose it with a tunnel

Phones need an `https` address for the camera scan, location and push, and Bolna needs a public address to call. A free tunnel does both:

```bash
# Frontend, for phones (the Vite dev server proxies /api to the backend)
cd frontend
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.trycloudflare.com npm run dev
cloudflared tunnel --url http://localhost:5173

# Backend, for Bolna
cloudflared tunnel --url http://localhost:8080
```

Open the printed `https://....trycloudflare.com` address on the phone. Vite blocks unknown host names unless they are allowed, so use the allowed-hosts variable shown above. For ngrok use `.ngrok-free.app` (or the host ngrok prints) and `ngrok http 5173` or `ngrok http 8080`. The hotline URL in the Bolna functions is the backend tunnel, as in `docs/bolna.md`.

## Reset the dev database

The seed runs only when the `users` table is empty, and Flyway adds new tables on start. A database created before the wow-factor features has the old seed, so wipe it to get eight weeks of patterned history for the surplus forecast and heatmap:

```bash
docker compose down -v   # removes the reserve-db volume
docker compose up -d
```

Then start the backend again. If you run Postgres some other way, drop and recreate the schema instead:

```bash
psql "postgresql://reserve:reserve@localhost:5432/reserve" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

Seeded times are relative to the moment the backend first starts, so reset shortly before a demo.
