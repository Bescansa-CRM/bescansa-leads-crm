-- Importación del histórico (Pipefy + Meta) y reparto de leads sin atender.
-- Solo el servidor (clave de servicio) puede importar; el reparto puede pedirlo un administrador.

-- Devuelve (o crea) campaña, conjunto y anuncio por nombre
create or replace function public.resolve_ad_source(p_platform text, p_campaign text, p_adset text, p_ad text,
  out o_campaign uuid, out o_adset uuid, out o_ad uuid)
language plpgsql security definer set search_path = public as $$
begin
  if nullif(btrim(p_campaign), '') is not null then
    insert into campaigns (platform, name) values (coalesce(p_platform, 'meta'), btrim(p_campaign))
      on conflict (platform, lower(name)) do update set name = campaigns.name
      returning id into o_campaign;
  end if;
  if nullif(btrim(p_adset), '') is not null then
    insert into adsets (campaign_id, name) values (o_campaign, btrim(p_adset))
      on conflict (coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
      do update set name = adsets.name
      returning id into o_adset;
  end if;
  if nullif(btrim(p_ad), '') is not null then
    insert into ads (adset_id, name) values (o_adset, btrim(p_ad))
      on conflict (coalesce(adset_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
      do update set name = ads.name
      returning id into o_ad;
  end if;
end $$;
revoke all on function public.resolve_ad_source(text, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_ad_source(text, text, text, text) to service_role;

-- Importa un lote de leads ya fusionados por scripts/import-preview.ts. Idempotente por (source, external_id).
-- Cada elemento: {source, externalId, createdAt, nombre, apellidos, email, telefono, etapa, prioridad, interes,
--                 etapaProyecto, terreno, motivoPerdida, campaign, adset, ad, tags[], stageHistory[{etapa,enteredAt}],
--                 notes[{at,text}], mergedFrom[], raw}
create or replace function public.import_leads(p_batch uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  h jsonb;
  n jsonb;
  v_lead uuid;
  v_camp uuid; v_set uuid; v_ad uuid;
  v_etapa text;
  v_closed timestamptz;
  v_first timestamptz;
  v_created int := 0;
  v_skipped int := 0;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    if exists (select 1 from leads where source = it->>'source' and external_id = it->>'externalId') then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select o_campaign, o_adset, o_ad into v_camp, v_set, v_ad
      from resolve_ad_source('meta', it->>'campaign', it->>'adset', it->>'ad');

    v_etapa := it->>'etapa';
    select min((x->>'enteredAt')::timestamptz) into v_closed
      from jsonb_array_elements(coalesce(it->'stageHistory', '[]'::jsonb)) x where x->>'etapa' = v_etapa;
    select min((x->>'enteredAt')::timestamptz) into v_first
      from jsonb_array_elements(coalesce(it->'stageHistory', '[]'::jsonb)) x where x->>'etapa' <> 'nuevo';

    insert into leads (
      created_at, source, external_id, nombre, apellidos, email, telefono, etapa, prioridad,
      interes, etapa_proyecto, terreno, motivo_perdida, campaign_id, adset_id, ad_id, tags, raw,
      first_contact_at, closed_at
    ) values (
      (it->>'createdAt')::timestamptz, it->>'source', it->>'externalId',
      coalesce(nullif(it->>'nombre', ''), 'Sin nombre'), nullif(it->>'apellidos', ''),
      nullif(lower(it->>'email'), ''), nullif(it->>'telefono', ''), v_etapa, coalesce(it->>'prioridad', 'normal'),
      nullif(it->>'interes', ''), nullif(it->>'etapaProyecto', ''), nullif(it->>'terreno', ''),
      nullif(it->>'motivoPerdida', ''), v_camp, v_set, v_ad,
      coalesce(array(select jsonb_array_elements_text(it->'tags')), '{}'),
      jsonb_build_object('importado', it->'raw', 'fusionados', it->'mergedFrom'),
      v_first,
      case when v_etapa in ('ganado', 'perdido') then coalesce(v_closed, (it->>'createdAt')::timestamptz) end
    ) returning id into v_lead;

    -- el disparador ya guardó la fase actual con la fecha de alta: se rehace con el historial real
    delete from lead_stage_history where lead_id = v_lead;
    for h in select * from jsonb_array_elements(coalesce(it->'stageHistory', '[]'::jsonb)) loop
      insert into lead_stage_history (lead_id, etapa, entered_at)
        values (v_lead, h->>'etapa', (h->>'enteredAt')::timestamptz) on conflict do nothing;
    end loop;
    insert into lead_stage_history (lead_id, etapa, entered_at)
      values (v_lead, v_etapa, coalesce(v_closed, (it->>'createdAt')::timestamptz)) on conflict do nothing;

    for n in select * from jsonb_array_elements(coalesce(it->'notes', '[]'::jsonb)) loop
      insert into lead_events (lead_id, created_at, tipo, detalle) values (v_lead, (n->>'at')::timestamptz, 'nota', n->>'text');
    end loop;
    insert into lead_events (lead_id, created_at, tipo, detalle, data)
      values (v_lead, now(), 'importacion', 'Importado desde ' || (it->>'source'),
              jsonb_build_object('batch', p_batch, 'fusionados', it->'mergedFrom'));

    -- los leads que nunca fueron atendidos y siguen abiertos llevan una tarea de contacto
    if v_etapa = 'nuevo' and coalesce(it->>'prioridad', '') = 'alta' then
      insert into tasks (lead_id, titulo, due_at) values (v_lead, 'Contactar: lead no atendido antes de la migración', now());
    end if;
    v_created := v_created + 1;
  end loop;
  return jsonb_build_object('created', v_created, 'skipped', v_skipped);
end $$;
revoke all on function public.import_leads(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_leads(uuid, jsonb) to service_role;

-- Reparte por turnos los leads sin responsable (los recientes primero) y sus tareas abiertas.
create or replace function public.distribute_unassigned(p_only_tag text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  l record;
  v_owner uuid;
  v_n integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'solo un administrador puede repartir leads' using errcode = '42501';
  end if;
  for l in
    select id from leads
     where owner_id is null and etapa not in ('ganado', 'perdido')
       and (p_only_tag is null or p_only_tag = any (tags))
     order by created_at desc
  loop
    select id into v_owner from profiles where active and accepts_leads
      order by (select count(*) from leads x where x.owner_id = profiles.id and x.etapa not in ('ganado', 'perdido')), last_assigned_at nulls first, created_at limit 1 for update;
    exit when v_owner is null;
    update profiles set last_assigned_at = clock_timestamp() where id = v_owner;
    update leads set owner_id = v_owner, assigned_at = now() where id = l.id;
    update tasks set owner_id = v_owner where lead_id = l.id and done_at is null and owner_id is null;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.distribute_unassigned(text) from public, anon;
grant execute on function public.distribute_unassigned(text) to authenticated, service_role;
