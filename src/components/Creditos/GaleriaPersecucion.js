import React, { useState, useEffect } from 'react';
import './GaleriaPersecucion.scss';

const GaleriaPersecucion = ({ audioRef, startTime, endTime }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

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
          // Excluir la carpeta main y solo incluir carpetas con "creditos" en el nombre
          const pathParts = key.split('/');
          const folderName = pathParts[1]; // El nombre de la carpeta está en el índice 1
          return !key.includes('/main/') && folderName.toLowerCase().includes('creditos');
        })
        .map(key => requireContext(key));
      
      // Mezclar aleatoriamente las imágenes
      const shuffledImages = shuffleArray(allImages);
      console.log('Galería Persecución: Imágenes cargadas y mezcladas:', shuffledImages.length);
      setImages(shuffledImages);
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      setImages([]);
    }
  }, []);

  // Controlar visibilidad basado en el tiempo del audio
  useEffect(() => {
    const checkVisibility = () => {
      if (!audioRef?.current) return;
      
      const currentTime = audioRef.current.currentTime;
      console.log('Galería Persecución: Tiempo actual:', currentTime, 'Rango:', startTime, '-', endTime);
      
      if (currentTime >= startTime && currentTime <= endTime) {
        if (!isVisible) {
          console.log('Galería Persecución: Mostrando galería');
          setIsVisible(true);
        }
      } else {
        if (isVisible) {
          console.log('Galería Persecución: Ocultando galería');
          setIsVisible(false);
        }
      }
    };

    const audioElement = audioRef?.current;
    if (!audioElement) return;

    // Verificar visibilidad inicial
    checkVisibility();

    // Agregar listeners para cambios de tiempo
    audioElement.addEventListener('timeupdate', checkVisibility);
    audioElement.addEventListener('seeking', checkVisibility);
    audioElement.addEventListener('seeked', checkVisibility);

    return () => {
      audioElement.removeEventListener('timeupdate', checkVisibility);
      audioElement.removeEventListener('seeking', checkVisibility);
      audioElement.removeEventListener('seeked', checkVisibility);
    };
  }, [audioRef, startTime, endTime, isVisible]);

  // Cambiar imagen cada 100ms cuando está visible
  useEffect(() => {
    if (!isVisible || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, images]);

  if (!isVisible || images.length === 0) return null;

  return (
    <div className={`galeria-persecucion ${isVisible ? 'visible' : ''}`}>
      <div className="galeria-contenedor">
        <img 
          src={images[currentImageIndex]} 
          alt={`Imagen ${currentImageIndex + 1}`}
          className="galeria-imagen"
        />
      </div>
    </div>
  );
};

export default GaleriaPersecucion; 