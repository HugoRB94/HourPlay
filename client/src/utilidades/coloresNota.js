// utilidades/coloresNota.js
// Colores de la valoración según el tramo de nota. Las clases van escritas
// completas para que Tailwind las detecte al compilar.
export function coloresNota(nota) {
  if (nota >= 10)  return { fondo: 'bg-fuchsia-900/30 border-fuchsia-400/60 shadow-[0_0_12px_rgba(232,121,249,0.35)]', texto: 'text-fuchsia-300', suave: 'text-fuchsia-400/70' };
  if (nota >= 9)   return { fondo: 'bg-cyan-900/30 border-cyan-500/40', texto: 'text-cyan-300', suave: 'text-cyan-500/80' };
  if (nota >= 8)   return { fondo: 'bg-emerald-900/30 border-emerald-500/40', texto: 'text-emerald-400', suave: 'text-emerald-600' };
  if (nota >= 7)   return { fondo: 'bg-lime-900/30 border-lime-500/40', texto: 'text-lime-400', suave: 'text-lime-600' };
  if (nota >= 5)   return { fondo: 'bg-yellow-900/30 border-yellow-500/40', texto: 'text-yellow-400', suave: 'text-yellow-600' };
  if (nota >= 3.1) return { fondo: 'bg-orange-900/30 border-orange-500/40', texto: 'text-orange-400', suave: 'text-orange-600' };
  return { fondo: 'bg-red-900/30 border-red-500/40', texto: 'text-red-400', suave: 'text-red-600' };
}
