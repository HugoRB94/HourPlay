// components/SelectorFecha.jsx - Calendario propio con la semana empezando en lunes
//
// He sustituido el <input type="date"> nativo porque su calendario lo dibuja el
// navegador según el idioma del sistema: en muchos equipos empieza en domingo y
// no hay forma de cambiarlo desde la página. Este componente siempre empieza en
// lunes, muestra los meses en español y respeta el estilo oscuro de la aplicación.
// Devuelve la fecha en formato 'AAAA-MM-DD', igual que el input nativo.

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Convierte una fecha local a 'AAAA-MM-DD' sin pasar por UTC
// (toISOString podría devolver el día anterior según la zona horaria)
const aTexto = (fecha) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const desdeTexto = (texto) => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

function SelectorFecha({ valor, onCambio, permitirPasado = false }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Mes que se está mostrando (empieza en el de la fecha elegida o en el actual)
  const [mesVisible, setMesVisible] = useState(() => {
    const base = valor ? desdeTexto(valor) : hoy;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  // getDay() devuelve 0 = domingo; lo desplazamos para que 0 = lunes
  const huecosIniciales = (new Date(anio, mes, 1).getDay() + 6) % 7;

  const celdas = [
    ...Array(huecosIniciales).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(anio, mes, i + 1))
  ];

  // "octubre de 2026" -> "Octubre de 2026" (solo la primera letra en mayúscula)
  const textoMes = mesVisible.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const tituloMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth();
  const cambiarMes = (incremento) => setMesVisible(new Date(anio, mes + incremento, 1));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 select-none">
      {/* Cabecera: mes y flechas de navegación */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          disabled={!permitirPasado && esMesActual}
          aria-label="Mes anterior"
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-slate-100">{tituloMes}</span>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Días de la semana, empezando en lunes */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((dia, i) => (
          <span key={dia} className={`text-center text-xs font-medium py-1 ${i >= 5 ? 'text-cyan-500/70' : 'text-slate-500'}`}>
            {dia}
          </span>
        ))}
      </div>

      {/* Rejilla de días */}
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((fecha, i) => {
          if (!fecha) return <span key={`hueco-${i}`} />;

          const texto = aTexto(fecha);
          const seleccionado = texto === valor;
          const esHoy = fecha.getTime() === hoy.getTime();
          const deshabilitado = !permitirPasado && fecha < hoy;

          return (
            <button
              key={texto}
              type="button"
              onClick={() => onCambio(texto)}
              disabled={deshabilitado}
              aria-label={fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              aria-pressed={seleccionado}
              className={`h-9 rounded-md text-sm transition-colors ${
                seleccionado
                  ? 'bg-cyan-600 text-white font-bold'
                  : deshabilitado
                    ? 'text-slate-600 cursor-not-allowed'
                    : esHoy
                      ? 'text-cyan-400 font-semibold ring-1 ring-cyan-500/50 hover:bg-slate-700'
                      : 'text-slate-200 hover:bg-slate-700'
              }`}
            >
              {fecha.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SelectorFecha;
