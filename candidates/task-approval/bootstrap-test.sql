-- Synthetic CI database only. Never run against a hosted Supabase database.
create role anon nologin;
create role authenticated nologin;
create role authenticator login password 'synthetic-ci-password' noinherit;
grant anon, authenticated to authenticator;
create schema auth;
create table auth.users(id uuid primary key, email text not null);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
insert into auth.users values ('11111111-1111-4111-8111-111111111111','owner@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','stranger@example.invalid');
