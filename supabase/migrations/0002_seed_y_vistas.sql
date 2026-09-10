-- =========================================================
-- Cine App - Datos de ejemplo + vistas de lectura pública (v2)
-- Ejecutar en Supabase > SQL Editor DESPUÉS de 0001_init.sql
-- =========================================================

-- ---------- Vista de películas con género, promedio de reseñas y ventas ----------
-- Corre con permisos del dueño (postgres), por eso puede contar filas de
-- compra_entradas sin exponerlas: solo expone el número agregado.
create view vista_peliculas as
select
  p.*,
  coalesce(r.promedio, 0)::numeric(3, 2) as promedio_estrellas,
  coalesce(r.cantidad_resenas, 0) as cantidad_resenas,
  coalesce(v.entradas_vendidas, 0) as entradas_vendidas,
  coalesce(gen.generos, '{}') as generos
from peliculas p
left join lateral (
  select array_agg(g.nombre order by g.nombre) as generos
  from pelicula_generos pg
  join generos g on g.id = pg.genero_id
  where pg.pelicula_id = p.id
) gen on true
left join lateral (
  select avg(estrellas) as promedio, count(*) as cantidad_resenas
  from resenas
  where pelicula_id = p.id
) r on true
left join lateral (
  select count(ce.id) as entradas_vendidas
  from funciones f
  join compra_entradas ce on ce.funcion_id = f.id
  join compras c on c.id = ce.compra_id and c.estado = 'pagada'
  where f.pelicula_id = p.id
) v on true;

grant select on vista_peliculas to anon, authenticated;

-- ---------- Géneros ----------
insert into generos (nombre) values
  ('Acción'), ('Comedia'), ('Drama'), ('Terror'),
  ('Ciencia ficción'), ('Animación'), ('Romance'), ('Suspenso')
on conflict (nombre) do nothing;

-- ---------- Categorías y productos de candy bar ----------
insert into categorias_productos (nombre) values
  ('Pochoclos'), ('Bebidas'), ('Golosinas')
on conflict (nombre) do nothing;

insert into productos (nombre, categoria_id, precio, activo)
select 'Pochoclo chico', id, 3500, true from categorias_productos where nombre = 'Pochoclos'
union all
select 'Pochoclo grande', id, 5500, true from categorias_productos where nombre = 'Pochoclos'
union all
select 'Gaseosa chica', id, 2800, true from categorias_productos where nombre = 'Bebidas'
union all
select 'Gaseosa grande', id, 4200, true from categorias_productos where nombre = 'Bebidas'
union all
select 'Nachos con queso', id, 4800, true from categorias_productos where nombre = 'Golosinas'
union all
select 'Chocolate', id, 2200, true from categorias_productos where nombre = 'Golosinas';

-- ---------- Salas (con sus butacas generadas automáticamente) ----------
do $$
declare
  nueva_sala_id int;
  i int;
begin
  for i in 1..3 loop
    insert into salas (nombre) values ('Sala ' || i)
    on conflict (nombre) do nothing
    returning id into nueva_sala_id;

    if nueva_sala_id is not null then
      perform generar_butacas_sala(nueva_sala_id);
    end if;
  end loop;
end $$;

-- ---------- Películas de ejemplo ----------
insert into peliculas (nombre, sinopsis, imagen_url, duracion_minutos, formato, idioma, restriccion_edad, fecha_estreno, activa)
values
  ('Horizonte Estelar', 'Una tripulación descubre una señal que podría cambiar el destino de la humanidad.', null, 128, '3D', 'subtitulada', null, current_date - 20, true),
  ('Risas en el Barrio', 'Una comedia sobre un grupo de vecinos que organiza la fiesta del siglo.', null, 95, '2D', 'castellano', null, current_date - 15, true),
  ('La Sombra del Pasado', 'Un thriller psicológico sobre un detective que persigue un caso que lo obsesiona.', null, 112, '2D', 'subtitulada', 16, current_date - 10, true),
  ('Umbral Oscuro', 'Terror puro: una casa abandonada esconde algo que no debería despertarse.', null, 101, '4D', 'castellano', 18, current_date - 5, true);

-- Géneros de cada película
insert into pelicula_generos (pelicula_id, genero_id)
select p.id, g.id from peliculas p, generos g
where (p.nombre = 'Horizonte Estelar' and g.nombre in ('Ciencia ficción', 'Acción'))
   or (p.nombre = 'Risas en el Barrio' and g.nombre in ('Comedia'))
   or (p.nombre = 'La Sombra del Pasado' and g.nombre in ('Suspenso', 'Drama'))
   or (p.nombre = 'Umbral Oscuro' and g.nombre in ('Terror'));

-- Funciones de ejemplo (se asignan a salas manualmente en el seed;
-- el trigger de solapamiento igual valida que no se pisen los horarios)
insert into funciones (pelicula_id, sala_id, inicio, fin, formato, idioma, precio_base, precio_vip, es_preventa)
select p.id, s.id,
  (current_date + 1)::timestamptz + time '18:00',
  (current_date + 1)::timestamptz + time '18:00' + (p.duracion_minutos || ' minutes')::interval,
  p.formato, p.idioma, 4500, 6500, false
from peliculas p
join salas s on s.nombre = 'Sala 1'
where p.nombre = 'Horizonte Estelar'
union all
select p.id, s.id,
  (current_date + 1)::timestamptz + time '21:00',
  (current_date + 1)::timestamptz + time '21:00' + (p.duracion_minutos || ' minutes')::interval,
  p.formato, p.idioma, 3800, 5800, false
from peliculas p
join salas s on s.nombre = 'Sala 2'
where p.nombre = 'Risas en el Barrio'
union all
select p.id, s.id,
  (current_date + 1)::timestamptz + time '20:00',
  (current_date + 1)::timestamptz + time '20:00' + (p.duracion_minutos || ' minutes')::interval,
  p.formato, p.idioma, 4000, 6000, false
from peliculas p
join salas s on s.nombre = 'Sala 3'
where p.nombre = 'La Sombra del Pasado';
