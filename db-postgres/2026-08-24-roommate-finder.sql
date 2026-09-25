-- Foltrest migration: Roommate Finder feature.
-- Safe to run on your existing database -- adds one new table only.

create table if not exists "roommatePosts" (
  id text primary key,
  "posterId" text not null references users(id),
  title text not null,
  description text,
  location text not null,
  "rentShare" numeric,
  "moveInDate" date,
  "genderPreference" text not null default 'any' check ("genderPreference" in ('any', 'male', 'female')),
  photos jsonb default '[]',
  status text not null default 'open' check (status in ('open', 'closed')),
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_roommate_posts_status on "roommatePosts"(status);
create index if not exists idx_roommate_posts_poster on "roommatePosts"("posterId");
