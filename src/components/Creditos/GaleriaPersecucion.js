import React, { useState, useEffect, useRef } from 'react';
import './GaleriaPersecucion.scss';

const GaleriaPersecucion = ({ audioRef, startTime, endTime, analyser }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [speedFactor, setSpeedFactor] = useState(1); // Factor multiplicador de velocidad
  const [pulseScale, setPulseScale] = useState(1);
  const [pulseGlow, setPulseGlow] = useState(0);
  const energyHistoryRef = useRef([]);
  const lastChangeTimeRef = useRef(Date.now());
  const energyHistoryLength = 3; // Reducido para más reactividad
  const compressionCanvasRef = useRef(null);
  const compressionContextRef = useRef(null);

  // Velocidad base constante (ms)
  const BASE_SPEED = 100;

  // Función para comprimir una imagen
  const compressImage = (imageUrl, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        if (!compressionCanvasRef.current) {
          compressionCanvasRef.current = document.createElement('canvas');
          compressionContextRef.current = compressionCanvasRef.current.getContext('2d');
        }

        // Calcular dimensiones manteniendo la proporción
        const maxWidth = 800; // Ancho máximo
        const maxHeight = 600; // Alto máximo
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Configurar canvas
        compressionCanvasRef.current.width = width;
        compressionCanvasRef.current.height = height;

        // Dibujar y comprimir
        compressionContextRef.current.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con compresión
        const compressedDataUrl = compressionCanvasRef.current.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  // Función para mezclar aleatoriamente un array
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Cargar y comprimir imágenes
  useEffect(() => {
    try {
      const requireContext = require.context('../../components/GaticosYMonetes/galerias', true, /\.(png|jpe?g|svg)$/);
      const allImages = requireContext.keys()
        .filter(key => {
          const pathParts = key.split('/');
          const folderName = pathParts[1];
          return !key.includes('/main/') && folderName.toLowerCase().includes('creditos');
        })
        .map(key => requireContext(key));
      
      // Comprimir todas las imágenes
      Promise.all(allImages.map(img => compressImage(img)))
        .then(compressedImages => {
          const shuffledImages = shuffleArray(compressedImages);
          console.log('Galería Persecución: Imágenes cargadas, comprimidas y mezcladas:', shuffledImages.length);
          setImages(shuffledImages);
        })
        .catch(error => {
          console.error('Error al comprimir imágenes:', error);
          // Si falla la compresión, usar las imágenes originales
          const shuffledImages = shuffleArray(allImages);
          setImages(shuffledImages);
        });
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      setImages([]);
    }
  }, []);

  // Controlar visibilidad y opacidad basado en el tiempo del audio
  useEffect(() => {
    const checkVisibility = () => {
      if (!audioRef?.current) return;
      
      const currentTime = audioRef.current.currentTime;
      const transitionDuration = 5;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        if (currentTime < startTime + transitionDuration) {
          const progress = (currentTime - startTime) / transitionDuration;
          setOpacity(progress);
        } 
        else if (currentTime > endTime - transitionDuration) {
          const progress = (endTime - currentTime) / transitionDuration;
          setOpacity(progress);
        } 
        else {
          setOpacity(1);
        }
        
        if (!isVisible) {
          console.log('Galería Persecución: Mostrando galería');
          setIsVisible(true);
        }
      } else {
        if (isVisible) {
          console.log('Galería Persecución: Ocultando galería');
          setIsVisible(false);
          setOpacity(0);
        }
      }
    };

    const audioElement = audioRef?.current;
    if (!audioElement) return;

    checkVisibility();

    audioElement.addEventListener('timeupdate', checkVisibility);
    audioElement.addEventListener('seeking', checkVisibility);
    audioElement.addEventListener('seeked', checkVisibility);

    return () => {
      audioElement.removeEventListener('timeupdate', checkVisibility);
      audioElement.removeEventListener('seeking', checkVisibility);
      audioElement.removeEventListener('seeked', checkVisibility);
    };
  }, [audioRef, startTime, endTime, isVisible]);

  // Analizar la música y actualizar el factor de velocidad y el pulso
  useEffect(() => {
    if (!isVisible || !analyser || images.length === 0) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyzeAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Analizar solo las frecuencias bajas y medias para el pulso
      const lowMidFreqs = dataArray.slice(0, bufferLength * 0.4);
      const instantEnergy = lowMidFreqs.reduce((sum, value) => sum + value, 0) / lowMidFreqs.length;
      
      // Normalizar la energía instantánea con un umbral más bajo
      const normalizedEnergy = Math.min(1, instantEnergy / 15);
      
      // Calcular nuevo factor de velocidad
      const newFactor = 0.2 + (normalizedEnergy * 1.8);
      setSpeedFactor(prevFactor => {
        const smoothingFactor = 0.3;
        return prevFactor + (newFactor - prevFactor) * smoothingFactor;
      });

      // Calcular efectos de pulso - mucho más agresivo
      const pulseIntensity = Math.pow(normalizedEnergy, 0.3); // Exponente más bajo para más contraste
      const baseScale = 0.85; // Más pequeño en reposo
      const maxScale = 1.4; // Más grande en picos
      const newScale = baseScale + (pulseIntensity * (maxScale - baseScale));
      
      // Aplicar el pulso directamente sin suavizado
      setPulseScale(newScale);

      // Calcular brillo del pulso - más agresivo
      const maxGlow = 150;
      const newGlow = pulseIntensity * maxGlow;
      setPulseGlow(newGlow);

      requestAnimationFrame(analyzeAudio);
    };

    const animationFrameId = requestAnimationFrame(analyzeAudio);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, analyser, images]);

  // Cambiar imágenes según la velocidad actual
  useEffect(() => {
    if (!isVisible || images.length === 0) return;

    // La velocidad real es la velocidad base dividida por el factor
    const currentSpeed = BASE_SPEED / speedFactor;

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
      lastChangeTimeRef.current = Date.now();
    }, currentSpeed);

    return () => clearInterval(interval);
  }, [isVisible, images, speedFactor]);

  if (!isVisible || images.length === 0) return null;

  return (
    <div 
      className={`galeria-persecucion ${isVisible ? 'visible' : ''}`}
      style={{
        opacity,
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      <img 
        src={images[currentImageIndex]} 
        alt={`Imagen ${currentImageIndex + 1}`}
        className="galeria-imagen"
        style={{ 
          opacity: 0.5,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          margin: 0,
          display: 'block',
          borderRadius: 0
        }}
      />
    </div>
  );
};

export default GaleriaPersecucion; 