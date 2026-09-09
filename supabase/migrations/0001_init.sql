-- ---------- Extensiones (deben ir antes de usarse) ----------
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------- Tipos ----------
create type rol_usuario as enum ('cliente', 'admin', 'empleado');
create type formato_pelicula as enum ('2D', '3D', '4D', '5D');
create type idioma_pelicula as enum ('castellano', 'subtitulada');
create type tipo_butaca as enum ('normal', 'accesible', 'vip');
create type estado_compra as enum ('pendiente', 'pagada', 'cancelada');
create type tipo_movimiento_puntos as enum ('ganado', 'canjeado');
create type tipo_recompensa as enum ('entrada', 'producto');
create type segmento_cupon as enum ('todos', 'primera_compra', 'mayores_50');

-- ---------- Perfiles (extiende auth.users) ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date not null,
  tipo_sangre text,
  color_ojos text,
  dias_vacaciones int,
  rol rol_usuario not null default 'cliente',
  puntos int not null default 0,
  credito numeric(10, 2) not null default 0,
  primera_compra_usada boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Géneros / Películas ----------
create table generos (
  id serial primary key,
  nombre text not null unique
);

create table peliculas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sinopsis text not null,
  imagen_url text,
  duracion_minutos int not null,
  formato formato_pelicula not null default '2D',
  idioma idioma_pelicula not null default 'castellano',
  restriccion_edad int, -- null = sin restriccion, 13 o 18
  fecha_estreno date not null,
  precio_preventa numeric(10, 2),
  dias_preventa int not null default 7,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table pelicula_generos (
  pelicula_id uuid references peliculas (id) on delete cascade,
  genero_id int references generos (id) on delete cascade,
  primary key (pelicula_id, genero_id)
);

-- ---------- Salas / Butacas ----------
create table salas (
  id serial primary key,
  nombre text not null unique
);

create table butacas (
  id serial primary key,
  sala_id int not null references salas (id) on delete cascade,
  fila char(1) not null,
  columna int not null,
  tipo tipo_butaca not null default 'normal',
  unique (sala_id, fila, columna)
);

-- Genera las 20 filas x (4,20,4) butacas de una sala, saltando J y K
-- (reemplazadas por butacas accesibles) y marcando VIP las filas R, S, T.
create or replace function generar_butacas_sala(p_sala_id int)
returns void as $$
declare
  filas text[] := array['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
  fila text;
  col int;
  columnas int[] := array[4, 20, 4];
  bloque int;
  es_medio boolean;
  t tipo_butaca;
begin
  foreach fila in array filas loop
    es_medio := fila in ('J', 'K');
    for bloque in 1..3 loop
      for col in 1..(case when es_medio then (case bloque when 1 then 2 when 2 then 10 when 3 then 2 end) else columnas[bloque] end) loop
        if fila in ('R','S','T') then
          t := 'vip';
        elsif es_medio then
          t := 'accesible';
        else
          t := 'normal';
        end if;
        insert into butacas (sala_id, fila, columna, tipo)
        values (p_sala_id, fila, (bloque - 1) * 100 + col, t);
      end loop;
    end loop;
  end loop;
end;
$$ language plpgsql;

-- Ejemplo de uso al crear una sala nueva desde el admin:
-- insert into salas (nombre) values ('Sala 1') returning id; -- luego:
-- select generar_butacas_sala(<id_devuelto>);

-- ---------- Funciones (proyecciones) ----------
create table funciones (
  id uuid primary key default gen_random_uuid(),
  pelicula_id uuid not null references peliculas (id) on delete cascade,
  sala_id int not null references salas (id),
  inicio timestamptz not null,
  fin timestamptz not null,
  formato formato_pelicula not null,
  idioma idioma_pelicula not null,
  precio_base numeric(10, 2) not null,
  precio_vip numeric(10, 2) not null,
  es_preventa boolean not null default false,
  created_at timestamptz not null default now()
);

-- Evita superposición de funciones en una misma sala (incluye los 30 min de limpieza).
-- No se puede usar "exclude using gist" con tstzrange(inicio, fin + interval) porque
-- la suma timestamptz + interval no es IMMUTABLE; se valida entonces con un trigger.
create or replace function verificar_solapamiento_funcion()
returns trigger as $$
begin
  if exists (
    select 1 from funciones f
    where f.sala_id = new.sala_id
      and f.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and new.inicio < f.fin + interval '30 minutes'
      and f.inicio < new.fin + interval '30 minutes'
  ) then
    raise exception 'La sala % ya tiene una función que se superpone (incluyendo 30 min de limpieza) en ese horario', new.sala_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_verificar_solapamiento_funcion
  before insert or update on funciones
  for each row execute function verificar_solapamiento_funcion();

-- ---------- Cupones ----------
create table cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  porcentaje numeric(5, 2) not null check (porcentaje > 0 and porcentaje <= 100),
  segmento segmento_cupon not null default 'todos',
  activo boolean not null default true,
  fecha_desde timestamptz,
  fecha_hasta timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Candy bar ----------
create table categorias_productos (
  id serial primary key,
  nombre text not null unique
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_id int references categorias_productos (id),
  precio numeric(10, 2) not null,
  imagen_url text,
  activo boolean not null default true
);

create table combos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(10, 2) not null,
  incluye_entrada boolean not null default true,
  activo boolean not null default true
);

