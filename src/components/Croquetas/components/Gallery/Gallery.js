import { useState, useEffect, useCallback, useRef } from 'react';

export const useGallery = (selectedTrack = null) => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const imageStatesRef = useRef(new Map());
  const currentIndexRef = useRef(0);

  const preloadImage = useCallback((imagePath) => {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        imageStatesRef.current.set(imagePath, { state: 'ready', imgElement: img });
        resolve({ status: 'fulfilled', value: imagePath });
      };
      
      img.onerror = () => {
        imageStatesRef.current.set(imagePath, { state: 'error' });
        resolve({ status: 'rejected', reason: `Failed to load ${imagePath}` });
      };
      
      imageStatesRef.current.set(imagePath, { state: 'loading' });
      img.src = imagePath;
    });
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      try {
        let imagesList = selectedTrack?.images || [];

        if (imagesList.length === 0) {
          setIsLoading(false);
          setPreloadProgress(100);
          setAllImages([]);
          return;
        }

        imageStatesRef.current.clear();
        currentIndexRef.current = 0;

        // Inicializar todas las imágenes como 'loading'
        imagesList.forEach((img) => {
          const imageObj = typeof img === 'object' ? img : { path: img };
          const imagePath = imageObj.path || img;
          imageStatesRef.current.set(imagePath, { state: 'loading' });
        });

        setAllImages(imagesList);

        // Precargar imágenes en lotes
        const INITIAL_PRELOAD = 20;
        const preloadBatch = imagesList.slice(0, INITIAL_PRELOAD);
        
        let loadedCount = 0;
        const totalImages = imagesList.length;

        const loadBatch = async () => {
          const promises = preloadBatch.map(img => {
            const imageObj = typeof img === 'object' ? img : { path: img };
            const imagePath = imageObj.path || img;
            return preloadImage(imagePath).then(() => {
              loadedCount++;
              setPreloadProgress(Math.min(100, (loadedCount / totalImages) * 100));
            });
          });

          await Promise.all(promises);
          
          // Cargar el resto en background
          const remainingImages = imagesList.slice(INITIAL_PRELOAD);
          remainingImages.forEach((img, index) => {
            setTimeout(() => {
              const imageObj = typeof img === 'object' ? img : { path: img };
              const imagePath = imageObj.path || img;
              preloadImage(imagePath).then(() => {
                loadedCount++;
                setPreloadProgress(Math.min(100, (loadedCount / totalImages) * 100));
              });
            }, index * 50);
          });
        };

        await loadBatch();
        setIsLoading(false);
        setPreloadProgress(100);
      } catch (error) {
        console.error('[useGallery] Error loading images:', error);
        setIsLoading(false);
      }
    };

    if (selectedTrack) {
      loadImages();
    } else {
      setIsLoading(false);
      setAllImages([]);
      setPreloadProgress(0);
    }
  }, [selectedTrack, preloadImage]);

  // Función para hacer seek a una posición basada en tiempo
  const seekToImagePosition = useCallback((targetTime, track) => {
    if (!track || !track.subfolderToAudioIndex) return;

    // Calcular qué imagen corresponde a ese tiempo
    // Por ahora, simplemente avanzar basado en el tiempo
    const imagesPerSecond = 1; // Ajustar según necesidad
    const targetIndex = Math.floor(targetTime * imagesPerSecond);
    
    if (targetIndex >= 0 && targetIndex < allImages.length) {
      setCurrentImageIndex(targetIndex);
      currentIndexRef.current = targetIndex;
    }
  }, [allImages.length]);

  return {
    isLoading,
    preloadProgress,
    allImages,
    currentImageIndex,
    seekToImagePosition
  };
};
