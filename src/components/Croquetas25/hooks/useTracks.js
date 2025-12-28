import { useState, useEffect } from 'react';

// Normalizar nombres de carpetas (minúsculas, sin espacios)
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '-');
};

// Carpetas que NO deben ser tracks
const IGNORED_FOLDERS = ['components', 'backups', 'node_modules', '.git'];

const isValidTrackName = (trackName) => {
  if (!trackName) return false;
  const normalized = normalizeName(trackName);
  if (IGNORED_FOLDERS.includes(normalized)) return false;
  if (trackName.startsWith('.')) return false;
  return true;
};

export const useTracks = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTracks = () => {
      try {
        // Cargar archivos usando require.context (patrón de GaticosYMonetes)
        const imagesContext = require.context('../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
        const audioContext = require.context('../assets/tracks', true, /\.(mp3|MP3)$/);
        const guionContext = require.context('../assets/tracks', true, /guion\.js$/);
        
        const imageFiles = imagesContext.keys();
        const audioFiles = audioContext.keys();
        const guionFiles = guionContext.keys();
        
        // Objeto temporal para almacenar tracks
        const tracksTemp = {};
        
        // Procesar imágenes (patrón simple de GaticosYMonetes)
        imageFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackNameOriginal = pathParts[0];
          
          if (!isValidTrackName(trackNameOriginal)) {
            return;
          }
          
          const trackNameKey = normalizeName(trackNameOriginal);
          
          if (!tracksTemp[trackNameKey]) {
            tracksTemp[trackNameKey] = {
              id: trackNameKey,
              name: trackNameOriginal,
              images: [],
              imagesBySubfolder: {},
              audioSrcs: [],
              audioBySubfolder: {},
              subfolderToAudioIndex: {},
              subfolderOrder: [],
              guionesBySubfolder: {}
            };
          }
          
          // Determinar subcarpeta
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackNameKey].imagesBySubfolder[subfolder]) {
            tracksTemp[trackNameKey].imagesBySubfolder[subfolder] = [];
          }
          
          tracksTemp[trackNameKey].imagesBySubfolder[subfolder].push({
            path: imagesContext(file),
            originalPath: file,
            subfolder: subfolder
          });
        });
        
        // Procesar audios (patrón simple)
        audioFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackNameOriginal = pathParts[0];
          
          if (!isValidTrackName(trackNameOriginal)) {
            return;
          }
          
          const trackNameKey = normalizeName(trackNameOriginal);
          
          if (!tracksTemp[trackNameKey]) {
            tracksTemp[trackNameKey] = {
              id: trackNameKey,
              name: trackNameOriginal,
              images: [],
              imagesBySubfolder: {},
              audioSrcs: [],
              audioBySubfolder: {},
              subfolderToAudioIndex: {},
              subfolderOrder: [],
              guionesBySubfolder: {}
            };
          }
          
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackNameKey].audioBySubfolder[subfolder]) {
            tracksTemp[trackNameKey].audioBySubfolder[subfolder] = [];
          }
          
          // Obtener URL del audio (require.context ya devuelve URLs válidas)
          let audioUrl = audioContext(file);
          if (typeof audioUrl !== 'string') {
            audioUrl = audioUrl?.default || audioUrl;
          }
          
          tracksTemp[trackNameKey].audioBySubfolder[subfolder].push(audioUrl);
        });
        
        // Procesar guiones
        guionFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackNameOriginal = pathParts[0];
          
          if (!isValidTrackName(trackNameOriginal)) {
            return;
          }
          
          const trackNameKey = normalizeName(trackNameOriginal);
          
          if (!tracksTemp[trackNameKey]) {
            tracksTemp[trackNameKey] = {
              id: trackNameKey,
              name: trackNameOriginal,
              images: [],
              imagesBySubfolder: {},
              audioSrcs: [],
              audioBySubfolder: {},
              subfolderToAudioIndex: {},
              subfolderOrder: [],
              guionesBySubfolder: {}
            };
          }
          
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          try {
            const module = guionContext(file);
            tracksTemp[trackNameKey].guionesBySubfolder[subfolder] = module.default || module;
          } catch (error) {
            console.warn(`Error al cargar guion para ${trackNameOriginal}:`, error);
          }
        });
        
        // Organizar imágenes y audios por subcarpeta
        Object.values(tracksTemp).forEach(track => {
          // Organizar imágenes por subcarpeta en orden alfabético
          if (track.imagesBySubfolder) {
            const subfolderKeys = Object.keys(track.imagesBySubfolder).sort((a, b) => {
              if (a === '__root__') return -1;
              if (b === '__root__') return 1;
              return a.localeCompare(b);
            });
            
            track.subfolderOrder = [...subfolderKeys];
            
            subfolderKeys.forEach(subfolder => {
              track.imagesBySubfolder[subfolder].sort((a, b) => {
                return (a.originalPath || a.path).localeCompare(b.originalPath || b.path);
              });
            });
            
            // Crear array plano de imágenes manteniendo orden de subcarpetas
            track.images = [];
            subfolderKeys.forEach(subfolder => {
              track.images.push(...track.imagesBySubfolder[subfolder]);
            });
          }
          
          // Organizar audios por subcarpeta
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
                // Ordenar audios alfabéticamente y tomar el primero
                const sortedAudios = audios.sort((a, b) => String(a).localeCompare(String(b)));
                track.subfolderToAudioIndex[subfolder] = audioIndex;
                track.audioSrcs.push(sortedAudios[0]);
                audioIndex++;
              }
            });
          }
        });
        
        // Convertir a array y filtrar tracks sin audio
        let tracksArray = Object.values(tracksTemp)
          .filter(track => track.audioSrcs && track.audioSrcs.length > 0)
          .map(track => ({
            id: track.id,
            name: track.name,
            src: track.audioSrcs[0],
            srcs: track.audioSrcs,
            images: track.images || [],
            subfolderOrder: track.subfolderOrder || [],
            imagesBySubfolder: track.imagesBySubfolder || {},
            subfolderToAudioIndex: track.subfolderToAudioIndex || {},
            guionesBySubfolder: track.guionesBySubfolder || {},
            guion: track.guionesBySubfolder?.['__root__'] || null
          }));
        
        // Lógica especial para Croquetas25: rotación entre colecciones
        const croquetas25Track = tracksArray.find(t => 
          ['croquetas25', 'croquetas 25'].includes(normalizeName(t.name))
        );
        
        if (croquetas25Track) {
          const imagesByCollection = new Map();
          
          // Agregar imágenes propias de Croquetas25
          if (croquetas25Track.images && croquetas25Track.images.length > 0) {
            imagesByCollection.set('croquetas25', croquetas25Track.images.map(img => 
              typeof img === 'object' ? { ...img, collection: 'croquetas25' } : { path: img, originalPath: img, subfolder: '__root__', collection: 'croquetas25' }
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
          
          // Crear array intercalado
          const interleavedImages = [];
          const collectionNames = Array.from(imagesByCollection.keys());
          const maxImagesPerCollection = Math.max(...Array.from(imagesByCollection.values()).map(imgs => imgs.length));
          
          for (let round = 0; round < maxImagesPerCollection; round++) {
            const shuffledCollections = [...collectionNames].sort(() => Math.random() - 0.5);
            
            shuffledCollections.forEach(collectionName => {
              const collectionImages = imagesByCollection.get(collectionName);
              if (collectionImages && round < collectionImages.length) {
                interleavedImages.push(collectionImages[round]);
              }
            });
          }
          
          collectionNames.forEach(collectionName => {
            const collectionImages = imagesByCollection.get(collectionName);
            if (collectionImages && collectionImages.length > maxImagesPerCollection) {
              for (let i = maxImagesPerCollection; i < collectionImages.length; i++) {
                interleavedImages.push(collectionImages[i]);
              }
            }
          });
          
          croquetas25Track.images = interleavedImages;
          croquetas25Track.useCollectionRotation = true;
        }
        
        console.log('[useTracks] Tracks cargados:', tracksArray.map(t => ({ 
          id: t.id, 
          name: t.name, 
          images: t.images.length,
          audios: t.srcs.length,
          hasGuion: !!t.guion
        })));
        
        setTracks(tracksArray);
        setIsLoading(false);
      } catch (error) {
        console.error('[useTracks] Error al cargar tracks:', error);
        setTracks([]);
        setIsLoading(false);
      }
    };

    loadTracks();
  }, []);

  return { tracks, isLoading };
};

export default useTracks;