create table combo_items (
  combo_id uuid references combos (id) on delete cascade,
  producto_id uuid references productos (id),
  cantidad int not null default 1,
  primary key (combo_id, producto_id)
);

-- ---------- Compras ----------
create table compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references profiles (id),
  email_invitado text,
  cupon_id uuid references cupones (id),
  credito_usado numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  estado estado_compra not null default 'pendiente',
  created_at timestamptz not null default now()
);

create table compra_entradas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras (id) on delete cascade,
  funcion_id uuid not null references funciones (id),
  butaca_id int not null references butacas (id),
  precio numeric(10, 2) not null,
  qr_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  validado boolean not null default false,
  validado_at timestamptz,
  unique (funcion_id, butaca_id)
);

create table compra_productos (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras (id) on delete cascade,
  producto_id uuid references productos (id),
  combo_id uuid references combos (id),
  cantidad int not null default 1,
  precio_unitario numeric(10, 2) not null,
  qr_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  validado boolean not null default false,
  validado_at timestamptz
);

-- ---------- Puntos y recompensas ----------
create table recompensas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo tipo_recompensa not null,
  producto_id uuid references productos (id),
  costo_puntos int not null,
  activo boolean not null default true
);

create table puntos_historial (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles (id) on delete cascade,
  tipo tipo_movimiento_puntos not null,
  cantidad int not null,
  motivo text,
  compra_id uuid references compras (id),
  recompensa_id uuid references recompensas (id),
  created_at timestamptz not null default now()
);

-- ---------- Reseñas ----------
create table resenas (
  id uuid primary key default gen_random_uuid(),
  pelicula_id uuid not null references peliculas (id) on delete cascade,
  usuario_id uuid not null references profiles (id) on delete cascade,
  estrellas int not null check (estrellas between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (pelicula_id, usuario_id)
);

-- ---------- Alertas de estreno ----------
create table alertas_estreno (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles (id) on delete cascade,
  pelicula_id uuid not null references peliculas (id) on delete cascade,
  notificado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (usuario_id, pelicula_id)
);

-- ---------- Log de actividad (admin/empleados) ----------
create table log_actividad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references profiles (id),
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Row Level Security (políticas iniciales, se irán ajustando)
-- =========================================================

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and rol = 'admin'
  );
$$ language sql stable security definer;

create or replace function is_empleado()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and rol in ('empleado', 'admin')
  );
$$ language sql stable security definer;

alter table profiles enable row level security;
alter table peliculas enable row level security;
alter table pelicula_generos enable row level security;
alter table generos enable row level security;
alter table salas enable row level security;
alter table butacas enable row level security;
alter table funciones enable row level security;
alter table cupones enable row level security;
alter table categorias_productos enable row level security;
alter table productos enable row level security;
alter table combos enable row level security;
alter table combo_items enable row level security;
alter table compras enable row level security;
alter table compra_entradas enable row level security;
alter table compra_productos enable row level security;
alter table recompensas enable row level security;
alter table puntos_historial enable row level security;
alter table resenas enable row level security;
alter table alertas_estreno enable row level security;
alter table log_actividad enable row level security;

-- Lectura pública de catálogo (lo que ve cualquier visitante sin login)
create policy "publico puede ver peliculas activas" on peliculas for select using (true);
create policy "publico puede ver generos" on generos for select using (true);
create policy "publico puede ver relacion pelicula-genero" on pelicula_generos for select using (true);
create policy "publico puede ver salas" on salas for select using (true);
create policy "publico puede ver butacas" on butacas for select using (true);
create policy "publico puede ver funciones" on funciones for select using (true);
create policy "publico puede ver categorias" on categorias_productos for select using (true);
create policy "publico puede ver productos" on productos for select using (true);
create policy "publico puede ver combos" on combos for select using (true);
create policy "publico puede ver combo items" on combo_items for select using (true);
create policy "publico puede ver recompensas" on recompensas for select using (true);
create policy "publico puede ver resenas" on resenas for select using (true);

