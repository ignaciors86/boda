import React, { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import GaleriaLoader from './GaleriaLoader';
import './Controles.scss';

const Controles = () => {
  const socketRef = useRef(null);
  const [coleccionActual, setColeccionActual] = useState('test');
  const galerias = GaleriaLoader();

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
      
      socketRef.current.emit('kudo', {
        id: Date.now(),
        coleccion: id,
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
        {Object.values(galerias).map(galeria => (
          <button
            key={galeria.id}
            className={`coleccion-btn ${coleccionActual === galeria.id ? 'active' : ''}`}
            onClick={() => cambiarColeccion(galeria.id)}
          >
            {galeria.nombre}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Controles; 