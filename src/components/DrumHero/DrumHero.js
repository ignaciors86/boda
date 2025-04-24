import React, { useRef, useState, useEffect } from "react";
import "./DrumHero.scss";
import { QRCodeSVG } from 'qrcode.react';
import { ref, onChildAdded } from 'firebase/database';
import { database } from '../../firebase';

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
  const [likes, setLikes] = useState([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTransformTime = useRef(0);
  const lastPulseTime = useRef(0);

  // Imágenes de mascotas con fondo transparente
  const petImages = [
    "https://cdn-icons-png.flaticon.com/512/1076/1076984.png", // Gato 1
    "https://cdn-icons-png.flaticon.com/512/1076/1076985.png", // Gato 2
    "https://cdn-icons-png.flaticon.com/512/1076/1076986.png", // Gato 3
    "https://cdn-icons-png.flaticon.com/512/1076/1076987.png", // Gato 4
    "https://cdn-icons-png.flaticon.com/512/1076/1076988.png", // Gato 5
    "https://cdn-icons-png.flaticon.com/512/1076/1076989.png", // Perro 1
    "https://cdn-icons-png.flaticon.com/512/1076/1076990.png", // Perro 2
    "https://cdn-icons-png.flaticon.com/512/1076/1076991.png", // Perro 3
    "https://cdn-icons-png.flaticon.com/512/1076/1076992.png", // Perro 4
    "https://cdn-icons-png.flaticon.com/512/1076/1076993.png"  // Perro 5
  ];

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
      
      if (intensidad > 10 &&
          intensidad > lastIntensity * 1.1) {
        handlePulse();
        beatCount++;

        if (beatCount % 4 === 0) {
          setBackgroundColor(generateRandomBackgroundColor());
        }

        handleTransform();

        if ((currentTime - lastChangeTime) > minChangeInterval) {
          setCurrentImage(prev => (prev + 1) % petImages.length);
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

  const generateRandomHeart = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
      '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71',
      '#F1C40F', '#E67E22', '#1ABC9C', '#34495E', '#16A085',
      '#F39C12', '#D35400', '#8E44AD', '#2C3E50', '#27AE60'
    ];

    return {
      id: Date.now(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: Math.random() * 0.8 + 0.4,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 2 + 3,
      danceSpeed: Math.random() * 2 + 1,
      danceStyle: Math.random() > 0.5 ? 'dance' : 'dance2',
      floatDirection: Math.random() > 0.5 ? 'left' : 'right'
    };
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const newLike = localStorage.getItem('newLike');
      if (newLike) {
        const likeData = JSON.parse(newLike);
        const heart = {
          ...generateRandomHeart(),
          emoji: likeData.emoji || '❤️'
        };
        setLikes(prev => [...prev, heart]);
        setTimeout(() => {
          setLikes(prev => prev.filter(l => l.id !== heart.id));
        }, 3000);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="drum-hero" style={{ backgroundColor }}>
      <div className="qr-container">
        <QRCodeSVG 
          value="http://boda-umber.vercel.app/gaticos-y-monetes/kudos"
          size={150}
          level="H"
          includeMargin={true}
        />
        <p className="qr-text">Escanea para enviar likes</p>
      </div>

      <div className="likes-overlay">
        {likes.map(like => (
          <div
            key={like.id}
            className="heart"
            style={{
              left: `${like.x}%`,
              top: `${like.y}%`,
              transform: `scale(${like.scale}) rotate(${like.rotation}deg)`,
              color: like.color,
              fontSize: `${like.size}rem`,
              animation: `float-up-${like.floatDirection} 3s ease-out forwards, ${like.danceStyle} ${like.danceSpeed}s infinite`
            }}
          >
            {like.emoji}
          </div>
        ))}
      </div>

      <div className="image-container">
        <div 
          className={`polygon ${isRotating ? 'rotating' : ''} ${isPulsing ? 'pulsing' : ''} ${isTransforming ? 'transforming' : ''}`} 
          style={getPolygonStyle()} 
        />
        <img 
          src={petImages[currentImage]} 
          alt={`Pet ${currentImage + 1}`}
          className={`pet-image ${isPulsing ? 'pulsing' : ''}`}
        />
      </div>

      <button 
        onClick={togglePlay} 
        className="play-button"
      >
        {isPlaying ? 'Detener' : 'Capturar Audio'}
      </button>
    </div>
  );
};

export default DrumHero; 