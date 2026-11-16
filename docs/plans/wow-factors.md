# ReServe wow factors: implementation plan

Spec: `SPEC.md` (the API contract and domain rules). This plan extends it; every new endpoint and type a task adds must also be written into `SPEC.md` in the same task.

Goal: road-following ride simulator, rescue-risk ETA, QR handover, impact and leaderboard with certificate, surplus heatmap and forecast, AI photo and voice autofill, a Bolna phone hotline for donors, an installable app with web push, and Tamil and Hindi UI.

## Global constraints

- Code rules from `SPEC.md`: at most one single-line `//` comment per function, only when it adds meaning. No block comments, no JSDoc or Javadoc, no file headers.
- Visible UI text: no em or en dashes and no middle-dot `·` separators (use commas, spacing, line breaks). Sentence case.
- Follow the existing layering. Backend: one package per feature with controller, service, repository, request/response records; errors through `ApiException` producing `{"message", "fields"?}`. Frontend: CSS Modules plus the variables in `src/styles/tokens.css`, `lucide-react` icons, shared pieces from `src/components/ui`, API calls only through `src/lib/api.ts`, types mirrored in `src/lib/types.ts`.
- No new dependency unless the task names it.
- Database changes only through new Flyway files (`V4__...`, `V5__...`). Never edit `V1` to `V3`.
- Optional integrations (Anthropic key, Bolna secret, VAPID keys) are configured in `application.yml` with environment overrides. When unset the feature is cleanly off: the app starts, the endpoint answers "off", and the UI hides the control.
- New list endpoints load by date range in one query (like `StatsService`), never one query per row. Outbound calls (Claude, push) have timeouts; push sends run off the request thread.
- Dev database: Postgres container `reserve-dev-pg` on `localhost:5436`. Run the backend with `DB_URL=jdbc:postgresql://localhost:5436/reserve mvn spring-boot:run`. Never touch the other containers on ports 5432 and 5433.
- Checks before committing: `cd backend && mvn -q test` and `cd frontend && npm run build && npm run lint && npm test` (the `test` script exists from Task 1 on).
- Commit on branch `feature/wow-factors` with a conventional subject. End every commit message with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push. (This replaces the `SPEC.md` line "Do not git commit".)
- New non-trivial logic gets one small focused test: JUnit 5 for backend (no Spring context needed for pure logic), Vitest for frontend pure functions.

## Task 1: Road routing and a road-following ride simulator

Frontend only.

- Add `vitest` as a devDependency and a `"test": "vitest run"` script in `frontend/package.json`.
- New `src/lib/route.ts`:
  - `export interface RoadRoute { path: LatLng[]; km: number; min: number }` (reuse `LatLng` from `features/tracking/geo.ts`, or move `LatLng` to `lib` if that avoids a cycle).
  - `roadRoute(points: LatLng[]): Promise<RoadRoute | null>` calling `${OSRM}/route/v1/driving/{lng,lat;lng,lat...}?overview=full&geometries=geojson`, where `OSRM = import.meta.env.VITE_OSRM_URL ?? 'https://router.project-osrm.org'`. A 6 second timeout through `AbortController`. Cache results in a module `Map` keyed by the points rounded to 4 decimals. Any failure returns `null`.
  - Pure helpers, each tested: `pathKm(path)`, `pointAlong(path, km)` (the point `km` along the path, clamped to the end), `remainingKm(path, pos)` (path length from the vertex nearest `pos` to the end).
  - `useRoadRoute(from: LatLng | null, to: LatLng | null)` hook returning `RoadRoute | null`, refetching only when `from` or `to` change by more than 50 m.
