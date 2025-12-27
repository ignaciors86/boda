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
          
          tracksTemp[trackName].audioBySubfolder[subfolder].push(audioContext(file));
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
                track.audioSrcs.push(sortedAudios[0]); // Solo primer audio por subcarpeta
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
          const allOtherImages = tracksArray
            .filter(t => !['croquetas25', 'croquetas 25'].includes(normalizeName(t.name)))
            .flatMap(t => t.images)
            .map(img => typeof img === 'object' ? img : { path: img, originalPath: img, subfolder: '__root__' });
          
          // Ordenar por originalPath
          allOtherImages.sort((a, b) => {
            const pathA = a.originalPath || a.path || '';
            const pathB = b.originalPath || b.path || '';
            return String(pathA).localeCompare(String(pathB));
          });
          
          // Combinar y ordenar
          croquetas25Track.images = [...croquetas25Track.images, ...allOtherImages].sort((a, b) => {
            const pathA = a.originalPath || a.path || '';
            const pathB = b.originalPath || b.path || '';
            return String(pathA).localeCompare(String(pathB));
          });
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
