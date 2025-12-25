import { useState, useEffect } from 'react';

// Helper para normalizar nombres
const normalizeName = (name) => name?.toLowerCase().replace(/\s+/g, '-') || '';

// Helper para crear track inicial
const createTrack = (trackName) => ({
  id: normalizeName(trackName),
  name: trackName,
  images: [],
  audioSrc: null,
  guion: null
});

// Helper para procesar archivos
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

        // Procesar imágenes
        processFiles(imagesContext.keys(), imagesContext, tracksTemp, (track, imagePath) => {
          track.images.push(imagePath);
        });

        // Procesar audio
        processFiles(audioContext.keys(), audioContext, tracksTemp, (track, audioPath) => {
          if (!track.audioSrc) track.audioSrc = audioPath;
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

        // Convertir a array y filtrar tracks con audio
        let tracksArray = Object.values(tracksTemp)
          .filter(track => track.audioSrc !== null)
          .map(track => ({
            id: track.id,
            name: track.name,
            src: track.audioSrc,
            images: track.images,
            guion: track.guion
          }));

        // Agregar todas las imágenes a Croquetas25 si existe
        const croquetas25Track = tracksArray.find(t => 
          ['croquetas25', 'croquetas 25'].includes(normalizeName(t.name))
        );
        
        if (croquetas25Track) {
          const allOtherImages = tracksArray
            .filter(t => !['croquetas25', 'croquetas 25'].includes(normalizeName(t.name)))
            .flatMap(t => t.images);
          croquetas25Track.images = [...croquetas25Track.images, ...allOtherImages];
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
