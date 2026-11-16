# Classroom demo script

About 6 minutes, 7 with questions. One story: food is posted by phone, a kitchen takes part of it, a volunteer delivers it, and the impact shows up. Every live step has a fallback line, so a failed integration never stalls the room.

## Before you start (15 minutes ahead)

1. Reset the dev database so the seed times are fresh and the forecast has history. Follow "Reset the dev database" in the README, and run it only against the ReServe database, never another project's.
2. Start the backend with every integration on:

   ```bash
   cd backend
   ANTHROPIC_API_KEY=sk-ant-... VOICE_SECRET=change-me-to-something-long \
   VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... mvn spring-boot:run
   ```

   On Windows PowerShell set each variable first, for example `$env:VOICE_SECRET = "change-me-to-something-long"; mvn spring-boot:run` (same for the other variables and for the frontend allowed-hosts variable in the README).

3. Start the frontend and tunnel it for the phone, and tunnel the backend for Bolna (README, "Phones and the hotline"). Put the backend tunnel address in the two Bolna functions (`docs/bolna.md`).
4. Make your own donor account. In the app choose Create account, Donor, and use the mobile number you will call from. On the address step type any address and do not tap Use my location, so the account stays at the default Tambaram spot, near the kitchens. Use this account for the whole demo.
5. Open two windows on the laptop: donor (your new account) and kitchen (Hope Kitchen Trust, `9840100003`). Run the volunteer (Krrish Pandey, `9840100002`) on a phone: open the tunnel address there and sign in. The password for the demo accounts is `reserve123`. A second device is needed because a laptop camera cannot scan the laptop's own screen (step 7); with no phone, open the volunteer in a third laptop window and type the digits.
6. In the volunteer session, block location for the site (browser lock icon, Location, Block) and reload. The Simulate ride switch only appears when location is blocked, unavailable or more than 30 km from the pickup, so this makes step 6 work wherever you are presenting.
7. In the kitchen window open Profile and turn Notifications on, and allow the browser prompt. Keep Accepting food on (Today).
8. Do one practice call so Bolna and the tunnel are warm. Delete or ignore the practice post.
9. Have these ready as fallbacks: a recorded video of the autofill, one of the phone call, and a screenshot of the push alert. The photo to upload is `frontend/public/food/biryani.jpg`.

## The script

### 1. Landing and leaderboard (0:00 to 0:40)

Open the landing page. Say: "Restaurants and events throw away food every night while kitchens nearby need it. ReServe connects them." Point at the live impact numbers, then open the leaderboard from the nav. Say: "Volunteers and donors ranked by meals delivered in the last 30 days."

Fallback: if the numbers fail to load, they appear as placeholders. Say the numbers from memory (the seed has weeks of history) and move on.

### 2. Donor posts with photo autofill (0:40 to 1:40)

In the donor window choose Post food. Upload `biryani.jpg`, then tap Fill from photo. The name, veg or non-veg, category, quantity and times fill in. Say: "Claude read the photo. The donor still checks every field." Continue to the end and post it.

Fallback: if the control is missing the key is off, and if it fails you get a "Couldn't read that" message. Play the recorded video, then fill the form by hand (name, quantity, times, four safety toggles). Dictation (Describe it) needs a browser with speech recognition, so skip it unless you have rehearsed it.

### 3. The phone call that posts food live (1:40 to 2:50)

Call the Bolna number from the mobile you registered. Answer the agent: veg biryani, veg, 50 servings, cooked, pickup within 45 minutes, best before in 1 hour, then yes to all four safety questions, and yes to post. The agent reads back a code like RS-2481. Say: "No app, no typing. A donor with a basic phone can post food."

Keep the hour short on purpose: under 2 hours to best before makes the food critical, which is what triggers the push alert in the next step.

Fallback: play the recorded call. Or post the same food from the terminal while you talk, using the typed request in `docs/bolna.md` section 5. It needs the backend started with `VOICE_SECRET`, the header `X-Voice-Secret` set to that same value, and a `phone` that belongs to a registered donor, so use the number of the donor account you made (the seed donors work too). Use `+45` and `+60` for the times. It appears the same way, marked By phone.

### 4. The kitchen sees it: risk badge and push (2:50 to 3:30)

In the kitchen window a notification pops up: Critical food nearby. Open Available food. The new post sits at the top with a By phone badge and a risk badge, Tight with a few minutes to spare. Say: "The badge is the time left after the volunteer reaches the donor and brings it here, so the kitchen knows which food is a real race."

Fallback: if no notification shows, the feed still updates live over SSE, so just show the post arriving. Show the screenshot of the alert and say the browser blocked it. Push needs the VAPID keys and the Notifications toggle on in Profile.

### 5. Partial accept (3:30 to 4:00)

Tap the food, then Accept food and take 20 of the 50 servings. Say: "The kitchen only takes what it can serve. The other 30 stay open for another kitchen." The accepted part is a new pickup, and the rest is still in the list.

Fallback: nothing external here. If the accept fails, check Accepting food is on in the kitchen's Today screen.

### 6. Volunteer claims and rides the road (4:00 to 5:00)

In the volunteer window the new pickup appears. Claim it with the Accept button and open the active pickup. Turn on Simulate ride. The rider moves along the real road on the donor and kitchen maps, and the ETA counts down. Say: "Location is shared live with the donor and the kitchen."

Fallback: if the road service is slow or offline the ride switches to a straight line by itself (or set `VITE_OSRM_URL` to your own server), and it still shows live tracking. If the Simulate ride switch is missing, location is not blocked: block it for the site (prep step 6) and reload.

### 7. QR handovers (5:00 to 5:40)

On the volunteer's phone show the QR code and the 4 digit code for the pickup. In the donor window open Track, then Confirm pickup, then Scan code, and point the laptop camera at the phone screen. Say: "Handover is proven by a code only the volunteer has." Run the ride to the kitchen and repeat in the kitchen window: Confirm delivery and Scan code.

Fallback: type the 4 digits instead of scanning. Do this whenever you have no second device, since a laptop cannot scan its own screen, or when the camera is blocked (it needs https or localhost, and the donor window on `localhost` is fine). The code is on the volunteer screen under the QR.

### 8. NGO insights, heatmap and forecast (5:40 to 6:20)

In the kitchen window open Insights: meals, the funnel, and Expected surplus, the donors likely to post in the coming week. Then open Map and turn History on: green circles are rescued food, red are food that expired. Say: "The kitchen can plan for Friday night and see where food goes to waste."

Fallback: both read the seeded history, so this works offline. If the page fails to load, show the screenshot and say what each panel shows.

### 9. Certificate and language (6:20 to 7:00)

On the donor Profile tap Download certificate, then Save as PDF, to show the printable certificate with all-time meals, kilograms and CO2e avoided. Go back and change the language to Tamil from the Language control, then Hindi. Say: "The app speaks the language of the people using it."

Fallback: if the print dialog is awkward on the projector, show the certificate page on screen only. The language switch is local and has no dependency, so it always works.

## If everything goes wrong

Hotline, tunnel and AI key are all optional. With none of them set, the app still runs: skip steps 2 and 3, post a donation from the form, and carry on from step 4 (without the push alert).
