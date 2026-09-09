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
2. Andá a **SQL Editor** → **New query**, pegá el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y ejecutalo. Esto crea todas las tablas, roles y políticas de seguridad (RLS) iniciales.
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
