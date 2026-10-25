import React, { createContext, useState, useEffect } from 'react';
import { API_URL } from '../servicios/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Definimos la función dentro para evitar advertencias de dependencias
    const verificar = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/auth/verificar`, {
          credentials: 'include'
        });
        
        // Si el servidor no responde bien (500, 404), lanzamos error para el catch
        if (!respuesta.ok) throw new Error("Error en servidor");

        const datos = await respuesta.json();

        if (datos && datos.exito && datos.autenticado) {
          // Guardamos solo lo necesario para no saturar el estado
          setUsuario({ id: datos.usuarioId });
        } else {
          setUsuario(null);
        }
      } catch (error) {
        console.error('Fallo en la verificación inicial:', error);
        setUsuario(null);
      } finally {
        // IMPORTANTE: Siempre terminamos la carga, pase lo que pase
        setCargando(false);
      }
    };

    verificar();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}