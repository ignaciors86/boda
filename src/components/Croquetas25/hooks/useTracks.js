import { useState, useEffect } from 'react';
import { getTrackAudios, getTrackAudiosBySubfolder, audioImports } from '../assets/tracks/audioImports';

const normalizeName = (name) => name?.toLowerCase().replace(/\s+/g, '-') || '';

// Carpetas que NO deben ser tracks (ignorar)
const IGNORED_FOLDERS = ['components', 'backups', 'node_modules', '.git'];

const isValidTrackName = (trackName) => {
  if (!trackName) return false;
  // Ignorar carpetas que no deberían ser tracks
  if (IGNORED_FOLDERS.includes(trackName.toLowerCase())) return false;
  // Ignorar nombres que empiezan con punto (archivos ocultos)
  if (trackName.startsWith('.')) return false;
  return true;
};

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
        const guionContext = require.context('../assets/tracks', true, /guion\.js$/);
        
        const tracksTemp = {};

        // Procesar imágenes - organizar por subcarpeta
        const imageFiles = imagesContext.keys().sort((a, b) => a.localeCompare(b));
        console.log('[useTracks] Archivos de imagen encontrados (recursivo):', imageFiles.length, imageFiles.slice(0, 10));
        
        imageFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackNameOriginal = pathParts[0];
          // Filtrar carpetas que no deberían ser tracks
          if (!isValidTrackName(trackNameOriginal)) {
            console.log(`[useTracks] Ignorando carpeta no válida: ${trackNameOriginal}`);
            return;
          }
          // Normalizar el nombre para usar como clave (evitar problemas case-sensitive en móviles)
          const trackNameKey = normalizeName(trackNameOriginal);
          if (!tracksTemp[trackNameKey]) {
            tracksTemp[trackNameKey] = createTrack(trackNameOriginal);
          }
          
          // Determinar subcarpeta: si hay más de 2 partes (track/subcarpeta/archivo), usar subcarpeta
          // Si solo hay 2 partes (track/archivo), está en la raíz
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackNameKey].imagesBySubfolder) {
            tracksTemp[trackNameKey].imagesBySubfolder = {};
          }
          if (!tracksTemp[trackNameKey].imagesBySubfolder[subfolder]) {
            tracksTemp[trackNameKey].imagesBySubfolder[subfolder] = [];
          }
          
          tracksTemp[trackNameKey].imagesBySubfolder[subfolder].push({
            path: imagesContext(file),
            originalPath: file,
            subfolder: subfolder
          });
        });

        // Procesar audio - usar imports estáticos como Timeline
        // Esto asegura que webpack los incluya correctamente en producción
        // Primero, obtener todos los tracks que tienen audios disponibles
        const availableTracks = Object.keys(audioImports);
        
        availableTracks.forEach(trackName => {
          const trackNameKey = normalizeName(trackName);
          
          // Si el track no existe aún, crearlo
          if (!tracksTemp[trackNameKey]) {
            tracksTemp[trackNameKey] = createTrack(trackName);
          }
          
          const trackAudiosBySubfolder = getTrackAudiosBySubfolder(trackName);
          
          if (Object.keys(trackAudiosBySubfolder).length > 0) {
            tracksTemp[trackNameKey].audioBySubfolder = {};
            
            Object.keys(trackAudiosBySubfolder).forEach(subfolder => {
              const audios = trackAudiosBySubfolder[subfolder];
              if (audios && audios.length > 0) {
                tracksTemp[trackNameKey].audioBySubfolder[subfolder] = audios;
                // Logging detallado para debug
                audios.forEach((audio, idx) => {
                  const audioUrl = typeof audio === 'string' ? audio : (audio?.default || audio);
                  console.log(`[useTracks] Audio cargado estáticamente - Track: ${trackName}, Subcarpeta: ${subfolder}, Audio ${idx + 1}: ${audioUrl}`);
                });
              }
            });
          }
        });

        // Procesar guiones - organizar por subcarpeta
        const guionFiles = guionContext.keys().sort((a, b) => a.localeCompare(b));
        guionFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackNameOriginal = pathParts[0];
          // Filtrar carpetas que no deberían ser tracks
          if (!isValidTrackName(trackNameOriginal)) {
            console.log(`[useTracks] Ignorando carpeta no válida: ${trackNameOriginal}`);
            return;
          }
          // Normalizar el nombre para usar como clave (evitar problemas case-sensitive en móviles)
          const trackNameKey = normalizeName(trackNameOriginal);
          if (!tracksTemp[trackNameKey]) {
            tracksTemp[trackNameKey] = createTrack(trackNameOriginal);
          }
          
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!tracksTemp[trackNameKey].guionesBySubfolder) {
            tracksTemp[trackNameKey].guionesBySubfolder = {};
          }
          
          try {
            const module = guionContext(file);
            tracksTemp[trackNameKey].guionesBySubfolder[subfolder] = module.default || module;
          } catch (error) {
            console.warn(`Error al cargar guion para ${trackNameOriginal}:`, error);
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
                
                // Obtener la URL del audio (imports estáticos, webpack procesa las URLs correctamente)
                // Igual que Timeline, que funciona perfectamente en producción
                let audioSrc = sortedAudios[0];
                
                // Webpack procesa los imports estáticos y devuelve strings directamente
                // Si viene como objeto (poco probable), extraer el default
                if (typeof audioSrc !== 'string') {
                  audioSrc = audioSrc?.default || audioSrc;
                  // Asegurar que sea string
                  if (typeof audioSrc !== 'string') {
                    console.warn(`[useTracks] Audio src no es string para ${track.name}:`, audioSrc);
                    audioSrc = String(audioSrc);
                  }
                }
                
                // Logging para verificar la URL generada
                console.log(`[useTracks] Agregando audio a track ${track.name}: ${audioSrc} (tipo: ${typeof audioSrc})`);
                
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
