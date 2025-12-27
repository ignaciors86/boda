import { useState, useEffect, useCallback, useRef } from 'react';

export const useGallery = (selectedTrack = null, onSubfolderComplete = null, onAllComplete = null, currentAudioIndex = null) => {
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
  
  // Estructura plana: mapeo de subcarpeta a índices de imágenes en allImages
  const subfolderImageIndicesRef = useRef(new Map()); // Map<subfolder, number[]>
  // Índice actual por subcarpeta (evita problemas de reseteo)
  const subfolderCurrentIndexRef = useRef(new Map()); // Map<subfolder, number>
  const lastAudioIndexRef = useRef(null);
  
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
        subfolderImageIndicesRef.current.clear();
        subfolderCurrentIndexRef.current.clear();
        lastSubfolderRef.current = null;
        completedSubfoldersRef.current.clear();
        lastAudioIndexRef.current = null; // Resetear para que el efecto se ejecute en la primera carga
        
        // Construir estructura plana: mapear cada subcarpeta a sus índices de imágenes
        imagesList.forEach((img, index) => {
          const imageObj = typeof img === 'object' ? img : { path: img, originalPath: img, subfolder: null };
          const imagePath = imageObj.path || img;
          const subfolder = imageObj.subfolder || null;
          const normalizedSubfolder = subfolder === null ? '__root__' : subfolder;
          
          imageStatesRef.current.set(imagePath, { state: 'pending', imgElement: null });
          imagesBySubfolderRef.current.set(imagePath, subfolder);
          
          // Agregar índice a la lista de índices de esta subcarpeta
          if (!subfolderImageIndicesRef.current.has(normalizedSubfolder)) {
            subfolderImageIndicesRef.current.set(normalizedSubfolder, []);
            // NO inicializar subfolderCurrentIndexRef aquí, se inicializará cuando sea necesario
          }
          subfolderImageIndicesRef.current.get(normalizedSubfolder).push(index);
          
          if (!subfolderCountsRef.current.has(subfolder)) {
            subfolderCountsRef.current.set(subfolder, { total: 0, used: 0 });
          }
          const counts = subfolderCountsRef.current.get(subfolder);
          counts.total++;
        });
        
        console.log('[Gallery] Estructura de subcarpetas:', Array.from(subfolderImageIndicesRef.current.entries()).map(([sf, indices]) => `${sf}: ${indices.length} imágenes`));

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

  // Determinar la subcarpeta actual basándose en el audio
  const getCurrentSubfolder = useCallback(() => {
    if (currentAudioIndex === null || currentAudioIndex === undefined || !selectedTrack?.subfolderToAudioIndex) {
      return null; // Sin filtrado
    }
    
    // Buscar la subcarpeta que corresponde al audio actual
    for (const [subfolder, audioIndex] of Object.entries(selectedTrack.subfolderToAudioIndex)) {
      if (audioIndex === currentAudioIndex) {
        return subfolder === '__root__' ? null : subfolder;
      }
    }
    
    // Si no se encontró mapeo y el índice es 0, usar la primera subcarpeta en subfolderOrder o __root__
    if (currentAudioIndex === 0 && selectedTrack?.subfolderOrder && selectedTrack.subfolderOrder.length > 0) {
      const firstSubfolder = selectedTrack.subfolderOrder[0];
      return firstSubfolder === '__root__' ? null : firstSubfolder;
    }
    
    return null;
  }, [selectedTrack, currentAudioIndex]);
  
  // Inicializar índice cuando cambia el audio (solo la primera vez para cada subcarpeta)
  useEffect(() => {
    if (allImages.length === 0) return;
    
    // Solo procesar si realmente cambió el índice de audio
    if (lastAudioIndexRef.current === currentAudioIndex) {
      return; // No hacer nada si el audio no cambió
    }
    
    const currentSubfolder = getCurrentSubfolder();
    const normalizedSubfolder = currentSubfolder === null ? '__root__' : currentSubfolder;
    
    console.log(`[Gallery] useEffect: Audio cambió de ${lastAudioIndexRef.current} a ${currentAudioIndex}, subcarpeta: ${currentSubfolder || '__root__'}`);
    
    // Inicializar índice de esta subcarpeta SOLO si no existe
    // NO resetear imágenes "used" ni el índice cuando cambia el audio
    // Mantener el estado exactamente como está para continuar desde donde estaba
    if (subfolderImageIndicesRef.current.has(normalizedSubfolder)) {
      const indices = subfolderImageIndicesRef.current.get(normalizedSubfolder);
      if (indices.length > 0) {
        if (!subfolderCurrentIndexRef.current.has(normalizedSubfolder)) {
          // Solo inicializar la primera vez para esta subcarpeta
          subfolderCurrentIndexRef.current.set(normalizedSubfolder, 0);
          currentIndexRef.current = indices[0];
          console.log(`[Gallery] useEffect: Inicializando índice para subcarpeta ${currentSubfolder || '__root__'} (audio ${currentAudioIndex}) a 0`);
        } else {
          // NO hacer NADA cuando se vuelve a esta subcarpeta - mantener todo como está
          const existingIndex = subfolderCurrentIndexRef.current.get(normalizedSubfolder);
          console.log(`[Gallery] useEffect: Subcarpeta ${currentSubfolder || '__root__'} ya tiene índice: ${existingIndex}, NO tocando nada`);
        }
      }
    } else if (currentSubfolder === null && !subfolderCurrentIndexRef.current.has('__root__')) {
      // Si no hay subcarpeta específica, inicializar solo la primera vez
      subfolderCurrentIndexRef.current.set('__root__', 0);
      currentIndexRef.current = 0;
      console.log(`[Gallery] useEffect: Inicializando índice para todas las imágenes (audio ${currentAudioIndex}) a 0`);
    }
    
    lastAudioIndexRef.current = currentAudioIndex;
  }, [currentAudioIndex, allImages.length, getCurrentSubfolder]);

  // Función para obtener la siguiente imagen disponible
  const getNextImage = useCallback(() => {
    console.log(`[Gallery] getNextImage llamado | allImages.length: ${allImages.length} | currentAudioIndex: ${currentAudioIndex}`);
    if (allImages.length === 0) {
      console.warn('Gallery: No hay imágenes disponibles aún');
      return null;
    }

    const currentSubfolder = getCurrentSubfolder();
    const normalizedSubfolder = currentSubfolder === null ? '__root__' : currentSubfolder;
    
    console.log(`[Gallery] getNextImage: currentSubfolder=${currentSubfolder}, normalizedSubfolder=${normalizedSubfolder}, currentAudioIndex=${currentAudioIndex}`);
    
    // Obtener índices de imágenes de la subcarpeta actual
    let imageIndices = subfolderImageIndicesRef.current.get(normalizedSubfolder);
    
    // Si no hay subcarpeta específica o no hay índices, usar todas las imágenes
    if (!imageIndices || imageIndices.length === 0) {
      imageIndices = Array.from({ length: allImages.length }, (_, i) => i);
    }
    
    // Obtener índice actual de esta subcarpeta (inicializar si no existe)
    if (!subfolderCurrentIndexRef.current.has(normalizedSubfolder)) {
      subfolderCurrentIndexRef.current.set(normalizedSubfolder, 0);
      console.log(`[Gallery] getNextImage: Inicializando índice para subcarpeta ${currentSubfolder || '__root__'} a 0`);
    }
    let subfolderIndex = subfolderCurrentIndexRef.current.get(normalizedSubfolder);
    console.log(`[Gallery] getNextImage: Índice leído de ref: ${subfolderIndex} para subcarpeta ${currentSubfolder || '__root__'}`);
    if (subfolderIndex >= imageIndices.length) {
      subfolderIndex = 0;
      subfolderCurrentIndexRef.current.set(normalizedSubfolder, 0);
      console.log(`[Gallery] getNextImage: Índice ${subfolderIndex} >= ${imageIndices.length}, reseteado a 0`);
    }
    
    const targetImageIndex = imageIndices[subfolderIndex];
    const targetImageObj = allImages[targetImageIndex];
    const targetImagePath = typeof targetImageObj === 'object' ? (targetImageObj.path || targetImageObj) : targetImageObj;
    const targetImageState = imageStatesRef.current.get(targetImagePath);
    
    console.log(`[Gallery] getNextImage: Subcarpeta ${currentSubfolder || '__root__'}, índice: ${subfolderIndex}/${imageIndices.length}, imagen en allImages: ${targetImageIndex}, estado: ${targetImageState?.state || 'undefined'}, path: ${targetImagePath}`);
    
    // Buscar la siguiente imagen lista en esta subcarpeta
    let attempts = 0;
    const startIndex = subfolderIndex;
    
    while (attempts < imageIndices.length) {
      const imageIndex = imageIndices[subfolderIndex];
      const imageObj = allImages[imageIndex];
      const imagePath = typeof imageObj === 'object' ? (imageObj.path || imageObj) : imageObj;
      const imageState = imageStatesRef.current.get(imagePath);

      // Solo usar imágenes que estén 'ready', no 'used' ni 'loading' ni 'pending'
      if (imageState && imageState.state === 'ready') {
        const imageSubfolder = imagesBySubfolderRef.current.get(imagePath);
        const previousSubfolder = lastSubfolderRef.current;
        
        // Marcar como usada
        imageStatesRef.current.set(imagePath, { ...imageState, state: 'used' });
        
        // Actualizar contador
        if (imageSubfolder !== null && subfolderCountsRef.current.has(imageSubfolder)) {
          const counts = subfolderCountsRef.current.get(imageSubfolder);
          counts.used++;
        }
        
        // Verificar si se completó la subcarpeta anterior
        if (previousSubfolder !== null && 
            previousSubfolder !== imageSubfolder &&
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
            completedSubfoldersRef.current.add(previousSubfolder);
            console.log(`[Gallery] Subcarpeta ${previousSubfolder} completada (${actuallyUsedCount}/${prevCounts.total} imágenes)`);
            if (onSubfolderComplete) {
              onSubfolderComplete(previousSubfolder);
            }
          }
        }
        
        lastSubfolderRef.current = imageSubfolder;
        
        // Avanzar índice de esta subcarpeta
        subfolderIndex++;
        if (subfolderIndex >= imageIndices.length) {
          // Cuando se completa el ciclo (índice vuelve a 0), resetear todas las imágenes a "ready"
          // para permitir que se usen de nuevo
          const normalizedImageSubfolder = imageSubfolder === null ? '__root__' : imageSubfolder;
          subfolderImageIndicesRef.current.get(normalizedImageSubfolder)?.forEach(idx => {
            const imgObj = allImages[idx];
            const imgPath = typeof imgObj === 'object' ? (imgObj.path || imgObj) : imgObj;
            const state = imageStatesRef.current.get(imgPath);
            if (state && state.state === 'used') {
              imageStatesRef.current.set(imgPath, { ...state, state: 'ready' });
            }
          });
          if (imageSubfolder !== null && subfolderCountsRef.current.has(imageSubfolder)) {
            subfolderCountsRef.current.get(imageSubfolder).used = 0;
          }
          subfolderIndex = 0;
        }
        
        // Guardar índice actualizado ANTES de verificar completitud
        subfolderCurrentIndexRef.current.set(normalizedSubfolder, subfolderIndex);
        currentIndexRef.current = imageIndices[subfolderIndex] || imageIndices[0] || 0;
        const savedIndex = subfolderCurrentIndexRef.current.get(normalizedSubfolder);
        console.log(`[Gallery] getNextImage: Imagen encontrada y marcada como usada. Subcarpeta: ${currentSubfolder || '__root__'}, índice avanzado a: ${subfolderIndex}/${imageIndices.length}, guardado: ${savedIndex}, próxima imagen índice en allImages: ${imageIndices[subfolderIndex] || imageIndices[0]}, path actual: ${imagePath}`);
        
        // Verificar si todas las subcarpetas están completas
        const allSubfoldersComplete = Array.from(subfolderCountsRef.current.keys()).every(subfolder => {
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
        
        return imagePath;
      }

      // Si no está lista, avanzar en esta subcarpeta
      subfolderIndex++;
      if (subfolderIndex >= imageIndices.length) {
        subfolderIndex = 0;
      }
      attempts++;
    }
    
    // Guardar índice actualizado incluso si no encontramos imagen lista
    subfolderCurrentIndexRef.current.set(normalizedSubfolder, subfolderIndex);
    console.log(`[Gallery] getNextImage: No se encontró imagen lista después de ${attempts} intentos. Índice guardado: ${subfolderIndex}`);

    // Si ninguna está lista, devolver null
    console.warn(`Gallery: No hay imágenes listas disponibles en subcarpeta ${currentSubfolder || '__root__'}`);
    return null;
  }, [allImages, onSubfolderComplete, onAllComplete, getCurrentSubfolder]);

  // Pre-cargar imágenes próximas de forma proactiva durante la reproducción
  const preloadNextImages = useCallback(() => {
    if (preloadingRef.current || allImages.length === 0) return;
    
    const currentSubfolder = getCurrentSubfolder();
    const normalizedSubfolder = currentSubfolder === null ? '__root__' : currentSubfolder;
    
    // Obtener índices de imágenes de la subcarpeta actual
    let imageIndices = subfolderImageIndicesRef.current.get(normalizedSubfolder);
    if (!imageIndices || imageIndices.length === 0) {
      imageIndices = Array.from({ length: allImages.length }, (_, i) => i);
    }
    
    // Obtener índice actual de esta subcarpeta
    let subfolderIndex = subfolderCurrentIndexRef.current.get(normalizedSubfolder) || 0;
    if (subfolderIndex >= imageIndices.length) {
      subfolderIndex = 0;
    }
    
    preloadingRef.current = true;
    const imagesToPreload = [];
    
    // Obtener las próximas imágenes que no estén listas (solo de la subcarpeta actual)
    for (let i = 0; i < imageIndices.length * 2 && imagesToPreload.length < MAX_PRELOAD; i++) {
      const idx = (subfolderIndex + i) % imageIndices.length;
      const imageIndex = imageIndices[idx];
      const imageObj = allImages[imageIndex];
      const imagePath = typeof imageObj === 'object' ? (imageObj.path || imageObj) : imageObj;
      const imageState = imageStatesRef.current.get(imagePath);
      
      // Solo precargar si está pendiente
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
      }, idx * 30);
    });

    setTimeout(() => {
      preloadingRef.current = false;
    }, imagesToPreload.length * 30 + 100);
  }, [allImages, preloadImage, getCurrentSubfolder]);

  // Función para hacer seek a una posición de imagen usando tiempos auxiliares
  const seekToImagePosition = useCallback((targetTime, selectedTrack) => {
    if (!selectedTrack || !selectedTrack.seekTimeMap || selectedTrack.seekTimeMap.size === 0) {
      console.warn('[Gallery] seekToImagePosition: seekTimeMap no disponible');
      return;
    }
    
    if (allImages.length === 0) {
      console.warn('[Gallery] seekToImagePosition: no hay imágenes disponibles');
      return;
    }
    
    const seekTimeMap = selectedTrack.seekTimeMap;
    
    // Encontrar la imagen más cercana al tiempo objetivo
    let closestIndex = 0;
    let minTimeDiff = Infinity;
    
    seekTimeMap.forEach((time, index) => {
      if (index >= allImages.length) return;
      const timeDiff = Math.abs(time - targetTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestIndex = index;
      }
    });
    
    // Determinar la subcarpeta de la imagen objetivo
    const targetImageObj = allImages[closestIndex];
    if (!targetImageObj) return;
    
    const targetImagePath = typeof targetImageObj === 'object' ? (targetImageObj.path || targetImageObj) : targetImageObj;
    const targetSubfolder = imagesBySubfolderRef.current.get(targetImagePath);
    const normalizedTargetSubfolder = targetSubfolder === null ? '__root__' : targetSubfolder;
    
    // Encontrar la posición de esta imagen en los índices de su subcarpeta
    const subfolderIndices = subfolderImageIndicesRef.current.get(normalizedTargetSubfolder);
    if (!subfolderIndices || subfolderIndices.length === 0) {
      // Si no hay índices para esta subcarpeta, usar todas las imágenes
      currentIndexRef.current = closestIndex;
      console.log(`[Gallery] Seek a tiempo ${targetTime.toFixed(2)}s: imagen ${closestIndex} (sin subcarpeta específica)`);
      return;
    }
    
    const positionInSubfolder = subfolderIndices.indexOf(closestIndex);
    if (positionInSubfolder === -1) {
      // Si la imagen no está en los índices de su subcarpeta, buscar la más cercana
      let closestPosition = 0;
      let minDist = Infinity;
      subfolderIndices.forEach((idx, pos) => {
        const dist = Math.abs(idx - closestIndex);
        if (dist < minDist) {
          minDist = dist;
          closestPosition = pos;
        }
      });
      subfolderCurrentIndexRef.current.set(normalizedTargetSubfolder, closestPosition);
      currentIndexRef.current = subfolderIndices[closestPosition];
      console.log(`[Gallery] Seek a tiempo ${targetTime.toFixed(2)}s: imagen ${closestIndex}, ajustado a posición ${closestPosition} en subcarpeta ${targetSubfolder || '__root__'}`);
      return;
    }
    
    // Resetear estados de imágenes usadas desde la posición objetivo hacia adelante en esta subcarpeta
    // También resetear las anteriores si estamos rebobinando
    const currentPosition = subfolderCurrentIndexRef.current.get(normalizedTargetSubfolder) || 0;
    const isRewinding = positionInSubfolder < currentPosition;
    
    const startReset = isRewinding ? positionInSubfolder : currentPosition;
    const endReset = isRewinding ? currentPosition : positionInSubfolder;
    
    for (let i = startReset; i <= endReset; i++) {
      if (i >= subfolderIndices.length) break;
      const idx = subfolderIndices[i];
      const imgObj = allImages[idx];
      const imgPath = typeof imgObj === 'object' ? (imgObj.path || imgObj) : imgObj;
      const state = imageStatesRef.current.get(imgPath);
      
      if (state && state.state === 'used') {
        imageStatesRef.current.set(imgPath, { ...state, state: 'ready' });
        const imgSubfolder = imagesBySubfolderRef.current.get(imgPath);
        if (imgSubfolder !== null && subfolderCountsRef.current.has(imgSubfolder)) {
          const counts = subfolderCountsRef.current.get(imgSubfolder);
          if (counts.used > 0) counts.used--;
        }
      }
    }
    
    // Actualizar índice de la subcarpeta
    subfolderCurrentIndexRef.current.set(normalizedTargetSubfolder, positionInSubfolder);
    currentIndexRef.current = closestIndex;
    
    console.log(`[Gallery] Seek a tiempo ${targetTime.toFixed(2)}s: imagen ${closestIndex}, subcarpeta ${targetSubfolder || '__root__'}, posición en subcarpeta ${positionInSubfolder}`);
  }, [allImages]);
  
  return { 
    allImages, 
    getNextImage, 
    isLoading, 
    preloadProgress,
    preloadNextImages,
    seekToImagePosition
  };
};

export default useGallery;
