import { useState, useEffect } from 'react';

const normalizeName = (name) => name?.toLowerCase().replace(/\s+/g, '-') || '';

export const useTracks = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        // Cargar manifest desde public
        const response = await fetch('/tracks/tracks-manifest.json');
        if (!response.ok) {
          throw new Error(`Failed to load tracks manifest: ${response.status}`);
        }
        const manifest = await response.json();
        const { tracks: tracksData } = manifest;
        const tracksMap = new Map();

        // Procesar cada track del manifest
        Object.keys(tracksData).forEach(trackName => {
          if (!isValidTrackName(trackName)) return;
          
          const trackKey = normalizeName(trackName);
          const trackData = tracksData[trackName];
          
          // Crear estructura del track
          const track = {
            id: trackKey,
            name: trackName,
            imagesBySubfolder: new Map(),
            audioBySubfolder: new Map()
          };
          
          // Procesar subcarpetas
          Object.keys(trackData).forEach(subfolder => {
            const subfolderData = trackData[subfolder];
            
            // Procesar imágenes
            if (subfolderData.images && subfolderData.images.length > 0) {
              track.imagesBySubfolder.set(subfolder, subfolderData.images.map(img => ({
                path: img.url,
                originalPath: img.path,
                subfolder: subfolder,
                trackName: trackName
              })));
            }
            
            // Procesar audios - usar URLs directamente del manifest, igual que Croquetas25
            if (subfolderData.audio && subfolderData.audio.length > 0) {
              track.audioBySubfolder.set(subfolder, subfolderData.audio.map(audio => audio.url));
            }
          });
          
          tracksMap.set(trackKey, track);
        });

        // Convertir a array de tracks finales
        const finalTracks = [];
        
        tracksMap.forEach((track) => {
          // Ordenar subcarpetas
          const subfolderOrder = Array.from(track.imagesBySubfolder.keys()).sort((a, b) => {
            if (a === '__root__') return -1;
            if (b === '__root__') return 1;
            return a.localeCompare(b);
          });
          
          // Crear array de imágenes secuencial
          const imagesArray = [];
          subfolderOrder.forEach(subfolder => {
            imagesArray.push(...track.imagesBySubfolder.get(subfolder));
          });

          // Procesar audios - usar imports estáticos
          const audioSubfolders = Array.from(track.audioBySubfolder.keys()).sort((a, b) => {
            if (a === '__root__') return -1;
            if (b === '__root__') return 1;
            return a.localeCompare(b);
          });
          
          const audioSrcs = [];
          const subfolderToAudioIndex = {};
          let audioIndex = 0;
          let lastAudioIndex = -1;

          // Primero, mapear audios existentes
          audioSubfolders.forEach(subfolder => {
            const audios = track.audioBySubfolder.get(subfolder);
            if (audios && audios.length > 0) {
              // Asegurar que el audio sea un string válido
              let audioSrc = audios[0];
              if (typeof audioSrc !== 'string') {
                audioSrc = audioSrc?.default || String(audioSrc);
              }
              // Verificar que sea un string válido antes de agregarlo
              if (typeof audioSrc === 'string' && audioSrc.length > 0) {
                subfolderToAudioIndex[subfolder] = audioIndex;
                audioSrcs.push(audioSrc);
                lastAudioIndex = audioIndex;
                audioIndex++;
              }
            }
          });

          // Asociar subcarpetas de imágenes sin audio al audio anterior
          subfolderOrder.forEach(subfolder => {
            if (!subfolderToAudioIndex.hasOwnProperty(subfolder)) {
              if (lastAudioIndex >= 0) {
                subfolderToAudioIndex[subfolder] = lastAudioIndex;
              } else if (audioSrcs.length > 0) {
                subfolderToAudioIndex[subfolder] = 0;
              }
            } else {
              lastAudioIndex = subfolderToAudioIndex[subfolder];
            }
          });

          // Asegurar que todos los audioSrcs sean strings válidos
          const validAudioSrcs = audioSrcs.filter(src => {
            if (typeof src === 'string' && src.length > 0) {
              return true;
            }
            return false;
          });

          const finalTrack = {
            id: track.id,
            name: track.name,
            srcs: validAudioSrcs,
            images: imagesArray,
            subfolderOrder: subfolderOrder,
            imagesBySubfolder: Object.fromEntries(track.imagesBySubfolder),
            subfolderToAudioIndex: subfolderToAudioIndex
          };

          finalTracks.push(finalTrack);
        });

        setTracks(finalTracks);
        setIsLoading(false);
      } catch (error) {
        console.error('[useTracks] Error cargando tracks:', error);
        setIsLoading(false);
      }
    };

    loadTracks();
  }, []);

  return { tracks, isLoading };
};

const isValidTrackName = (trackName) => {
  if (!trackName) return false;
  const IGNORED_FOLDERS = ['components', 'backups', 'node_modules', '.git', 'generateAudioImports.js', 'audioImports.js', 'tracks-manifest.json'];
  if (IGNORED_FOLDERS.includes(trackName.toLowerCase())) return false;
  if (trackName.startsWith('.')) return false;
  return true;
};
