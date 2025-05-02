import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import GaleriaLoader from './GaleriaLoader';
import './GaticosYMonetes.scss';

const GaticosYMonetes = () => {
  const [receivedKudos, setReceivedKudos] = useState([]);
  const socketRef = useRef(null);
  const galerias = GaleriaLoader();

  useEffect(() => {
    // Inicializar Socket.IO
    const socketUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:1337' 
      : 'https://boda-strapi-production.up.railway.app';
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false,
      forceNew: true
    });
    
    socketRef.current.on('connect', () => {
      console.log('GaticosYMonetes: Conectado al servidor Socket.IO');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('GaticosYMonetes: Error de conexión Socket.IO:', error);
    });

    socketRef.current.on('kudo', (kudo) => {
      console.log('GaticosYMonetes: Nuevo kudo recibido:', kudo);
      setReceivedKudos(prevKudos => [...prevKudos, kudo]);
      
      // Eliminar el kudo después de 5 segundos
      setTimeout(() => {
        setReceivedKudos(prevKudos => prevKudos.filter(k => k.id !== kudo.id));
      }, 5000);
    });

    socketRef.current.on('disconnect', () => {
      console.log('GaticosYMonetes: Desconectado del servidor Socket.IO');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="gaticos-y-monetes-container">
      {/* Contenido existente del componente */}
      
      {/* Renderizar los kudos recibidos */}
      {receivedKudos.map(kudo => (
        <div
          key={kudo.id}
          className="floating-kudo"
          style={{
            left: `${kudo.x}%`,
            top: `${kudo.y}%`,
            transform: `scale(${kudo.scale}) rotate(${kudo.rotation}deg)`
          }}
        >
          {kudo.emoji}
        </div>
      ))}
    </div>
  );
};

export default GaticosYMonetes; 