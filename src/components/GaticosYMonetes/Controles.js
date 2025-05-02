import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import GaleriaLoader from './GaleriaLoader';
import './Controles.scss';

const Controles = () => {
  const [speedMultiplier, setSpeedMultiplier] = useState(2.5);
  const [photoChangeFactor, setPhotoChangeFactor] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const socketRef = useRef(null);
  const [coleccionActual, setColeccionActual] = useState('test');
  const galerias = GaleriaLoader();
  const [backgroundFormat, setBackgroundFormat] = useState(() => {
    const savedFormat = localStorage.getItem('backgroundFormat');
    return savedFormat || 'polygons';
  });

  useEffect(() => {
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
      console.log('Controles: Socket conectado');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Controles: Error de conexión Socket.IO:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (socketRef.current?.connected) {
      console.log('Controles: Emitiendo formato inicial:', backgroundFormat);
      socketRef.current.emit('background-format-change', {
        format: backgroundFormat,
        timestamp: Date.now()
      });
    }
  }, [backgroundFormat]);

  const cambiarColeccion = (id) => {
    setColeccionActual(id);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('kudo', {
        id: Date.now(),
        coleccion: id,
        timestamp: Date.now()
      });
    }
  };

  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeedMultiplier(newSpeed);
    if (socketRef.current?.connected) {
      socketRef.current.emit('speed-change', {
        multiplier: newSpeed,
        timestamp: Date.now()
      });
    }
  };

  const handlePhotoFactorSubmit = (e) => {
    e.preventDefault();
    const factor = parseFloat(inputValue);
    if (!isNaN(factor) && factor > 0) {
      setPhotoChangeFactor(factor);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('photo-factor-change', {
          factor: factor,
          timestamp: Date.now()
        });
      }
    }
  };

  const handleBackgroundFormatChange = (e) => {
    const newFormat = e.target.value;
    console.log('Controles: Cambiando formato a:', newFormat);
    setBackgroundFormat(newFormat);
    localStorage.setItem('backgroundFormat', newFormat);
  };

  return (
    <div className="controles-reset">
      <div className="controles-remake-bg">
        <div className="controles-remake">
          <section className="colecciones-section">
            <h2>Colecciones</h2>
            <div className="colecciones-list">
              {Object.values(galerias).map(galeria => (
                <button
                  key={galeria.id}
                  className={`coleccion-btn${coleccionActual === galeria.id ? ' active' : ''}`}
                  onClick={() => cambiarColeccion(galeria.id)}
                >
                  {galeria.nombre}
                </button>
              ))}
            </div>
          </section>

          <div className="divider" />

          <section className="formato-section">
            <h2>Formato de Fondo</h2>
            <div className="formato-control">
              <select
                value={backgroundFormat}
                onChange={handleBackgroundFormatChange}
                className="formato-select"
              >
                <option value="polygons">Polígonos</option>
                <option value="pulse">Círculo Pulsante</option>
              </select>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Controles; 