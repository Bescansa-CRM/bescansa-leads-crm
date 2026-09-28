-- Seguridad: RLS en todas las tablas. El equipo (3-4 personas) ve todos los leads; solo los administradores
-- gestionan usuarios, ajustes, gasto e importaciones. Las escrituras del servidor usan la clave de servicio.

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin');
$$;

revoke all on function public.is_active_user(), public.is_admin() from public, anon;
grant execute on function public.is_active_user(), public.is_admin() to authenticated, service_role;

-- Nada para anon
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.adsets enable row level security;
alter table public.ads enable row level security;
alter table public.leads enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.lead_events enable row level security;
alter table public.tasks enable row level security;
alter table public.ad_spend enable row level security;
alter table public.app_settings enable row level security;
alter table public.import_batches enable row level security;
alter table public.notifications_log enable row level security;

-- Grants mínimos para el rol authenticated (las políticas filtran)
grant select on public.profiles, public.campaigns, public.adsets, public.ads, public.lead_stage_history,
  public.app_settings to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant update (role, active, accepts_leads, full_name) on public.profiles to authenticated;
grant select, insert, update on public.leads to authenticated;
grant delete on public.leads to authenticated;
grant select, insert on public.lead_events to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update, delete on public.ad_spend to authenticated;
grant insert, update, delete on public.campaigns, public.adsets, public.ads to authenticated;
grant insert, update on public.app_settings to authenticated;
grant select on public.import_batches, public.notifications_log to authenticated;
grant usage on all sequences in schema public to authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (public.is_active_user());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid())
              and active = (select active from public.profiles where id = auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- catálogo publicitario: lectura para el equipo, escritura para administración
create policy campaigns_select on public.campaigns for select to authenticated using (public.is_active_user());
create policy campaigns_write on public.campaigns for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy adsets_select on public.adsets for select to authenticated using (public.is_active_user());
create policy adsets_write on public.adsets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ads_select on public.ads for select to authenticated using (public.is_active_user());
create policy ads_write on public.ads for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- leads: el equipo activo trabaja con todos; solo admin borra
create policy leads_select on public.leads for select to authenticated using (public.is_active_user());
create policy leads_insert on public.leads for insert to authenticated with check (public.is_active_user());
create policy leads_update on public.leads for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy leads_delete on public.leads for delete to authenticated using (public.is_admin());

create policy stage_history_select on public.lead_stage_history for select to authenticated using (public.is_active_user());

-- eventos: solo lectura e inserción; el autor no se puede falsificar
create policy events_select on public.lead_events for select to authenticated using (public.is_active_user());
create policy events_insert on public.lead_events for insert to authenticated
  with check (public.is_active_user() and (author_id is null or author_id = auth.uid()));

create policy tasks_select on public.tasks for select to authenticated using (public.is_active_user());
create policy tasks_insert on public.tasks for insert to authenticated with check (public.is_active_user());
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

create policy spend_all on public.ad_spend for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy spend_select on public.ad_spend for select to authenticated using (public.is_active_user());

create policy settings_select on public.app_settings for select to authenticated using (public.is_active_user());
create policy settings_write on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy batches_select on public.import_batches for select to authenticated using (public.is_admin());
create policy notif_select on public.notifications_log for select to authenticated using (public.is_admin());
