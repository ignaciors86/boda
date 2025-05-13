import React, { useState, useEffect, useRef } from 'react';
import './GaleriaPersecucion.scss';

const GaleriaPersecucion = ({ audioRef, startTime, endTime, analyser }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [changeSpeed, setChangeSpeed] = useState(50); // Velocidad base más rápida
  const energyHistoryRef = useRef([]);
  const lastChangeTimeRef = useRef(Date.now());
  const energyHistoryLength = 5;

  // Función para mezclar aleatoriamente un array
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Cargar imágenes
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
      
      const shuffledImages = shuffleArray(allImages);
      console.log('Galería Persecución: Imágenes cargadas y mezcladas:', shuffledImages.length);
      setImages(shuffledImages);
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

  // Analizar la música y actualizar la velocidad de cambio
  useEffect(() => {
    if (!isVisible || !analyser || images.length === 0) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyzeAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const totalEnergy = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const now = Date.now();

      // Actualizar historial de energía
      energyHistoryRef.current.push(totalEnergy);
      if (energyHistoryRef.current.length > energyHistoryLength) {
        energyHistoryRef.current.shift();
      }

      const averageEnergy = energyHistoryRef.current.reduce((sum, val) => sum + val, 0) / energyHistoryRef.current.length || 1;
      
      // Calcular nueva velocidad basada en la energía - más agresivo
      const minSpeed = 10; // Velocidad máxima (ms)
      const maxSpeed = 100; // Velocidad mínima (ms)
      const normalizedEnergy = Math.min(1, totalEnergy / 80); // Umbral más bajo
      const newSpeed = Math.floor(maxSpeed - (normalizedEnergy * (maxSpeed - minSpeed)));
      
      // Suavizar el cambio de velocidad - más rápido
      setChangeSpeed(prevSpeed => {
        const smoothingFactor = 0.5; // Más rápido
        return Math.floor(prevSpeed + (newSpeed - prevSpeed) * smoothingFactor);
      });

      // Mecanismo de empuje adicional
      const timeSinceLastChange = now - lastChangeTimeRef.current;
      if (timeSinceLastChange > changeSpeed * 1.5) { // Si se atasca, forzar cambio
        setCurrentImageIndex(prev => (prev + 1) % images.length);
        lastChangeTimeRef.current = now;
      }

      requestAnimationFrame(analyzeAudio);
    };

    const animationFrameId = requestAnimationFrame(analyzeAudio);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, analyser, images, changeSpeed]);

  // Cambiar imágenes según la velocidad actual
  useEffect(() => {
    if (!isVisible || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
      lastChangeTimeRef.current = Date.now();
    }, changeSpeed);

    return () => clearInterval(interval);
  }, [isVisible, images, changeSpeed]);

  if (!isVisible || images.length === 0) return null;

  return (
    <div 
      className={`galeria-persecucion ${isVisible ? 'visible' : ''}`}
      style={{ opacity }}
    >
      <div className="galeria-contenedor">
        <img 
          src={images[currentImageIndex]} 
          alt={`Imagen ${currentImageIndex + 1}`}
          className="galeria-imagen"
          style={{ opacity }}
        />
      </div>
    </div>
  );
};

export default GaleriaPersecucion; 