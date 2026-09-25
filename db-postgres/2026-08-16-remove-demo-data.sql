-- Foltrest: remove old demo/seed data from your LIVE database.
-- Only removes rows tied to the 4 known demo accounts and their
-- listings — safe to run even if you've already started using the
-- app for real, since it won't touch anything else.
--
-- Run this in Supabase SQL Editor, once.

do $$
declare
  demo_emails text[] := array['admin@foltrest.com','tunde@foltrest.com','ngozi@foltrest.com','chidinma@foltrest.com'];
  demo_user_ids text[];
  demo_listing_ids text[];
begin
  select array_agg(id) into demo_user_ids from users where email = any(demo_emails);

  if demo_user_ids is null then
    raise notice 'No demo accounts found — nothing to remove.';
    return;
  end if;

  select array_agg(id) into demo_listing_ids from listings where "agentId" = any(demo_user_ids);

  -- Delete child records first (foreign key order), then the listings, then the users.
  delete from reports where "listingId" = any(demo_listing_ids) or "reporterId" = any(demo_user_ids) or "agentId" = any(demo_user_ids);
  delete from "siteReviews" where "userId" = any(demo_user_ids);
  delete from reviews where "listingId" = any(demo_listing_ids) or "agentId" = any(demo_user_ids) or "renterId" = any(demo_user_ids);
  delete from messages where "listingId" = any(demo_listing_ids) or "senderId" = any(demo_user_ids) or "receiverId" = any(demo_user_ids);
  delete from transactions where "listingId" = any(demo_listing_ids) or "renterId" = any(demo_user_ids);
  delete from listings where id = any(demo_listing_ids);
  delete from users where id = any(demo_user_ids);

  raise notice 'Removed % demo account(s) and their related data.', array_length(demo_user_ids, 1);
end $$;
