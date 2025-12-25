import { useState, useEffect, useCallback, useRef } from 'react';

export const useGallery = (selectedTrack = null) => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  
  // Controlador de imágenes: ready, loading, used
  const imageStatesRef = useRef(new Map());
  const currentIndexRef = useRef(0);
  const preloadQueueRef = useRef([]);
  const preloadingRef = useRef(false);
  const MAX_PRELOAD = 5;

  useEffect(() => {
    const loadImages = async () => {
      try {
        let imagesList = selectedTrack?.images?.length > 0
          ? selectedTrack.images
          : (() => {
              const context = require.context('../../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
              return context.keys().map(file => context(file)).sort((a, b) => a.localeCompare(b));
            })();

        if (imagesList.length === 0) {
          setIsLoading(false);
          setPreloadProgress(100);
          return;
        }

        // Resetear estados
        imageStatesRef.current.clear();
        currentIndexRef.current = 0;
        preloadQueueRef.current = [];
        preloadingRef.current = false;

        // Inicializar todas las imágenes como 'pending'
        imagesList.forEach(img => {
          imageStatesRef.current.set(img, { state: 'pending', imgElement: null });
        });

        // Pre-cargar las primeras imágenes inmediatamente
        const initialPreloadCount = Math.min(MAX_PRELOAD, imagesList.length);
        let loadedCount = 0;
        const totalImages = imagesList.length;

        const preloadImage = (imagePath, index) => {
          return new Promise((resolve) => {
            const img = new Image();
            const updateState = (state) => {
              const current = imageStatesRef.current.get(imagePath);
              if (current) {
                imageStatesRef.current.set(imagePath, { ...current, state, imgElement: state === 'ready' ? img : null });
              }
            };

            img.onload = () => {
              updateState('ready');
              loadedCount++;
              setPreloadProgress((loadedCount / totalImages) * 100);
              resolve(imagePath);
            };
            img.onerror = () => {
              console.warn('Gallery: Error al precargar imagen:', imagePath);
              updateState('error');
              loadedCount++;
              setPreloadProgress((loadedCount / totalImages) * 100);
              resolve(imagePath);
            };
            
            updateState('loading');
            img.src = imagePath;
          });
        };

        // Pre-cargar primeras imágenes
        const initialPromises = imagesList.slice(0, initialPreloadCount).map((img, idx) => 
          preloadImage(img, idx)
        );

        await Promise.all(initialPromises);
        
        // Continuar pre-cargando el resto en background
        const remainingImages = imagesList.slice(initialPreloadCount);
        const remainingPromises = remainingImages.map((img, idx) => 
          preloadImage(img, initialPreloadCount + idx)
        );
        
        // Esperar a que todas las imágenes estén cargadas (o fallen) usando allSettled
        Promise.allSettled(remainingPromises).then(() => {
          console.log('Gallery: Todas las imágenes procesadas (cargadas o con error)');
          setIsLoading(false);
          setPreloadProgress(100);
        });
        
        console.log('Gallery: Imágenes iniciales precargadas, cargando el resto...');
        setAllImages(imagesList);
        
        // Marcar como no cargando después de un tiempo máximo para evitar bloqueos
        const maxWaitTime = 30000; // 30 segundos máximo
        setTimeout(() => {
          if (loadedCount < totalImages) {
            console.warn(`Gallery: Timeout - Solo ${loadedCount}/${totalImages} imágenes cargadas, continuando de todas formas`);
            setIsLoading(false);
            setPreloadProgress(100);
          }
        }, maxWaitTime);
      } catch (error) {
        console.error('Gallery: Error al cargar las galerías:', error);
        setAllImages([]);
        setIsLoading(false);
        setPreloadProgress(100);
      }
    };

    loadImages();
  }, [selectedTrack]);

  // Función para obtener la siguiente imagen disponible (sin repetición hasta completar loop)
  const getNextImage = useCallback(() => {
    if (allImages.length === 0) {
      console.warn('Gallery: No hay imágenes disponibles aún');
      return null;
    }

    // Buscar la siguiente imagen lista, empezando desde currentIndex
    let attempts = 0;
    while (attempts < allImages.length) {
      const index = currentIndexRef.current;
      const imagePath = allImages[index];
      const imageState = imageStatesRef.current.get(imagePath);

      if (imageState && imageState.state === 'ready') {
        // Marcar como usada y avanzar índice
        imageStatesRef.current.set(imagePath, { ...imageState, state: 'used' });
        currentIndexRef.current = (currentIndexRef.current + 1) % allImages.length;
        
        // Si hemos completado el loop, resetear estados de 'used' a 'ready'
        if (currentIndexRef.current === 0) {
          imageStatesRef.current.forEach((state, path) => {
            if (state.state === 'used') {
              imageStatesRef.current.set(path, { ...state, state: 'ready' });
            }
          });
        }
        
        return imagePath;
      }

      // Si no está lista, avanzar y seguir buscando
      currentIndexRef.current = (currentIndexRef.current + 1) % allImages.length;
      attempts++;
    }

    // Si ninguna está lista, devolver null
    console.warn('Gallery: No hay imágenes listas disponibles');
    return null;
  }, [allImages]);

  // Pre-cargar imágenes próximas de forma proactiva
  const preloadNextImages = useCallback(() => {
    if (preloadingRef.current || allImages.length === 0) return;
    
    preloadingRef.current = true;
    const nextIndices = [];
    let current = currentIndexRef.current;
    
    // Obtener índices de las próximas imágenes que no estén listas
    for (let i = 0; i < MAX_PRELOAD && nextIndices.length < MAX_PRELOAD; i++) {
      const index = (current + i) % allImages.length;
      const imagePath = allImages[index];
      const imageState = imageStatesRef.current.get(imagePath);
      
      if (imageState && (imageState.state === 'pending' || imageState.state === 'loading')) {
        nextIndices.push({ index, imagePath });
      }
    }

    // Pre-cargar las imágenes pendientes
    nextIndices.forEach(({ imagePath }, idx) => {
      setTimeout(() => {
        const imageState = imageStatesRef.current.get(imagePath);
        if (imageState && imageState.state !== 'ready' && imageState.state !== 'loading') {
          const img = new Image();
          imageStatesRef.current.set(imagePath, { ...imageState, state: 'loading' });
          
          img.onload = () => {
            imageStatesRef.current.set(imagePath, { state: 'ready', imgElement: img });
          };
          img.onerror = () => {
            console.warn('Gallery: Error al precargar imagen:', imagePath);
            imageStatesRef.current.set(imagePath, { ...imageState, state: 'error' });
          };
          img.src = imagePath;
        }
      }, idx * 50);
    });

    setTimeout(() => {
      preloadingRef.current = false;
    }, nextIndices.length * 50 + 100);
  }, [allImages]);

  return { 
    allImages, 
    getNextImage, 
    isLoading, 
    preloadProgress,
    preloadNextImages
  };
};

export default useGallery;
