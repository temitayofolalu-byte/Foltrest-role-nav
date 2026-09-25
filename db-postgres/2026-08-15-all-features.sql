-- Foltrest all-feature migration. Run once in Supabase SQL Editor.

alter table listings add column if not exists "rentedAt" timestamptz;

alter table users add column if not exists "passwordResetTokenHash" text;
alter table users add column if not exists "passwordResetExpiresAt" timestamptz;
alter table users add column if not exists "bankAccountName" text;
alter table users add column if not exists "bankAccountNumber" text;
alter table users add column if not exists "bankCode" text;
alter table users add column if not exists "paystackRecipientCode" text;

alter table transactions drop constraint if exists transactions_status_check;
alter table transactions add constraint transactions_status_check check (status in ('pending','paid','completed','refunded'));
alter table transactions add column if not exists "paidAt" timestamptz;
alter table transactions add column if not exists "paymentChannel" text;
alter table transactions add column if not exists "paystackTransactionId" text;
alter table transactions add column if not exists "payoutStatus" text default 'pending';
alter table transactions add column if not exists "payoutAt" timestamptz;
alter table transactions add column if not exists "paystackTransferId" text;

create table if not exists notifications (
 id text primary key,
 "userId" text not null references users(id),
 title text not null, body text not null, type text not null default 'info',
 read boolean not null default false,
 "createdAt" timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications("userId","createdAt");
create index if not exists idx_transactions_active_listing on transactions("listingId") where status in ('pending','paid');
