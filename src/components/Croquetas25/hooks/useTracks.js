import { useState, useEffect } from 'react';

const normalizeName = (name) => name?.toLowerCase().replace(/\s+/g, '-') || '';

const createTrack = (trackName) => ({
  id: normalizeName(trackName),
  name: trackName,
  images: [],
  audioSrcs: [], // Array para múltiples audios
  guion: null
});

const processFiles = (files, context, tracksTemp, processor) => {
  files.forEach(file => {
    const trackName = file.split('/')[1];
    if (!tracksTemp[trackName]) tracksTemp[trackName] = createTrack(trackName);
    processor(tracksTemp[trackName], context(file), file);
  });
};

export const useTracks = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTracks = () => {
      try {
        const imagesContext = require.context('../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
        const audioContext = require.context('../assets/tracks', true, /\.(mp3|MP3)$/);
        const guionContext = require.context('../assets/tracks', true, /guion\.js$/);
        
        const tracksTemp = {};

        // Procesar imágenes - organizar por subcarpeta
        const imageFiles = imagesContext.keys().sort((a, b) => a.localeCompare(b));
        console.log('[useTracks] Archivos de imagen encontrados (recursivo):', imageFiles.length, imageFiles.slice(0, 10));
        
        imageFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackName = pathParts[0];
          if (!tracksTemp[trackName]) tracksTemp[trackName] = createTrack(trackName);
          
          // Determinar subcarpeta: si hay más de 2 partes (track/subcarpeta/archivo), usar subcarpeta
          // Si solo hay 2 partes (track/archivo), está en la raíz
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackName].imagesBySubfolder) {
            tracksTemp[trackName].imagesBySubfolder = {};
          }
          if (!tracksTemp[trackName].imagesBySubfolder[subfolder]) {
            tracksTemp[trackName].imagesBySubfolder[subfolder] = [];
          }
          
          tracksTemp[trackName].imagesBySubfolder[subfolder].push({
            path: imagesContext(file),
            originalPath: file,
            subfolder: subfolder
          });
        });

        // Procesar audio - organizar por subcarpeta
        const audioFiles = audioContext.keys().sort((a, b) => a.localeCompare(b));
        const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        audioFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackName = pathParts[0];
          if (!tracksTemp[trackName]) tracksTemp[trackName] = createTrack(trackName);
          
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackName].audioBySubfolder) {
            tracksTemp[trackName].audioBySubfolder = {};
          }
          if (!tracksTemp[trackName].audioBySubfolder[subfolder]) {
            tracksTemp[trackName].audioBySubfolder[subfolder] = [];
          }
          
          // Obtener la URL del audio desde require.context
          let audioUrl = audioContext(file);
          
          // En iOS, especialmente con subcarpetas, verificar y normalizar la ruta
          if (isIOS && subfolder !== '__root__') {
            // Convertir a string si es necesario
            if (typeof audioUrl !== 'string') {
              audioUrl = audioUrl?.default || audioUrl;
            }
            
            // Logging para diagnóstico
            console.log(`[useTracks] iOS: Procesando audio de subcarpeta - Track: ${trackName}, Subcarpeta: ${subfolder}, Ruta original: ${file}, URL generada: ${audioUrl}`);
            
            // Verificar que la URL sea válida
            if (audioUrl && typeof audioUrl === 'string') {
              // require.context debería devolver URLs válidas, pero verificar
              if (!audioUrl.startsWith('http') && !audioUrl.startsWith('data:') && !audioUrl.startsWith('/')) {
                console.warn(`[useTracks] iOS: URL de audio de subcarpeta puede ser problemática: ${audioUrl}`);
              }
            }
          }
          
          tracksTemp[trackName].audioBySubfolder[subfolder].push(audioUrl);
        });

        // Procesar guiones - organizar por subcarpeta
        const guionFiles = guionContext.keys().sort((a, b) => a.localeCompare(b));
        guionFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackName = pathParts[0];
          if (!tracksTemp[trackName]) tracksTemp[trackName] = createTrack(trackName);
          
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackName].guionesBySubfolder) {
            tracksTemp[trackName].guionesBySubfolder = {};
          }
          
          try {
            const module = guionContext(file);
            tracksTemp[trackName].guionesBySubfolder[subfolder] = module.default || module;
          } catch (error) {
            console.warn(`Error al cargar guion para ${trackName}:`, error);
          }
        });

        // Organizar imágenes, audios y guiones por subcarpeta en orden alfabético
        Object.values(tracksTemp).forEach(track => {
          // Organizar imágenes por subcarpeta
          if (track.imagesBySubfolder) {
            const subfolderKeys = Object.keys(track.imagesBySubfolder).sort((a, b) => {
              if (a === '__root__') return -1;
              if (b === '__root__') return 1;
              return a.localeCompare(b);
            });
            
            subfolderKeys.forEach(subfolder => {
              track.imagesBySubfolder[subfolder].sort((a, b) => {
                return (a.originalPath || a.path).localeCompare(b.originalPath || b.path);
              });
            });
            
            track.images = [];
            track.subfolderOrder = [];
            subfolderKeys.forEach(subfolder => {
              track.subfolderOrder.push(subfolder);
              track.images.push(...track.imagesBySubfolder[subfolder]);
            });
          }
          
          // Organizar audios por subcarpeta
          track.subfolderToAudioIndex = {};
          if (track.audioBySubfolder && Object.keys(track.audioBySubfolder).length > 0) {
            const subfolderKeys = Object.keys(track.audioBySubfolder).sort((a, b) => {
              if (a === '__root__') return -1;
              if (b === '__root__') return 1;
              return a.localeCompare(b);
            });
            
            track.audioSrcs = [];
            let audioIndex = 0;
            subfolderKeys.forEach(subfolder => {
              const audios = track.audioBySubfolder[subfolder];
              if (audios && audios.length > 0) {
                const sortedAudios = audios.sort((a, b) => String(a).localeCompare(String(b)));
                track.subfolderToAudioIndex[subfolder] = audioIndex;
                
                // En iOS, asegurar que las rutas de subcarpetas sean URLs absolutas válidas
                let audioSrc = sortedAudios[0];
                if (typeof audioSrc !== 'string') {
                  audioSrc = audioSrc?.default || audioSrc;
                }
                
                // Si es una ruta de subcarpeta y estamos en iOS, verificar y normalizar
                const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (isIOS && audioSrc && typeof audioSrc === 'string') {
                  // require.context debería devolver URLs válidas, pero en iOS con subcarpetas puede haber problemas
                  // Asegurar que la ruta sea accesible
                  if (!audioSrc.startsWith('http') && !audioSrc.startsWith('data:') && !audioSrc.startsWith('/')) {
                    // Si no tiene prefijo, podría ser una ruta relativa problemática
                    // Intentar convertir a ruta absoluta
                    try {
                      // require.context debería devolver una URL válida, pero si no, intentar construirla
                      if (audioSrc.includes('./') || audioSrc.includes('../')) {
                        // Es una ruta relativa, convertir a absoluta
                        const baseUrl = window.location.origin;
                        const absolutePath = audioSrc.startsWith('.') 
                          ? audioSrc.replace(/^\./, '')
                          : '/' + audioSrc;
                        audioSrc = baseUrl + absolutePath;
                        console.log(`[useTracks] iOS: Ruta de subcarpeta normalizada: ${audioSrc}`);
                      }
                    } catch (e) {
                      console.warn(`[useTracks] Error normalizando ruta de audio en iOS:`, e);
                    }
                  }
                }
                
                track.audioSrcs.push(audioSrc);
                audioIndex++;
              }
            });
          } else if (track.audioSrcs && track.audioSrcs.length > 0) {
            track.subfolderToAudioIndex['__root__'] = 0;
          }
          
          if (!track.audioSrcs || track.audioSrcs.length === 0) {
            track.audioSrcs = [];
          }
        });

        let tracksArray = Object.values(tracksTemp)
          .filter(track => track.audioSrcs && track.audioSrcs.length > 0)
          .map(track => ({
            id: track.id,
            name: track.name,
            src: track.audioSrcs[0],
            srcs: track.audioSrcs,
            images: track.images ? track.images.map(img => ({
              path: img.path,
              originalPath: img.originalPath,
              subfolder: img.subfolder
            })) : [],
            subfolderOrder: track.subfolderOrder || [],
            imagesBySubfolder: track.imagesBySubfolder || {},
            subfolderToAudioIndex: track.subfolderToAudioIndex || {},
            guionesBySubfolder: track.guionesBySubfolder || {},
            guion: track.guionesBySubfolder?.['__root__'] || track.guion || null
          }));

        const croquetas25Track = tracksArray.find(t => 
          ['croquetas25', 'croquetas 25'].includes(normalizeName(t.name))
        );
        
        if (croquetas25Track) {
          // Organizar imágenes por colección para rotación
          const imagesByCollection = new Map();
          
          // Agregar imágenes propias de Croquetas25
          if (croquetas25Track.images && croquetas25Track.images.length > 0) {
            imagesByCollection.set('croquetas25', croquetas25Track.images.map(img => 
              typeof img === 'object' ? img : { path: img, originalPath: img, subfolder: '__root__', collection: 'croquetas25' }
            ));
          }
          
          // Agregar imágenes de otras colecciones
          tracksArray
            .filter(t => !['croquetas25', 'croquetas 25'].includes(normalizeName(t.name)))
            .forEach(track => {
              const collectionName = normalizeName(track.name);
              if (track.images && track.images.length > 0) {
                imagesByCollection.set(collectionName, track.images.map(img => 
                  typeof img === 'object' 
                    ? { ...img, collection: collectionName }
                    : { path: img, originalPath: img, subfolder: '__root__', collection: collectionName }
                ));
              }
            });
          
          // Crear array intercalado: una imagen de cada colección en rotación
          const interleavedImages = [];
          const collectionNames = Array.from(imagesByCollection.keys());
          const maxImagesPerCollection = Math.max(...Array.from(imagesByCollection.values()).map(imgs => imgs.length));
          
          // Para cada posición, tomar una imagen de cada colección en rotación
          for (let round = 0; round < maxImagesPerCollection; round++) {
            // Mezclar el orden de las colecciones en cada ronda para más variedad
            const shuffledCollections = [...collectionNames].sort(() => Math.random() - 0.5);
            
            shuffledCollections.forEach(collectionName => {
              const collectionImages = imagesByCollection.get(collectionName);
              if (collectionImages && round < collectionImages.length) {
                interleavedImages.push(collectionImages[round]);
              }
            });
          }
          
          // Agregar las imágenes restantes de colecciones más largas
          collectionNames.forEach(collectionName => {
            const collectionImages = imagesByCollection.get(collectionName);
            if (collectionImages && collectionImages.length > maxImagesPerCollection) {
              for (let i = maxImagesPerCollection; i < collectionImages.length; i++) {
                interleavedImages.push(collectionImages[i]);
              }
            }
          });
          
          croquetas25Track.images = interleavedImages;
          // Marcar que esta colección usa rotación entre colecciones
          croquetas25Track.useCollectionRotation = true;
        }

        console.log('Tracks encontrados:', tracksArray.map(t => ({ 
          id: t.id, 
          name: t.name, 
          images: t.images.length,
          hasGuion: !!t.guion
        })));
        
        setTracks(tracksArray);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar los tracks:', error);
        setTracks([]);
        setIsLoading(false);
      }
    };

    loadTracks();
  }, []);

  return { tracks, isLoading };
};

export default useTracks;
