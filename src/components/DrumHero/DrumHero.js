import React, { useRef, useState, useEffect } from "react";
import "./DrumHero.scss";
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { colecciones } from '../../data/GaticosYMonetes';

const DrumHero = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [currentPolygon, setCurrentPolygon] = useState({ 
    sides: 3, 
    color: '#ff3366', 
    rotation: 0,
    direction: 1,
    borderRadius: 0
  });
  const [isPulsing, setIsPulsing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
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
  const lastPulseTime = useRef(0);
  const socketRef = useRef(null);

  const generateRandomColor = () => {
    const colors = [
      '#ff3366', '#33ff66', '#3366ff', '#ff33ff', '#33ffff',
      '#ff6633', '#66ff33', '#6633ff', '#ff66ff', '#66ffff'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const generateRandomBackgroundColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 10%)`;
  };

  const generateRandomPolygon = () => {
    const sides = Math.floor(Math.random() * 5) + 3;
    const color = generateRandomColor();
    const rotation = Math.random() * 360;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const borderRadius = Math.random() * 50;
    return { sides, color, rotation, direction, borderRadius };
  };

  const handlePulse = () => {
    const currentTime = Date.now();
    if (currentTime - lastPulseTime.current > 300) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 300);
      lastPulseTime.current = currentTime;
    }
  };

  const handleTransform = () => {
    const currentTime = Date.now();
    if (currentTime - lastTransformTime.current > 2000) {
      setIsTransforming(true);
      setCurrentPolygon(generateRandomPolygon());
      setTimeout(() => {
        setIsTransforming(false);
        setIsRotating(true);
      }, 500);
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
        setIsRotating(true);

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
    let lastChangeTime = 0;
    const minChangeInterval = 50;
    let lastIntensity = 0;
    let beatCount = 0;

    const analyzeAudio = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      const currentTime = Date.now();
      
      if (intensidad > 10 && intensidad > lastIntensity * 1.1) {
        handlePulse();
        beatCount++;

        // Actualizar los kudos activos con el ritmo
        setActiveKudos(prev => prev.map(kudo => ({
          ...kudo,
          scale: kudo.scale * (1 + (intensidad / 100)),
          rotation: kudo.rotation + (Math.random() * 20 - 10)
        })));

        if (beatCount % 4 === 0) {
          setBackgroundColor(generateRandomBackgroundColor());
        }

        handleTransform();

        if ((currentTime - lastChangeTime) > minChangeInterval) {
          setCurrentImageIndex(prev => (prev + 1) % petImages.length);
          lastChangeTime = currentTime;
        }
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
      setIsRotating(false);
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
    const { sides, color, rotation, direction, borderRadius } = currentPolygon;
    const points = Array.from({ length: sides }, (_, i) => {
      const angle = (i * 2 * Math.PI) / sides;
      const x = 50 + 50 * Math.cos(angle);
      const y = 50 + 50 * Math.sin(angle);
      return `${x}% ${y}%`;
    }).join(', ');

    return {
      clipPath: `polygon(${points})`,
      backgroundColor: color,
      '--initial-rotation': `${rotation}deg`,
      '--rotation-direction': direction,
      '--border-radius': `${borderRadius}%`
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
      console.log('DrumHero: Conectado al servidor Socket.IO');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('DrumHero: Error de conexión Socket.IO:', error);
    });

    socketRef.current.on('disconnect', () => {
      console.log('DrumHero: Desconectado del servidor Socket.IO');
    });

    socketRef.current.on('kudo', (kudo) => {
      console.log('DrumHero: Recibido kudo:', kudo);
      
      // Si el emoji es 🐱 o 🐶, cambiar la colección
      if (kudo.emoji === '🐱' || kudo.emoji === '🐶') {
        if (kudo.emoji === '🐱') {
          console.log('DrumHero: Cambiando a colección de gatos');
          setPetImages(colecciones.gatos.imagenes);
          setColeccionActual('gatos');
        } else {
          console.log('DrumHero: Cambiando a colección de perros');
          setPetImages(colecciones.perros.imagenes);
          setColeccionActual('perros');
        }
        setCurrentImageIndex(0);
      } else {
        // Manejo normal de kudos
        if (!kudosRef.current.has(kudo.id)) {
          kudosRef.current.add(kudo.id);
          
          const x = Math.random() * 80 + 10;
          const y = Math.random() * 80 + 10;
          
          const newKudo = {
            ...kudo,
            scale: Math.random() * 0.5 + 0.5,
            rotation: Math.random() * 360,
            x: x,
            y: y,
            opacity: 1,
            startTime: Date.now()
          };

          setActiveKudos(prev => [...prev, newKudo]);

          setTimeout(() => {
            kudosRef.current.delete(kudo.id);
            setActiveKudos(prev => prev.filter(k => k.id !== kudo.id));
          }, 5000);
        }
      }
    });

    socketRef.current.on('cambiar-coleccion', (data) => {
      console.log('DrumHero: Recibido evento cambiar-coleccion:', data);
      const { coleccion } = data;
      console.log('DrumHero: Colección recibida:', coleccion);
      
      if (coleccion === 'gatos') {
        console.log('DrumHero: Cambiando a colección de gatos');
        setPetImages(colecciones.gatos.imagenes);
      } else if (coleccion === 'perros') {
        console.log('DrumHero: Cambiando a colección de perros');
        setPetImages(colecciones.perros.imagenes);
      }
      
      setColeccionActual(coleccion);
      setCurrentImageIndex(0);
      console.log('DrumHero: Colección actualizada a:', coleccion);
      console.log('DrumHero: Imágenes actualizadas:', petImages);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Efecto para depuración
  useEffect(() => {
    console.log('DrumHero: Estado actualizado - coleccionActual:', coleccionActual);
    console.log('DrumHero: Estado actualizado - petImages:', petImages);
  }, [coleccionActual, petImages]);

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
          className={`polygon ${isRotating ? 'rotating' : ''} ${isPulsing ? 'pulsing' : ''} ${isTransforming ? 'transforming' : ''}`} 
          style={getPolygonStyle()} 
        />
        <img 
          src={petImages[currentImageIndex]} 
          alt={`Pet ${currentImageIndex + 1}`}
          className={`pet-image ${isPulsing ? 'pulsing' : ''}`}
          key={petImages[currentImageIndex]}
        />
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