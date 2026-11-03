-- Repasses e saldo dos usuários — rodar uma vez no Supabase (Dashboard → SQL Editor)

create table if not exists web_payouts (
  id            bigserial primary key,
  username      text not null,
  amount        numeric(12,2) not null,
  entries_count integer not null,
  pix_key       text,
  paid_by       text,
  created_at    timestamptz default now(),
  undone_at     timestamptz
);

-- Uma linha por venda ou estorno. Saldo = soma de user_share sem payout_id e sem settled.
create table if not exists web_ledger (
  id                 bigserial primary key,
  mp_payment_id      text not null,
  entry_key          text not null,               -- 'sale' ou 'adj:{cents}:{cents}'
  username           text not null,
  external_reference text,
  slot               integer,
  slot_name          text,
  title              text,
  kind               text not null check (kind in ('sale', 'reversal')),
  gross              numeric(12,2) not null,      -- negativo no estorno
  percent            numeric(5,2),                -- % do usuário gravada na venda; null = ainda sem %
  user_share         numeric(12,2) not null default 0,
  settled            boolean not null default false, -- venda de antes do painel: só entra nos gráficos
  occurred_at        timestamptz not null,
  payout_id          bigint references web_payouts(id),
  created_at         timestamptz default now(),
  unique (mp_payment_id, entry_key)
);

create index if not exists idx_web_ledger_occurred on web_ledger(occurred_at desc);
create index if not exists idx_web_ledger_user     on web_ledger(username, occurred_at desc);
create index if not exists idx_web_ledger_open     on web_ledger(username) where payout_id is null and settled = false;
create index if not exists idx_web_payouts_user    on web_payouts(username, created_at desc);

-- Só o servidor (service role) acessa.
alter table web_ledger  enable row level security;
alter table web_payouts enable row level security;

-- Marca como pago tudo o que estava na tela: venda que entrar depois fica para o próximo saldo.
create or replace function ec_pay_user(
  p_username text, p_max_id bigint, p_expected numeric, p_pix_key text, p_paid_by text
) returns web_payouts language plpgsql as $$
declare
  v_total   numeric(12,2);
  v_count   integer;
  v_missing integer;
  v_payout  web_payouts;
begin
  perform pg_advisory_xact_lock(hashtext('ec_payout:' || p_username));

  select coalesce(sum(user_share), 0), count(*), count(*) filter (where percent is null)
    into v_total, v_count, v_missing
    from web_ledger
   where username = p_username and payout_id is null and settled = false and id <= p_max_id;

  if v_missing > 0 then raise exception 'sem_percentual'; end if;
  if v_total <= 0 then raise exception 'sem_saldo'; end if;
  if v_total <> p_expected then raise exception 'saldo_mudou'; end if;

  insert into web_payouts (username, amount, entries_count, pix_key, paid_by)
  values (p_username, v_total, v_count, p_pix_key, p_paid_by)
  returning * into v_payout;

  update web_ledger set payout_id = v_payout.id
   where username = p_username and payout_id is null and settled = false and id <= p_max_id;

  return v_payout;
end $$;

-- Devolve as vendas do pagamento para o saldo.
create or replace function ec_undo_payout(p_id bigint) returns web_payouts language plpgsql as $$
declare
  v_payout web_payouts;
begin
  update web_payouts set undone_at = now()
   where id = p_id and undone_at is null
  returning * into v_payout;

  if v_payout.id is null then raise exception 'pagamento_invalido'; end if;

  update web_ledger set payout_id = null where payout_id = p_id;
  return v_payout;
end $$;

-- Aplica a % às vendas que entraram antes de ela ser configurada.
create or replace function ec_fill_percent(p_username text, p_percent numeric) returns void language sql as $$
  update web_ledger
     set percent = p_percent, user_share = round(gross * p_percent / 100, 2)
   where username = p_username and percent is null and payout_id is null;
$$;

revoke all on function ec_pay_user(text, bigint, numeric, text, text) from public, anon, authenticated;
revoke all on function ec_undo_payout(bigint)                         from public, anon, authenticated;
revoke all on function ec_fill_percent(text, numeric)                 from public, anon, authenticated;
