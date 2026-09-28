-- Cada usuario nuevo de Supabase Auth recibe su perfil. El primer usuario del sistema es administrador;
-- los siguientes entran como "ventas" y un administrador puede cambiar su rol desde Ajustes.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    case when exists (select 1 from public.profiles) then 'ventas' else 'admin' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Los usuarios existentes antes de esta migración (si los hubiera) también reciben perfil
insert into public.profiles (id, email, full_name, role)
select u.id, coalesce(u.email, ''), split_part(coalesce(u.email, ''), '@', 1),
       case when row_number() over (order by u.created_at) = 1 and not exists (select 1 from public.profiles) then 'admin' else 'ventas' end
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);
