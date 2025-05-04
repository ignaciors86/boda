import React, { useRef, useState, useEffect } from "react";
import "./DrumHero.scss";
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import GaleriaLoader from '../GaticosYMonetes/GaleriaLoader';
import { colecciones } from '../../data/GaticosYMonetes';
import KITT from '../KITT/KITT';
import Meteoritos from '../Backgrounds/Meteoritos/Meteoritos';
import Poligonos from '../Backgrounds/Poligonos/Poligonos';
import Pulse from '../Backgrounds/Pulse/Pulse';
import gsap from 'gsap';
import PoligonosFlotantes from '../Backgrounds/PoligonosFlotantes/PoligonosFlotantes';
import Sphere from '../GaticosYMonetes/Sphere';

const DrumHero = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [buttonVisible, setButtonVisible] = useState(true);
  const [elementOpacities, setElementOpacities] = useState({
    polygon: 1,
    image: 1,
    button: 1
  });
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
  const galerias = GaleriaLoader();
  const [coleccionActual, setColeccionActual] = useState('test');
  const [petImages, setPetImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const kudosRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTransformTime = useRef(0);
  const socketRef = useRef(null);
  const [qrColor, setQrColor] = useState('#00ff00'); // Color inicial neon verde
  const [imagePolygonState, setImagePolygonState] = useState({ 
    sides: 4, 
    color: '#ff3366', 
    rotation: 0,
    scale: 1,
    opacity: 1,
    rotationDirection: 1
  });
  const rotationSpeedRef = useRef(0.15);
  const MAX_ROTATION = 25; // Máximo ángulo de rotación permitido
  const [isPulsingPolygon, setIsPulsingPolygon] = useState(false);
  const [isPulsingImage, setIsPulsingImage] = useState(false);
  const [backgroundFormat, setBackgroundFormat] = useState(() => {
    const savedFormat = localStorage.getItem('backgroundFormat');
    return savedFormat || 'polygons';
  });
  const [sensitiveMode, setSensitiveMode] = useState(() => {
    const savedMode = localStorage.getItem('sensitiveMode');
    return savedMode === 'true';
  });
  const [energyHistory, setEnergyHistory] = useState([]);
  const [bassEnergy, setBassEnergy] = useState(0);
  const [midEnergy, setMidEnergy] = useState(0);
  const [trebleEnergy, setTrebleEnergy] = useState(0);
  const [beatThreshold, setBeatThreshold] = useState(1.3);
  const [energyHistoryLength] = useState(10);
  const [lastImageChange, setLastImageChange] = useState(Date.now());
  const [pulseCircle, setPulseCircle] = useState({
    size: 1,
    color: '#ff3366',
    opacity: 0.8
  });
  const [backgroundPolygon, setBackgroundPolygon] = useState({
    sides: 3,
    color: '#ff3366',
    rotation: 0,
    scale: 1,
    opacity: 0.8
  });
  const [imageOrientation, setImageOrientation] = useState('landscape');
  const kudosDataRef = useRef([]);
  const elementsRef = useRef({});
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const emojisContainerRef = useRef(null);

  // Nuevos refs para manejar estados que no necesitan re-renders
  const energyHistoryRef = useRef([]);
  const lastPulseTimeRef = useRef(Date.now());
  const lastImageChangeRef = useRef(Date.now());
  const lastEnergyUpdateRef = useRef(Date.now());
  const lastColorUpdateRef = useRef(Date.now());
  const beatThresholdRef = useRef(1.3);
  const energyHistoryLengthRef = useRef(10);

  const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 30) + 70; // 70-100%
    const lightness = Math.floor(Math.random() * 20) + 40; // 40-60%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const generateRandomBackgroundColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 10%)`;
  };

  const updatePolygon = (intensidad) => {
    if (backgroundFormat !== 'polygons') return;

    const currentTime = Date.now();
    const baseInterval = 50;
    const adjustedInterval = baseInterval / 2.5;
    
    if (currentTime - lastTransformTime.current > adjustedInterval) {
      const newSides = Math.floor(Math.random() * 5) + 3;
      const newRotation = backgroundPolygon.rotation + (Math.random() * 20 - 10);
      const newScale = 1 + (intensidad / 200);
      const newOpacity = Math.max(0.1, Math.min(0.9, intensidad / 255));
      
      setBackgroundPolygon({
        sides: newSides,
        color: generateRandomColor(),
        rotation: newRotation,
        scale: newScale,
        opacity: newOpacity
      });
      
      lastTransformTime.current = currentTime;
    }
  };

  const updatePulseCircle = (intensidad) => {
    if (backgroundFormat !== 'pulse') return;

    const currentTime = Date.now();
    const baseInterval = 50;
    
    if (currentTime - lastTransformTime.current > baseInterval) {
      const targetSize = 0.15 + (intensidad / 150);
      const currentSize = pulseCircle.size;
      const newSize = currentSize + (targetSize - currentSize) * 0.2;
      
      const newOpacity = Math.max(0.3, Math.min(0.9, intensidad / 128));
      
      const hue = Math.floor(Math.random() * 60) + 180;
      const newColor = `hsl(${hue}, 100%, 50%)`;
      
      setPulseCircle({
        size: newSize,
        color: newColor,
        opacity: newOpacity
      });
      
      lastTransformTime.current = currentTime;
    }
  };

  const handlePulse = () => {
    const currentTime = Date.now();
    if (currentTime - lastTransformTime.current > 300) {
      setIsPulsingPolygon(true);
      setIsPulsingImage(true);
      setTimeout(() => setIsPulsingPolygon(false), 500);
      setTimeout(() => setIsPulsingImage(false), 500);
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
          setButtonVisible(true);
        };

        audioContextRef.current = newAudioContext;
        analyserRef.current = newAnalyser;
        setIsPlaying(true);
        setTimeout(() => setButtonVisible(false), 100); // Desvanecer el botón después de un breve retraso

      } catch (error) {
        console.error('Error al acceder al audio del sistema:', error);
        setIsPlaying(false);
        setButtonVisible(true);
      }
    } catch (error) {
      console.error('Error al iniciar audio del sistema:', error);
      setIsPlaying(false);
      setButtonVisible(true);
    }
  };

  const updateElementOpacities = (intensidad) => {
    const umbralBajo = 30;
    const tiempoDesvanecimiento = 8000;
    
    const smoothFade = (value) => {
      const t = Math.max(0, Math.min(1, (value - umbralBajo/2) / (umbralBajo/2)));
      return t * t * (3 - 2 * t);
    };

    // Calcular la rotación basada en el tiempo para un movimiento suave
    const tiempo = Date.now() / 1000; // Convertir a segundos
    const rotacion = Math.sin(tiempo * 0.5) * 5; // Oscila entre -5 y 5 grados
    
    if (intensidad < umbralBajo) {
      const opacidad = smoothFade(intensidad);
      const scale = Math.max(0.3, opacidad);
      
      setElementOpacities(prev => ({
        polygon: Math.max(0.1, prev.polygon + (opacidad - prev.polygon) * 0.1),
        image: Math.max(0, prev.image + (opacidad - prev.image) * 0.1),
        button: Math.max(0.1, prev.button + (opacidad - prev.button) * 0.1)
      }));

      setImagePolygonState(prev => ({
        ...prev,
        scale: scale,
        rotation: rotacion
      }));

      if (backgroundFormat === 'polygons') {
        updatePolygon(intensidad);
      } else if (backgroundFormat === 'pulse') {
        updatePulseCircle(intensidad);
      }
    } else {
      const scale = Math.min(1.2, 1 + (intensidad / 200));
      
      setElementOpacities(prev => ({
        polygon: prev.polygon + (1 - prev.polygon) * 0.1,
        image: prev.image + (1 - prev.image) * 0.1,
        button: prev.button + (1 - prev.button) * 0.1
      }));

      setImagePolygonState(prev => ({
        ...prev,
        scale: scale,
        rotation: rotacion
      }));

      if (backgroundFormat === 'polygons') {
        updatePolygon(intensidad);
      } else if (backgroundFormat === 'pulse') {
        updatePulseCircle(intensidad);
      }
    }
  };

  const calculateContrastingColor = (bgColor) => {
    // Convertir el color de fondo a HSL
    const temp = document.createElement('div');
    temp.style.color = bgColor;
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp);
    const rgb = computed.color.match(/\d+/g);
    document.body.removeChild(temp);

    // Convertir RGB a HSL
    let r = rgb[0] / 255;
    let g = rgb[1] / 255;
    let b = rgb[2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    // Calcular color complementario
    h = (h + 0.5) % 1;
    s = 1; // Saturación máxima para efecto neon
    l = 0.5; // Luminosidad media

    // Convertir HSL a RGB
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r2, g2, b2;
    if (s === 0) {
      r2 = g2 = b2 = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r2 = hue2rgb(p, q, h + 1/3);
      g2 = hue2rgb(p, q, h);
      b2 = hue2rgb(p, q, h - 1/3);
    }

    return `rgb(${Math.round(r2 * 255)}, ${Math.round(g2 * 255)}, ${Math.round(b2 * 255)})`;
  };

  const updateQrColor = (intensidad) => {
    // Usar una función seno para un cambio más suave
    const hue = Math.sin(Date.now() / 5000) * 60 + 120; // Oscila entre 60 y 180 grados
    const saturation = 100;
    const lightness = 50 + (Math.sin(Date.now() / 3000) * 10); // Oscila suavemente entre 40 y 60
    
    const newColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    setQrColor(newColor);
  };

  useEffect(() => {
    if (!isPlaying || !analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId = null;

    const analyzeAudio = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const totalEnergy = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const now = Date.now();

      // Actualizar historial de energía solo cada 100ms
      if (now - lastEnergyUpdateRef.current > 100) {
        energyHistoryRef.current = [...energyHistoryRef.current, totalEnergy];
        if (energyHistoryRef.current.length > energyHistoryLengthRef.current) {
          energyHistoryRef.current.shift();
        }
        lastEnergyUpdateRef.current = now;
      }

      const averageEnergy = energyHistoryRef.current.reduce((sum, val) => sum + val, 0) / energyHistoryRef.current.length || 1;
      const isBeat = totalEnergy > averageEnergy * (sensitiveMode ? 1.1 : beatThresholdRef.current);

      if (isBeat) {
        const timeSinceLastPulse = now - lastPulseTimeRef.current;
        const timeSinceLastImage = now - lastImageChangeRef.current;
        
        if (timeSinceLastPulse >= (sensitiveMode ? 200 : 500)) {
          if (backgroundFormat === 'polygons') {
            updatePolygon(totalEnergy);
          } else {
            updatePulseCircle(totalEnergy);
          }
          handlePulse();
          
          // Modificar el tiempo mínimo entre cambios de imagen según el modo
          const minImageChangeTime = sensitiveMode ? 50 : 1000;
          if (timeSinceLastImage >= minImageChangeTime && petImages.length > 0) {
            setCurrentImageIndex(prev => (prev + 1) % petImages.length);
            lastImageChangeRef.current = now;
            
            const newSides = Math.floor(Math.random() * 5) + 3;
            setImagePolygonState(prev => ({
              ...prev,
              sides: newSides,
              scale: 1 + (totalEnergy / 400)
            }));
          }

          lastPulseTimeRef.current = now;
        }
      }

      if (now - lastColorUpdateRef.current > 50) {
        updateQrColor(totalEnergy);
        lastColorUpdateRef.current = now;
      }

      updateElementOpacities(totalEnergy);
      animationFrameId = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, petImages, backgroundFormat, sensitiveMode]);

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

  const getBackgroundStyle = () => {
    if (backgroundFormat === 'polygons') {
      const { sides, color, rotation, scale, opacity } = backgroundPolygon;
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
        opacity: opacity * elementOpacities.polygon,
        transition: 'all 0.3s ease-out',
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'block'
      };
    } else {
      const { size, color, opacity } = pulseCircle;
      return {
        clipPath: 'circle(50% at 50% 50%)',
        backgroundColor: color,
        opacity: opacity * elementOpacities.polygon,
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '100vmin',
        height: '100vmin',
        transform: `translate(-50%, -50%) scale(${size})`,
        display: 'block',
        zIndex: 1,
        boxShadow: `0 0 30px ${color}`,
        filter: 'blur(1px)',
        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        mixBlendMode: 'screen',
        willChange: 'transform, opacity, box-shadow'
      };
    }
  };

  const getImagePolygonStyle = () => {
    const { rotation, scale } = imagePolygonState;
    return {
      transform: `rotate(${rotation}deg) scale(${scale})`,
      transition: 'all 0.3s ease-out',
      position: 'relative',
      width: '80%',
      height: '80%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
      console.log('DrumHero: Socket conectado');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('DrumHero: Error de conexión Socket.IO:', error);
    });

    socketRef.current.on('sensitive-mode-change', (data) => {
      console.log('DrumHero: Recibido cambio de modo sensible:', data);
      setSensitiveMode(data.enabled);
    });

    socketRef.current.on('kudo', (data) => {
      console.log('DrumHero: Recibido kudo:', data);
      
      if (data.coleccion) {
        console.log('DrumHero: Cambiando a colección:', data.coleccion);
        setPetImages(galerias[data.coleccion]?.imagenes || []);
        setColeccionActual(data.coleccion);
        setCurrentImageIndex(0);
      } else {
        if (!kudosRef.current.has(data.id)) {
          kudosRef.current.add(data.id);
          
          // Verificar que el contenedor existe
          if (!containerRef.current) {
            console.warn('DrumHero: El contenedor no está disponible aún');
            return;
          }

          const container = containerRef.current;
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;
          const bubbleSize = 6 * (window.innerWidth / 100); // 6vw
          const margin = 1 * (window.innerWidth / 100); // 1vw

          // Generar posición inicial aleatoria dentro del contenedor
          const x = Math.random() * (containerWidth - 2 * margin - bubbleSize) + margin;
          const y = Math.random() * (containerHeight - 2 * margin - bubbleSize) + margin;
          
          // Generar propiedades de animación
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5; // Velocidad constante
          const freq = 0.3; // Frecuencia constante
          const phase = Math.random() * Math.PI * 2;
          const minScale = 1.2;
          const maxScale = 2.2;
          const baseScale = Math.random() * (maxScale - minScale) + minScale;
          
          // Color aleatorio translúcido
          const r = Math.floor(Math.random() * 200 + 30);
          const g = Math.floor(Math.random() * 200 + 30);
          const b = Math.floor(Math.random() * 200 + 30);
          const bgColor = `rgba(${r},${g},${b},0.45)`;

          const kudoData = {
            ...data,
            x,
            y,
            angle,
            speed,
            freq,
            phase,
            minScale,
            maxScale,
            baseScale,
            bgColor,
            id: Date.now(),
            opacity: 1
          };

          setActiveKudos(prev => [...prev, kudoData]);
          kudosDataRef.current.push(kudoData);

          // Efecto de onda al aparecer
          const element = elementsRef.current[kudoData.id];
          if (element) {
            const wave = document.createElement('div');
            wave.className = 'pulse-wave css-pulse';
            element.appendChild(wave);
            setTimeout(() => wave.remove(), 700);
          }

          // Desvanecimiento suave antes de desaparecer
          setTimeout(() => {
            const element = elementsRef.current[kudoData.id];
            if (element) {
              gsap.to(element, {
                opacity: 0,
                scale: 0.8,
                duration: 1,
                ease: "power2.in",
                onComplete: () => {
                  kudosRef.current.delete(data.id);
                  setActiveKudos(prev => prev.filter(k => k.id !== kudoData.id));
                  kudosDataRef.current = kudosDataRef.current.filter(k => k.id !== kudoData.id);
                  if (elementsRef.current[kudoData.id]) {
                    delete elementsRef.current[kudoData.id];
                  }
                }
              });
            }
          }, 9000); // Comenzar desvanecimiento 1 segundo antes de desaparecer
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [galerias]);

  // Animación de kudos recibidos
  useEffect(() => {
    if (emojisContainerRef.current) {
      const container = emojisContainerRef.current;
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const bubbleSizeVW = 6; // 6vw ~ 80px en 1366px de ancho
      const bubbleSize = bubbleSizeVW * vw;
      const marginVW = 1; // 1vw
      const margin = marginVW * vw;

      function animateKudos(time) {
        kudosDataRef.current.forEach(kudo => {
          const element = elementsRef.current[kudo.id];
          if (!element) return;

          // Calcular nueva posición
          let newX = kudo.x + Math.cos(kudo.angle) * kudo.speed;
          let newY = kudo.y + Math.sin(kudo.angle) * kudo.speed;

          // Oscilación de tamaño
          const t = (time || 0) / 1000;
          const scale = kudo.minScale + (kudo.maxScale - kudo.minScale) * 0.5 * (1 + Math.sin(kudo.freq * t + kudo.phase));
          const radio = (bubbleSize * scale) / 2;

          // Rebote en los bordes
          if (newX < radio) {
            newX = radio;
            kudo.angle = Math.PI - kudo.angle;
          } else if (newX > containerWidth - radio) {
            newX = containerWidth - radio;
            kudo.angle = Math.PI - kudo.angle;
          }
          if (newY < radio) {
            newY = radio;
            kudo.angle = -kudo.angle;
          } else if (newY > containerHeight - radio) {
            newY = containerHeight - radio;
            kudo.angle = -kudo.angle;
          }

          kudo.x = newX;
          kudo.y = newY;

          gsap.set(element, { 
            x: kudo.x, 
            y: kudo.y, 
            scale, 
            backgroundColor: kudo.bgColor 
          });
        });

        requestAnimationFrame(animateKudos);
      }

      // Limpiar animación anterior si existe
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Iniciar nueva animación
      animateKudos();

      // Limpiar al desmontar
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, []);

  const renderActiveKudos = () => {
    return activeKudos.map((kudo) => {
      const direction = 1;
      const speed = 8;

      return (
        <div
          key={kudo.id}
          ref={el => {
            if (el && !elementsRef.current[kudo.id]) {
              elementsRef.current[kudo.id] = el;
              // Animación de aparición
              gsap.fromTo(el, 
                { scale: 0, opacity: 0 },
                { 
                  scale: kudo.baseScale, 
                  opacity: 1,
                  duration: 0.5,
                  ease: "back.out(1.7)",
                  onComplete: () => {
                    // Añadir y animar el pulso
                    const wave = document.createElement('div');
                    wave.className = 'pulse-wave css-pulse';
                    el.appendChild(wave);
                    setTimeout(() => wave.remove(), 700);
                  }
                }
              );
            }
          }}
          className="emoji-option dragonball"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 165, 0, 0.8), rgba(255, 69, 0, 0.4))',
            perspective: '600px',
            overflow: 'visible',
            position: 'absolute',
            left: `${kudo.x}px`,
            top: `${kudo.y}px`,
            width: '6vw',
            height: '6vw',
            minWidth: 48,
            minHeight: 48,
            maxWidth: 120,
            maxHeight: 120,
            transform: `scale(${kudo.baseScale})`,
            opacity: kudo.opacity,
            borderRadius: '50%',
            boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)',
            animation: 'dragonballGlow 2s infinite alternate'
          }}
        >
          <Sphere speed={speed} direction={direction}>
            <span className="dragonball-face front" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backfaceVisibility: 'hidden',
              fontSize: '4.2vw',
              filter: 'drop-shadow(0 0 0.5vw #fff8)'
            }}>
              {kudo.emoji}
            </span>
            <span className="dragonball-face back" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'block',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}>
              <span style={{position: 'relative', width: '100%', height: '100%', display: 'block'}}>
                <span style={{ 
                  position: 'absolute',
                  fontSize: '2vw',
                  color: '#d32f2f',
                  zIndex: 1,
                  filter: 'drop-shadow(0 0 0.3vw #0008)'
                }}>★</span>
                <span style={{ 
                  position: 'absolute',
                  fontSize: '0.8vw',
                  zIndex: 2,
                  filter: 'drop-shadow(0 0 0.1vw #000)'
                }}>{kudo.emoji}</span>
              </span>
            </span>
          </Sphere>
        </div>
      );
    });
  };

  // Efecto para depuración
  useEffect(() => {
    console.log('DrumHero: Estado actualizado - coleccionActual:', coleccionActual);
    console.log('DrumHero: Estado actualizado - petImages:', petImages);
    console.log('DrumHero: Estado actualizado - currentImageIndex:', currentImageIndex);
  }, [coleccionActual, petImages, currentImageIndex]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error al intentar entrar en modo pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    // Actualizar las imágenes cuando se carguen las galerías
    if (galerias.test?.imagenes?.length > 0) {
      console.log('DrumHero: Usando imágenes locales de test');
      setPetImages(galerias.test.imagenes);
    } else {
      console.log('DrumHero: Usando imágenes de ejemplo');
      setPetImages(colecciones.gatos.imagenes);
    }
  }, [galerias]);

  // Añadimos un efecto para escuchar cambios en localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'backgroundFormat') {
        console.log('DrumHero: Cambio detectado en formato de fondo:', e.newValue);
        setBackgroundFormat(e.newValue);
        if (e.newValue === 'polygons') {
          setBackgroundPolygon({
            sides: 3,
            color: generateRandomColor(),
            rotation: 0,
            scale: 1,
            opacity: 0.8
          });
        } else if (e.newValue === 'pulse') {
          setPulseCircle({
            size: 1,
            color: generateRandomColor(),
            opacity: 0.8
          });
          updatePulseCircle(128);
        }
      } else if (e.key === 'sensitiveMode') {
        console.log('DrumHero: Cambio detectado en modo sensible:', e.newValue);
        setSensitiveMode(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (petImages.length > 0) {
      const img = new Image();
      img.src = petImages[currentImageIndex];
      img.onload = () => {
        const orientation = img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape';
        setImageOrientation(orientation);
      };
    }
  }, [currentImageIndex, petImages]);

  return (
    <div className="drum-hero" style={{ backgroundColor }} ref={containerRef}>
      <button 
        onClick={toggleFullScreen} 
        className="fullscreen-button"
        title="Pantalla completa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      </button>

      <div className="qr-container">
        <QRCodeSVG 
          value={`${window.location.protocol}//${window.location.hostname === 'localhost' ? (localIp || 'localhost') : window.location.hostname}${window.location.hostname === 'localhost' ? ':3000' : ''}/gaticos-y-monetes/kudos`}
          size={Math.min(window.innerWidth * 0.1, 100)}
          level="H"
          includeMargin={true}
          bgColor="transparent"
          fgColor={qrColor}
          style={{
            filter: 'drop-shadow(0 0 5px currentColor)',
            transition: 'color 0.5s ease-out'
          }}
        />
        <p className="qr-text" style={{ color: qrColor, transition: 'color 0.5s ease-out' }}>Escanea para enviar likes</p>
      </div>

      <div className="qr-container henar">
        <QRCodeSVG 
          value={`${window.location.protocol}//${window.location.hostname === 'localhost' ? (localIp || 'localhost') : window.location.hostname}${window.location.hostname === 'localhost' ? ':3000' : ''}/gaticos-y-monetes/controles`}
          size={Math.min(window.innerWidth * 0.1, 100)}
          level="H"
          includeMargin={true}
          bgColor="transparent"
          fgColor={qrColor}
          style={{
            filter: 'drop-shadow(0 0 5px currentColor)',
            transition: 'color 0.5s ease-out'
          }}
        />
        <p className="qr-text" style={{ color: qrColor, transition: 'color 0.5s ease-out' }}>SOLO PARA ENAR</p>
      </div>

      <div className="image-container">
        {backgroundFormat === 'pulse' && (
          <div 
            className={`background ${isPulsingPolygon ? 'pulsing' : ''}`}
            style={getBackgroundStyle()}
          />
        )}
        <div 
          className={`image-wrapper ${isPulsingImage ? 'pulsing' : ''}`}
          style={{...getImagePolygonStyle(), opacity: elementOpacities.image}}
        >
          {petImages.length > 0 && (
            <img
              src={petImages[currentImageIndex]}
              alt={`Pet ${currentImageIndex + 1}`}
              className="pet-image"
              data-orientation={imageOrientation}
            />
          )}
        </div>
      </div>

      <div className="emojis-container" ref={emojisContainerRef}>
        {renderActiveKudos()}
      </div>

      <button 
        onClick={togglePlay} 
        className={`play-button ${!buttonVisible ? 'hidden' : ''}`}
        style={{ 
          opacity: buttonVisible ? elementOpacities.button : 0,
          pointerEvents: buttonVisible ? 'auto' : 'none',
          transform: `translateX(-50%) scale(${buttonVisible ? 1 : 0.8})`,
          zIndex: 1000
        }}
      >
        {isPlaying ? 'Detener' : 'Capturar Audio'}
      </button>

      <div className="background" style={{ backgroundColor }}>
        {backgroundFormat === 'polygons' && <Poligonos analyser={analyserRef.current} />}
        {backgroundFormat === 'poligonos-flotantes' && <PoligonosFlotantes analyser={analyserRef.current} />}
        {backgroundFormat === 'pulse' && <Pulse analyser={analyserRef.current} />}
        {backgroundFormat === 'kitt' && <KITT analyser={analyserRef.current} />}
        {backgroundFormat === 'meteoritos' && <Meteoritos analyser={analyserRef.current} />}
      </div>
    </div>
  );
};

export default DrumHero; 