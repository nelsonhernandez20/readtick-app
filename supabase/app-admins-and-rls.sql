-- Ejecutar en Supabase → SQL Editor → Run
-- Crea app_admins, función is_app_admin() y políticas seguras en reportes_pago

create table if not exists public.app_admins (
  email text primary key
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins a
    where lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

-- === reportes_pago (CRÍTICO: pagos y comprobantes) ===
alter table public.reportes_pago enable row level security;

alter table public.reportes_pago drop constraint if exists reportes_pago_status_check;
alter table public.reportes_pago add constraint reportes_pago_status_check
  check (status in ('pendiente', 'confirmado', 'aprobado', 'rechazado'));

-- Políticas viejas / peligrosas (las que ves hoy en el panel)
drop policy if exists "Permitir actualizar reportes" on public.reportes_pago;
drop policy if exists "Permitir consultar reportes a todos" on public.reportes_pago;
drop policy if exists "Cualquiera puede enviar reportes de pago" on public.reportes_pago;
drop policy if exists "Lectura de reportes para usuarios autenticados" on public.reportes_pago;
drop policy if exists "Admin lee reportes" on public.reportes_pago;
drop policy if exists "Admin actualiza reportes" on public.reportes_pago;
drop policy if exists "Usuario lee sus reportes" on public.reportes_pago;
drop policy if exists "Usuario inserta su reporte" on public.reportes_pago;

-- Mismo flujo que app/pagos: insert con email de sesión y status pendiente (no auto-confirmar PRO)
create policy "Usuario inserta su reporte"
  on public.reportes_pago for insert to authenticated
  with check (
    lower(coalesce(sender_user, user_identifier, '')) = lower(coalesce(auth.jwt()->>'email', ''))
    and coalesce(status, 'pendiente') = 'pendiente'
  );

create policy "Usuario lee sus reportes"
  on public.reportes_pago for select to authenticated
  using (
    lower(coalesce(sender_user, user_identifier, '')) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "Admin lee reportes"
  on public.reportes_pago for select to authenticated
  using (public.is_app_admin());

create policy "Admin actualiza reportes"
  on public.reportes_pago for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

insert into public.app_admins (email) values
  ('elividabla1406@gmail.com'),
  ('nelsonhernandez335@gmail.com')
on conflict (email) do nothing;

-- === uso_diario_tts (cuota de voz por usuario) ===
alter table public.uso_diario_tts enable row level security;

drop policy if exists "Usuario lee su uso tts" on public.uso_diario_tts;
drop policy if exists "Usuario escribe su uso tts" on public.uso_diario_tts;

create policy "Usuario lee su uso tts"
  on public.uso_diario_tts for select to authenticated
  using (lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')));

create policy "Usuario escribe su uso tts"
  on public.uso_diario_tts for all to authenticated
  using (lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')))
  with check (lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')));

notify pgrst, 'reload schema';
