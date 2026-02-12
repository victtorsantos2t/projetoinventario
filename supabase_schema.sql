-- Habilita UUID extension
create extension if not exists "uuid-ossp";

-- Tabela Profiles (Usuarios)
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  updated_at timestamp with time zone,
  constraint username_length check (char_length(full_name) >= 3)
);

-- Tabela Ativos
create table public.ativos (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  tipo text not null,
  serial text unique not null,
  status text not null default 'Disponível',
  dono_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela Movimentações
create table public.movimentacoes (
  id uuid default uuid_generate_v4() primary key,
  ativo_id uuid references public.ativos(id) on delete cascade not null,
  usuario_id uuid references public.profiles(id) not null,
  tipo_movimentacao text not null,
  data_movimentacao timestamp with time zone default timezone('utc'::text, now()) not null,
  observacao text
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.ativos enable row level security;
alter table public.movimentacoes enable row level security;

-- Policies

-- Profiles: Todos podem ver perfis, apenas o dono pode editar o seu (ou admin)
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Ativos: Apenas autenticados podem ver.
create policy "Authenticated users can view assets." on public.ativos for select using (auth.role() = 'authenticated');

-- Política para inserção/atualização de ativos
create policy "Authenticated users can insert assets." on public.ativos for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update assets." on public.ativos for update using (auth.role() = 'authenticated');

-- Apenas Admin pode deletar
create policy "Only admins can delete assets." on public.ativos for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_ativos_updated_at before update on public.ativos
for each row execute procedure update_updated_at_column();

-- Trigger para criar entry em public.profiles quando usuário é criado em auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
