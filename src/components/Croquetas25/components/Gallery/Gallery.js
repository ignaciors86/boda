import { useState, useEffect, useCallback } from 'react';

export const useGallery = (selectedTrack = null) => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      try {
        let imagesList = selectedTrack?.images?.length > 0
          ? selectedTrack.images
          : (() => {
              const context = require.context('../../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
              return context.keys().map(file => context(file));
            })();

        if (imagesList.length === 0) {
          setIsLoading(false);
          setPreloadProgress(100);
          return;
        }

        let loadedCount = 0;
        const totalImages = imagesList.length;

        const preloadPromises = imagesList.map((imagePath) => 
          new Promise((resolve) => {
            const img = new Image();
            const updateProgress = () => {
              loadedCount++;
              setPreloadProgress((loadedCount / totalImages) * 100);
              resolve(imagePath);
            };
            img.onload = updateProgress;
            img.onerror = () => {
              console.warn('Gallery: Error al precargar imagen:', imagePath);
              updateProgress();
            };
            img.src = imagePath;
          })
        );

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

  const getRandomImage = useCallback(() => {
    if (allImages.length === 0) {
      console.warn('Gallery: No hay imágenes disponibles aún');
      return null;
    }
    return allImages[Math.floor(Math.random() * allImages.length)];
  }, [allImages]);

  return { allImages, getRandomImage, isLoading, preloadProgress };
};

export default useGallery;
