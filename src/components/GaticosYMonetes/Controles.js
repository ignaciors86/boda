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
  const [sensitiveMode, setSensitiveMode] = useState(() => {
    const savedMode = localStorage.getItem('sensitiveMode');
    return savedMode === 'true';
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

  useEffect(() => {
    if (socketRef.current?.connected) {
      console.log('Controles: Emitiendo modo sensible inicial:', sensitiveMode);
      socketRef.current.emit('sensitive-mode-change', {
        enabled: sensitiveMode,
        timestamp: Date.now()
      });
    }
  }, [sensitiveMode]);

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
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('background-format-change', {
        format: newFormat,
        timestamp: Date.now()
      });
    }
  };

  const handleSensitiveModeChange = (e) => {
    const newMode = e.target.checked;
    console.log('Controles: Cambiando modo sensible a:', newMode);
    setSensitiveMode(newMode);
    localStorage.setItem('sensitiveMode', newMode);
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('sensitive-mode-change', {
        enabled: newMode,
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className="controles">
      <div className="controles-content">
        <div className="controles-section">
          <h2>COlecciones</h2>
          <div className="controles-buttons">
            {Object.values(galerias).map(galeria => (
              <button
                key={galeria.id}
                className={`controles-btn${coleccionActual === galeria.id ? ' active' : ''}`}
                onClick={() => cambiarColeccion(galeria.id)}
              >
                {galeria.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="controles-section">
          <h2>Formato de Fondo</h2>
          <select
            value={backgroundFormat}
            onChange={handleBackgroundFormatChange}
            className="controles-select"
          >
            <option value="polygons">Polígonos</option>
            <option value="poligonos-flotantes">Polígonos Flotantes</option>
            <option value="pulse">Círculo Pulsante</option>
            <option value="kitt">KITT</option>
            <option value="meteoritos">Meteoritos</option>
          </select>
        </div>

        <div className="controles-section">
          <h2>Modo de Cambio</h2>
          <label className="controles-checkbox">
            <input
              type="checkbox"
              checked={sensitiveMode}
              onChange={handleSensitiveModeChange}
            />
            <span>Modo Sensible (cambios rápidos)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Controles; 