// He centralizado la conexion a la base de datos MySQL en este modulo.
// He optado por importar @prisma/client directamente para aprovechar 
// la gestion automatica de dependencias de Node.js y asegurar la estabilidad.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  // El log de cada consulta SQL ('query') ralentiza y ensucia la consola; solo avisos y errores
  log: ['warn', 'error'],
});

module.exports = prisma;