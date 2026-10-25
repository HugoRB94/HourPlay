// Esta página presenta información sobre el proyecto HourPlay,
// su propósito y las tecnologías utilizadas. Es importante para
// el TFG ya que aquí se puede explicar la motivación del proyecto
// y los problemas que resuelve para los usuarios.

function SobreMi() {
  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-8">
          Sobre HourPlay
        </h1>

        {/* Sección explicativa del proyecto */}
        <div className="space-y-6 text-slate-300">
          <p className="text-lg leading-relaxed">
            <strong className="text-cyan-400">HourPlay</strong> nace de un problema común entre los jugadores: 
            tenemos decenas (o cientos) de juegos pendientes, pero poco tiempo libre.
          </p>
          
          <p className="text-lg leading-relaxed">
            A diferencia de otros gestores de backlog que solo organizan tu colección, 
            HourPlay te <strong className="text-cyan-400">recomienda qué jugar según el tiempo que tengas disponible</strong>.
          </p>

          <p className="text-lg leading-relaxed">
            ¿Tienes solo 2 horas? Te sugerimos un juego indie corto. ¿Todo el fin de semana? 
            Perfecto para ese RPG que llevas meses posponiendo.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SobreMi;