create table push_subscriptions (
    id bigserial primary key,
    user_id bigint not null references users(id),
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);
