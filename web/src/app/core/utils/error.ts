/** Extrae un mensaje legible de un error atrapado en un catch (Error, error de Supabase, o desconocido). */
export function mensajeError(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return fallback;
}
