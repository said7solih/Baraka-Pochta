-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- =====================
-- TABLES
-- =====================

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  client_code text unique not null,
  address text,
  phone text,
  name text,
  extra_phone text,
  total_kg numeric(10,2),
  total_usd numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists parcels (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  supplier text,
  client_code text not null references clients(client_code) on update cascade,
  cargo_type text check (cargo_type in ('Pochta','Gabarit','Avia')),
  address text,
  weight_kg numeric(10,3),
  mesta int,
  amount_usd numeric(10,2),
  amount_sum numeric(15,2),
  phone text,
  name text,
  comment text,
  status text check (status in ('Omborda','Yetkazib berildi','Qaytib keldi','Olinmagan')) default 'Omborda',
  warehouse_status text,
  days_in_warehouse int,
  exchange_rate numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  category text not null check (category in ('Yuk','Ofis','Ishchilar','Xojaynlar','Marketing','IT','Moliyaviy','YetkazibBerish')),
  expense_item text,
  usd numeric(10,2),
  sum numeric(15,2),
  card_amount numeric(10,2),
  total_usd numeric(10,2),
  total_sum numeric(15,2),
  comment text,
  exchange_rate numeric(10,2),
  employee_name text,
  created_at timestamptz default now()
);

create table if not exists balance (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  total_balance_usd numeric(10,2),
  usd numeric(10,2),
  sum numeric(15,2),
  card numeric(10,2),
  fact_usd numeric(10,2),
  fact_sum numeric(15,2),
  fact_card numeric(10,2),
  diff_usd numeric(10,2),
  diff_sum numeric(15,2),
  diff_card numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists daily_finance (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  income_usd numeric(10,2),
  income_sum numeric(15,2),
  income_card numeric(10,2),
  expense_usd numeric(10,2),
  expense_sum numeric(15,2),
  expense_card numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists exchange_rates (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  usd_rate_expense numeric(10,2),
  cny_rate numeric(10,4),
  usd_rate_income numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','employee','client')),
  client_code text references clients(client_code) on update cascade,
  created_at timestamptz default now(),
  unique(user_id)
);

-- =====================
-- INDEXES
-- =====================
create index if not exists parcels_client_code_idx on parcels(client_code);
create index if not exists parcels_date_idx on parcels(date desc);
create index if not exists parcels_status_idx on parcels(status);
create index if not exists expenses_date_idx on expenses(date desc);
create index if not exists expenses_category_idx on expenses(category);
create index if not exists user_roles_user_id_idx on user_roles(user_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table clients enable row level security;
alter table parcels enable row level security;
alter table employees enable row level security;
alter table expenses enable row level security;
alter table balance enable row level security;
alter table daily_finance enable row level security;
alter table exchange_rates enable row level security;
alter table user_roles enable row level security;

-- Helper function: get current user role
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid() limit 1;
$$;

-- Helper function: get current user client_code
create or replace function get_my_client_code()
returns text language sql security definer stable as $$
  select client_code from user_roles where user_id = auth.uid() limit 1;
$$;

-- user_roles: users can read their own row; owner can read all
create policy "user_roles_select_own" on user_roles for select
  using (user_id = auth.uid() or get_my_role() = 'owner');

create policy "user_roles_insert_own" on user_roles for insert
  with check (user_id = auth.uid());

create policy "user_roles_update_owner" on user_roles for update
  using (get_my_role() = 'owner');

-- clients: owner + employee read all; client reads own row only
create policy "clients_owner_employee_select" on clients for select
  using (get_my_role() in ('owner','employee') or client_code = get_my_client_code());

create policy "clients_owner_write" on clients for all
  using (get_my_role() = 'owner');

-- parcels: owner + employee see all; client sees only own client_code
create policy "parcels_staff_select" on parcels for select
  using (
    get_my_role() in ('owner','employee') or
    (get_my_role() = 'client' and client_code = get_my_client_code())
  );

create policy "parcels_staff_write" on parcels for insert
  with check (get_my_role() in ('owner','employee'));

create policy "parcels_staff_update" on parcels for update
  using (get_my_role() in ('owner','employee'));

create policy "parcels_owner_delete" on parcels for delete
  using (get_my_role() = 'owner');

-- employees: owner + employee read; only owner writes
create policy "employees_read" on employees for select
  using (get_my_role() in ('owner','employee'));

create policy "employees_owner_write" on employees for all
  using (get_my_role() = 'owner');

-- expenses: ONLY owner
create policy "expenses_owner_only" on expenses for all
  using (get_my_role() = 'owner');

-- balance: ONLY owner
create policy "balance_owner_only" on balance for all
  using (get_my_role() = 'owner');

-- daily_finance: ONLY owner
create policy "daily_finance_owner_only" on daily_finance for all
  using (get_my_role() = 'owner');

-- exchange_rates: owner + employee read; owner writes
create policy "exchange_rates_read" on exchange_rates for select
  using (get_my_role() in ('owner','employee'));

create policy "exchange_rates_owner_write" on exchange_rates for all
  using (get_my_role() = 'owner');
