import { useState, useEffect } from 'react';

// Hook para cargar imágenes de las galerías
export const useGallery = () => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

      console.log('Gallery: Total de imágenes cargadas:', imagesList.length);
      
      setAllImages(imagesList);
      setIsLoading(false);
    } catch (error) {
      console.error('Gallery: Error al cargar las galerías:', error);
      setAllImages([]);
      setIsLoading(false);
    }
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
    isLoading
  };
};

export default useGallery;
