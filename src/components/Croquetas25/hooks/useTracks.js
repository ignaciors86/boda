import { useState, useEffect } from 'react';

// Hook para cargar automáticamente tracks desde carpetas
export const useTracks = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTracks = () => {
      try {
        // Cargar todas las imágenes de las carpetas de tracks
        const imagesContext = require.context('../assets/tracks', true, /\.(jpg|jpeg|png|gif|webp)$/);
        const imageFiles = imagesContext.keys();
        
        // Cargar todos los archivos de audio
        const audioContext = require.context('../assets/tracks', true, /\.(mp3|wav|ogg)$/);
        const audioFiles = audioContext.keys();
        
        // Crear un objeto temporal para almacenar los tracks
        const tracksTemp = {};

        // Procesar cada archivo de imagen encontrado
        imageFiles.forEach(file => {
          const pathParts = file.split('/');
          const trackName = pathParts[1]; // El nombre de la carpeta es el nombre del track
          
          if (!tracksTemp[trackName]) {
            tracksTemp[trackName] = {
              id: trackName.toLowerCase().replace(/\s+/g, '-'), // ID en minúsculas con guiones
              name: trackName, // Nombre original de la carpeta
              images: [],
              audioSrc: null
            };
          }
          
          tracksTemp[trackName].images.push(imagesContext(file));
        });

        // Procesar cada archivo de audio encontrado
        audioFiles.forEach(file => {
          const pathParts = file.split('/');
          const trackName = pathParts[1]; // El nombre de la carpeta es el nombre del track
          
          if (!tracksTemp[trackName]) {
            tracksTemp[trackName] = {
              id: trackName.toLowerCase().replace(/\s+/g, '-'),
              name: trackName,
              images: [],
              audioSrc: null
            };
          }
          
          // Asignar el audio (si hay múltiples, tomar el primero)
          if (!tracksTemp[trackName].audioSrc) {
            tracksTemp[trackName].audioSrc = audioContext(file);
          }
        });

        // Convertir a array y filtrar tracks que tengan al menos audio
        const tracksArray = Object.values(tracksTemp)
          .filter(track => track.audioSrc !== null) // Solo tracks con audio
          .map(track => ({
            id: track.id,
            name: track.name,
            src: track.audioSrc,
            images: track.images
          }));

        console.log('Tracks encontrados:', tracksArray.map(t => ({ id: t.id, name: t.name, images: t.images.length })));
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

  return {
    tracks,
    isLoading
  };
};

export default useTracks;

