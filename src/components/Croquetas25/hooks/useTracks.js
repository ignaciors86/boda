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
        const audioContext = require.context('../assets/tracks', true, /\.(mp3|m4a|wav|ogg)$/);
        const guionContext = require.context('../assets/tracks', true, /guion\.js$/);
        
        const tracksTemp = {};

        // Procesar imágenes - ordenar alfabéticamente por ruta completa
        // require.context con true busca recursivamente en subcarpetas
        const imageFiles = imagesContext.keys().sort((a, b) => a.localeCompare(b));
        console.log('[useTracks] Archivos de imagen encontrados (recursivo):', imageFiles.length, imageFiles.slice(0, 10));
        processFiles(imageFiles, imagesContext, tracksTemp, (track, imagePath, file) => {
          // Incluir la ruta completa del archivo para mantener referencia a subcarpetas
          track.images.push({ path: imagePath, originalPath: file });
        });

        // Procesar audio - cargar todos los archivos de audio por colección, ordenados alfabéticamente
        const audioFiles = audioContext.keys().sort((a, b) => a.localeCompare(b));
        audioFiles.forEach(file => {
          const pathParts = file.split('/').filter(p => p && p !== '.');
          const trackName = pathParts[0];
          if (!tracksTemp[trackName]) tracksTemp[trackName] = createTrack(trackName);
          tracksTemp[trackName].audioSrcs.push(audioContext(file));
        });

        // Procesar guiones
        processFiles(guionContext.keys(), guionContext, tracksTemp, (track, guionModule, file) => {
          try {
            const module = guionContext(file);
            track.guion = module.default || module;
          } catch (error) {
            console.warn(`Error al cargar guion para ${track.name}:`, error);
          }
        });

        // Ordenar imágenes dentro de cada track alfabéticamente
        Object.values(tracksTemp).forEach(track => {
          // Si las imágenes son objetos con path y originalPath, ordenar por originalPath
          // Si son strings, ordenar directamente
          track.images.sort((a, b) => {
            const pathA = typeof a === 'string' ? a : a.originalPath || a.path;
            const pathB = typeof b === 'string' ? b : b.originalPath || b.path;
            return pathA.localeCompare(pathB);
          });
        });

        let tracksArray = Object.values(tracksTemp)
          .filter(track => track.audioSrcs.length > 0) // Filtrar tracks con al menos un audio
          .map(track => ({
            id: track.id,
            name: track.name,
            src: track.audioSrcs[0], // Mantener compatibilidad: primer audio como src
            srcs: track.audioSrcs, // Array de todos los audios ordenados alfabéticamente
            // Convertir imágenes a formato esperado (string o objeto con path)
            images: track.images.map(img => typeof img === 'string' ? img : img.path || img),
            guion: track.guion
          }));

        const croquetas25Track = tracksArray.find(t => 
          ['croquetas25', 'croquetas 25'].includes(normalizeName(t.name))
        );
        
        if (croquetas25Track) {
          const allOtherImages = tracksArray
            .filter(t => !['croquetas25', 'croquetas 25'].includes(normalizeName(t.name)))
            .flatMap(t => t.images)
            .sort((a, b) => a.localeCompare(b));
          croquetas25Track.images = [...croquetas25Track.images, ...allOtherImages].sort((a, b) => a.localeCompare(b));
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