-- Administración total para admin
create policy "admin todo peliculas" on peliculas for all using (is_admin()) with check (is_admin());
create policy "admin todo generos" on generos for all using (is_admin()) with check (is_admin());
create policy "admin todo pelicula_generos" on pelicula_generos for all using (is_admin()) with check (is_admin());
create policy "admin todo salas" on salas for all using (is_admin()) with check (is_admin());
create policy "admin todo butacas" on butacas for all using (is_admin()) with check (is_admin());
create policy "admin todo funciones" on funciones for all using (is_admin()) with check (is_admin());
create policy "admin todo cupones" on cupones for all using (is_admin()) with check (is_admin());
create policy "admin todo categorias" on categorias_productos for all using (is_admin()) with check (is_admin());
create policy "admin todo productos" on productos for all using (is_admin()) with check (is_admin());
create policy "admin todo combos" on combos for all using (is_admin()) with check (is_admin());
create policy "admin todo combo_items" on combo_items for all using (is_admin()) with check (is_admin());
create policy "admin todo recompensas" on recompensas for all using (is_admin()) with check (is_admin());
create policy "admin lee log" on log_actividad for select using (is_admin());
create policy "admin/empleado escribe log" on log_actividad for insert with check (is_empleado());

-- Perfiles: cada usuario ve/edita el propio, admin ve todos
create policy "usuario ve su perfil" on profiles for select using (auth.uid() = id or is_admin());
create policy "usuario crea su perfil" on profiles for insert with check (auth.uid() = id);
create policy "usuario edita su perfil" on profiles for update using (auth.uid() = id or is_admin());

-- Cupones: solo admin los ve/gestiona (se validan por RPC al aplicar, no por lectura directa)
create policy "admin ve cupones" on cupones for select using (is_admin());

-- Compras: el dueño (o admin/empleado) puede ver y crear las propias
create policy "usuario ve sus compras" on compras for select using (
  auth.uid() = usuario_id or is_empleado()
);
create policy "usuario crea compra" on compras for insert with check (
  auth.uid() = usuario_id or usuario_id is null
);
create policy "usuario cancela su compra" on compras for update using (
  auth.uid() = usuario_id or is_admin()
);

create policy "ver entradas de mi compra" on compra_entradas for select using (
  exists (select 1 from compras c where c.id = compra_id and (c.usuario_id = auth.uid() or is_empleado()))
);
create policy "crear entradas en mi compra" on compra_entradas for insert with check (
  exists (select 1 from compras c where c.id = compra_id and (c.usuario_id = auth.uid() or c.usuario_id is null))
);
create policy "empleado valida entrada" on compra_entradas for update using (is_empleado());

create policy "ver productos de mi compra" on compra_productos for select using (
  exists (select 1 from compras c where c.id = compra_id and (c.usuario_id = auth.uid() or is_empleado()))
);
create policy "crear productos en mi compra" on compra_productos for insert with check (
  exists (select 1 from compras c where c.id = compra_id and (c.usuario_id = auth.uid() or c.usuario_id is null))
);
create policy "empleado valida producto" on compra_productos for update using (is_empleado());

-- Puntos: el usuario ve su propio historial
create policy "usuario ve su historial de puntos" on puntos_historial for select using (
  auth.uid() = usuario_id or is_admin()
);

-- Reseñas: cualquier usuario autenticado puede crear/editar la propia
create policy "usuario crea resena" on resenas for insert with check (auth.uid() = usuario_id);
create policy "usuario edita su resena" on resenas for update using (auth.uid() = usuario_id);
create policy "usuario borra su resena" on resenas for delete using (auth.uid() = usuario_id or is_admin());

-- Alertas de estreno: propias del usuario
create policy "usuario gestiona sus alertas" on alertas_estreno for all using (
  auth.uid() = usuario_id
) with check (auth.uid() = usuario_id);

-- =========================================================
-- Realtime: habilitar para ver butacas ocupadas en vivo
-- =========================================================
alter publication supabase_realtime add table compra_entradas;
alter publication supabase_realtime add table funciones;
