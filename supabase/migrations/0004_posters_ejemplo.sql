-- =========================================================
-- Pósters de ejemplo para las películas del seed (0002).
-- Son imágenes de placeholder (picsum.photos con seed fijo, quedan
-- siempre iguales); el día que tengamos el panel de admin con carga
-- de imágenes a Supabase Storage, esto se reemplaza por posters reales.
-- =========================================================

update peliculas set imagen_url = 'https://picsum.photos/seed/horizonte-estelar/400/600'
where nombre = 'Horizonte Estelar';

update peliculas set imagen_url = 'https://picsum.photos/seed/risas-en-el-barrio/400/600'
where nombre = 'Risas en el Barrio';

update peliculas set imagen_url = 'https://picsum.photos/seed/la-sombra-del-pasado/400/600'
where nombre = 'La Sombra del Pasado';

update peliculas set imagen_url = 'https://picsum.photos/seed/umbral-oscuro/400/600'
where nombre = 'Umbral Oscuro';
