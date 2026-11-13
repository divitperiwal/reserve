create table users (
    id            bigserial primary key,
    role          varchar(16)  not null,
    name          varchar(120) not null,
    phone         varchar(10)  not null unique,
    password_hash varchar(100) not null,
    org_type      varchar(60),
    vehicle       varchar(60),
    address       text         not null,
    lat           double precision not null,
    lng           double precision not null,
    verified      boolean      not null default false,
    on_duty       boolean      not null default true,
    drop_ngo_id   bigint references users (id),
    rating        numeric(2, 1) not null default 4.8,
    created_at    timestamptz  not null default now()
);

create table donations (
    id            bigserial primary key,
    donor_id      bigint       not null references users (id),
    title         varchar(160) not null,
    diet          varchar(16)  not null,
    category      varchar(16)  not null,
    quantity      int          not null,
    unit          varchar(16)  not null,
    weight_kg     numeric(8, 2) not null,
    containers    int,
    photo_url     text,
    note          text,
    address       text         not null,
    lat           double precision not null,
    lng           double precision not null,
    prepared_at   timestamptz,
    best_before   timestamptz  not null,
    pickup_from   timestamptz  not null,
    pickup_until  timestamptz  not null,
    safety_checks text         not null,
    status        varchar(16)  not null,
    volunteer_id  bigint references users (id),
    ngo_id        bigint references users (id),
    pickup_code   char(4)      not null,
    drop_code     char(4)      not null,
    claimed_at    timestamptz,
    picked_up_at  timestamptz,
    delivered_at  timestamptz,
    cur_lat       double precision,
    cur_lng       double precision,
    loc_at        timestamptz,
    created_at    timestamptz  not null default now()
);

create index idx_donations_status_best_before on donations (status, best_before);
create index idx_donations_donor on donations (donor_id);
create index idx_donations_volunteer on donations (volunteer_id);
create index idx_donations_ngo on donations (ngo_id);
create index idx_donations_created on donations (created_at);

create table location_pings (
    id          bigserial primary key,
    donation_id bigint           not null references donations (id),
    lat         double precision not null,
    lng         double precision not null,
    recorded_at timestamptz      not null default now()
);

create index idx_location_pings_donation on location_pings (donation_id, recorded_at);

create table activities (
    id          bigserial primary key,
    type        varchar(16) not null,
    actor_id    bigint references users (id),
    donation_id bigint      not null references donations (id),
    created_at  timestamptz not null default now()
);

create index idx_activities_created on activities (created_at desc);

create table otp_codes (
    phone      varchar(10) primary key,
    code       varchar(6)  not null,
    expires_at timestamptz not null
);
