-- Alertas de leads sin contactar. Devuelve los leads "nuevos" sin ningún contacto que ya superaron el plazo
-- y todavía no se han avisado (cada aviso queda registrado en notifications_log para no repetirlo).

create or replace function public.pending_sla_alerts(p_min_reminder integer, p_min_escalate integer)
returns table (lead_id uuid, age_minutes integer, owner_id uuid, owner_email text, send_reminder boolean, send_escalation boolean)
language sql stable security definer set search_path = public as $$
  select l.id,
         floor(extract(epoch from (now() - l.created_at)) / 60)::integer,
         l.owner_id,
         p.email,
         (now() - l.created_at) >= make_interval(mins => p_min_reminder)
           and not exists (select 1 from notifications_log n where n.lead_id = l.id and n.tipo = 'sla_recordatorio'),
         (now() - l.created_at) >= make_interval(mins => p_min_escalate)
           and not exists (select 1 from notifications_log n where n.lead_id = l.id and n.tipo = 'sla_escalado')
    from leads l
    left join profiles p on p.id = l.owner_id and p.active
   where l.etapa = 'nuevo'
     and l.first_contact_at is null
     and l.created_at > now() - interval '14 days'   -- no reavisar de leads antiguos (p. ej. los importados)
     and (
       ((now() - l.created_at) >= make_interval(mins => p_min_reminder)
         and not exists (select 1 from notifications_log n where n.lead_id = l.id and n.tipo = 'sla_recordatorio'))
       or
       ((now() - l.created_at) >= make_interval(mins => p_min_escalate)
         and not exists (select 1 from notifications_log n where n.lead_id = l.id and n.tipo = 'sla_escalado'))
     )
   order by l.created_at;
$$;

revoke all on function public.pending_sla_alerts(integer, integer) from public, anon, authenticated;
grant execute on function public.pending_sla_alerts(integer, integer) to service_role;

-- Leads sin contactar para el resumen diario (incluye los importados: ese es justo su objetivo)
create or replace function public.unattended_leads(p_limit integer default 200)
returns table (lead_id uuid, nombre text, apellidos text, telefono text, email text, hours_waiting numeric)
language sql stable security definer set search_path = public as $$
  select l.id, l.nombre, l.apellidos, l.telefono, l.email,
         round(extract(epoch from (now() - l.created_at)) / 3600.0, 1)
    from leads l
   where l.etapa = 'nuevo' and l.first_contact_at is null
   order by l.created_at
   limit p_limit;
$$;
revoke all on function public.unattended_leads(integer) from public, anon, authenticated;
grant execute on function public.unattended_leads(integer) to service_role;