- Simulator in `features/volunteer/hooks.ts` (`useLocationShare`): when simulating, fetch the road route from the sim start to the current target once per leg and advance 0.2 km along it every 3 s with `pointAlong`. If routing fails, keep the existing straight `stepToward` behaviour.
- Map: in `components/map/LiveMap.tsx` (and wherever the tracking page draws the remaining leg) draw the remaining leg along the road path when a route is available, falling back to the current dashed straight line. The leg runs from leg start to the next stop (CLAIMED: rider's first point to donor; PICKED_UP: donor to kitchen). The covered trail is unchanged.
- Tracking page ETA (`features/tracking/geo.ts` `leg()` callers): when a road route exists, show remaining km from `remainingKm` and minutes scaled as `route.min * remaining / route.km`; otherwise the existing estimate.

## Task 2: Rescue-risk score

Frontend only.

- New `src/lib/risk.ts`, tested:
  - `export type RiskLevel = 'SAFE' | 'TIGHT' | 'AT_RISK'`
  - `rescueRisk(d: Donation, opts: { now?: number; from?: LatLng | null; kitchen?: LatLng | null; toDonorMin?: number; toKitchenMin?: number }): { level: RiskLevel; spareMin: number }`
  - Constants: `HANDOVER_MIN = 10` per handover, `DISPATCH_MIN = 15` (time for a volunteer to reach the donor when nobody is assigned or no position is known).
  - Ride minutes default to `etaMin(haversineKm(a, b))` from `features/tracking/geo.ts` unless `toDonorMin` / `toKitchenMin` are given.
  - Status rules: AVAILABLE uses `opts.kitchen` (the viewing kitchen) as the drop; ACCEPTED and CLAIMED use `d.ngo`; before pickup the total is ride-to-donor (from `opts.from`, else `DISPATCH_MIN`) + handover + ride-to-kitchen + handover; PICKED_UP is ride-to-kitchen + handover. With no kitchen known, the drop leg counts as `DISPATCH_MIN`.
  - `spareMin = (bestBefore - (now + total)) in minutes`. Before pickup, arriving at the donor after `pickupUntil` makes it `AT_RISK`. Otherwise `spareMin < 0` is `AT_RISK`, `< 30` is `TIGHT`, else `SAFE`.
- New `RiskBadge` component in `src/components/ui` showing "Safe, 2h 10m to spare", "Tight, 20m to spare" or "At risk", coloured with existing token colours (success, warning, danger).
- Show it on: NGO available cards (kitchen = the NGO user's location), volunteer task cards (from = volunteer's location), and the tracking page using the road minutes from Task 1 when available.

## Task 3: QR handover

Frontend only. Dependencies: `qrcode` (+ `@types/qrcode`) to draw, `jsqr` to read.

- QR payload: `reserve:<donationId>:<code>` (code is the 4 digit pickup or drop code).
- In `features/tracking/codes.tsx`, wherever the assigned volunteer sees a code, also render it as a QR (canvas or data URL from `qrcode`), large enough to scan from a phone, with the digits still shown under it.
- New `src/components/ui` `QrScanner` (or a feature file next to the confirm sheets): opens the camera with `getUserMedia({ video: { facingMode: 'environment' } })`, reads frames into a canvas, decodes with `jsqr`, stops the stream on success, unmount and close. Shows a clear message when the camera is unavailable or denied.
- The donor's confirm-pickup sheet and the NGO's confirm-delivery sheet (`features/ngo/ConfirmSheet.tsx` and the donor equivalent) get a "Scan code" button. A scanned payload whose id matches the sheet's donation fills the code and submits through the existing confirm call. A payload for another donation shows "This code is for a different pickup". Typing the code stays as the fallback.
- Payload parse/format as small pure functions with a test.

## Task 4: Impact, leaderboard and surplus statistics (backend)

Package `com.reserve.stats`.

- `GET /api/stats/leaderboard?days=30` (public, add to the permitAll GET list): `Leaderboard { days, meals, foodKg, co2Kg, volunteers: [{id, name, initials, pickups, meals, badge?}], donors: [{id, name, initials, donations, meals}] }`. Based on donations DELIVERED within the period, top 10 each by meals. `badge` is the highest badge in `StatsService.BADGES` whose `target` is at most the volunteer's pickups in the period. No phone numbers.
- Extend `MyStats` with `allTime: {count, meals, foodKg, co2Kg, since}` (count = delivered pickups for a volunteer, delivered donations for a donor, deliveries received for an NGO; `since` = the user's `createdAt`) and `earnedBadges: string[]` (volunteer only: every badge whose target is at most this month's pickups; empty list for other roles). Add repository queries as needed; no per-row queries.
- `GET /api/stats/surplus?days=56` (NGO only, `days` between 7 and 90): `SurplusMap { days, points: [{lat, lng, kg, status}], forecast: [...] }`.
  - `points`: donations created in the period with status DELIVERED or EXPIRED, grouped by status and lat/lng rounded to 3 decimals, `kg` summed.
  - `forecast`: pure class `SurplusForecast` (unit tested) with a static method taking the donations, `now` and the zone. Look back 8 weeks over every donation except CANCELLED. Group by donor, weekday (zone) and 3-hour slot of `pickupFrom`. Keep groups seen in at least 2 distinct weeks. `expectedMeals = round(total meals / weeks seen)`. Each entry: `{donorId, donorName, address, lat, lng, from, until, expectedMeals, weeksSeen, weeksLooked: 8}` where `from`/`until` are the next occurrence of that slot after `now`. Return the 6 soonest within the next 7 days.
- Mirror every type in `frontend/src/lib/types.ts` and add client functions in `frontend/src/lib/api.ts` (`leaderboard(days)`, `surplus(days)`). No UI in this task.

## Task 5: Seed eight weeks of patterned history

Backend `seed/DataSeeder.java`.

- Replace the roughly 30 days of delivered history with 8 weeks generated from a fixed `Random(42)` and recurring donor patterns, so the forecast and heatmap show something real:
  - Kalyan Mahal: Saturday and Sunday, pickup 20:00 to 23:00, 80 to 120 servings.
  - SRM Hostel Mess: Monday to Friday, 14:00 to 16:00, 30 to 50 servings.
  - Sunrise Bakery: daily, 21:00 to 22:30, 10 to 20 packs.
  - TechPark Cafeteria: Monday to Friday, 15:00 to 17:00, 20 to 40 servings.
  - Hotel Annapoorna: Friday and Saturday, 22:00 to 23:30, 25 to 45 servings.
  - Others: a few scattered posts.
- About 12% of past posts end EXPIRED, the rest DELIVERED by the seeded volunteers to the seeded NGOs, with plausible claim, pickup and delivery times and handover codes.
- Keep today's live demo state exactly as it is (the ~9 available donations and Ravi's active pickup).
- Record activities for history only if the current seeder does; keep inserts batched (`saveAll`).
- The seeder still runs only when `users` is empty. Document in the report how to reset the dev DB (`docker rm -f reserve-dev-pg` and recreate it as in Global constraints).

