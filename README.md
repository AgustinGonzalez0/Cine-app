# Cine App — TP1 Programación IV

Sistema completo de venta de entradas y candy bar para un cine, con panel de administración y panel de empleados. Ver el detalle completo de requerimientos en [docs/requerimientos.md](docs/requerimientos.md).

## Stack

- **Frontend**: Angular (standalone components) + PWA, en [`web/`](web/).
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage).
- **Deploy**: Vercel.

## Estructura del repo

```
Cine-app/
├── docs/               # documentación (requerimientos, decisiones)
├── supabase/
│   └── migrations/     # SQL para crear el esquema en Supabase
└── web/                # aplicación Angular
```

## Puesta en marcha — pasos que tenés que hacer vos

### 1. Supabase

1. Entrá a tu proyecto de Supabase (o creá uno nuevo) en https://supabase.com/dashboard.
2. Andá a **SQL Editor** → **New query** y corré, en orden, cada archivo de [`supabase/migrations/`](supabase/migrations/) (`0001` a `0005` por ahora, y los que se vayan agregando). Esto crea las tablas, roles, políticas de seguridad (RLS), datos de ejemplo (géneros, salas, películas y funciones de prueba) y algunas vistas de lectura pública.
3. Andá a **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public key**
4. Pegalos en `web/src/environments/environment.ts` y `environment.development.ts` (reemplazando `YOUR-PROJECT-REF` y `YOUR-ANON-KEY`). La anon key está diseñada para ser pública en el frontend; la seguridad real la dan las políticas RLS que ya quedaron creadas.
5. En **Authentication → Providers**, dejá habilitado Email/Password (es lo que vamos a usar para el registro de usuarios).
6. En **Authentication → Sign In / Providers → Email**, desactivá **"Confirm email"**. Así, cuando alguien se registra, queda logueado al instante y el perfil (nombre, apellido, fecha de nacimiento, etc.) se crea sin pasos intermedios. Es una simplificación razonable para el TP; se puede reactivar más adelante si hace falta un flujo de verificación real.
7. Cuando lleguemos a la parte de generar los PDFs de entradas con QR e imágenes de películas, vamos a necesitar un **bucket de Storage** (te aviso en ese momento).

Por ahora con eso alcanza. A medida que sumemos funcionalidades (cupones, puntos, reportes) puede que agreguemos migraciones nuevas (`0002_...sql`, etc.) que también vas a tener que correr en el SQL Editor.

### 2. Vercel

Todavía no hace falta nada — cuando tengamos una primera versión navegable te paso los pasos para conectar el repo de GitHub a Vercel y dejar el deploy automático en cada push.

### 3. Correr localmente

```bash
cd web
npm install
npm start
```

## Decisiones técnicas (se va completando a medida que avanzamos)

- Arquitectura por *features* dentro de `web/src/app` (`core`, `shared`, `features/*`).
- Butacas: layout fijo de 20 filas x 3 columnas (4/20/4), con filas J y K convertidas en butacas accesibles (2/10/2) y filas R/S/T como VIP. Se generan con la función SQL `generar_butacas_sala`.
- Anti-solapamiento de funciones por sala resuelto a nivel de base de datos con un trigger (`verificar_solapamiento_funcion`) que valida contra la sala y el horario, incluyendo automáticamente los 30 minutos de limpieza entre funciones. (No se usó `exclude constraint` porque la suma `timestamptz + interval` no es `IMMUTABLE` y Postgres no permite usarla en un índice GiST).
- Butacas ocupadas en tiempo real vía Supabase Realtime sobre la tabla `compra_entradas`.
- Autenticación con Supabase Auth (email/password). Al registrarse se crea además una fila en `profiles` con los datos propios del negocio (fecha de nacimiento, tipo de sangre, color de ojos, días de vacaciones, rol, puntos, crédito).
- Estilo visual propio: paleta oscura tipo "sala de cine" (fondo casi negro, acento rojo, detalles dorados) con tipografía condensada (Bebas Neue) para títulos y Manrope para texto, definida como sistema de variables CSS en `src/styles.scss`.
- Vistas SQL (`vista_peliculas`, `vista_resenas`) para exponer datos agregados o de otros usuarios sin abrir el RLS de las tablas base: `vista_peliculas` calcula promedio de reseñas, cantidad de reseñas y entradas vendidas por película (sin exponer las filas individuales de `compra_entradas`); `vista_resenas` expone nombre y apellido del autor de cada reseña sin abrir el resto de la tabla `profiles` (que solo cada usuario puede ver por sí mismo).
- Cartelera con las 3 películas más vendidas destacadas arriba, buscador por nombre y filtro por género (múltiple), calculado en el cliente sobre `vista_peliculas`.
- Detalle de película: sinopsis, funciones agrupadas por día, aviso de restricción de edad, y reseñas con calificación por estrellas (una reseña por usuario y película, se puede editar).
- Selección de butacas en tiempo real: como el RLS de `compra_entradas` solo deja ver la propia compra (para no exponer precio/QR/usuario de otra persona), la ocupación de butacas se replica a una tabla espejo pública sin datos sensibles (`ocupacion_butacas`), mantenida por triggers `security definer` a partir de `compra_entradas` y `compras` (se libera la butaca si la compra se cancela). Angular se suscribe a esa tabla con Supabase Realtime, así cualquier visitante ve al instante qué butacas ocupó otra persona que está comprando en simultáneo.
- El precio de cada butaca depende de si la fila es VIP (R, S, T) o no; la UI exige una confirmación explícita antes de pagar si hay butacas VIP en la selección.
- Restricción de edad: se calcula la edad del usuario logueado a partir de `fecha_nacimiento` y se bloquea la compra si no alcanza el mínimo de la película. Si el usuario compra como invitado (sin login) no hay forma de validar la edad del lado del cliente, así que ahí queda como advertencia informativa (igual que pediría el cine en la puerta).
- El pago no está integrado con ninguna pasarela real (no lo pidió la consigna): al confirmar, la compra se crea directamente en estado `pagada`, simulando un pago exitoso. La unicidad de `(funcion_id, butaca_id)` en `compra_entradas` evita el doble booking a nivel de base de datos aunque dos personas confirmen al mismo tiempo.
- **Compra como invitado + RLS + `RETURNING`**: Postgres aplica la política de `SELECT` de una tabla también al valor devuelto por un `INSERT ... RETURNING` (lo que dispara `.select()` en supabase-js). Como una compra de invitado (`usuario_id` null) no es visible para nadie según esa política, pedir la fila de vuelta hacía fallar el insert entero con "new row violates row-level security policy" aunque los datos fueran válidos. Se resolvió generando el `id` de la compra en el cliente (`crypto.randomUUID()`) y sin pedir `RETURNING`. Por el mismo motivo, las políticas de `INSERT` de `compra_entradas`/`compra_productos` (que validaban la compra con una subconsulta a `compras`) tampoco podían "ver" una compra de invitado; se resolvió con una función `security definer` (`es_compra_propia_o_invitado`) que consulta `compras` sin pasar por su propio RLS, igual que ya se hacía con `is_admin()`/`is_empleado()`.
