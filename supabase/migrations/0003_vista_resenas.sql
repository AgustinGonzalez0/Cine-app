
create view vista_resenas as
select
  r.id,
  r.pelicula_id,
  r.usuario_id,
  r.estrellas,
  r.comentario,
  r.created_at,
  pr.nombre,
  pr.apellido
from resenas r
join profiles pr on pr.id = r.usuario_id;

grant select on vista_resenas to anon, authenticated;
