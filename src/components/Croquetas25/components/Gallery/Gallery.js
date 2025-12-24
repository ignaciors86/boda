import { useState, useEffect } from 'react';

// Hook para cargar imágenes de las galerías
export const useGallery = () => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      try {
        // Cargar todas las imágenes de las galerías de GaticosYMonetes
        // Por ahora usamos la misma carpeta, luego se moverá a Croquetas25
        // Ruta desde Gallery.js (src/components/Croquetas25/components/Gallery/):
        // ../../../ nos lleva a src/components/
        const context = require.context('../../../GaticosYMonetes/galerias', true, /\.(jpg|jpeg|png|gif|webp)$/);
        const files = context.keys();
        
        const imagesList = [];

        // Procesar cada archivo encontrado
        files.forEach(file => {
          const imagePath = context(file);
          imagesList.push(imagePath);
        });

        console.log('Gallery: Total de imágenes encontradas:', imagesList.length);
        
        // Precargar todas las imágenes realmente
        let loadedCount = 0;
        const totalImages = imagesList.length;
        
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
  }, []);

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
