-- CRM de leads · Estudio Bescansa · esquema base (v1)
-- Migración hacia adelante: no editar una vez aplicada; los cambios van en migraciones nuevas.

-- ── Utilidades ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Usuarios ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'ventas' check (role in ('admin', 'ventas')),
  active boolean not null default true,
  accepts_leads boolean not null default true,
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Origen publicitario ───────────────────────────────────────────────────────
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'meta' check (platform in ('meta', 'google', 'landing', 'otro')),
  external_id text,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index campaigns_platform_name on public.campaigns (platform, lower(name));
create unique index campaigns_platform_ext on public.campaigns (platform, external_id) where external_id is not null;

create table public.adsets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  external_id text,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index adsets_campaign_name on public.adsets (coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  adset_id uuid references public.adsets(id) on delete set null,
  external_id text,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index ads_adset_name on public.ads (coalesce(adset_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ── Leads ─────────────────────────────────────────────────────────────────────
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  source text not null check (source in ('meta_form', 'landing', 'google_form', 'manual', 'import_pipefy', 'import_meta')),
  external_id text,

  nombre text not null,
  apellidos text,
  email text,
  telefono text,
  municipio text,
  provincia text,

  etapa text not null default 'nuevo'
    check (etapa in ('nuevo', 'contactado', 'calificado', 'visita', 'propuesta', 'negociacion', 'ganado', 'perdido')),
  prioridad text not null default 'normal' check (prioridad in ('alta', 'normal', 'baja')),
  owner_id uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,

  interes text check (interes in ('casa_modular', 'reforma', 'terreno', 'otro')),
  etapa_proyecto text check (etapa_proyecto in
    ('solicita_informacion', 'solo_informacion', 'tiene_terreno', 'explorando', 'tiene_proyecto', 'listo_para_empezar')),
  terreno text check (terreno in ('propio', 'reservado', 'buscando', 'sin_terreno')),
  superficie_rango text,
  presupuesto_rango text,
  plazo text,
  financiacion text,
  perfil jsonb not null default '{}'::jsonb,          -- buyer persona: edad_rango, hogar, motivo, situación de vivienda…

  valor_estimado numeric(12, 2),
  valor_final numeric(12, 2),
  motivo_perdida text check (motivo_perdida in
    ('sin_respuesta', 'precio', 'sin_terreno', 'no_es_su_perfil', 'compro_a_otro', 'reforma', 'ya_no_le_interesa', 'duplicado', 'otro')),

  first_contact_at timestamptz,
  contact_attempts integer not null default 0,
  next_action_at timestamptz,
  closed_at timestamptz,

  campaign_id uuid references public.campaigns(id) on delete set null,
  adset_id uuid references public.adsets(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  fbclid text, gclid text, meta_lead_id text,
  landing_url text, referrer text,

  consent_text text,
  consent_at timestamptz,
  consent_version text,
  consent_whatsapp boolean not null default false,

  tags text[] not null default '{}',
  duplicate_of uuid references public.leads(id) on delete set null,
  raw jsonb,

  constraint leads_perdido_requiere_motivo check (etapa <> 'perdido' or motivo_perdida is not null),
  constraint leads_contacto_minimo check (email is not null or telefono is not null or source in ('import_pipefy', 'manual'))
);
create trigger leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

create unique index leads_source_external on public.leads (source, external_id);  -- los NULL no chocan entre sí
create index leads_email_idx on public.leads (lower(email)) where email is not null;
create index leads_telefono_idx on public.leads (telefono) where telefono is not null;
create index leads_etapa_idx on public.leads (etapa, created_at desc);
create index leads_owner_idx on public.leads (owner_id) where owner_id is not null;
create index leads_ad_idx on public.leads (ad_id);
create index leads_campaign_idx on public.leads (campaign_id);
create index leads_next_action_idx on public.leads (next_action_at) where next_action_at is not null;

-- Historial de fases (para embudos y tiempos)
create table public.lead_stage_history (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  etapa text not null,
  entered_at timestamptz not null default now(),
  changed_by uuid references public.profiles(id) on delete set null
);
create index lead_stage_history_lead on public.lead_stage_history (lead_id, entered_at);
create unique index lead_stage_history_once on public.lead_stage_history (lead_id, etapa);

-- Actividad (append-only)
create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  author_id uuid references public.profiles(id) on delete set null,
  tipo text not null check (tipo in
    ('nota', 'llamada', 'email', 'whatsapp', 'visita', 'cambio_etapa', 'asignacion', 'reingreso', 'importacion', 'sistema')),
  contacto_efectivo boolean,                                 -- para llamadas/mensajes: ¿hubo respuesta?
  detalle text,
  data jsonb not null default '{}'::jsonb
);
create index lead_events_lead on public.lead_events (lead_id, created_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  titulo text not null,
  due_at timestamptz,
  done_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index tasks_open on public.tasks (owner_id, due_at) where done_at is null;
create index tasks_lead on public.tasks (lead_id);

-- Gasto publicitario (carga manual/CSV) para coste por lead y por venta
create table public.ad_spend (
  id bigint generated always as identity primary key,
  day date not null,
  platform text not null check (platform in ('meta', 'google', 'otro')),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  adset_id uuid references public.adsets(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete cascade,
  spend numeric(12, 2) not null check (spend >= 0),
  impressions integer,
  clicks integer,
  leads_reported integer,
  created_at timestamptz not null default now()
);
create unique index ad_spend_unique on public.ad_spend (day, platform, campaign_id, adset_id, ad_id) nulls not distinct;

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  filename text,
  stats jsonb not null default '{}'::jsonb,
  reverted_at timestamptz
);

create table public.notifications_log (
  id bigint generated always as identity primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  tipo text not null,
  to_email text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'error')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_lead on public.notifications_log (lead_id, tipo);

insert into public.app_settings (key, value) values
  ('horario', '{"dias":[1,2,3,4,5],"desde":"09:00","hasta":"19:00","zona":"Europe/Madrid"}'),
  ('alertas', '{"minutos_sin_contactar":30,"minutos_escalado":120,"emails_admin":[]}');

-- ── Triggers de negocio ───────────────────────────────────────────────────────
-- Historial de fases y fechas de cierre
create or replace function public.leads_track_stage() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into lead_stage_history (lead_id, etapa, entered_at)
      values (new.id, new.etapa, new.created_at) on conflict do nothing;
  elsif new.etapa is distinct from old.etapa then
    insert into lead_stage_history (lead_id, etapa, changed_by)
      values (new.id, new.etapa, auth.uid()) on conflict do nothing;
    insert into lead_events (lead_id, author_id, tipo, detalle, data)
      values (new.id, auth.uid(), 'cambio_etapa', old.etapa || ' → ' || new.etapa,
              jsonb_build_object('de', old.etapa, 'a', new.etapa));
    if new.etapa in ('ganado', 'perdido') then
      new.closed_at := coalesce(new.closed_at, now());
    else
      new.closed_at := null;
    end if;
  end if;
  return new;
end $$;

create trigger leads_stage_after after insert on public.leads
  for each row execute function public.leads_track_stage();
create trigger leads_stage_before before update of etapa on public.leads
  for each row execute function public.leads_track_stage();

-- Un contacto (llamada, email, whatsapp, visita) registra el primer contacto y cuenta intentos
create or replace function public.lead_events_track_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tipo in ('llamada', 'email', 'whatsapp', 'visita') then
    update leads
       set contact_attempts = contact_attempts + 1,
           first_contact_at = coalesce(first_contact_at, case when coalesce(new.contacto_efectivo, true) then new.created_at end)
     where id = new.lead_id;
  end if;
  return new;
end $$;
create trigger lead_events_contact after insert on public.lead_events
  for each row execute function public.lead_events_track_contact();

-- ── Alta de leads (llamada solo desde el servidor con la clave de servicio) ───
-- Recibe el lead ya normalizado (teléfono E.164, email en minúsculas) y hace, de forma atómica:
-- deduplicar → crear o registrar reingreso → asignar por turnos → crear tarea de contacto.
create or replace function public.ingest_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := nullif(lower(btrim(p->>'email')), '');
  v_tel text := nullif(btrim(p->>'telefono'), '');
  v_source text := coalesce(p->>'source', 'manual');
  v_ext text := nullif(p->>'external_id', '');
  v_existing uuid;
  v_lead uuid;
  v_owner uuid;
  v_campaign uuid;
  v_adset uuid;
  v_ad uuid;
begin
  if v_email is null and v_tel is null then
    raise exception 'lead sin email ni teléfono' using errcode = '22023';
  end if;

  -- idempotencia por id externo
  if v_ext is not null then
    select id into v_existing from leads where source = v_source and external_id = v_ext;
    if found then
      return jsonb_build_object('lead_id', v_existing, 'created', false, 'duplicate', false, 'reason', 'external_id');
    end if;
  end if;

  -- duplicado por teléfono o email
  select id into v_existing from leads
   where (v_tel is not null and telefono = v_tel) or (v_email is not null and lower(email) = v_email)
   order by created_at limit 1;
  if found then
    insert into lead_events (lead_id, tipo, detalle, data)
      values (v_existing, 'reingreso', 'El contacto volvió a enviar el formulario',
              jsonb_build_object('source', v_source, 'external_id', v_ext, 'payload', p));
    update leads set next_action_at = least(coalesce(next_action_at, now()), now())
     where id = v_existing and etapa not in ('ganado', 'perdido');
    return jsonb_build_object('lead_id', v_existing, 'created', false, 'duplicate', true, 'reason', 'contacto');
  end if;

  -- origen publicitario
  if nullif(p->>'campaign', '') is not null then
    insert into campaigns (platform, name, external_id)
      values (coalesce(p->>'platform', 'meta'), p->>'campaign', nullif(p->>'campaign_id', ''))
      on conflict (platform, lower(name)) do update set name = excluded.name
      returning id into v_campaign;
  end if;
  if nullif(p->>'adset', '') is not null then
    insert into adsets (campaign_id, name, external_id)
      values (v_campaign, p->>'adset', nullif(p->>'adset_id', ''))
      on conflict (coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
      do update set name = excluded.name
      returning id into v_adset;
  end if;
  if nullif(p->>'ad', '') is not null then
    insert into ads (adset_id, name, external_id)
      values (v_adset, p->>'ad', nullif(p->>'ad_id', ''))
      on conflict (coalesce(adset_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
      do update set name = excluded.name
      returning id into v_ad;
  end if;

  -- asignación por turnos: el que hace más tiempo que no recibe un lead
  select id into v_owner from profiles
   where active and accepts_leads
   order by (select count(*) from leads x where x.owner_id = profiles.id and x.etapa not in ('ganado', 'perdido')), last_assigned_at nulls first, created_at
   limit 1 for update skip locked;
  if v_owner is not null then
    update profiles set last_assigned_at = now() where id = v_owner;
  end if;

  insert into leads (
    source, external_id, nombre, apellidos, email, telefono, municipio, provincia,
    interes, etapa_proyecto, terreno, superficie_rango, presupuesto_rango, plazo, financiacion, perfil,
    owner_id, assigned_at, campaign_id, adset_id, ad_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, meta_lead_id,
    landing_url, referrer, consent_text, consent_at, consent_version, consent_whatsapp, tags, raw
  ) values (
    v_source, v_ext, coalesce(nullif(btrim(p->>'nombre'), ''), 'Sin nombre'), nullif(btrim(p->>'apellidos'), ''),
    v_email, v_tel, nullif(p->>'municipio', ''), nullif(p->>'provincia', ''),
    nullif(p->>'interes', ''), nullif(p->>'etapa_proyecto', ''), nullif(p->>'terreno', ''),
    nullif(p->>'superficie_rango', ''), nullif(p->>'presupuesto_rango', ''), nullif(p->>'plazo', ''),
    nullif(p->>'financiacion', ''), coalesce(p->'perfil', '{}'::jsonb),
    v_owner, case when v_owner is not null then now() end, v_campaign, v_adset, v_ad,
    nullif(p->>'utm_source', ''), nullif(p->>'utm_medium', ''), nullif(p->>'utm_campaign', ''),
    nullif(p->>'utm_content', ''), nullif(p->>'utm_term', ''), nullif(p->>'fbclid', ''), nullif(p->>'gclid', ''),
    nullif(p->>'meta_lead_id', ''), nullif(p->>'landing_url', ''), nullif(p->>'referrer', ''),
    nullif(p->>'consent_text', ''), (nullif(p->>'consent_at', ''))::timestamptz, nullif(p->>'consent_version', ''),
    coalesce((p->>'consent_whatsapp')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(p->'tags')), '{}'), p
  ) returning id into v_lead;

  insert into tasks (lead_id, owner_id, titulo, due_at)
    values (v_lead, v_owner, 'Contactar al lead nuevo', now() + interval '30 minutes');
  insert into lead_events (lead_id, tipo, detalle, data)
    values (v_lead, 'sistema', 'Lead recibido por ' || v_source, jsonb_build_object('owner_id', v_owner));

  return jsonb_build_object('lead_id', v_lead, 'created', true, 'duplicate', false, 'owner_id', v_owner);
end $$;

revoke all on function public.ingest_lead(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_lead(jsonb) to service_role;
