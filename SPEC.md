# ReServe: build contract

Food-donation coordinator. Donors post surplus food, an NGO kitchen accepts what it needs (all or part), a volunteer claims it, picks it up and delivers it to that kitchen, tracked live and sorted by what expires first. Design source: `ReServe — Food Donation Coordinator.pdf` (8 screens). This file is the single source of truth shared by backend and frontend.

## Stack

- `backend/`: Java 21, Spring Boot 3.3, Maven, Spring Web, Spring Data JPA, Spring Security (stateless JWT via jjwt 0.12), Flyway, PostgreSQL, Bean Validation. Port **8080**.
- `frontend/`: React 19 + TypeScript + Vite, react-router-dom 7, CSS Modules + CSS variables (no Tailwind), lucide-react icons, react-leaflet 5 maps. Port **5173**, `/api` proxied to 8080.
- `docker-compose.yml`: Postgres 16, db `reserve`, user `reserve`, password `reserve`, port 5432.
- Live updates: **SSE** (`GET /api/stream`). Volunteer location: browser `watchPosition` → `POST /api/donations/{id}/location` every ~5s.

## Code rules (all agents)

- Simple, well-layered code. No speculative abstractions.
- Comments: **at most one single-line `//` comment per function**, only when it adds meaning. No block comments, no JSDoc/Javadoc, no file headers.
- No em/en dashes and no middle-dot `·` separators in visible UI text (use spacing, commas, line breaks). Sentence case.
- Do not git commit.

## Roles

`DONOR` (restaurants, hostels, events, homes), `VOLUNTEER` (students, riders), `NGO` (shelters, kitchens; NGO users also see the activity dashboard).

## Domain rules

- Urgency from `bestBefore - now`: **CRITICAL** < 2h, **SOON** 2h to 6h, **FRESH** > 6h. Computed client-side (`lib/time.ts`).
- The feed is role-aware. An NGO sees `AVAILABLE` donations (waiting for a kitchen) near it; a volunteer sees only `ACCEPTED` donations (a kitchen wants them, waiting for a volunteer). Only donations whose pickup window is still open are listed. A scheduler (every 60s) flips `AVAILABLE` and `ACCEPTED` donations past `pickupUntil` to `EXPIRED` and emits activity.
- Accept (NGO) takes a `quantity` from 1 to the full amount. Full amount: the donation becomes `ACCEPTED` with `ngo` set. Part: the post is split, a new donation (new id, the chosen quantity, `ACCEPTED`, ngo set) is created and returned, and the original stays `AVAILABLE` with the remainder. Both are broadcast. An NGO with `acceptingFood` off gets **409** `Turn on Accepting food to take new food`.
- Claim is atomic: `UPDATE donations SET status='CLAIMED', volunteer_id=?, claimed_at=now() WHERE id=? AND status='ACCEPTED' AND pickup_until > now()`; 0 rows → **409** `{"message":"This pickup is no longer available"}`. The drop kitchen is always the donation's `ngo`; the volunteer does not choose one.
- Handover codes: each donation gets a 4-digit `pickupCode` and `dropCode` at creation. **Only the assigned volunteer** sees them in the DTO. The **donor** enters `pickupCode` to confirm pickup (`CLAIMED → PICKED_UP`); the **NGO** enters `dropCode` to confirm delivery (`PICKED_UP → DELIVERED`). Wrong code → 422.
- Create validation: `pickupFrom < pickupUntil <= bestBefore`, `bestBefore > now`, all 4 safety checks required, quantity ≥ 1. Error 400 `{"message", "fields": {field: msg}}`.
- Status flow: `AVAILABLE → ACCEPTED → CLAIMED → PICKED_UP → DELIVERED`; `AVAILABLE | ACCEPTED → EXPIRED | CANCELLED`; volunteer `release` (or no pickup within 30 minutes) sends `CLAIMED → ACCEPTED`; kitchen `withdraw` sends `ACCEPTED → AVAILABLE` and clears the ngo.
- Meals: `SERVINGS` → quantity; `KG` → quantity × 3; `PACKS` → quantity. `weightKg`: servings × 0.3, kg as given, packs × 0.25 (stored on create unless donor sends it). CO2e avoided = 2.5 kg per kg of food.
- Distance: haversine km from requester's `lat/lng` (query params or profile).
- OTP (dev mode): `app.otp.dev=true` logs the code and returns it as `devCode`.

