// ============================================================
// ESTADISTICAS.JSX - Dashboard de Estadísticas de la Biblioteca
// ============================================================
// Muestra métricas visuales sobre la biblioteca del usuario.
// He diseñado este dashboard como alternativa simplificada a sistemas
// de analytics complejos, priorizando claridad visual y métricas relevantes.
//
// JUSTIFICACIÓN TFG:
// - Demuestra procesamiento de datos agregados en backend
// - Visualización efectiva mediante Recharts (estándar en React empresarial)
// - Separación responsabilidades: lógica en backend, presentación en frontend
// ============================================================

// paginas/Estadisticas.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector, LabelList } from 'recharts';
import { obtenerEstadisticas } from '../servicios/api';
import { Trophy, Clock, Gamepad2, Target, PieChart as IconoTarta, BarChart3 } from 'lucide-react';

// Superficie de las tarjetas (slate-900). Se usa también como "hueco" de 2px
// entre segmentos para que se distingan aunque dos colores se parezcan.
const SUPERFICIE = '#0f172a';

// Cada estado tiene siempre el mismo color, aunque otro estado no tenga juegos.
// La combinación se ha validado para daltonismo y contraste sobre el fondo oscuro.
const ESTADOS = [
  { clave: 'pendiente', nombre: 'Pendientes', color: '#3987e5' },
  { clave: 'jugando', nombre: 'Jugando', color: '#c98500' },
  { clave: 'completado', nombre: 'Completados', color: '#199e70' },
  { clave: 'abandonado', nombre: 'Abandonados', color: '#e34948' }
];
const COLOR_GENEROS = '#0891b2';

