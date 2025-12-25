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
        const audioContext = require.context('../assets/tracks', true, /\.(mp3|m4a|wav|ogg)$/);
        const audioFiles = audioContext.keys();
        
        // Cargar archivos guion.js
        const guionContext = require.context('../assets/tracks', true, /guion\.js$/);
        const guionFiles = guionContext.keys();
        
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
              audioSrc: null,
              guion: null
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
              audioSrc: null,
              guion: null
            };
          }
          
          // Asignar el audio (si hay múltiples, tomar el primero)
          if (!tracksTemp[trackName].audioSrc) {
            tracksTemp[trackName].audioSrc = audioContext(file);
          }
        });

        // Procesar archivos guion.js
        guionFiles.forEach(file => {
          const pathParts = file.split('/');
          const trackName = pathParts[1]; // El nombre de la carpeta es el nombre del track
          
          if (!tracksTemp[trackName]) {
            tracksTemp[trackName] = {
              id: trackName.toLowerCase().replace(/\s+/g, '-'),
              name: trackName,
              images: [],
              audioSrc: null,
              guion: null
            };
          }
          
          // Cargar el guion
          try {
            const guionModule = guionContext(file);
            tracksTemp[trackName].guion = guionModule.default || guionModule;
          } catch (error) {
            console.warn(`Error al cargar guion para ${trackName}:`, error);
          }
        });

        // Convertir a array y filtrar tracks que tengan al menos audio
        let tracksArray = Object.values(tracksTemp)
          .filter(track => track.audioSrc !== null) // Solo tracks con audio
          .map(track => ({
            id: track.id,
            name: track.name,
            src: track.audioSrc,
            images: track.images,
            guion: track.guion // Incluir el guion si existe
          }));

        // Si existe Croquetas25, agregar todas las imágenes de otros tracks
        const croquetas25Track = tracksArray.find(t => t.id === 'croquetas25' || t.name.toLowerCase() === 'croquetas25' || t.name.toLowerCase() === 'croquetas 25');
        if (croquetas25Track) {
          // Recopilar todas las imágenes de otros tracks (excluyendo Croquetas25)
          const allOtherImages = tracksArray
            .filter(t => t.id !== 'croquetas25' && t.name.toLowerCase() !== 'croquetas25' && t.name.toLowerCase() !== 'croquetas 25')
            .flatMap(t => t.images);
          
          // Agregar todas las imágenes a Croquetas25
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

  return {
    tracks,
    isLoading
  };
};

export default useTracks;

