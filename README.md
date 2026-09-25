# Foltrest — NestJS + TypeScript, Multi-Page Frontend ("Market Day" design)

Full rebuild covering every feature (renter/agent/admin flows, escrow
payments, agent verification, listing approval, ratings, chat) — now with
a proper multi-page frontend instead of one giant file, and a bold
"Market Day" visual design.

## Agent verification documents — now real uploads

Agents pick a file directly on the registration page (`auth.html`) —
no more pasting a link. Files upload to `/api/uploads/document`
(backed by `src/uploads`), get saved into the `/uploads` folder on the
server, and the returned URL is what gets stored as `idDocumentUrl` /
`passportPhotoUrl`. Admin can click straight through to view them in
the admin panel.

Accepted file types: JPG, PNG, WEBP, PDF — capped at 5MB each.

## Moving to real Supabase — using the Supabase Client Library

The backend connects to Supabase using their **client library over HTTPS**
(an API key), not a raw database password. This sidesteps connection
string / password / network issues entirely.

### Setup steps

1. **Create the tables** (if you haven't already). In Supabase: Dashboard
   → SQL Editor → New query → paste everything from
   `db-postgres/schema.sql` → Run.

2. **Get your Project URL and service_role key.**
   Dashboard → Settings → API. You'll see:
   - **Project URL** — looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **service_role key** (under "Project API keys") — a long secret key

3. **Set up your `.env` file.** Copy `.env.example` to `.env`, fill in:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-long-service-role-key
   ```

4. **Install, run:**
   ```
   npm install
   npm start
   ```

5. **Check it worked** — open Supabase's Table Editor and you should see
   your tables listed (empty until real users start signing up).

### Important: never expose the service_role key in frontend code

This key has full access to your database, bypassing all security rules.
It's meant for backend-only use (which is exactly what we're doing —
it lives only in your server's `.env` file, never sent to the browser).

### If something errors

- `"relation ... does not exist"` → you haven't run `schema.sql` yet.
- `401` or `"Invalid API key"` → double-check you copied the
  **service_role** key, not the `anon` key, and that `SUPABASE_URL` has
  no trailing slash.
- Still stuck → run this quick test file to isolate the issue:
  ```js
  // test-connection.js
  require('dotenv').config();
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  supabase.from('users').select('*').then(r => console.log(r));
  ```
  Run with `node test-connection.js` and see exactly what it returns.

## How to run it

```
npm install
npm start
```
Open **http://localhost:4000**

## Creating your real admin account

There's no demo data anymore — this is a real app. To get your own admin
login, add these three lines to your `.env` file:
```
ADMIN_NAME=Your Name
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=a-real-strong-password
```
Then run this **once**:
```
npm run create-admin
```
This creates exactly one real admin account — no fake agents, renters,
or listings. From here, real agents and renters sign up through the
normal registration page, and you approve/verify them as admin.

## Frontend structure (now split into real files)

```
frontend/
  index.html        - Browse / home page
  listing.html       - Listing detail, rent flow, report, review
  auth.html           - Login / register (agent ID+passport fields)
  dashboard.html       - Agent dashboard + post-listing modal
  messages.html         - Chat inbox
  thread.html            - Individual chat thread (listing or admin chat)
  admin.html              - Admin panel
  css/style.css            - Shared "Market Day" design system (all colors, type, components)
  js/common.js              - Shared API helper, auth state, nav rendering
```

Every page pulls the same `css/style.css` and `js/common.js`, so the look
and auth state stay consistent everywhere, but each page is now its own
real file — easier to find, edit, and hand to another developer.

## Design system ("Market Day")

- Colors: white `#fff`, cream `#fff8ee`, ink `#12210f`, orange `#f1691f`,
  green `#1f7a46` (+ dark/soft variants)
- Type: Sora (headings, 700/800 weight), Inter (body/UI)
- Signature element: the bold color-blocked "band" hero card with a
  rotated orange highlight behind key words — used on the homepage and
  reused (smaller) wherever a page needs a strong header moment

## Backend (unchanged from last version)

Same NestJS modules as before: `auth`, `listings`, `transactions`,
`messages`, `trust`, `admin`, all going through `store/store.service.ts`
(local JSON files — swap this file for real PostgreSQL later).


## Frontend deployment
The static frontend is in `frontend/` and can be deployed to Netlify. Before deploying, edit `frontend/config.js` and replace `https://REPLACE_WITH_YOUR_BACKEND_URL/api` with your live NestJS API URL ending in `/api`. Then add the Netlify URL to the backend `FRONTEND_ORIGINS` environment variable and set `FRONTEND_ORIGIN` to the Netlify site URL.

## Secrets
Never commit `.env`. Copy `.env.example` to `.env` locally and set your real Supabase service-role and Paystack secret values there. The application now fails fast when required secrets are missing and no longer simulates Paystack payments.


## Security and Paystack webhook setup

### Private agent documents
Agent ID/passport uploads are stored under the private `private-documents` directory (outside the public `uploads` directory) and are no longer served by the public `/uploads` static route. Only an authenticated admin can open `/api/uploads/private/:filename`. On startup, existing local document URLs referenced by users are migrated out of the public uploads folder when the file exists locally.

### Paystack webhook
Configure a Paystack webhook URL pointing to:

`https://YOUR-BACKEND-DOMAIN/api/transactions/webhook`

The server verifies the `x-paystack-signature` HMAC SHA512 signature before accepting `charge.success`. A successful webhook changes a matching transaction from `pending` to `paid`. The renter can later confirm the apartment, which changes it to `completed` and marks a full-rent listing as rented. If the browser is closed after payment, the transaction no longer depends on the browser returning for the payment to be recorded.

For an existing Supabase database, run `db-postgres/2026-08-15-payment-webhook.sql` once.


## All-features migration
Run `db-postgres/2026-08-15-all-features.sql` in Supabase SQL Editor after the existing schema/migrations.

## Email verification migration
Run `db-postgres/2026-08-18-email-verification.sql` in Supabase SQL Editor. Adds the columns needed for the new signup email-verification flow. Anyone who already had an account before this migration is automatically treated as already verified, so nobody gets locked out.

## File storage — now permanent (Supabase Storage)
Listing photos and private ID/passport documents used to be saved on the
server's local disk — which most hosting platforms (Railway, Render, etc.)
wipe on every restart or redeploy. They now live in **Supabase Storage**
instead, which is permanent.

Two storage buckets are created **automatically** the first time you run
the app with real Supabase credentials — no manual dashboard step needed:
- `uploads` — public bucket, for listing exterior/interior photos
- `private-documents` — private bucket, for agent ID/passport photos (only
  accessible to admin, via a short-lived signed link)

If you already had listings/agents with old `/uploads/...` local file
paths saved from before this change, those old files won't exist anymore
on a fresh deploy — re-upload them once through the app after deploying.

## Roommate Finder migration
Run `db-postgres/2026-08-24-roommate-finder.sql` in Supabase SQL Editor. Adds a new "Roommates" section — separate from the paid-listing/escrow system — where any logged-in user can post "looking for a roommate" ads (with an optional gender preference filter) and message each other directly through the existing chat system. Admin can view and remove any post from the Admin panel.

## What's new in this pass
- **Rate limiting**: 5 login/register attempts and 3 password-reset requests per minute per IP address. Stops password-guessing and email-spam attacks.
- **Email verification**: new signups get a verification email (same delivery path as password reset — via Resend if configured, otherwise printed to the server console). Login still works immediately either way, but a renter must verify their email before making a payment. A dismissible banner appears site-wide for unverified users, with a "resend" link.
- **Pagination**: the Browse page now loads 20 listings at a time with a "Load more" button instead of everything at once. Admin's transactions, messages, and reports lists are paginated the same way (backend-ready; admin UI currently shows the most recent page — a "Load more" button can be added there too if you want it later).

### New environment variables
- `RESEND_API_KEY` — optional email delivery for password resets and notifications.
- `RESEND_FROM_EMAIL` — sender identity approved by your email provider.
- `ENABLE_AGENT_PAYOUTS=false` — keep false during testing; set true only after Paystack transfer recipients/balance are configured.

### Paystack webhook
Set the Paystack webhook URL to `/api/transactions/webhook` on your public backend. The server verifies `x-paystack-signature` before accepting `charge.success`.

### Agent payouts
Agents save their Nigerian bank account from the agent dashboard. On a completed full-rent transaction, if `ENABLE_AGENT_PAYOUTS=true`, Foltrest creates/uses the Paystack transfer recipient and sends the agent fee. Keep this disabled while testing.
