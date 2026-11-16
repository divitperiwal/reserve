# Donation hotline with Bolna

A donor phones a Bolna voice agent, answers a few questions, and the agent posts the donation to ReServe while they are still on the line. Kitchens see it in their feed straight away, marked "By phone".

The backend exposes two endpoints under `/api/voice`. They are off until a shared secret is set.

The function format and the caller number variable below follow Bolna's docs as of November 2026: [custom function calls](https://www.bolna.ai/docs/tool-calling/custom-function-calls), [schema](https://www.bolna.ai/docs/tool-calling/custom-function-schema.md), [examples](https://www.bolna.ai/docs/tool-calling/custom-function-examples.md) and [context variables](https://www.bolna.ai/docs/using-context). Check them again if the dashboard looks different.

## 1. Turn the hotline on

Pick a long random secret and start the backend with it:

```bash
cd backend
VOICE_SECRET=change-me-to-something-long DB_URL=jdbc:postgresql://localhost:5436/reserve mvn spring-boot:run
```

`app.voice.secret` in `application.yml` reads `VOICE_SECRET`. With no secret both endpoints answer 404, as if they did not exist. A request with a missing or wrong `X-Voice-Secret` header gets 401.

## 2. Expose port 8080

Bolna calls your backend from the internet, so it needs a public HTTPS URL. Any tunnel works, for example:

```bash
cloudflared tunnel --url http://localhost:8080
# or
ngrok http 8080
```

Use the printed host as `<public-host>` below, for example `https://quiet-river-1234.trycloudflare.com`.

## 3. Create the agent

In the Bolna dashboard create a new agent, connect a phone number for inbound calls, choose a multilingual voice and a transcriber that handles Tamil, Hindi and English, then paste this system prompt.

```text
You are the ReServe donation hotline. ReServe moves surplus cooked food from kitchens, events and restaurants to community kitchens nearby. Be warm, brief and clear. Reply in the language the caller uses (Tamil, Hindi or English) and switch if they switch. Ask one question at a time.

The caller's number is {from_number}. The current time is {current_time} ({timezone}).

1. Greet the caller: "Vanakkam, namaste, hello. This is ReServe. Thank you for sharing food."
2. Call lookup_donor with phone {from_number}. If registered is false, say: "This number is not registered as a donor on ReServe. Please sign up in the app first." Then end the call politely. If registered is true, greet them by name and say pickup will be from their saved address, which you read out.
3. Ask, one by one:
   - What is the food? (a short name, like "veg biryani")
   - Is it veg or non veg?
   - How much is there? Ask for a number and whether it is servings, kg or packs. Default to servings.
   - Optional: what kind of food it is: cooked, bakery, fruit and vegetables, packaged or raw. Default to cooked.
   - Until when can it be picked up?
   - Until when is it safe to eat (best before)?
4. Ask the four safety questions, one by one, and wait for a clear yes or no:
   - Is the food covered?
   - Has it been kept at a safe temperature, hot or cold?
   - Is it untouched, never served from or returned by guests?
   - Have you noted any allergens, such as nuts, dairy or gluten?
   If any answer is no, say kindly that ReServe can only take food that is covered, kept at a safe temperature, never served, and has allergens noted, and do not post.
5. Ask if there is a note for the volunteer, like a gate or a contact person. It is optional.
6. Read everything back in one sentence and ask "Shall I post it?"
7. On yes, call post_donation. Convert times before calling: a time like "in an hour and a half" becomes "+90" (minutes from now); a clock time becomes 24 hour "HH:MM", so 9 pm is "21:00". Send booleans as true or false.
8. Read the message the tool returns, word for word. If the tool returns an error message, read it, fix that one answer with the caller, and call the tool again.
9. Thank them and end the call.
```

Bolna fills `{from_number}` (also written `{{from_number}}`) with the number that placed an inbound call. That is how the caller's number reaches the functions: the prompt hands it to the model, and the model passes it as the `phone` parameter. ReServe strips spaces, dashes, `+91` or a leading `0` and keeps the last 10 digits, so `+919840100001` matches the account `9840100001`.

## 4. Add the two custom functions

In the agent's Tools tab add two custom functions. Bolna requires `"key": "custom_task"`, and the names in `param` must match `parameters.properties` exactly (case-sensitive). `%(name)s` is replaced with the value the model collected. ReServe accepts `quantity` as a string (`"50"`) and a safety answer as JSON `true` or the text `"true"` in any case, so every placeholder can use `%(name)s`. Anything else, such as `1` or `yes`, counts as no.

### lookup_donor

```json
{
  "name": "lookup_donor",
  "description": "Use at the start of every call to check whether the caller's phone number belongs to a registered ReServe donor. Pass the caller's number {from_number}.",
  "pre_call_message": "One moment while I find your account.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": { "type": "string", "description": "The caller's phone number, {from_number}" }
    },
    "required": ["phone"]
  },
  "key": "custom_task",
  "value": {
    "method": "POST",
    "url": "https://<public-host>/api/voice/lookup",
    "api_token": null,
    "headers": {
      "Content-Type": "application/json",
      "X-Voice-Secret": "change-me-to-something-long"
    },
    "param": {
      "phone": "%(phone)s"
    }
  }
}
```