## Task 6: Impact UI, public leaderboard and certificate

Frontend.

- New public route `/leaderboard` (lazy, like the others in `App.tsx`): period switch 7 / 30 days, totals strip (meals, food kg, CO2 avoided), volunteer and donor tables with rank, initials avatar and badge. Linked from the landing page and from the volunteer Impact page.
- Volunteer `ImpactPage.tsx`: an "Earned badges" row from `earnedBadges`, plus all-time totals from `allTime`.
- Donor and NGO: an impact card on their home or profile page with all-time meals, food kg and CO2 avoided from `allTime`.
- Certificate: route `/certificate` (any signed-in role) rendering a printable certificate: user name, role wording ("Volunteer", "Food donor", "Partner kitchen"), all-time meals, food kg, CO2 avoided, member since, today's date, ReServe mark. A print stylesheet (`@media print`) hides everything else; a "Download certificate" button on the impact or profile pages opens it and the page offers "Save as PDF" through `window.print()`. No PDF library.

## Task 7: Surplus heatmap and forecast UI

Frontend, NGO only.

- `features/ngo/MapView.tsx`: a "History" toggle that overlays `surplus.points` as react-leaflet `CircleMarker`s (radius scaled by `sqrt(kg)`, green for DELIVERED, red for EXPIRED, translucent), with a small legend ("Rescued", "Expired") and a 30 / 56 day switch.
- `features/ngo/Insights.tsx`: an "Expected surplus" section listing `forecast` entries: donor name, day and time window in words ("Sat 8 pm to 11 pm"), expected meals, and "seen 6 of last 8 weeks". Label it as a pattern from past posts, not a promise. Empty state when the list is empty.

