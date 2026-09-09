# Requerimientos del sistema — Cine App

Resumen de los requerimientos extraídos del intercambio de emails con el cliente (TP1 - Programación IV).

## 1. Alcance general

Sistema web completo para un cine de un solo edificio con varias salas, que permite:
- Venta de entradas online con selección de butacas en tiempo real.
- Venta de productos de candy bar (solos o combinados con la entrada).
- Gestión administrativa completa (salas, funciones, productos, precios, cupones, reportes).
- Validación de entradas y productos mediante código QR por parte de empleados.

## 2. Salas y butacas

- Todas las salas tienen la misma disposición: **20 filas** (letras) x **3 columnas** de butacas con **4, 20 y 4** asientos respectivamente.
- Las filas **J y K** (las dos filas del medio) fueron eliminadas y reemplazadas por una fila de **butacas accesibles** (discapacidad), con **2, 10 y 2** butacas por columna.
- Las últimas 3 filas (**R, S, T**) son butacas **VIP**, con precio más alto y marca visual distinta. El usuario debe confirmar explícitamente que compra una butaca VIP antes de pagar.
- Las butacas accesibles deben resaltarse visualmente de forma diferente al resto.
- La selección de butacas debe reflejarse **en tiempo real**: si otro usuario está comprando al mismo tiempo, se debe ver qué butacas quedan ocupadas al instante (Supabase Realtime).

## 3. Películas y funciones

- Cada película tiene: nombre, sinopsis, imagen, duración, uno o más géneros, formato (2D/3D/4D/5D), idioma (castellano/subtitulada) y restricción de edad opcional (13 o 18 años, o sin restricción).
- El admin controla qué películas están visibles y en qué horarios/funciones.
- **Regla de negocio clave**: no puede haber dos funciones en la misma sala si no pasó al menos **30 minutos** entre el fin de una función y el inicio de la siguiente.
- **Asignación automática de salas**: el admin define película + horarios recurrentes (ej. lunes, martes y viernes 18hs) y el sistema asigna la sala automáticamente, garantizando que nunca haya dos funciones simultáneas en la misma sala.
- Restricción de edad: los usuarios menores a la edad mínima no pueden comprar esa entrada; toda entrada de una película con restricción debe aclarar que debe asistir un adulto.
- Sección "Próximamente": películas que se estrenan en las próximas semanas, con opción de activar una alerta/notificación cuando se habilite la venta.
- Preventa configurable por película: apertura de venta hasta 7 días antes del estreno con precio especial; al pasar la fecha de preventa, el precio vuelve al normal.

## 4. Usuarios y autenticación

- Registro de usuario (Supabase Auth) con datos: email, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, días de vacaciones por año.
- Se puede comprar también como **invitado/anónimo** (sin registrarse), pagando normalmente.
- Beneficio de registro: cupón de 20% de descuento en la primera compra (porcentaje configurable por el admin).
- Roles: **cliente**, **admin** (control total del sistema) y **empleado** (valida QR de entradas y candy bar).

## 5. Compra de entradas y candy bar

- El flujo de compra genera un **PDF** con los datos de la entrada y un **código QR** para presentar en el cine.
- Se pueden comprar productos de candy bar (pochoclos, bebidas, etc.), organizados en categorías, junto con la entrada, usando el mismo QR para retirarlos.
- **Combos**: entrada + pochoclos + bebida a precio fijo configurable desde el admin, destacados en la página de compra.
- Un QR deja de ser válido apenas se valida (una vez usado para entrar al cine o para retirar candy bar, no puede reutilizarse).
- Cancelación de compra hasta 2 horas antes de la función: no se devuelve dinero, se otorga **crédito en cuenta** para futuras compras (combinable con otros métodos de pago).

## 6. Cupones y fidelización

- Cupones configurables por el admin: porcentaje de descuento, y opcionalmente restringidos a un segmento de usuarios (ej. mayores de 50 años).
- Programa de puntos: 1 punto por cada peso gastado (usuarios registrados). Los puntos no son transferibles entre usuarios.
- Canje de puntos por recompensas configurables por el admin (ej. entrada = 500 pts, pochoclo grande = 150 pts).
- El usuario ve en su perfil el saldo de puntos y el historial de canjes.

## 7. Reseñas y descubrimiento

- Los usuarios pueden calificar películas con estrellas y dejar un comentario corto, visible antes de comprar entradas.
- Se muestra la puntuación promedio de cada película.
- Home: se destacan primero las 3 películas más vendidas.
- Buscador de películas con filtro por género (múltiple).
- Sección "Mis películas": historial visual (pósters, fechas, calificación propia) de las películas que el usuario ya vio.

## 8. Panel de administración

- Gestión total de salas, funciones, distribución de butacas, productos, categorías, combos, cupones y reglas de puntos.
- Reporte de facturación diaria y cantidad de entradas vendidas, exportable a **PDF** y **Excel**.
- Gráficos de películas más vistas (por semana y por mes) y ranking de productos de candy bar más vendidos.
- **Log de actividad**: registro con fecha y hora de acciones administrativas (alta de función, modificación de precio, validación de QR, etc.) y qué usuario/empleado la realizó.

## 9. Panel de empleados

- Escaneo de código QR (cámara) para validar entradas y retiro de candy bar.
- Ingreso manual del código si el lector no funciona.
- Un QR usado no puede volver a validarse.

## 10. Requisitos técnicos y transversales

- Frontend en **Angular**, aplicando las buenas prácticas y técnicas vistas en clase (standalone components, routing, guards, reactive forms, servicios, etc.).
- Backend/datos con **Supabase** (Auth, Postgres, Realtime, Storage).
- La aplicación debe ser una **PWA**.
- Estilo visual propio y cuidado (no usar un template genérico sin adaptar).
- UI simple y rápida de usar tanto para clientes como empleados: evitar selectores de fecha/hora poco usables y minimizar el scroll.
- Aplicación desplegada con URL pública funcional, código en GitHub, README con arquitectura y decisiones técnicas.

## 11. Fuera de alcance (mencionado pero no confirmado)

- Pantalla con mapa del cine indicando la sala de la entrada comprada: el cliente mencionó la idea pero aclaró que **todavía no tiene luz verde**. No se implementa a menos que se confirme.
