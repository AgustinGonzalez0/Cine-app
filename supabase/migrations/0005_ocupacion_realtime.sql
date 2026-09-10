-- =========================================================
-- Ocupación de butacas en tiempo real, visible para cualquier visitante.
--
-- Problema: compra_entradas tiene RLS que solo deja ver la propia compra
-- (o a empleados), y Supabase Realtime respeta ese RLS al replicar los
-- cambios. Si dejáramos esa tabla como fuente para el mapa de butacas,
-- un usuario jamás vería las butacas que está ocupando otro usuario en
-- este mismo momento, ni en la carga inicial ni en vivo.
--
-- Solución: una tabla espejo, sin datos sensibles (sin precio, sin QR,
-- sin usuario), de lectura 100% pública, mantenida por triggers.
-- =========================================================

create table ocupacion_butacas (
  funcion_id uuid not null references funciones (id) on delete cascade,
  butaca_id int not null references butacas (id) on delete cascade,
  primary key (funcion_id, butaca_id)
);

alter table ocupacion_butacas enable row level security;

create policy "cualquiera ve la ocupacion de butacas" on ocupacion_butacas
  for select using (true);

-- Nadie inserta/borra manualmente: solo lo hacen los triggers de abajo
-- (via security definer, corren con permisos del dueño de la función).

create or replace function sync_ocupacion_por_entrada()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into ocupacion_butacas (funcion_id, butaca_id)
    values (new.funcion_id, new.butaca_id)
    on conflict do nothing;
  elsif tg_op = 'DELETE' then
    delete from ocupacion_butacas
    where funcion_id = old.funcion_id and butaca_id = old.butaca_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_sync_ocupacion_por_entrada
  after insert or delete on compra_entradas
  for each row execute function sync_ocupacion_por_entrada();

-- Si se cancela una compra, sus butacas se liberan; si se "descancela",
-- vuelven a marcarse ocupadas.
create or replace function sync_ocupacion_por_cancelacion()
returns trigger as $$
begin
  if new.estado = 'cancelada' and old.estado <> 'cancelada' then
    delete from ocupacion_butacas ob
    using compra_entradas ce
    where ce.compra_id = new.id
      and ob.funcion_id = ce.funcion_id
      and ob.butaca_id = ce.butaca_id;
  elsif new.estado <> 'cancelada' and old.estado = 'cancelada' then
    insert into ocupacion_butacas (funcion_id, butaca_id)
    select ce.funcion_id, ce.butaca_id
    from compra_entradas ce
    where ce.compra_id = new.id
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_sync_ocupacion_por_cancelacion
  after update of estado on compras
  for each row execute function sync_ocupacion_por_cancelacion();

alter publication supabase_realtime add table ocupacion_butacas;