## Task 8: AI draft service (backend)

Package `com.reserve.ai`. Dependency: `com.anthropic:anthropic-java:3.3.0`.

- Config: `app.ai.api-key: ${ANTHROPIC_API_KEY:}`, `app.ai.model: ${AI_MODEL:claude-opus-5-5}`. Build an `AnthropicClient` with `AnthropicOkHttpClient.builder().apiKey(key).timeout(Duration.ofSeconds(30)).build()` only when the key is set.
- `GET /api/ai/status` (DONOR) returns `{enabled}`.
- `POST /api/ai/draft` (DONOR) `{photoUrl?, text?}` with exactly one set (else 400). Returns `DonationDraft { title?, diet?, category?, quantity?, unit?, bestBeforeMinutes?, pickupFromMinutes?, pickupUntilMinutes?, note? }`, all minutes counted from now.
  - Photo: `photoUrl` must match the same pattern `DonationService.validate` uses; read the bytes through `UploadService` (add a read method if needed) and send as a base64 image block with the right media type.
  - Text: the donor's description, possibly Tamil or Hindi.
  - Use structured output (`.outputConfig(DonationDraft.class)` style from the SDK, with a separate record for the model's output if enum handling needs it). Stable system prompt first; put the current local time in the zone (`app.zone`) in the user message so "till 9 pm" can become minutes. Title in English, short, like the seed titles. Effort `low`. Check `stopReason` before reading content.
  - Server-side clean-up of the model's output: unknown enums become null, quantity clamped 1 to 10000, minutes clamped 0 to 2880, title trimmed to 160 chars.
  - Errors: feature off returns 404 `AI drafting is off`; refusal, timeout or API failure returns 422 `Couldn't read that, please fill the form yourself`; never 500.
  - Rate limit per donor: 30 drafts per hour, in memory, returns 429 `Too many requests, try again later`. Mark it with a `// shortcut:` comment saying it is per instance.
- Security config: both endpoints DONOR only.
- Unit test the clean-up/clamping logic (no network).

## Task 9: Photo autofill and voice dictation (frontend)

- `api.aiStatus()` and `api.aiDraft({photoUrl} | {text})` in `lib/api.ts`, types in `lib/types.ts`.
- `features/donor/PostFlow.tsx` and `usePostForm.ts`:
  - After a photo upload, when AI is enabled, a "Fill from photo" button (lucide `Sparkles`) calls the draft and applies it.
  - A "Describe it" mic button using `window.SpeechRecognition ?? window.webkitSpeechRecognition` with language choices English (`en-IN`), Tamil (`ta-IN`), Hindi (`hi-IN`); shows the live transcript, and on finish sends the text to the draft endpoint. Hidden when speech recognition or AI is unavailable.
  - Applying a draft fills only the fields it contains, converts minutes into the form's datetime values relative to now, never ticks safety checks, and shows a toast "Filled in for you, check every field before posting". Loading state on the button while waiting; errors shown through the existing toast.
- The draft-to-form conversion is a pure function with a Vitest test.

## Task 10: Bolna donation hotline

Backend package `com.reserve.voice`, plus a small frontend badge and docs.

- Migration `V4__donation_source.sql`: `alter table donations add column source varchar(16) not null default 'APP';`. Enum `Source { APP, VOICE }` on `Donation`, exposed as `source` in `DonationDto` and in `frontend/src/lib/types.ts`.
- `DonationService` gains a creation path that takes the donor `User`, the `Create` request and a `Source`; the existing `create(AuthUser, Create)` delegates to it with `APP`. Validation, activity and broadcast stay shared.
- Shared secret: `app.voice.secret: ${VOICE_SECRET:}`. Requests must send header `X-Voice-Secret`, compared in constant time (`MessageDigest.isEqual`). Secret unset: both endpoints return 404. Wrong secret: 401. Add `/api/voice/**` to permitAll in `SecurityConfig`; the controller (or a small filter) enforces the secret.
- `POST /api/voice/lookup` `{phone}` returns `{registered, name?, address?}` for a DONOR account.
- `POST /api/voice/donations` body: `{phone, title, diet, category?, quantity, unit?, pickupFrom?, pickupUntil, bestBefore, covered, safeTemp, noReturns, allergensNoted, note?}`.
  - `phone`: strip spaces, dashes, `+91` or leading `0`, keep the last 10 digits; must belong to a DONOR, else 404 `This number is not registered as a donor on ReServe`.
  - `category` defaults to COOKED, `unit` to SERVINGS, `pickupFrom` to now.
  - Times are strings, either `+90` (minutes from now) or `21:00` (24 hour clock in `app.zone`, today or tomorrow if already past). Parser `SpokenTime` with unit tests.
  - All four safety booleans must be true, else 400 `We can only take food that is covered, kept at a safe temperature, never served, and has allergens noted`.
  - Address and lat/lng come from the donor's profile. Created with `Source.VOICE`.
  - Success returns `{code, message}`, message written for the agent to read aloud, for example `Done. RS-2481, 50 servings of veg biryani, is live. Pickup by 9 pm.`
  - All error messages short and speakable.
- Frontend: a small "By phone" badge (lucide `Phone`) on donation cards where `source === 'VOICE'` (NGO available list, donor donations list, volunteer task list).
- `docs/bolna.md`: how to create the Bolna agent (multilingual system prompt that greets the caller, asks the fields one by one including the four safety questions, confirms back, then calls the tool), the two custom functions with their JSON parameter schemas, URL `https://<public-host>/api/voice/...`, the `X-Voice-Secret` header, how the caller's number reaches the function, running a tunnel to port 8080, and curl examples. Check Bolna's current docs for the custom function format and the caller-number variable (WebFetch `https://docs.bolna.ai`); if they cannot be fetched, say so in the doc and the report.

## Task 11: Installable app and web push

Backend dependencies: `nl.martijndwars:web-push` (latest 5.x) and the BouncyCastle provider it requires.

- Migration `V5__push_subscriptions.sql`: `push_subscriptions(id bigserial primary key, user_id bigint not null references users(id), endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now())`, index on `user_id`.
- Config `app.push.public-key: ${VAPID_PUBLIC_KEY:}`, `app.push.private-key: ${VAPID_PRIVATE_KEY:}`, `app.push.subject: ${VAPID_SUBJECT:mailto:admin@reserve.local}`. Off when keys are blank. README note on generating keys (`npx web-push generate-vapid-keys`).
- Package `com.reserve.push`:
  - `GET /api/push/key` (public) returns `{enabled, publicKey?}`.
  - `POST /api/push/subscribe` `{endpoint, keys: {p256dh, auth}}` (any signed-in user) upserts by endpoint for the current user.
  - `POST /api/push/unsubscribe` `{endpoint}` deletes the caller's row.
  - `PushService.send(userIds, payload)` sends `{title, body, url}` JSON; deletes subscriptions answered with 404 or 410.
- Triggers without coupling `DonationService` to push: `DonationService` publishes a small domain event (for example `DonationEvent(type, donationId)`) through `ApplicationEventPublisher` on create and on accept. A `PushNotifier` handles it with `@TransactionalEventListener(phase = AFTER_COMMIT)` and `@Async` on a bounded executor (`@EnableAsync`, pool size in `application.yml`).
  - Created and critical (`bestBefore - now < 2h`): NGOs with `acceptingFood` within 7 km. Title `Critical food nearby`, body like `40 servings of veg biryani, 2.1 km away, best before 9:10 pm`, url `/ngo`.
  - Accepted: on-duty volunteers within 7 km. Title `Pickup needed`, url `/volunteer`.
- Frontend:
  - `public/manifest.webmanifest` (name ReServe, short name, theme and background colours from tokens, `display: standalone`, `start_url: /`) and PNG icons 192 and 512 (generate them once from `public/favicon.svg` with any local tool and commit the PNGs; no runtime dependency), linked from `index.html` with `theme-color`.
  - `public/sw.js`: cache-first for `/assets/` only, network-first for navigations falling back to the cached `/`, never caches `/api`. `push` event shows the notification; `notificationclick` focuses an open tab or opens the url.
  - Register the service worker in `main.tsx`.
  - `src/lib/push.ts`: `pushSupported()`, `pushIsOn()`, `enablePush()`, `disablePush()` using `PushManager` with the server key.
  - A "Notifications" toggle row on the volunteer, donor and NGO profile pages, hidden when unsupported or the server reports push off.
- Unit test the targeting rule (who gets which notification) without sending.

## Task 12: Tamil and Hindi, part 1 (infrastructure, landing, auth, donor)

- `src/lib/i18n.tsx`: `I18nProvider`, `useT()` returning `t(text: string, vars?: Record<string, string | number>)` where the key is the English source text and `{name}` placeholders are filled from `vars`; `useLang()` returning `[lang, setLang]`. Languages `en`, `ta`, `hi`; stored in `localStorage` key `reserve.lang` (wrapped in try/catch like `tokenStore`); sets `document.documentElement.lang`. Missing keys fall back to English. A dev-only `console.warn` once per missing key is fine.
- Dictionaries `src/locales/ta.ts` and `src/locales/hi.ts` as `Record<string, string>`.
- `LanguageSwitch` component (English, தமிழ், हिन्दी) in `components/ui`, shown on the landing page header, the auth page, and every role's profile page.
- Translate all visible strings in `features/landing`, `features/auth` and `features/donor`, including toasts and validation text produced on the client. Server error messages stay English.
- The voice dictation language from Task 9 defaults to the current UI language.
- Test: `t` fallback and placeholder filling.

## Task 13: Tamil and Hindi, part 2 (everything else)

- Translate all visible strings in `features/volunteer`, `features/ngo`, `features/tracking`, `components/shell`, `components/ui`, `components/dash`, `components/map`, and the pages added in Tasks 6 and 7 (leaderboard, certificate, history map, forecast), including `RiskBadge` wording and push toggle labels.
- Keep dictionaries consistent: same English keys, natural phrasing, food and place names untranslated.

## Task 14: Documentation and demo script

- `README.md`: new features in "How it works", new environment variables (`ANTHROPIC_API_KEY`, `AI_MODEL`, `VOICE_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `VITE_OSRM_URL`), how to expose the backend through a tunnel for phones and Bolna, how to reset the dev database for the new seed.
- `docs/demo.md`: a 5 to 7 minute classroom script in order: landing and leaderboard, donor posts with photo autofill, the phone call that posts food live, kitchen sees it with risk badge and push alert, partial accept, volunteer claims and simulates the road ride, QR handovers, NGO insights with heatmap and forecast, certificate download, language switch. Include a fallback line for each live step (recorded video, typed code, straight-line simulator).
- Make sure `SPEC.md` lists every endpoint and type added by Tasks 1 to 13.
