// contextos/NotificacionesContext.jsx
// Sustituye a los alert() y confirm() nativos del navegador, que rompen la estética
// de la aplicación, por avisos y ventanas de confirmación con el mismo diseño que el resto.
// - notificar(mensaje, tipo): aviso flotante que desaparece solo ('exito' | 'error' | 'info').
// - confirmar({ titulo, mensaje, textoConfirmar }): ventana modal que devuelve una
//   promesa con true/false, para usarla igual que confirm(): if (!(await confirmar(...))) return;
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const NotificacionesContext = createContext(null);

const DURACION_AVISO_MS = 4000;

const ESTILOS = {
  exito: { icono: CheckCircle2, color: 'text-emerald-400', borde: 'border-emerald-500/40' },
  error: { icono: AlertCircle, color: 'text-red-400', borde: 'border-red-500/40' },
  info: { icono: Info, color: 'text-cyan-400', borde: 'border-cyan-500/40' }
};

export function NotificacionesProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);
  const siguienteId = useRef(0);

  const cerrarAviso = useCallback((id) => {
    setAvisos(prev => prev.filter(a => a.id !== id));
  }, []);

  const notificar = useCallback((mensaje, tipo = 'exito') => {
    const id = siguienteId.current++;
    setAvisos(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => cerrarAviso(id), DURACION_AVISO_MS);
  }, [cerrarAviso]);

  const confirmar = useCallback(({ titulo = '¿Estás seguro?', mensaje = '', textoConfirmar = 'Aceptar' } = {}) => {
    return new Promise((resolver) => {
      setConfirmacion({ titulo, mensaje, textoConfirmar, resolver });
    });
  }, []);

  const responder = (valor) => {
    confirmacion.resolver(valor);
    setConfirmacion(null);
  };

  return (
    <NotificacionesContext.Provider value={{ notificar, confirmar }}>
      {children}

      {/* Pila de avisos en la esquina inferior derecha (centrada en móvil) */}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-[80] flex flex-col gap-3 sm:w-96 pointer-events-none">
        {avisos.map(({ id, mensaje, tipo }) => {
          const { icono: Icono, color, borde } = ESTILOS[tipo] || ESTILOS.info;
          return (
            <div
              key={id}
              role="status"
              className={`pointer-events-auto animate-aparecer flex items-start gap-3 bg-slate-900/95 backdrop-blur-sm border ${borde} rounded-xl p-4 shadow-2xl text-white`}
            >
              <Icono className={`${color} shrink-0 mt-0.5`} size={20} />
              <p className="text-sm text-slate-200 flex-1">{mensaje}</p>
              <button onClick={() => cerrarAviso(id)} className="text-slate-500 hover:text-white transition-colors" aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Ventana de confirmación con el mismo estilo que los modales de la app */}
      {confirmacion && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4"
          onClick={() => responder(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="animate-aparecer bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl text-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="text-red-400 shrink-0" size={24} />
              <h2 className="text-lg font-bold">{confirmacion.titulo}</h2>
            </div>
            {confirmacion.mensaje && <p className="text-slate-400 text-sm mb-6">{confirmacion.mensaje}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => responder(false)}
                className="px-4 py-2 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                autoFocus
                onClick={() => responder(true)}
                className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                {confirmacion.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificacionesContext.Provider>
  );
}

export const useNotificaciones = () => useContext(NotificacionesContext);
