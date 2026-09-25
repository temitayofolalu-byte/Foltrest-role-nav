# Foltrest — all requested features

This build adds the requested features in one project so they can be verified one-by-one afterward.

## Included
1. Real listing photo uploads (multiple exterior/interior images).
2. Forgot-password flow with expiring reset tokens.
3. Paystack `charge.success` webhook with signature verification and payment state `paid`.
4. Private ID/passport document storage and admin-only document access.
5. Agent bank account setup and Paystack transfer payout path; keep `ENABLE_AGENT_PAYOUTS=false` while testing.
6. In-app notifications and optional email notifications via Resend.
7. Public Foltrest site reviews page.
8. Top Agent badge criteria and display on listing details.
9. Existing rented-listing 24-hour public window remains intact; records are not deleted.

## One Supabase step
Run **db-postgres/2026-08-15-all-features.sql** in Supabase SQL Editor. It is intended for an existing database and uses `IF NOT EXISTS` where appropriate.

## Environment
Keep your secrets server-side:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `FRONTEND_ORIGIN`
- `RESEND_API_KEY` (optional for email)
- `RESEND_FROM_EMAIL` (optional)
- `ENABLE_AGENT_PAYOUTS=false` during verification

## Paystack webhook
After the backend has a public HTTPS URL, set Paystack webhook to:
`https://YOUR-BACKEND-DOMAIN/api/transactions/webhook`

## Verification order
1. Start backend and frontend; confirm build/startup.
2. Run Supabase migration.
3. Test listing photo upload.
4. Test password reset.
5. Test private document access as admin and non-admin.
6. Test Paystack webhook in test mode.
7. Test agent bank-account setup with payouts disabled.
8. Enable payouts only after all payment tests pass.
9. Test notifications.
10. Open Reviews and verify Top Agent badge criteria.
