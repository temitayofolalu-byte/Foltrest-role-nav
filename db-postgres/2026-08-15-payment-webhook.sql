-- Foltrest payment safety: allow Paystack webhook-confirmed payments.
-- Run this in Supabase SQL Editor on an existing database.

alter table transactions drop constraint if exists transactions_status_check;
alter table transactions add constraint transactions_status_check
  check (status in ('pending', 'paid', 'completed', 'refunded'));

alter table transactions add column if not exists "paidAt" timestamptz;
alter table transactions add column if not exists "paymentChannel" text;
alter table transactions add column if not exists "paystackTransactionId" text;

create unique index if not exists ux_transactions_payment_ref
  on transactions("paymentRef") where "paymentRef" is not null;
