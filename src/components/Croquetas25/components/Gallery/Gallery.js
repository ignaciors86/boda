import { useState, useEffect } from 'react';

// Hook para cargar imágenes de las galerías del track seleccionado
export const useGallery = (selectedTrack = null) => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      try {
        let imagesList = [];

        if (selectedTrack && selectedTrack.images && selectedTrack.images.length > 0) {
          // Usar las imágenes del track seleccionado
          imagesList = selectedTrack.images;
          console.log('Gallery: Usando imágenes del track:', selectedTrack.name, 'Total:', imagesList.length);
        } else {
          // Si no hay track seleccionado, cargar todas las imágenes de todos los tracks
          // Esto es para el preloader antes de seleccionar canción
          const context = require.context('../../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
          const files = context.keys();
          
          files.forEach(file => {
            const imagePath = context(file);
            imagesList.push(imagePath);
          });
          
          console.log('Gallery: Cargando todas las imágenes de tracks. Total:', imagesList.length);
        }
        
        // Precargar todas las imágenes realmente
        let loadedCount = 0;
        const totalImages = imagesList.length;
        
        if (totalImages === 0) {
          setIsLoading(false);
          setPreloadProgress(100);
          return;
        }
        
        const preloadPromises = imagesList.map((imagePath) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              loadedCount++;
              // Usar contador que solo avanza, no índice
              setPreloadProgress((loadedCount / totalImages) * 100);
              resolve(imagePath);
            };
            img.onerror = () => {
              console.warn('Gallery: Error al precargar imagen:', imagePath);
              loadedCount++;
              // Contar también los errores para que el progreso avance
              setPreloadProgress((loadedCount / totalImages) * 100);
              resolve(imagePath); // Continuar aunque falle una imagen
            };
            img.src = imagePath;
          });
        });

        // Esperar a que todas las imágenes se precarguen
        await Promise.all(preloadPromises);
        
        console.log('Gallery: Todas las imágenes precargadas');
        setAllImages(imagesList);
        setIsLoading(false);
        setPreloadProgress(100);
      } catch (error) {
        console.error('Gallery: Error al cargar las galerías:', error);
        setAllImages([]);
        setIsLoading(false);
        setPreloadProgress(100);
      }
    };

    loadImages();
  }, [selectedTrack]);

  // Función para obtener una imagen aleatoria
  const getRandomImage = () => {
    if (allImages.length === 0) {
      console.warn('Gallery: No hay imágenes disponibles aún');
      return null;
    }
    const randomIndex = Math.floor(Math.random() * allImages.length);
    return allImages[randomIndex];
  };

  return {
    allImages,
    getRandomImage,
    isLoading,
    preloadProgress
  };
};

export default useGallery;
