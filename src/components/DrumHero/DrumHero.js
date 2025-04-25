import React, { useRef, useState, useEffect } from "react";
import "./DrumHero.scss";
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { colecciones } from '../../data/GaticosYMonetes';

const DrumHero = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [polygonState, setPolygonState] = useState({ 
    sides: 3, 
    color: '#ff3366', 
    rotation: 0,
    scale: 1,
    opacity: 0.8
  });
  const [isPulsing, setIsPulsing] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [receivedKudos, setReceivedKudos] = useState([]);
  const [activeKudos, setActiveKudos] = useState([]);
  const [localIp, setLocalIp] = useState(null);
  const [coleccionActual, setColeccionActual] = useState('gatos');
  const [petImages, setPetImages] = useState(colecciones.gatos.imagenes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const kudosRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTransformTime = useRef(0);
  const socketRef = useRef(null);

  const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const generateRandomBackgroundColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 10%)`;
  };

  const updatePolygon = (intensidad) => {
    const currentTime = Date.now();
    if (currentTime - lastTransformTime.current > 50) { // Actualizar cada 50ms
      const newSides = Math.floor(Math.random() * 5) + 3;
      const newRotation = polygonState.rotation + (Math.random() * 20 - 10);
      const newScale = 1 + (intensidad / 200);
      const newOpacity = 0.6 + (intensidad / 500);
      
      setPolygonState({
        sides: newSides,
        color: generateRandomColor(),
        rotation: newRotation,
        scale: newScale,
        opacity: Math.min(newOpacity, 0.9)
      });
      
      lastTransformTime.current = currentTime;
    }
  };

  const handlePulse = () => {
    const currentTime = Date.now();
    if (currentTime - lastTransformTime.current > 300) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 300);
      lastTransformTime.current = currentTime;
    }
  };

  const desconectarAudio = async () => {
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }
  };

  const iniciarAudioSistema = async () => {
    try {
      await desconectarAudio();

      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const newAnalyser = newAudioContext.createAnalyser();
      newAnalyser.fftSize = 128;
      newAnalyser.smoothingTimeConstant = 0.05;

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            logicalSurface: true,
            cursor: "never"
          },
          audio: {
            suppressLocalAudioPlayback: false,
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            latency: 0
          },
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          systemAudio: "include"
        });

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('No se detectaron pistas de audio');
        }

        stream.getVideoTracks().forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });

        mediaStreamSourceRef.current = newAudioContext.createMediaStreamSource(stream);
        mediaStreamSourceRef.current.connect(newAnalyser);

        stream.getAudioTracks()[0].onended = () => {
          console.log('Compartir audio detenido por el usuario');
          setIsPlaying(false);
        };

        audioContextRef.current = newAudioContext;
        analyserRef.current = newAnalyser;
        setIsPlaying(true);

      } catch (error) {
        console.error('Error al acceder al audio del sistema:', error);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error al iniciar audio del sistema:', error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (!isPlaying || !analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let lastIntensity = 0;

    const analyzeAudio = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (intensidad > lastIntensity * 1.1) {
        updatePolygon(intensidad);
        handlePulse();
        setCurrentImageIndex(prev => (prev + 1) % petImages.length);
      }

      lastIntensity = intensidad;
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    if (isPlaying) {
      await desconectarAudio();
      setIsPlaying(false);
    } else {
      await iniciarAudioSistema();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      desconectarAudio();
    };
  }, []);

  const getPolygonStyle = () => {
    const { sides, color, rotation, scale, opacity } = polygonState;
    const points = Array.from({ length: sides }, (_, i) => {
      const angle = (i * 2 * Math.PI) / sides;
      const x = 50 + 50 * Math.cos(angle);
      const y = 50 + 50 * Math.sin(angle);
      return `${x}% ${y}%`;
    }).join(', ');

    return {
      clipPath: `polygon(${points})`,
      backgroundColor: color,
      transform: `rotate(${rotation}deg) scale(${scale})`,
      opacity: opacity,
      transition: 'all 0.1s ease-out'
    };
  };

  useEffect(() => {
    // Obtener la IP local
    const getLocalIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setLocalIp(data.ip);
      } catch (error) {
        console.error('Error al obtener la IP local:', error);
        // Si falla, intentamos obtener la IP de la red local
        try {
          const response = await fetch('http://localhost:3000/api/ip');
          const data = await response.json();
          setLocalIp(data.ip);
        } catch (error) {
          console.error('Error al obtener la IP local alternativa:', error);
          setLocalIp('localhost');
        }
      }
    };

    getLocalIp();
  }, []);

  useEffect(() => {
    if (!socketRef.current) {
      // Detectar si estamos en localhost basado en la URL
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const socketUrl = isDevelopment 
        ? 'http://localhost:1337' 
        : 'https://boda-strapi-production.up.railway.app';
      
      console.log('DrumHero: Inicializando socket en:', socketUrl);
      
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
        console.log('DrumHero: Socket conectado');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('DrumHero: Error de conexión Socket.IO:', error);
      });

      socketRef.current.on('kudo', (data) => {
        console.log('DrumHero: Recibido kudo:', data);
        
        // Mapeo de emojis a colecciones
        const coleccionMap = {
          '🐱': 'gatos',
          '🐶': 'perros',
          '🦫': 'capibaras',
          '🦦': 'nutrias'
        };
        
        const nuevaColeccion = coleccionMap[data.emoji];
        
        if (nuevaColeccion) {
          console.log('DrumHero: Cambiando a colección:', nuevaColeccion);
          if (colecciones[nuevaColeccion] && colecciones[nuevaColeccion].imagenes) {
            const nuevasImagenes = colecciones[nuevaColeccion].imagenes;
            console.log('DrumHero: Número de imágenes en la nueva colección:', nuevasImagenes.length);
            setPetImages(nuevasImagenes);
            setColeccionActual(nuevaColeccion);
            setCurrentImageIndex(0);
          } else {
            console.error('DrumHero: Colección no encontrada o sin imágenes:', nuevaColeccion);
          }
        } else {
          // Si no es un emoji de colección, mostrar el kudo normal
          if (!kudosRef.current.has(data.id)) {
            kudosRef.current.add(data.id);
            
            const x = Math.random() * 80 + 10; // Entre 10% y 90%
            const y = Math.random() * 80 + 10; // Entre 10% y 90%
            
            const newKudo = {
              ...data,
              scale: Math.random() * 0.5 + 0.5,
              rotation: Math.random() * 360,
              x: x,
              y: y,
              opacity: 1,
              startTime: Date.now()
            };

            setActiveKudos(prev => [...prev, newKudo]);

            setTimeout(() => {
              kudosRef.current.delete(data.id);
              setActiveKudos(prev => prev.filter(k => k.id !== data.id));
            }, 5000);
          }
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Efecto para depuración
  useEffect(() => {
    console.log('DrumHero: Estado actualizado - coleccionActual:', coleccionActual);
    console.log('DrumHero: Estado actualizado - petImages:', petImages);
    console.log('DrumHero: Estado actualizado - currentImageIndex:', currentImageIndex);
  }, [coleccionActual, petImages, currentImageIndex]);

  return (
    <div className="drum-hero" style={{ backgroundColor }}>
      <div className="qr-container">
        <QRCodeSVG 
          value={`${window.location.protocol}//${window.location.hostname === 'localhost' ? (localIp || 'localhost') : window.location.hostname}${window.location.hostname === 'localhost' ? ':3000' : ''}/gaticos-y-monetes/kudos`}
          size={150}
          level="H"
          includeMargin={true}
        />
        <p className="qr-text">Escanea para enviar likes</p>
      </div>

      <div className="image-container">
        <div 
          className="polygon"
          style={getPolygonStyle()}
        />
        <div className="image-wrapper">
          {petImages.length > 0 && (
            <img
              src={petImages[currentImageIndex]}
              alt={`Pet ${currentImageIndex + 1}`}
              className={`pet-image ${isPulsing ? 'pulsing' : ''}`}
            />
          )}
        </div>
      </div>

      <button 
        onClick={togglePlay} 
        className="play-button"
      >
        {isPlaying ? 'Detener' : 'Capturar Audio'}
      </button>

      {activeKudos.map(kudo => (
        <div
          key={kudo.id}
          className="floating-kudo"
          style={{
            left: `${kudo.x}%`,
            top: `${kudo.y}%`,
            transform: `scale(${kudo.scale}) rotate(${kudo.rotation}deg)`,
            opacity: kudo.opacity
          }}
        >
          {kudo.emoji}
        </div>
      ))}
    </div>
  );
};

export default DrumHero; 