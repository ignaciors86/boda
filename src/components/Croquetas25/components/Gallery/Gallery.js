import { useState, useEffect, useCallback, useRef } from 'react';

export const useGallery = (selectedTrack = null, onSubfolderComplete = null, onAllComplete = null, getCurrentAudioIndex = null, getCurrentAudioTime = null) => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  
  // Controlador de imágenes: ready, loading, used
  const imageStatesRef = useRef(new Map());
  const currentIndexRef = useRef(0);
  const preloadQueueRef = useRef([]);
  const preloadingRef = useRef(false);
  const backgroundLoadingRef = useRef(false);
  
  // Rastrear subcarpetas
  const imagesBySubfolderRef = useRef(new Map()); // Map<imagePath, subfolder>
  const subfolderCountsRef = useRef(new Map()); // Map<subfolder, {total, used}>
  const lastSubfolderRef = useRef(null);
  const completedSubfoldersRef = useRef(new Set());
  
  // Sistema de sincronización
  const subfolderStartTimesRef = useRef(new Map()); // Map<subfolder, {startTime, audioTime}>
  const currentAudioIndexRef = useRef(null); // AudioIndex actual para filtrar imágenes
  
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
          ? selectedTrack.images // Mantener estructura con subcarpetas
          : (() => {
              const context = require.context('../../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
              return context.keys().map(file => ({
                path: context(file),
                originalPath: file,
                subfolder: null
              })).sort((a, b) => a.originalPath.localeCompare(b.originalPath));
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

        // Inicializar todas las imágenes como 'pending' y rastrear subcarpetas
        imagesBySubfolderRef.current.clear();
        subfolderCountsRef.current.clear();
        lastSubfolderRef.current = null;
        completedSubfoldersRef.current.clear();
        subfolderStartTimesRef.current.clear();
        currentAudioIndexRef.current = null;
        
        imagesList.forEach((img) => {
          const imageObj = typeof img === 'object' ? img : { path: img, originalPath: img, subfolder: null };
          const imagePath = imageObj.path || img;
          const subfolder = imageObj.subfolder || null;
          
          imageStatesRef.current.set(imagePath, { state: 'pending', imgElement: null });
          imagesBySubfolderRef.current.set(imagePath, subfolder);
          
          if (!subfolderCountsRef.current.has(subfolder)) {
            subfolderCountsRef.current.set(subfolder, { total: 0, used: 0 });
          }
          const counts = subfolderCountsRef.current.get(subfolder);
          counts.total++;
        });

        setAllImages(imagesList);
        setPreloadProgress(0);

        // Calcular cuántas imágenes precargar inicialmente
        const initialCount = Math.min(INITIAL_PRELOAD_COUNT, imagesList.length);
        const initialImages = imagesList.slice(0, initialCount).map(img => {
          return typeof img === 'object' ? (img.path || img) : img;
        });

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

  // Obtener subcarpetas que usan el audioIndex actual
  const getSubfoldersForAudioIndex = useCallback((audioIndex) => {
    if (!selectedTrack || !selectedTrack.subfolderToAudioIndex || audioIndex === null || audioIndex === undefined) {
      return new Set();
    }
    
    const subfolders = new Set();
    Object.entries(selectedTrack.subfolderToAudioIndex).forEach(([subfolder, idx]) => {
      if (idx === audioIndex) {
        subfolders.add(subfolder);
      }
    });
    return subfolders;
  }, [selectedTrack]);

  // Resetear índice cuando cambia el audio
  useEffect(() => {
    if (!selectedTrack || !getCurrentAudioIndex || allImages.length === 0) return;
    
    const audioIndex = getCurrentAudioIndex();
    if (audioIndex === null || audioIndex === undefined) return;
    
    // Solo resetear si cambió el audioIndex
    if (currentAudioIndexRef.current === audioIndex) return;
    
    currentAudioIndexRef.current = audioIndex;
    
    // Encontrar la primera imagen de las subcarpetas que usan este audio
    const validSubfolders = getSubfoldersForAudioIndex(audioIndex);
    if (validSubfolders.size === 0) return;
    
    // Buscar la primera imagen de estas subcarpetas
    let firstImageIndex = -1;
    for (let i = 0; i < allImages.length; i++) {
      const imageObj = allImages[i];
      const imagePath = typeof imageObj === 'object' ? (imageObj.path || imageObj) : imageObj;
      const imageSubfolder = imagesBySubfolderRef.current.get(imagePath);
      
      if (validSubfolders.has(imageSubfolder)) {
        firstImageIndex = i;
        break;
      }
    }
    
    if (firstImageIndex !== -1) {
      console.log(`[Gallery] AudioIndex cambió a ${audioIndex}, resetando índice a ${firstImageIndex}`);
      currentIndexRef.current = firstImageIndex;
      
      // Resetear estados "used" de las imágenes de estas subcarpetas
      imagesBySubfolderRef.current.forEach((subfolder, path) => {
        if (validSubfolders.has(subfolder)) {
          const state = imageStatesRef.current.get(path);
          if (state && state.state === 'used') {
            imageStatesRef.current.set(path, { ...state, state: 'ready' });
          }
        }
      });
      
      // Resetear contadores
      validSubfolders.forEach(subfolder => {
        if (subfolderCountsRef.current.has(subfolder)) {
          const counts = subfolderCountsRef.current.get(subfolder);
          counts.used = 0;
        }
      });
      
      lastSubfolderRef.current = null;
    }
  }, [selectedTrack, allImages, getCurrentAudioIndex, getSubfoldersForAudioIndex]);

  // Función para obtener la siguiente imagen disponible (sin repetición hasta completar loop)
  const getNextImage = useCallback(() => {
    if (allImages.length === 0) {
      console.warn('Gallery: No hay imágenes disponibles aún');
      return null;
    }

    // Obtener audioIndex actual y subcarpetas válidas
    const audioIndex = getCurrentAudioIndex ? getCurrentAudioIndex() : null;
    const validSubfolders = getSubfoldersForAudioIndex(audioIndex);

    // Buscar la siguiente imagen lista, empezando desde currentIndex
    let attempts = 0;
    while (attempts < allImages.length) {
      const index = currentIndexRef.current;
      const imageObj = allImages[index];
      const imagePath = typeof imageObj === 'object' ? (imageObj.path || imageObj) : imageObj;
      const imageState = imageStatesRef.current.get(imagePath);
      const imageSubfolder = imagesBySubfolderRef.current.get(imagePath);

      // Si hay audioIndex, solo aceptar imágenes de subcarpetas válidas
      if (audioIndex !== null && validSubfolders.size > 0 && !validSubfolders.has(imageSubfolder)) {
        currentIndexRef.current = (currentIndexRef.current + 1) % allImages.length;
        attempts++;
        continue;
      }

      if (imageState && imageState.state === 'ready') {
        const currentSubfolder = imageSubfolder;
        const previousSubfolder = lastSubfolderRef.current;
        const timestamp = Date.now();
        const audioTime = getCurrentAudioTime ? getCurrentAudioTime() : null;
        
        // Registrar tiempo de inicio de subcarpeta si es la primera imagen
        if (previousSubfolder !== currentSubfolder && currentSubfolder !== null) {
          if (!subfolderStartTimesRef.current.has(currentSubfolder)) {
            subfolderStartTimesRef.current.set(currentSubfolder, {
              startTime: timestamp,
              audioTime: audioTime
            });
          }
        }
        
        // Marcar como usada
        imageStatesRef.current.set(imagePath, { ...imageState, state: 'used' });
        
        // Actualizar contador
        if (currentSubfolder !== null && subfolderCountsRef.current.has(currentSubfolder)) {
          const counts = subfolderCountsRef.current.get(currentSubfolder);
          counts.used++;
        }
        
        // Verificar si se completó la subcarpeta anterior
        if (previousSubfolder !== null && 
            previousSubfolder !== currentSubfolder &&
            !completedSubfoldersRef.current.has(previousSubfolder)) {
          
          let actuallyUsedCount = 0;
          imagesBySubfolderRef.current.forEach((subfolder, path) => {
            if (subfolder === previousSubfolder) {
              const state = imageStatesRef.current.get(path);
              if (state && state.state === 'used') {
                actuallyUsedCount++;
              }
            }
          });
          
          const prevCounts = subfolderCountsRef.current.get(previousSubfolder);
          if (actuallyUsedCount >= prevCounts.total && prevCounts.total > 0) {
            const endAudioTime = getCurrentAudioTime ? getCurrentAudioTime() : null;
            const startInfo = subfolderStartTimesRef.current.get(previousSubfolder);
            
            completedSubfoldersRef.current.add(previousSubfolder);
            console.log(`[Gallery] Subcarpeta ${previousSubfolder} completada (${actuallyUsedCount}/${prevCounts.total} imágenes)`);
            if (onSubfolderComplete) {
              onSubfolderComplete(previousSubfolder, {
                startTime: startInfo?.startTime,
                endTime: timestamp,
                startAudioTime: startInfo?.audioTime,
                endAudioTime: endAudioTime
              });
            }
          }
        }
        
        lastSubfolderRef.current = currentSubfolder;
        
        // Avanzar al siguiente índice, buscando la siguiente imagen válida
        let nextIndex = (currentIndexRef.current + 1) % allImages.length;
        let foundNext = false;
        
        // Buscar siguiente imagen válida (de subcarpetas válidas si hay audioIndex)
        for (let i = 0; i < allImages.length; i++) {
          const nextImageObj = allImages[nextIndex];
          const nextImagePath = typeof nextImageObj === 'object' ? (nextImageObj.path || nextImageObj) : nextImageObj;
          const nextImageSubfolder = imagesBySubfolderRef.current.get(nextImagePath);
          
          // Si no hay audioIndex o la imagen pertenece a subcarpetas válidas, usar este índice
          if (audioIndex === null || validSubfolders.size === 0 || validSubfolders.has(nextImageSubfolder)) {
            foundNext = true;
            break;
          }
          
          nextIndex = (nextIndex + 1) % allImages.length;
        }
        
        currentIndexRef.current = foundNext ? nextIndex : (currentIndexRef.current + 1) % allImages.length;
        
        // Verificar si todas las subcarpetas están completas (antes de resetear)
        const allSubfoldersComplete = Array.from(subfolderCountsRef.current.keys()).every(subfolder => {
          // Verificar manualmente si todas las imágenes de esta subcarpeta están usadas
          let usedCount = 0;
          imagesBySubfolderRef.current.forEach((sf, path) => {
            if (sf === subfolder) {
              const state = imageStatesRef.current.get(path);
              if (state && state.state === 'used') {
                usedCount++;
              }
            }
          });
          const counts = subfolderCountsRef.current.get(subfolder);
          return counts && usedCount >= counts.total && counts.total > 0;
        });
        
        if (allSubfoldersComplete && onAllComplete) {
          console.log('[Gallery] Todas las subcarpetas completadas, llamando onAllComplete');
          onAllComplete();
        }
        
        // Si hemos completado el loop, resetear estados
        if (currentIndexRef.current === 0) {
          imageStatesRef.current.forEach((state, path) => {
            if (state.state === 'used') {
              imageStatesRef.current.set(path, { ...state, state: 'ready' });
            }
          });
          subfolderCountsRef.current.forEach((counts) => {
            counts.used = 0;
          });
          completedSubfoldersRef.current.clear();
          lastSubfolderRef.current = null;
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
  }, [allImages, onSubfolderComplete, onAllComplete, getCurrentAudioIndex, getCurrentAudioTime, getSubfoldersForAudioIndex]);

  // Pre-cargar imágenes próximas de forma proactiva durante la reproducción
  const preloadNextImages = useCallback(() => {
    if (preloadingRef.current || allImages.length === 0) return;
    
    preloadingRef.current = true;
    const imagesToPreload = [];
    let current = currentIndexRef.current;
    
      // Obtener las próximas imágenes que no estén listas
      for (let i = 0; i < MAX_PRELOAD * 2 && imagesToPreload.length < MAX_PRELOAD; i++) {
        const index = (current + i) % allImages.length;
        const imageObj = allImages[index];
        const imagePath = typeof imageObj === 'object' ? (imageObj.path || imageObj) : imageObj;
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