Returns `{"registered": true, "name": "Kalyan Mahal", "address": "12 Rajaji Street, Kattankulathur"}` or `{"registered": false}`.

### post_donation

```json
{
  "name": "post_donation",
  "description": "Use only after the caller has answered every question, all four safety answers are yes, and they confirmed the read-back. Posts the donation live on ReServe.",
  "pre_call_message": "Posting it now.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": { "type": "string", "description": "The caller's phone number, {from_number}" },
      "title": { "type": "string", "description": "Short name of the food, like veg biryani" },
      "diet": { "type": "string", "enum": ["VEG", "NON_VEG"], "description": "Veg or non veg" },
      "category": { "type": "string", "enum": ["COOKED", "BAKERY", "FRUIT_VEG", "PACKAGED", "RAW"], "description": "Kind of food, default COOKED" },
      "quantity": { "type": "integer", "description": "How much, as a whole number" },
      "unit": { "type": "string", "enum": ["SERVINGS", "KG", "PACKS"], "description": "Unit of the quantity, default SERVINGS" },
      "pickupFrom": { "type": "string", "description": "When pickup can start: minutes from now like +30, or 24 hour time like 19:30. Leave empty for now" },
      "pickupUntil": { "type": "string", "description": "When pickup must end: minutes from now like +90, or 24 hour time like 21:00" },
      "bestBefore": { "type": "string", "description": "When the food stops being safe to eat: minutes from now like +240, or 24 hour time like 23:00" },
      "covered": { "type": "boolean", "description": "The food is covered" },
      "safeTemp": { "type": "boolean", "description": "The food was kept at a safe temperature" },
      "noReturns": { "type": "boolean", "description": "The food was never served from or returned" },
      "allergensNoted": { "type": "boolean", "description": "Allergens have been noted" },
      "note": { "type": "string", "description": "Optional note for the volunteer" }
    },
    "required": ["phone", "title", "diet", "quantity", "pickupUntil", "bestBefore", "covered", "safeTemp", "noReturns", "allergensNoted"]
  },
  "key": "custom_task",
  "value": {
    "method": "POST",
    "url": "https://<public-host>/api/voice/donations",
    "api_token": null,
    "headers": {
      "Content-Type": "application/json",
      "X-Voice-Secret": "change-me-to-something-long"
    },
    "param": {
      "phone": "%(phone)s",
      "title": "%(title)s",
      "diet": "%(diet)s",
      "category": "%(category)s",
      "quantity": "%(quantity)s",
      "unit": "%(unit)s",
      "pickupFrom": "%(pickupFrom)s",
      "pickupUntil": "%(pickupUntil)s",
      "bestBefore": "%(bestBefore)s",
      "covered": "%(covered)s",
      "safeTemp": "%(safeTemp)s",
      "noReturns": "%(noReturns)s",
      "allergensNoted": "%(allergensNoted)s",
      "note": "%(note)s"
    }
  }
}
```

On success it returns `{"code": "RS-2481", "message": "Done. RS-2481, 50 servings of veg biryani, is live. Pickup by 9 pm."}`. The agent reads `message` aloud.

Rules the backend enforces, each with a short sentence the agent can read back:

| Problem | Status | Message |
| --- | --- | --- |
| Number not a donor | 404 | This number is not registered as a donor on ReServe |
| A safety answer is not exactly true | 400 | We can only take food that is covered, kept at a safe temperature, never served, and has allergens noted |
| A time it cannot read | 400 | I did not catch the pickup end time. Use minutes from now like +90, or a clock time like 21:00 |
| Pickup ends after best before | 400 | Pickup window must end by the best-before time |
| Quantity is not a whole number | 400 | Tell me how much food there is, as a whole number |
| Body is not valid JSON | 400 | Sorry, I could not read that request |
| Wrong or missing secret | 401 | Wrong voice secret |
| Hotline off (no secret set) | 404 | Not found |

Times are read in `app.zone` (Asia/Kolkata). A clock time that has already passed today means tomorrow. Address and map location come from the donor's profile.

## 5. Try it without a phone

```bash
HOST=http://localhost:8080
SECRET=change-me-to-something-long

curl -s -H "X-Voice-Secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"phone":"+91 98401 00001"}' $HOST/api/voice/lookup

curl -s -H "X-Voice-Secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"phone":"+91 98401 00001","title":"Veg biryani","diet":"VEG","quantity":50,
       "pickupUntil":"21:00","bestBefore":"23:00",
       "covered":true,"safeTemp":true,"noReturns":true,"allergensNoted":true}' \
  $HOST/api/voice/donations
```

Sign in as the NGO demo account (`9840100003`, password `reserve123`) and the donation appears under Available food with a "By phone" badge.
