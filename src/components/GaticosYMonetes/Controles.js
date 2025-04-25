import React, { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { colecciones } from '../../data/GaticosYMonetes';
import './Controles.scss';

const Controles = () => {
  const socketRef = useRef(null);
  const [coleccionActual, setColeccionActual] = useState('gatos');

  useEffect(() => {
    // Inicializar Socket.IO
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isDevelopment 
      ? 'http://localhost:1337' 
      : 'https://boda-strapi-production.up.railway.app';
    
    console.log('Controles: Inicializando socket en:', socketUrl);
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false,
      forceNew: true,
      timeout: 20000
    });

    socketRef.current.on('connect', () => {
      console.log('Controles: Conectado al servidor Socket.IO');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Controles: Error de conexión Socket.IO:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const cambiarColeccion = (id) => {
    console.log('Controles: Intentando cambiar a colección:', id);
    setColeccionActual(id);
    
    if (socketRef.current && socketRef.current.connected) {
      console.log('Controles: Socket conectado, emitiendo evento kudo de prueba');
      // Emitir un kudo de prueba en lugar de cambiar-coleccion
      socketRef.current.emit('kudo', {
        id: Date.now(),
        emoji: id === 'gatos' ? '🐱' : '🐶',
        timestamp: Date.now()
      });
    } else {
      console.error('Controles: Socket no conectado, estado:', socketRef.current ? socketRef.current.connected : 'no inicializado');
    }
  };

  return (
    <div className="controles-container">
      <h2>Controles de Imágenes</h2>
      <div className="colecciones">
        {Object.values(colecciones).map(coleccion => (
          <button
            key={coleccion.id}
            className={`coleccion-btn ${coleccionActual === coleccion.id ? 'active' : ''}`}
            onClick={() => cambiarColeccion(coleccion.id)}
          >
            {coleccion.nombre}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Controles; 