## Data model (Flyway `V1__init.sql`)

```
users(id bigserial pk, role varchar, name, phone varchar unique, password_hash, org_type varchar null,
      vehicle varchar null, address, lat double, lng double, verified bool, on_duty bool default true,
      drop_ngo_id bigint null fk users, rating numeric(2,1) default 4.8, created_at timestamptz)
donations(id bigserial pk, donor_id fk, title, diet varchar, category varchar, quantity int, unit varchar,
      weight_kg numeric(8,2), containers int null, photo_url text null, note text null, address, lat, lng,
      prepared_at, best_before, pickup_from, pickup_until timestamptz, safety_checks text (comma list),
      status varchar, volunteer_id fk null, ngo_id fk null, pickup_code char(4), drop_code char(4),
      claimed_at, picked_up_at, delivered_at, cur_lat, cur_lng, loc_at timestamptz null, created_at)
location_pings(id bigserial pk, donation_id fk, lat, lng, recorded_at)
activities(id bigserial pk, type varchar, actor_id fk null, donation_id fk, created_at)
otp_codes(phone pk, code, expires_at)
```

Seed (Java `DataSeeder`, runs when users table is empty, times relative to now) around Tambaram/Chengalpattu (lat ~12.82–12.93, lng ~80.04–80.13): NGOs Hope Kitchen Trust, Little Hearts Home, Annai Shelter; donors Kalyan Mahal (event venue), Hotel Annapoorna, SRM Hostel Mess, Spice Route, Sunrise Bakery, Green Basket, TechPark Cafeteria, a home kitchen; volunteers Ravi Kumar, Priya S., Arjun M., Nithya V., Krrish Pandey. ~9 available donations across urgencies, 1 active claim (Veg biryani by Ravi to Hope Kitchen, PICKED_UP with a few location pings), ~30 days of delivered history for charts, a few expired. All seeded passwords `reserve123`. Demo logins: donor `9840100001` (Kalyan Mahal), volunteer `9840100002` (Krrish Pandey), NGO `9840100003` (Hope Kitchen Trust), volunteer Ravi `9840100004`.

## REST API (JSON, `Authorization: Bearer <jwt>` except where public)

Errors: `{ "message": string, "fields"?: Record<string,string> }` with 400/401/403/404/409/422.

### Auth (public)
- `POST /api/auth/register` `{role, name, phone, password, orgType?, vehicle?, address, lat, lng}` → `AuthResponse`
- `POST /api/auth/login` `{phone, password}` → `AuthResponse`
- `POST /api/auth/otp/request` `{phone}` → `{sent: true, devCode?: string}`
- `POST /api/auth/otp/verify` `{phone, code}` → `AuthResponse` (404 if no account)

`AuthResponse = {token, user: User}`. Phone is 10 digits, stored without +91.

### Me
- `GET /api/me` → `User`
- `PATCH /api/me` `{name?, address?, lat?, lng?, vehicle?, dropNgoId?, onDuty?}` → `User`
- `GET /api/ngos` → `NgoRef[]` (any authenticated user)

### Donations
- `GET /api/donations/feed?lat&lng&radiusKm=7&withinHours=&diet=&category=&sort=expiry|distance&q=` (NGO: `AVAILABLE`, distance from the NGO; VOLUNTEER: `ACCEPTED`) → `Donation[]`
- `GET /api/donations/mine` → donor: own posts newest first; volunteer: claimed (active first, then history); NGO: deliveries addressed to it, including its `ACCEPTED` donations that have no volunteer yet.
- `GET /api/donations/{id}` → `Donation` (parties see full; others see without codes)
- `POST /api/donations` (DONOR) `CreateDonation` → `Donation`
- `DELETE /api/donations/{id}` (DONOR, AVAILABLE or ACCEPTED) → 204, becomes CANCELLED
- `POST /api/donations/{id}/accept` (NGO) `{quantity?}` (defaults to the full amount; 400 with field `quantity` if out of range) → the accepted `Donation` (a new id on a partial accept)
- `POST /api/donations/{id}/withdraw` (the accepting NGO, ACCEPTED only) → `Donation`, back to `AVAILABLE`
- `POST /api/donations/{id}/claim` (VOLUNTEER, ACCEPTED only, no body) → `Donation`
- `POST /api/donations/{id}/release` (assigned VOLUNTEER, CLAIMED only) → `Donation`, back to `ACCEPTED`
- `POST /api/donations/{id}/confirm-pickup` (DONOR owner) `{code}` → `Donation`
- `POST /api/donations/{id}/confirm-delivery` (NGO target) `{code}` → `Donation`
- `POST /api/donations/{id}/location` (assigned VOLUNTEER, CLAIMED or PICKED_UP) `{lat, lng}` → 204
- `GET /api/donations/{id}/route` (parties) → `{lat, lng, at}[]`