function Estadisticas() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Índice del segmento resaltado (al pasar el ratón por el gráfico o la leyenda)
  const [estadoActivo, setEstadoActivo] = useState(null);

  // He implementado este useEffect para sincronizar los graficos con la base de datos MySQL.
  // Al montar el componente, se invoca al servicio de estadisticas garantizando la
  // transmision de la cookie de sesion, lo que permite al backend calcular metricas
  // personalizadas para el usuario autenticado.
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setCargando(true);
      const respuesta = await obtenerEstadisticas();
      if (respuesta.exito) {
        setData(respuesta.datos);
      }
    } catch (error) {
      console.error("Error al cargar estadisticas", error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div className="pt-24 text-center text-slate-400">Calculando métricas...</div>;
  if (!data) return <div className="pt-24 text-center text-slate-400">No hay datos suficientes para mostrar estadísticas.</div>;

  const total = data.totalJuegos;
  const porcentaje = (valor) => (total > 0 ? Math.round((valor / total) * 100) : 0);

  // Formateamos los datos para Recharts (los estados vacíos no generan segmento)
  const dataPie = ESTADOS
    .map(estado => ({ ...estado, value: data.distribucionEstados[estado.clave] || 0 }))
    .filter(item => item.value > 0);

  const dataGeneros = data.topGeneros || [];

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-6 pb-12 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Análisis de tu Biblioteca
        </h1>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard icon={<Gamepad2 className="text-cyan-400" />} label="Total juegos" value={total} />
          <StatCard
            icon={<Trophy className="text-emerald-400" />}
            label="Completados"
            value={data.juegosCompletados}
            extra={
              <div className="mt-2">
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${data.porcentajeCompletado}%` }} />
                </div>
                <p className="text-slate-500 text-xs mt-1">{data.porcentajeCompletado}% de tu biblioteca</p>
              </div>
            }
          />
          <StatCard icon={<Target className="text-blue-400" />} label="Pendientes" value={data.juegosPendientes} />
          <StatCard icon={<Clock className="text-amber-400" />} label="Horas de backlog" value={`${data.horasEstimadas}h`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de distribución por estado */}
          <TarjetaGrafico icono={<IconoTarta size={20} className="text-cyan-400" />} titulo="Estado de la colección">
            {dataPie.length === 0 ? (
              <EstadoVacio texto="Añade juegos a tu biblioteca para ver su distribución" />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Donut con el total en el centro */}
                <div className="relative w-full sm:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataPie}
                        dataKey="value"
                        nameKey="nombre"
                        innerRadius="62%"
                        outerRadius="88%"
                        cornerRadius={4}
                        stroke={SUPERFICIE}
                        strokeWidth={2}
                        startAngle={90}
                        endAngle={-270}
                        activeShape={SegmentoActivo}
                        onMouseEnter={(_, indice) => setEstadoActivo(indice)}
                        onMouseLeave={() => setEstadoActivo(null)}
                        animationDuration={700}
                      >
                        {dataPie.map((entrada, indice) => (
                          <Cell
                            key={entrada.clave}
                            fill={entrada.color}
                            fillOpacity={estadoActivo === null || estadoActivo === indice ? 1 : 0.35}
                            style={{ transition: 'fill-opacity 200ms', outline: 'none', cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<TooltipOscuro total={total} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Texto central: total de juegos, o el estado resaltado */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-bold text-slate-50">
                      {estadoActivo !== null ? dataPie[estadoActivo]?.value : total}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {estadoActivo !== null ? dataPie[estadoActivo]?.nombre.toLowerCase() : 'juegos'}
                    </span>
                  </div>
                </div>

                {/* Leyenda con valores: identifica cada color sin depender solo de él */}
                <ul className="w-full sm:w-1/2 space-y-2">
                  {ESTADOS.map((estado) => {
                    const valor = data.distribucionEstados[estado.clave] || 0;
                    const indice = dataPie.findIndex(d => d.clave === estado.clave);
                    const atenuado = estadoActivo !== null && estadoActivo !== indice;
                    return (
                      <li
                        key={estado.clave}
                        onMouseEnter={() => indice >= 0 && setEstadoActivo(indice)}
                        onMouseLeave={() => setEstadoActivo(null)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          estadoActivo === indice ? 'bg-slate-800' : 'hover:bg-slate-800/60'
                        } ${atenuado || valor === 0 ? 'opacity-50' : ''}`}
                      >
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: estado.color }} />
                        <span className="flex-1 text-slate-200 text-sm">{estado.nombre}</span>
                        <span className="text-slate-50 font-semibold tabular-nums">{valor}</span>
                        <span className="text-slate-500 text-xs w-10 text-right tabular-nums">{porcentaje(valor)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </TarjetaGrafico>

          {/* Gráfico de géneros */}
          <TarjetaGrafico icono={<BarChart3 size={20} className="text-cyan-400" />} titulo="Top géneros">
            {dataGeneros.length === 0 ? (
              <EstadoVacio texto="Todavía no hay géneros que mostrar" />
            ) : (
              <div style={{ height: Math.max(dataGeneros.length * 52, 160) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGeneros} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      dataKey="genero"
                      type="category"
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#cbd5e1', fontSize: 13 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.08)', radius: 6 }}
                      content={<TooltipOscuro total={total} unidad="juegos" />}
                    />
                    <Bar
                      dataKey="cantidad"
                      name="Juegos"
                      fill={COLOR_GENEROS}
                      radius={[0, 4, 4, 0]}
                      barSize={22}
                      background={{ fill: '#1e293b', radius: 4 }}
                      activeBar={{ fill: '#22b8d6' }}
                      animationDuration={700}
                    >
                      <LabelList dataKey="cantidad" position="right" fill="#e2e8f0" fontSize={13} fontWeight={600} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TarjetaGrafico>
        </div>
      </div>
    </div>
  );
}

// Segmento resaltado del donut: se agranda ligeramente al pasar el ratón
function SegmentoActivo(props) {
  return <Sector {...props} outerRadius={props.outerRadius + 6} />;
}

// Tooltip con fondo oscuro y texto blanco. El de Recharts por defecto pinta
// el texto en negro, que no se leía sobre el fondo oscuro de la aplicación.
function TooltipOscuro({ active, payload, total, unidad }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const nombre = item.payload.nombre || item.payload.genero || item.name;
  const color = item.payload.color || item.payload.fill || COLOR_GENEROS;
  const valor = item.value;
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;

  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-slate-50 text-sm font-semibold">{nombre}</span>
      </div>
      <p className="text-slate-300 text-sm">
        <span className="text-white font-bold">{valor}</span> {unidad || (valor === 1 ? 'juego' : 'juegos')}
        <span className="text-slate-500"> · {pct}% del total</span>
      </p>
    </div>
  );
}

function TarjetaGrafico({ icono, titulo, children }) {
  return (
    // min-w-0 evita que el gráfico fuerce la tarjeta a desbordar la rejilla en móvil
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl min-w-0">
      <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">{icono}{titulo}</h3>
      {children}
    </div>
  );
}

function EstadoVacio({ texto }) {
  return <div className="h-64 flex items-center justify-center text-slate-500 text-sm text-center px-6">{texto}</div>;
}

function StatCard({ icon, label, value, extra }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-start gap-4 hover:border-slate-700 transition-colors">
      <div className="bg-slate-800 p-3 rounded-xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {extra}
      </div>
    </div>
  );
}

export default Estadisticas;
