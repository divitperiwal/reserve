# ReServe

Surplus food, rescued before it expires. Donors post leftover food, a nearby kitchen (NGO) accepts what it needs, and a volunteer picks it up and delivers it to that kitchen, tracked live.

- `backend/`: Java 21, Spring Boot 3, PostgreSQL, Flyway, JWT, Server-Sent Events
- `frontend/`: React 19, TypeScript, Vite, Leaflet
- `SPEC.md`: the API contract and domain rules both sides follow

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

1. **Post.** A donor lists food with quantity, pickup window, best-before time and a 4-point safety checklist.
2. **Accept.** Kitchens see open food nearby and accept all of a post or only the amount they need. A partial accept splits the post, and the rest stays open for other kitchens.
3. **Deliver.** Volunteers are only offered food a kitchen has accepted. A claim is one atomic update, so two people never get the same pickup.
4. **Track.** While on a pickup, the volunteer's browser shares its location every few seconds. The backend pushes it over SSE to the donor and the NGO.
5. **Verify.** The donor confirms pickup and the NGO confirms delivery, each with a 4-digit code the volunteer shows them.

Food that nobody has collected expires when its pickup window closes.

## Configuration

Backend environment variables: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `APP_OTP_DEV`.