### Uploads
- `POST /api/uploads` (DONOR, multipart field `file`, JPG/PNG/WEBP ≤ 5 MB) → `{url: "/api/uploads/<uuid>.jpg"}`; stored on disk under `app.upload-dir` (default `./uploads`).
- `GET /api/uploads/{name}` (public) → the image.

### Stats & activity
- `GET /api/stats/public` (public) → `PublicStats`
- `GET /api/stats/me` → `MyStats`
- `GET /api/stats/dashboard?days=7|30` (NGO) → `DashboardStats`
- `GET /api/activity?limit=20` (any auth) → `Activity[]`
- `GET /api/export.csv?days=7|30` (NGO, token may come as `?token=`) → `text/csv`

### Stream
- `GET /api/stream?token=<jwt>` → `text/event-stream`. Events:
  - `donation`: `Donation` (codes stripped), broadcast on create/accept (both donations on a split)/withdraw/claim/release/pickup/delivery/expire/cancel.
  - `location`: `{donationId, lat, lng, at}` sent only to that donation's donor, volunteer and NGO.
  - `activity`: `Activity`, broadcast.
  - comment heartbeat every 20s.

## Types (mirrored in `frontend/src/lib/types.ts`)

```ts
type Role = 'DONOR' | 'VOLUNTEER' | 'NGO';
type Diet = 'VEG' | 'NON_VEG';
type Category = 'COOKED' | 'BAKERY' | 'FRUIT_VEG' | 'PACKAGED' | 'RAW';
type Unit = 'SERVINGS' | 'KG' | 'PACKS';
type Status = 'AVAILABLE' | 'ACCEPTED' | 'CLAIMED' | 'PICKED_UP' | 'DELIVERED' | 'EXPIRED' | 'CANCELLED';
type SafetyCheck = 'COVERED' | 'SAFE_TEMP' | 'NO_RETURNS' | 'ALLERGENS_NOTED';

interface NgoRef { id: number; name: string; address: string; lat: number; lng: number }
interface User { id: number; role: Role; name: string; phone: string; initials: string; orgType?: string;
  vehicle?: string; address: string; lat: number; lng: number; verified: boolean; onDuty: boolean;
  dropNgo?: NgoRef; rating: number; rescues: number }
interface PersonRef { id: number; name: string; initials: string; phone: string; vehicle?: string;
  orgType?: string; rating?: number; rescues?: number }
interface Donation { id: number; code: string /* "RS-2481" */; title: string; diet: Diet; category: Category;
  quantity: number; unit: Unit; weightKg: number; containers?: number; photoUrl?: string; note?: string;
  address: string; lat: number; lng: number; preparedAt?: string; bestBefore: string; pickupFrom: string;
  pickupUntil: string; safetyChecks: SafetyCheck[]; status: Status; donor: PersonRef; volunteer?: PersonRef;
  ngo?: NgoRef; claimedAt?: string; pickedUpAt?: string; deliveredAt?: string; createdAt: string;
  distanceKm?: number; meals: number; pickupCode?: string; dropCode?: string;
  lastLocation?: { lat: number; lng: number; at: string } }
interface CreateDonation { title: string; diet: Diet; category: Category; quantity: number; unit: Unit;
  weightKg?: number; containers?: number; note?: string; address: string; lat: number; lng: number;
  preparedAt?: string; bestBefore: string; pickupFrom: string; pickupUntil: string; safetyChecks: SafetyCheck[] }
interface PublicStats { mealsRescued: number; foodKg: number; co2Kg: number; activeVolunteers: number;
  partnerNgos: number; livePickups: number; medianPickupMinutes: number; deliveredBeforeExpiryPct: number }
interface MyStats { monthLabel: string; pickups: number; meals: number; rank?: number; donations?: number;
  live?: number; nextBadge?: { name: string; current: number; target: number } }
interface DashboardStats { days: number; mealsRescued: number; mealsDeltaPct: number; foodKg: number;
  foodDeltaKg: number; medianPickupMinutes: number; medianDeltaMinutes: number; deliveredBeforeExpiryPct: number;
  perDay: { date: string; meals: number }[]; funnel: { posted: number; claimed: number; pickedUp: number;
  delivered: number; expired: number }; categories: { category: Category; pct: number }[];
  topVolunteers: { id: number; name: string; initials: string; pickups: number; meals: number }[]; co2Kg: number }
interface Activity { id: number; type: 'POSTED' | 'ACCEPTED' | 'CLAIMED' | 'PICKED_UP' | 'DELIVERED' | 'EXPIRED' | 'RELEASED';
  actorName: string; actorInitials: string; donationId: number; donationTitle: string; quantityLabel: string;
  donorName: string; ngoName?: string; at: string }
```

