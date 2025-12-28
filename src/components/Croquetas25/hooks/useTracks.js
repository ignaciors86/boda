import { useState, useEffect } from 'react';
import { getTrackAudiosBySubfolder, audioImports } from '../assets/tracks/audioImports';

const normalizeName = (name) => name?.toLowerCase().replace(/\s+/g, '-') || '';

// Carpetas que NO deben ser tracks
const IGNORED_FOLDERS = ['components', 'backups', 'node_modules', '.git', 'generateAudioImports.js'];

const isValidTrackName = (trackName) => {
  if (!trackName) return false;
  if (IGNORED_FOLDERS.includes(trackName.toLowerCase())) return false;
  if (trackName.startsWith('.')) return false;
  return true;
};

/**
 * Rehacer completamente la lógica de tracks desde cero
 * - Tracks normales: imágenes secuenciales por subcarpeta, asociadas a audios por subcarpeta
 * - Croquetas25: imágenes mezcladas de todas las carpetas
 */
export const useTracks = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTracks = () => {
      try {
        // Contextos para cargar archivos
        const imagesContext = require.context('../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
        const guionContext = require.context('../assets/tracks', true, /guion\.js$/);
        
        const tracksMap = new Map();

        // ============================================
        // PASO 1: Procesar todas las imágenes
        // ============================================
        const imageFiles = imagesContext.keys();
        
        imageFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackName = pathParts[0];
          
          if (!isValidTrackName(trackName)) return;
          
          const trackKey = normalizeName(trackName);
          
          // Crear track si no existe
          if (!tracksMap.has(trackKey)) {
            tracksMap.set(trackKey, {
              id: trackKey,
              name: trackName,
              imagesBySubfolder: new Map(),
              guionesBySubfolder: new Map(),
              audioBySubfolder: new Map()
            });
          }
          
          const track = tracksMap.get(trackKey);
          
          // Determinar subcarpeta
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          if (!track.imagesBySubfolder.has(subfolder)) {
            track.imagesBySubfolder.set(subfolder, []);
          }
          
          track.imagesBySubfolder.get(subfolder).push({
            path: imagesContext(file),
            originalPath: file,
            subfolder: subfolder,
            trackName: trackName
          });
        });

        // ============================================
        // PASO 2: Procesar guiones
        // ============================================
        const guionFiles = guionContext.keys();
        
        guionFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackName = pathParts[0];
          
          if (!isValidTrackName(trackName)) return;
          
          const trackKey = normalizeName(trackName);
          
          if (!tracksMap.has(trackKey)) {
            tracksMap.set(trackKey, {
              id: trackKey,
              name: trackName,
              imagesBySubfolder: new Map(),
              guionesBySubfolder: new Map(),
              audioBySubfolder: new Map()
            });
          }
          
          const track = tracksMap.get(trackKey);
          const subfolder = pathParts.length > 2 ? pathParts[1] : '__root__';
          
          try {
            const module = guionContext(file);
            track.guionesBySubfolder.set(subfolder, module.default || module);
          } catch (error) {
            // Error al cargar guion, continuar sin él
          }
        });

        // ============================================
        // PASO 3: Procesar audios desde audioImports
        // ============================================
        Object.keys(audioImports).forEach(trackName => {
          const trackKey = normalizeName(trackName);
          
          if (!tracksMap.has(trackKey)) {
            tracksMap.set(trackKey, {
              id: trackKey,
              name: trackName,
              imagesBySubfolder: new Map(),
              guionesBySubfolder: new Map(),
              audioBySubfolder: new Map()
            });
          }
          
          const track = tracksMap.get(trackKey);
          const trackAudiosBySubfolder = getTrackAudiosBySubfolder(trackName);
          
          Object.keys(trackAudiosBySubfolder).forEach(subfolder => {
            const audios = trackAudiosBySubfolder[subfolder];
            if (audios && audios.length > 0) {
              // Convertir a strings si es necesario
              const audioStrings = audios.map(audio => {
                if (typeof audio === 'string') return audio;
                return audio?.default || String(audio);
              });
              track.audioBySubfolder.set(subfolder, audioStrings);
            }
          });
        });

        // ============================================
        // PASO 4: Organizar y construir tracks finales
        // ============================================
        const finalTracks = [];
        
        tracksMap.forEach((track, trackKey) => {
          // Solo tracks con audio
          if (track.audioBySubfolder.size === 0) return;
          
          const isCroquetas25 = trackKey === 'croquetas25';
          
          // Convertir Maps a objetos para ordenar
          const subfolderKeys = Array.from(track.imagesBySubfolder.keys()).sort((a, b) => {
            if (a === '__root__') return -1;
            if (b === '__root__') return 1;
            return a.localeCompare(b);
          });
          
          // Ordenar imágenes dentro de cada subcarpeta
          subfolderKeys.forEach(subfolder => {
            const images = track.imagesBySubfolder.get(subfolder);
            images.sort((a, b) => (a.originalPath || a.path).localeCompare(b.originalPath || b.path));
          });
          
          // ============================================
          // Construir array de imágenes según el tipo de track
          // ============================================
          let imagesArray = [];
          let subfolderOrder = [];
          
          if (isCroquetas25) {
            // CROQUETAS25: Mezclar imágenes de TODAS las carpetas (todos los tracks)
            const allTracksImages = [];
            
            tracksMap.forEach((otherTrack, otherKey) => {
              if (otherKey === trackKey) return; // Saltar Croquetas25
              
              const otherSubfolders = Array.from(otherTrack.imagesBySubfolder.keys()).sort((a, b) => {
                if (a === '__root__') return -1;
                if (b === '__root__') return 1;
                return a.localeCompare(b);
              });
              
              otherSubfolders.forEach(subfolder => {
                allTracksImages.push(...otherTrack.imagesBySubfolder.get(subfolder));
              });
            });
            
            // Intercalar: una de cada track, luego otra de cada track, etc.
            const tracksWithImages = Array.from(tracksMap.entries())
              .filter(([key, t]) => key !== trackKey && t.imagesBySubfolder.size > 0)
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
            
            if (tracksWithImages.length > 0) {
              // Aplanar imágenes de cada track
              const tracksImagesArrays = tracksWithImages.map(([, t]) => {
                const flatImages = [];
                const subfolders = Array.from(t.imagesBySubfolder.keys()).sort((a, b) => {
                  if (a === '__root__') return -1;
                  if (b === '__root__') return 1;
                  return a.localeCompare(b);
                });
                subfolders.forEach(subfolder => {
                  flatImages.push(...t.imagesBySubfolder.get(subfolder));
                });
                return flatImages;
              }).filter(arr => arr.length > 0);
              
              // Intercalar
              const trackIndices = new Map();
              tracksImagesArrays.forEach((_, idx) => trackIndices.set(idx, 0));
              
              while (true) {
                let addedAny = false;
                tracksImagesArrays.forEach((images, trackIdx) => {
                  const currentIdx = trackIndices.get(trackIdx) || 0;
                  if (currentIdx < images.length) {
                    imagesArray.push(images[currentIdx]);
                    trackIndices.set(trackIdx, currentIdx + 1);
                    addedAny = true;
                  }
                });
                if (!addedAny) break;
              }
            }
            
            // SubfolderOrder para Croquetas25: todas las subcarpetas de todos los tracks
            const allSubfolders = new Set();
            tracksMap.forEach((otherTrack) => {
              otherTrack.imagesBySubfolder.forEach((_, subfolder) => {
                allSubfolders.add(subfolder);
              });
            });
            subfolderOrder = Array.from(allSubfolders).sort((a, b) => {
              if (a === '__root__') return -1;
              if (b === '__root__') return 1;
              return a.localeCompare(b);
            });
          } else {
            // TRACKS NORMALES: Secuencial por subcarpeta
            subfolderOrder = subfolderKeys;
            subfolderOrder.forEach(subfolder => {
              imagesArray.push(...track.imagesBySubfolder.get(subfolder));
            });
          }
          
          // ============================================
          // Organizar audios por subcarpeta
          // Asociar subcarpetas de imágenes a audios:
          // - Si la subcarpeta tiene audio, usar ese
          // - Si no tiene audio, usar el de la subcarpeta anterior
          // ============================================
          const audioSubfolders = Array.from(track.audioBySubfolder.keys()).sort((a, b) => {
            if (a === '__root__') return -1;
            if (b === '__root__') return 1;
            return a.localeCompare(b);
          });
          
          const audioSrcs = [];
          const subfolderToAudioIndex = {};
          let audioIndex = 0;
          let lastAudioIndex = -1; // Para asociar subcarpetas sin audio al anterior
          
          // Primero, mapear audios existentes
          audioSubfolders.forEach(subfolder => {
            const audios = track.audioBySubfolder.get(subfolder);
            if (audios && audios.length > 0) {
              subfolderToAudioIndex[subfolder] = audioIndex;
              audioSrcs.push(audios[0]);
              lastAudioIndex = audioIndex;
              audioIndex++;
            }
          });
          
          // Luego, asociar subcarpetas de imágenes sin audio al audio anterior
          subfolderOrder.forEach(subfolder => {
            if (!subfolderToAudioIndex.hasOwnProperty(subfolder)) {
              // Esta subcarpeta de imágenes no tiene audio, usar el anterior
              if (lastAudioIndex >= 0) {
                subfolderToAudioIndex[subfolder] = lastAudioIndex;
              } else if (audioSrcs.length > 0) {
                // Si no hay audio anterior pero hay audios, usar el primero
                subfolderToAudioIndex[subfolder] = 0;
              }
            } else {
              // Actualizar lastAudioIndex si esta subcarpeta tiene audio
              lastAudioIndex = subfolderToAudioIndex[subfolder];
            }
          });
          
          // ============================================
          // Construir objeto final del track
          // ============================================
          const finalTrack = {
            id: track.id,
            name: track.name,
            src: audioSrcs[0] || null,
            srcs: audioSrcs,
            images: imagesArray,
            subfolderOrder: subfolderOrder,
            imagesBySubfolder: Object.fromEntries(track.imagesBySubfolder),
            subfolderToAudioIndex: subfolderToAudioIndex,
            guionesBySubfolder: Object.fromEntries(track.guionesBySubfolder),
            guion: track.guionesBySubfolder.get('__root__') || null,
            isCroquetas25: isCroquetas25
          };
          
          finalTracks.push(finalTrack);
        });
        
        // Ordenar tracks por nombre
        finalTracks.sort((a, b) => a.name.localeCompare(b.name));
        
        setTracks(finalTracks);
        setIsLoading(false);
      } catch (error) {
        console.error('[useTracks] Error loading tracks:', error);
        setTracks([]);
        setIsLoading(false);
      }
    };

    loadTracks();
  }, []);

  return { tracks, isLoading };
};

export default useTracks;
