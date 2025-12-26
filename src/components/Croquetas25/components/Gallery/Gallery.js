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
  const backgroundLoadingRef = useRef(false);
  
  // Configuración de carga progresiva
  const INITIAL_PRELOAD_COUNT = 20; // Imágenes iniciales para empezar rápido
  const MAX_PRELOAD = 10; // Imágenes a precargar durante reproducción
  const BATCH_SIZE = 15; // Tamaño de lote para carga en background
  const BATCH_DELAY = 200; // Delay entre lotes (ms)

  // Función para precargar una imagen individual
  const preloadImage = useCallback((imagePath) => {
    return new Promise((resolve) => {
      const img = new Image();
      const updateState = (state, imgElement = null) => {
        const current = imageStatesRef.current.get(imagePath);
        if (current) {
          imageStatesRef.current.set(imagePath, { 
            ...current, 
            state, 
            imgElement: imgElement || current.imgElement 
          });
        }
      };

      img.onload = () => {
        updateState('ready', img);
        resolve({ status: 'fulfilled', value: imagePath });
      };
      img.onerror = () => {
        console.warn('Gallery: Error al precargar imagen:', imagePath);
        updateState('error');
        resolve({ status: 'rejected', reason: `Failed to load ${imagePath}` });
      };
      
      updateState('loading');
      img.src = imagePath;
    });
  }, []);

  // Cargar imágenes en lotes en background
  const loadImagesInBatches = useCallback((imagesList, startIndex, onProgress) => {
    if (backgroundLoadingRef.current) return;
    backgroundLoadingRef.current = true;
    
    // Track del progreso máximo alcanzado para evitar retrocesos
    let maxProgressReached = 0;

    const loadBatch = (batchStart) => {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, imagesList.length);
      const batch = imagesList.slice(batchStart, batchEnd);
      
      if (batch.length === 0) {
        backgroundLoadingRef.current = false;
        return;
      }

      // Precargar este lote
      const batchPromises = batch.map(imagePath => {
        const state = imageStatesRef.current.get(imagePath);
        if (state && state.state === 'pending') {
          return preloadImage(imagePath);
        }
        return Promise.resolve({ status: 'fulfilled', value: imagePath });
      });

      Promise.allSettled(batchPromises).then(() => {
        // Actualizar progreso - solo contar imágenes que realmente se procesaron
        const loadedCount = Array.from(imageStatesRef.current.values())
          .filter(s => s.state === 'ready' || s.state === 'error').length;
        const progress = Math.min(100, (loadedCount / imagesList.length) * 100);
        
        // Solo actualizar si el progreso no retrocede
        maxProgressReached = Math.max(maxProgressReached, progress);
        if (onProgress) {
          onProgress(maxProgressReached);
        }

        // Cargar siguiente lote después de un delay
        if (batchEnd < imagesList.length) {
          setTimeout(() => loadBatch(batchEnd), BATCH_DELAY);
        } else {
          backgroundLoadingRef.current = false;
          console.log('Gallery: Todas las imágenes procesadas en background');
          // Asegurar que el progreso llegue a 100 al final
          if (onProgress) {
            onProgress(100);
          }
        }
      });
    };

    loadBatch(startIndex);
  }, [preloadImage]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        let imagesList = selectedTrack?.images?.length > 0
          ? selectedTrack.images.map(img => typeof img === 'string' ? img : img.path || img)
          : (() => {
              const context = require.context('../../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
              return context.keys().map(file => context(file)).sort((a, b) => a.localeCompare(b));
            })();

        if (imagesList.length === 0) {
          setIsLoading(false);
          setPreloadProgress(100);
          setAllImages([]);
          return;
        }

        // Resetear estados
        imageStatesRef.current.clear();
        currentIndexRef.current = 0;
        preloadQueueRef.current = [];
        preloadingRef.current = false;
        backgroundLoadingRef.current = false;

        // Inicializar todas las imágenes como 'pending'
        imagesList.forEach(img => {
          imageStatesRef.current.set(img, { state: 'pending', imgElement: null });
        });

        setAllImages(imagesList);
        setPreloadProgress(0);

        // Calcular cuántas imágenes precargar inicialmente
        const initialCount = Math.min(INITIAL_PRELOAD_COUNT, imagesList.length);
        const initialImages = imagesList.slice(0, initialCount);

        console.log(`Gallery: Precargando ${initialCount} imágenes iniciales de ${imagesList.length} totales...`);

        // Precargar imágenes iniciales
        const initialPromises = initialImages.map(img => preloadImage(img));
        
        Promise.allSettled(initialPromises).then(() => {
          const loadedCount = Array.from(imageStatesRef.current.values())
            .filter(s => s.state === 'ready' || s.state === 'error').length;
          const progress = (loadedCount / imagesList.length) * 100;
          
          console.log(`Gallery: ${loadedCount} imágenes iniciales listas. Continuando en background...`);
          
          // Marcar como listo para empezar (no esperar a todas)
          setIsLoading(false);
          setPreloadProgress(progress);
          
          // Continuar cargando el resto en background
          if (initialCount < imagesList.length) {
            loadImagesInBatches(imagesList, initialCount, (newProgress) => {
              setPreloadProgress(prev => {
                // Asegurar que el progreso nunca retrocede
                return Math.max(prev, newProgress);
              });
            });
          } else {
            // Si todas las imágenes ya están cargadas, marcar progreso como 100
            setPreloadProgress(100);
          }
        });
      } catch (error) {
        console.error('Gallery: Error al cargar las galerías:', error);
        setAllImages([]);
        setIsLoading(false);
        setPreloadProgress(100);
      }
    };

    loadImages();
  }, [selectedTrack, preloadImage, loadImagesInBatches]);

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

  // Pre-cargar imágenes próximas de forma proactiva durante la reproducción
  const preloadNextImages = useCallback(() => {
    if (preloadingRef.current || allImages.length === 0) return;
    
    preloadingRef.current = true;
    const imagesToPreload = [];
    let current = currentIndexRef.current;
    
    // Obtener las próximas imágenes que no estén listas
    // Buscar más adelante para tener un buffer
    for (let i = 0; i < MAX_PRELOAD * 2 && imagesToPreload.length < MAX_PRELOAD; i++) {
      const index = (current + i) % allImages.length;
      const imagePath = allImages[index];
      const imageState = imageStatesRef.current.get(imagePath);
      
      // Solo precargar si está pendiente (no loading para evitar duplicados)
      if (imageState && imageState.state === 'pending') {
        imagesToPreload.push(imagePath);
      }
    }

    // Pre-cargar las imágenes pendientes con delay escalonado
    imagesToPreload.forEach((imagePath, idx) => {
      setTimeout(() => {
        const imageState = imageStatesRef.current.get(imagePath);
        if (imageState && imageState.state === 'pending') {
          preloadImage(imagePath);
        }
      }, idx * 30); // Delay más corto para carga más rápida durante reproducción
    });

    setTimeout(() => {
      preloadingRef.current = false;
    }, imagesToPreload.length * 30 + 100);
  }, [allImages, preloadImage]);

  return { 
    allImages, 
    getNextImage, 
    isLoading, 
    preloadProgress,
    preloadNextImages
  };
};

export default useGallery;