Timestamps are ISO-8601 with offset (`OffsetDateTime`). JSON field names exactly as above (camelCase).

## Design system (frontend), v3: white, Apple, basil

v2 (monochrome, mono numerals, everything visible at once) was judged **cluttered: "everything just pushed in"**. v3 is a from-scratch redesign of every screen. The PDF is only a reference for features and data, never for layout density.

### Principles
1. **One job per screen.** Every screen answers one question. Show the primary action first; everything secondary moves one level deeper (a sheet, a row that opens a detail, a second tab). If a block does not help the main job, delete it.
2. **Fewer, larger things.** No more than about 3 groups visible per viewport. Prefer one list over a grid of cards. No dashboard confetti (badges on badges, counters everywhere, legends nobody reads).
3. **Apple patterns, properly.** Large titles (`PageHeader`), inset grouped lists (`Group` + `Row`), segmented controls with a sliding thumb, sheets for detail and confirmation (`Sheet`), switches (`Toggle`), pill buttons, translucent bars with `backdrop-filter`, spring motion (`--spring`), press feedback `scale(0.97)`, sheets that leave the way they came.
4. **White and calm.** Page background pure white `--bg`. Grouped surfaces use Apple grey `--surface-2` (#f5f5f7) without borders. Hairlines `--line` only to separate rows. Almost no shadows, except floating elements (sheets, map cards, toasts).
5. **One accent: basil** `--basil` #3a7d44 for primary actions, selection, links, success, the route line and the "on duty" state. **Red** `--red` only for food under 2 hours and errors. Everything else is ink `--ink` #1d1d1f and greys `--ink-2` #6e6e73, `--ink-3`.
6. **Typography:** Onest Variable only (no mono font any more; `.mono` now just means tabular figures + weight 600). Large title 30-40px weight 700, tracking -0.035em. Section title 20px weight 650. Body 15px, secondary 13px `--ink-2`. Numbers tabular, weight 600-700, and large when they are the point. No uppercase eyebrows, no letter-spaced labels.
7. **Copy:** short, human, sentence case. No em/en dashes, no middle dots. One label per intent.

### Shared UI kit (`src/components/ui`)
`Button` (variants primary=basil, dark, secondary=grey fill, tinted=basil soft, ghost=basil text, danger; sizes sm 36 / md 44 / lg 52; pill), `ButtonLink`, `IconButton` (36px round grey, `plain`), `Badge` (tones neutral, critical, fresh/basil, dark), `Segmented` (sliding thumb, `block`), `Chip`, `Avatar` (soft/basil/dark), `Card` (white + hairline, use rarely), **`Group` + `Row`** (inset grouped list with leading/title/subtitle/trailing/chevron; rows can be links or buttons), **`PageHeader`** (large title + subtitle + actions), **`Toggle`**, **`Sheet`** (bottom sheet on phones, centred dialog on >= 768px), `Field` (grey filled input), `Progress` (4px), `Countdown` (red only when critical), `FoodGlyph` (grey rounded square with icon), `DietMark`, `Skeleton`, `EmptyState`, `Logo`, `Stepper` (basil), `useToast` (top pill toast), `cx`. Map: `LiveMap` (greyscale OSM, basil route, ink pins, red for critical).

### Layout
- **Desktop (>= 1024px), full screen:** a slim sidebar (220px, white, hairline right edge, logo + 3-5 nav rows + account row at the bottom; active row on a `--fill` plate) and the content area filling the rest. Content is fluid but text blocks max about 720px; maps go edge to edge.
- **Phone (< 768px):** large title header that scrolls, translucent bottom tab bar (max 4 tabs), primary actions at thumb reach, sheets for details. 16px gutters, 44px targets.
- Tablet behaves like phone, with two-column lists where it helps.

### Screen blueprints (what each screen shows, nothing more)
- **Landing `/`:** white, airy, Apple product-page rhythm. (1) Nav: logo, 2-3 links, Sign in, "Donate food". (2) Hero: big headline, one line of copy, two buttons, and one product visual (a clean phone-sized composition of the volunteer pickup list or the live map card built with real components). (3) Three steps as a simple row of text with icons. (4) Impact: 3 big numbers from `publicStats`. (5) Roles: three short columns. (6) Closing line + button. Footer one line. No dark bands, no extra decoration.
- **Auth `/auth`:** a single centred column (max 400px) on white: logo, title, segmented Sign in / Create account, the form. Create account is **stepped**: step 1 choose role (3 large rows), step 2 name + phone + password (+ vehicle or org type), step 3 home address with "Use my location". OTP sign-in is a link that swaps the form. Demo accounts as one subtle "Try a demo account" row that opens a sheet with the three accounts. No side panel.
- **Volunteer:**
  - `/volunteer` **Pickups**: desktop = split view like Apple Maps: left column (about 420px) with large title "Pickups", one search field, one `Segmented` (All, Under 1 hr, Veg), then a single list of rows (food glyph, title, "donor, 1.2 km", trailing countdown). Right = full-height map with pins. Selecting a row (or pin) opens its **detail panel/sheet** with the full info and one big "Claim pickup" button. No category tiles, no alert banners, no impact card on this screen. If an active pickup exists, one basil row at the top of the list ("You're on a pickup, Veg biryani") opens it. Phone = the same list full width with a map toggle in the header; detail opens as a bottom sheet.
  - `/volunteer/pickup/:id` **Active pickup**: full-screen map with one floating card (desktop: left card over the map; phone: bottom sheet). The card shows only: phase title ("Head to Kalyan Mahal" / "Deliver to Hope Kitchen"), ETA large, a 3-step progress, the 4-digit code to show (large), one primary action (Navigate, opens Google Maps directions) and a secondary "Release". Live location sharing and the "Simulate ride" switch stay, tucked in one row.
  - `/volunteer/impact`: large numbers (meals, pickups, rank), badge progress, then history as a grouped list.
  - `/volunteer/profile`: Apple Settings style grouped list: name, vehicle, deliver to (NGO picker in a sheet), On duty toggle, Sign out.
- **Donor:**
  - `/donor` **Home**: large title greeting, one big "Post surplus food" button, then "Live now" grouped list (row per active donation with status text and countdown; opens a detail sheet with track link, pickup code entry, cancel), then "Recent" grouped list (5 rows, "See all").
  - `/donor/new` **Post food**: a **stepped flow**, one question per step with a thin progress bar and Back / Continue: (1) What: name, veg/non-veg segmented, category chips, optional photo; (2) How much: big stepper + unit segmented; (3) When: best before (with suggestion chip) and pickup window, inline validation with the one-tap fix; (4) Where: address prefilled + note; (5) Safety: four toggle rows; (6) Review: the volunteer card preview + Post. Desktop: centred 560px column.
  - `/donor/donations`: segmented Live / Past, one grouped list, rows open the detail sheet.
  - `/donor/profile`: settings-style grouped list incl. an impact summary and Sign out. No separate impact page.
- **NGO:**
  - `/ngo` **Today**: large title, then **Incoming** first (deliveries on the way, each row with volunteer, ETA, and a "Confirm delivery" button opening a code sheet). Then a compact "This week" block: 3 big numbers (meals rescued, food diverted, delivered before expiry) and one clean bar chart (meals per day). Nothing else.
  - `/ngo/activity`: the live activity feed as a grouped list (streaming dot in the header).
  - `/ngo/insights`: period segmented (7 / 30 days), Export CSV, funnel, categories, top volunteers, CO2e, each as a simple grouped list or bar.
  - `/ngo/map`: full-screen map of riders on the way with a small floating list.
  - `/ngo/profile`: settings-style list + Sign out.
- **Track `/track/:id`** (donor/NGO): full-screen map, floating card (desktop left, phone bottom sheet): status title, ETA, volunteer row with call button, 3-step progress, and the single role action (donor: "Confirm pickup" code entry; NGO: "Confirm delivery" code entry).
