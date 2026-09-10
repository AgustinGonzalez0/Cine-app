-- =========================================================
-- Fix: compra como invitado fallaba con "new row violates row-level
-- security policy" al crear las entradas.
--
-- Causa: las políticas de INSERT de compra_entradas/compra_productos
-- validan la compra con "exists (select 1 from compras c where ...)".
-- Esa subconsulta sobre `compras` está sujeta al RLS de `compras`, y su
-- política de SELECT no deja ver una compra de invitado (usuario_id
-- null) a un usuario anónimo. Entonces, aunque la compra exista de
-- verdad, la subconsulta no la encuentra y el check se rechaza.
--
-- Solución: una función security definer (como is_admin()/is_empleado())
-- que consulta `compras` sin pasar por su propio RLS.
-- =========================================================

create or replace function es_compra_propia_o_invitado(p_compra_id uuid)
returns boolean as $$
  select exists (
    select 1 from compras c
    where c.id = p_compra_id
      and (c.usuario_id = auth.uid() or c.usuario_id is null)
  );
$$ language sql stable security definer;

drop policy if exists "crear entradas en mi compra" on compra_entradas;
create policy "crear entradas en mi compra" on compra_entradas
  for insert with check (es_compra_propia_o_invitado(compra_id));

drop policy if exists "crear productos en mi compra" on compra_productos;
create policy "crear productos en mi compra" on compra_productos
  for insert with check (es_compra_propia_o_invitado(compra_id));
