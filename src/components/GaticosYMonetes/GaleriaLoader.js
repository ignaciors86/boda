import React from 'react';

const GaleriaLoader = () => {
  const [galerias, setGalerias] = React.useState({});

  React.useEffect(() => {
    try {
      // Cargar todas las imágenes de las galerías
      const context = require.context('./galerias', true, /\.(jpg|jpeg|png|gif)$/);
      const files = context.keys();
      
      // Crear un objeto temporal para almacenar las galerías
      const galeriasTemp = {};

      // Procesar cada archivo encontrado
      files.forEach(file => {
        const pathParts = file.split('/');
        const galeriaName = pathParts[1]; // El nombre de la carpeta es el nombre de la galería
        
        // Ignorar la carpeta principal GaticosYMonetes
        if (galeriaName === 'GaticosYMonetes') return;
        
        if (!galeriasTemp[galeriaName]) {
          galeriasTemp[galeriaName] = {
            id: galeriaName,
            nombre: galeriaName.charAt(0).toUpperCase() + galeriaName.slice(1),
            imagenes: []
          };
        }
        
        galeriasTemp[galeriaName].imagenes.push(context(file));
      });

      console.log('Galerías encontradas:', Object.keys(galeriasTemp));
      setGalerias(galeriasTemp);
    } catch (error) {
      console.error('Error al cargar las galerías:', error);
      // En caso de error, usar las colecciones de ejemplo
      const { colecciones } = require('../../data/GaticosYMonetes');
      setGalerias(colecciones);
    }
  }, []);

  return galerias;
};

export default GaleriaLoader; 