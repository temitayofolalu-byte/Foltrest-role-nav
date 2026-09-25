-- Foltrest migration: email verification on signup.
-- Safe to run on your existing database -- adds columns only, no data loss.

alter table users add column if not exists "emailVerified" boolean not null default false;
alter table users add column if not exists "emailVerificationTokenHash" text;
alter table users add column if not exists "emailVerificationExpiresAt" timestamptz;

-- Anyone who already has an account before this feature existed is treated
-- as already verified, so they aren't suddenly locked out of paying.
update users set "emailVerified" = true where "emailVerified" is false and "createdAt" < now();
