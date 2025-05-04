import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import GaleriaLoader from './GaleriaLoader';
import './Controles.scss';

const DEFAULT_AUTO_CHANGE_TIME = 0;

const Controles = () => {
  const [speedMultiplier, setSpeedMultiplier] = useState(2.5);
  const [photoChangeFactor, setPhotoChangeFactor] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [autoChangeTime, setAutoChangeTime] = useState(DEFAULT_AUTO_CHANGE_TIME);
  const [autoChangeInput, setAutoChangeInput] = useState(DEFAULT_AUTO_CHANGE_TIME.toString());
  const [isInputModified, setIsInputModified] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_AUTO_CHANGE_TIME);
  const [isResetting, setIsResetting] = useState(false);
  const socketRef = useRef(null);
  const autoChangeTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [coleccionActual, setColeccionActual] = useState(() => {
    const savedColeccion = localStorage.getItem('coleccionActual');
    return savedColeccion || 'ninguna';
  });
  const galerias = GaleriaLoader();
  const [backgroundFormat, setBackgroundFormat] = useState(() => {
    const savedFormat = localStorage.getItem('backgroundFormat');
    return savedFormat || 'kitt';
  });
  const [sensitiveMode, setSensitiveMode] = useState(() => {
    const savedMode = localStorage.getItem('sensitiveMode');
    return savedMode === 'true';
  });
  const [extraSensitiveMode, setExtraSensitiveMode] = useState(() => {
    const savedMode = localStorage.getItem('extraSensitiveMode');
    return savedMode === 'true';
  });
  const [pursuitMode, setPursuitMode] = useState(false);
  const [circularImages, setCircularImages] = useState(false);
  const [shakeImage, setShakeImage] = useState(false);
  const [autoChangeInterval, setAutoChangeInterval] = useState(null);

  const formatos = ['polygons', 'poligonos-flotantes', 'pulse', 'kitt', 'meteoritos'];

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
      if (autoChangeTimerRef.current) {
        clearInterval(autoChangeTimerRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoChangeTimerRef.current) {
      clearInterval(autoChangeTimerRef.current);
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    if (autoChangeTime > 0) {
      progressTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            setTimeout(() => {
              setTimeRemaining(autoChangeTime);
              const currentIndex = formatos.indexOf(backgroundFormat);
              const nextIndex = (currentIndex + 1) % formatos.length;
              const nextFormat = formatos[nextIndex];
              
              setBackgroundFormat(nextFormat);
              localStorage.setItem('backgroundFormat', nextFormat);
              
              if (socketRef.current?.connected) {
                socketRef.current.emit('galerias', {
                  id: Date.now(),
                  format: nextFormat,
                  timestamp: Date.now()
                });
              }
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (autoChangeTimerRef.current) {
        clearInterval(autoChangeTimerRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [autoChangeTime, backgroundFormat]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      console.log('Controles: Emitiendo formato inicial:', backgroundFormat);
      socketRef.current.emit('galerias', {
        format: backgroundFormat,
        timestamp: Date.now()
      });
    }
  }, [backgroundFormat]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      console.log('Controles: Emitiendo modo sensible inicial:', sensitiveMode);
      socketRef.current.emit('galerias', {
        sensitiveMode,
        extraSensitiveMode,
        pursuitMode,
        circularImages,
        shakeImage,
        timestamp: Date.now()
      });
    }
  }, [sensitiveMode, extraSensitiveMode, pursuitMode, circularImages, shakeImage]);

  const handleAutoChangeTimeChange = (e) => {
    setAutoChangeInput(e.target.value);
    setIsInputModified(true);
  };

  const handleAutoChangeTimeSubmit = (e) => {
    e.preventDefault();
    const time = parseInt(autoChangeInput);
    if (!isNaN(time) && time >= 0) {
      setAutoChangeTime(time);
      setTimeRemaining(time);
      setIsInputModified(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAutoChangeTimeSubmit(e);
    }
  };

  const handleBackgroundFormatChange = (e) => {
    const newFormat = e.target.value;
    console.log('Controles: Cambiando formato a:', newFormat);
    setBackgroundFormat(newFormat);
    localStorage.setItem('backgroundFormat', newFormat);
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('galerias', {
        id: Date.now(),
        format: newFormat,
        timestamp: Date.now()
      });
    }
  };

  const handleSensitiveModeChange = (e) => {
    const newMode = e.target.checked;
    setSensitiveMode(newMode);
    setExtraSensitiveMode(false);
    setPursuitMode(false);
    if (socketRef.current?.connected) {
      socketRef.current.emit('galerias', {
        id: Date.now(),
        sensitiveMode: newMode,
        extraSensitiveMode: false,
        pursuitMode: false,
        circularImages,
        shakeImage,
        timestamp: Date.now()
      });
    }
  };

  const handleExtraSensitiveModeChange = (e) => {
    const newMode = e.target.checked;
    setExtraSensitiveMode(newMode);
    setSensitiveMode(false);
    setPursuitMode(false);
    if (socketRef.current?.connected) {
      socketRef.current.emit('galerias', {
        id: Date.now(),
        sensitiveMode: false,
        extraSensitiveMode: newMode,
        pursuitMode: false,
        circularImages,
        shakeImage,
        timestamp: Date.now()
      });
    }
  };

  const handlePursuitModeChange = (e) => {
    const newMode = e.target.checked;
    setPursuitMode(newMode);
    setSensitiveMode(false);
    setExtraSensitiveMode(false);
    if (socketRef.current?.connected) {
      socketRef.current.emit('galerias', {
        id: Date.now(),
        sensitiveMode: false,
        extraSensitiveMode: false,
        pursuitMode: newMode,
        circularImages,
        shakeImage,
        timestamp: Date.now()
      });
    }
  };

  const handleCircularImagesChange = (e) => {
    const newMode = e.target.checked;
    setCircularImages(newMode);
    if (socketRef.current?.connected) {
      socketRef.current.emit('galerias', {
        id: Date.now(),
        sensitiveMode,
        extraSensitiveMode,
        pursuitMode,
        circularImages: newMode,
        shakeImage,
        timestamp: Date.now()
      });
    }
  };

  const handleShakeImageChange = (e) => {
    const newMode = e.target.checked;
    setShakeImage(newMode);
    if (socketRef.current?.connected) {
      socketRef.current.emit('galerias', {
        id: Date.now(),
        sensitiveMode,
        extraSensitiveMode,
        pursuitMode,
        circularImages,
        shakeImage: newMode,
        timestamp: Date.now()
      });
    }
  };

  const cambiarColeccion = (id) => {
    setColeccionActual(id);
    localStorage.setItem('coleccionActual', id);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('galerias', {
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
      socketRef.current.emit('galerias', {
        id: Date.now(),
        speed: newSpeed,
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
        socketRef.current.emit('galerias', {
          id: Date.now(),
          photoFactor: factor,
          timestamp: Date.now()
        });
      }
    }
  };

  const startAutoChange = (increment) => {
    // Cambio inmediato
    setAutoChangeInput(prev => Math.max(0, parseInt(prev || 0) + (increment ? 1 : -1)));
    
    // Configurar intervalo para cambios rápidos
    const interval = setInterval(() => {
      setAutoChangeInput(prev => Math.max(0, parseInt(prev || 0) + (increment ? 1 : -1)));
    }, 100); // Cambio cada 100ms

    setAutoChangeInterval(interval);
  };

  const stopAutoChange = () => {
    if (autoChangeInterval) {
      clearInterval(autoChangeInterval);
      setAutoChangeInterval(null);
    }
  };

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (autoChangeInterval) {
        clearInterval(autoChangeInterval);
      }
    };
  }, [autoChangeInterval]);

  return (
    <div className="controles">
      <div className="controles-content">
        <div className="controles-section">
          <h2>COlecciones</h2>
          <div className="controles-buttons">
            {Object.values(galerias)
              .sort((a, b) => a.id === 'ninguna' ? -1 : b.id === 'ninguna' ? 1 : 0)
              .map(galeria => (
              <button
                key={galeria.id}
                className={`controles-btn${coleccionActual === galeria.id ? ' active' : ''}`}
                onClick={() => cambiarColeccion(galeria.id)}
              >
                {galeria.nombre}
              </button>
            ))}
          </div>
          <label className="controles-checkbox">
            <input
              type="checkbox"
              checked={circularImages}
              onChange={handleCircularImagesChange}
            />
            <span>Imágenes Circulares</span>
          </label>
          <label className="controles-checkbox">
            <input
              type="checkbox"
              checked={shakeImage}
              onChange={handleShakeImageChange}
            />
            <span>Menear Imagen</span>
          </label>
        </div>

        <div className="controles-section">
          <h2>Formato de Fondo</h2>
          <div className="format-controls">
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
            <form onSubmit={handleAutoChangeTimeSubmit} className="auto-change-form">
              <div className="auto-change-input-container">
                <input
                  type="number"
                  value={autoChangeInput}
                  onChange={handleAutoChangeTimeChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Segundos"
                  min="0"
                  className="auto-change-input"
                />
                <div className="auto-change-buttons">
                  <button 
                    type="button" 
                    className="auto-change-button down"
                    onMouseDown={() => startAutoChange(false)}
                    onMouseUp={stopAutoChange}
                    onMouseLeave={stopAutoChange}
                    onTouchStart={() => startAutoChange(false)}
                    onTouchEnd={stopAutoChange}
                  />
                  <button 
                    type="button" 
                    className="auto-change-button up"
                    onMouseDown={() => startAutoChange(true)}
                    onMouseUp={stopAutoChange}
                    onMouseLeave={stopAutoChange}
                    onTouchStart={() => startAutoChange(true)}
                    onTouchEnd={stopAutoChange}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`auto-change-btn${isInputModified ? ' modified' : ''}`}
                style={{
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${autoChangeTime === 0 ? '100%' : ((autoChangeTime - timeRemaining) / autoChangeTime) * 100}%`,
                  backgroundColor: 'rgba(0, 255, 0, 0.3)',
                  transition: 'width 1s linear'
                }} />
                <span style={{ position: 'relative', zIndex: 1 }}>
                  Actualizar {timeRemaining > 0 ? timeRemaining : 0}s
                </span>
              </button>
            </form>
          </div>
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
          <label className="controles-checkbox">
            <input
              type="checkbox"
              checked={extraSensitiveMode}
              onChange={handleExtraSensitiveModeChange}
            />
            <span>Modo Extra Sensible (cambios muy rápidos)</span>
          </label>
          <label className="controles-checkbox">
            <input
              type="checkbox"
              checked={pursuitMode}
              onChange={handlePursuitModeChange}
            />
            <span>Modo Persecución (cambios extremadamente rápidos)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Controles;