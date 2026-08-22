-- EncryptedCheckout panel — Supabase migration
-- Run once in your Supabase SQL editor (Dashboard → SQL Editor)

-- ── Users ──────────────────────────────────────────────────────────────────
create table if not exists web_users (
  id            bigserial primary key,
  username      text unique not null,
  password_hash text not null,
  salt          text,
  created_at    timestamptz default now()
);

-- ── Credentials (MP accounts / slots) ─────────────────────────────────────
create table if not exists web_credentials (
  id              bigserial primary key,
  slot            integer unique not null,
  name            text not null,
  mp_user_id      text,
  access_token    text not null,           -- AES-GCM encrypted
  connected       boolean default true,
  is_active       boolean default false,
  health_status   text default 'ok',       -- ok | warn | error | banned
  health_message  text,
  last_test_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Sales ──────────────────────────────────────────────────────────────────
create table if not exists web_sales (
  id                  bigserial primary key,
  external_reference  text unique not null,
  mp_payment_id       text,
  mp_preference_id    text,
  slot                integer not null,
  slot_name           text,
  title               text,
  amount              numeric(12,2) not null,
  status              text not null default 'gerado',
  status_detail       text,
  payment_type_id     text,
  payment_method_id   text,
  payer_email         text,
  link                text,
  installments        integer,
  fee_amount          numeric(12,2),
  net_amount          numeric(12,2),
  rejection_count     integer default 0,
  auto_cancelled      boolean default false,
  notified            boolean default false,
  approved_at         timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── Settings (key/value store) ─────────────────────────────────────────────
create table if not exists web_settings (
  id          bigserial primary key,
  key         text unique not null,
  value       text not null,
  updated_at  timestamptz default now()
);

-- Default settings
insert into web_settings (key, value) values
  ('default_title',            'Pagamento'),
  ('auto_cancel_enabled',      'false'),
  ('max_rejections_per_link',  '3'),
  ('cancel_after_minutes',     '60')
on conflict (key) do nothing;

-- ── Logs ───────────────────────────────────────────────────────────────────
create table if not exists web_logs (
  id          bigserial primary key,
  type        text not null default 'info',  -- info | success | warn | error
  description text not null,
  slot        integer,
  slot_name   text,
  reference   text,
  amount      numeric(12,2),
  created_at  timestamptz default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_web_sales_status        on web_sales(status);
create index if not exists idx_web_sales_slot          on web_sales(slot);
create index if not exists idx_web_sales_created_at    on web_sales(created_at desc);
create index if not exists idx_web_logs_created_at     on web_logs(created_at desc);
create index if not exists idx_web_credentials_slot    on web_credentials(slot);

-- ── First admin user ───────────────────────────────────────────────────────
-- DEFAULT PASSWORD: Encrypted@2025  — CHANGE BEFORE INSERTING
-- To regenerate the hash with your own password:
--   node -e "const b=require('bcryptjs'); console.log(b.hashSync('YOUR_PASS', 12))"
--
-- INSERT INTO web_users (username, password_hash)
-- VALUES ('admin', '$2b$12$AMm3szeyhEcY0vyNTtyKHut2smFS2niSVhPDon8HD3ltdTFnSNCuG');
