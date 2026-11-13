alter table donations add column version bigint not null default 0;
create index idx_donations_status_pickup_until on donations (status, pickup_until);
create index idx_donations_status_claimed_at on donations (status, claimed_at);
