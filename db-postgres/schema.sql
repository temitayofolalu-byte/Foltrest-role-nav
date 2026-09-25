-- ============================================================
-- FOLTREST — Supabase / PostgreSQL schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste this → Run
--
-- Column names are camelCase in double quotes to match the backend
-- code exactly (agentId, rentPrice, etc) — no translation layer needed.
-- ============================================================

create table if not exists users (
  id text primary key,
  name text not null,
  email text unique not null,
  phone text,
  password text not null,
  role text not null check (role in ('agent', 'renter', 'admin')),
  verified boolean not null default false,
  "idDocumentUrl" text,
  "passportPhotoUrl" text,
  "verificationRejectionReason" text,
  "createdAt" timestamptz not null default now(),
  "passwordResetTokenHash" text,
  "passwordResetExpiresAt" timestamptz,
  "bankAccountName" text,
  "bankAccountNumber" text,
  "bankCode" text,
  "paystackRecipientCode" text
);

create table if not exists listings (
  id text primary key,
  "agentId" text not null references users(id),
  title text not null,
  description text,
  location text not null,
  rooms text,
  "rentPrice" numeric not null,
  "agentFee" numeric not null,
  photos jsonb default '{"exterior":[],"interior":[]}',
  status text not null default 'available' check (status in ('available', 'rented')),
  "verificationStatus" text not null default 'pending' check ("verificationStatus" in ('pending', 'approved', 'rejected')),
  "rejectionReason" text,
  "rentedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  "listingId" text not null references listings(id),
  "renterId" text not null references users(id),
  "amountPaid" numeric not null,
  "agentFeeAmount" numeric not null,
  "rentPortion" numeric not null default 0,
  "platformCommission" numeric not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'completed', 'refunded')),
  "paymentRef" text,
  date timestamptz not null default now(),
  "confirmedAt" timestamptz,
  "paidAt" timestamptz,
  "paymentChannel" text,
  "paystackTransactionId" text,
  "payoutStatus" text default 'pending',
  "payoutAt" timestamptz,
  "paystackTransferId" text
);

create table if not exists notifications (
  id text primary key,
  "userId" text not null references users(id),
  title text not null,
  body text not null,
  type text not null default 'info',
  read boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  "listingId" text references listings(id),
  "senderId" text not null references users(id),
  "receiverId" text not null references users(id),
  body text not null,
  "createdAt" timestamptz not null default now(),
  read boolean not null default false
);

create table if not exists reviews (
  id text primary key,
  "listingId" text not null references listings(id),
  "agentId" text not null references users(id),
  "renterId" text not null references users(id),
  rating numeric not null,
  comment text,
  "createdAt" timestamptz not null default now()
);

create table if not exists "siteReviews" (
  id text primary key,
  "userId" text not null references users(id),
  rating numeric not null,
  comment text,
  "createdAt" timestamptz not null default now()
);

create table if not exists reports (
  id text primary key,
  "reporterId" text not null references users(id),
  "listingId" text references listings(id),
  "agentId" text references users(id),
  reason text not null,
  status text not null default 'open',
  "createdAt" timestamptz not null default now()
);

-- Helpful indexes for the queries the app runs most
create index if not exists idx_listings_agent on listings("agentId");
create index if not exists idx_listings_status on listings("verificationStatus");
create index if not exists idx_transactions_listing on transactions("listingId");
create index if not exists idx_transactions_renter on transactions("renterId");
create index if not exists idx_messages_listing on messages("listingId");
create index if not exists idx_reviews_agent on reviews("agentId");


-- Safety constraints for existing/new databases. If tables already exist, run these separately in Supabase SQL Editor.
create index if not exists idx_transactions_active_listing on transactions("listingId") where status in ('pending','paid','completed');
create unique index if not exists ux_transactions_pending_listing on transactions("listingId") where status = 'pending';
create unique index if not exists ux_reviews_renter_listing on reviews("renterId","listingId");
