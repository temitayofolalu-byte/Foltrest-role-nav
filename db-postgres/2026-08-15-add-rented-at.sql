-- Foltrest migration: add the 24-hour "rented" visibility window.
-- Safe to run on your existing database — does NOT delete any listing
-- or transaction, just adds a new column and backfills it.

alter table listings add column if not exists "rentedAt" timestamptz;
create index if not exists idx_listings_rented_at on listings("rentedAt");

-- Any listing that was already marked "rented" before this feature
-- existed gets its 24-hour visibility window starting from right now,
-- instead of disappearing immediately with no grace period.
update listings
set "rentedAt" = coalesce("rentedAt", now())
where status = 'rented' and "rentedAt" is null;
