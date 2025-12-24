import React from 'react';
import { colecciones } from '../../data/GaticosYMonetes';

const GaleriaLoader = () => {
  const [galerias, setGalerias] = React.useState({});

  React.useEffect(() => {
    try {
      // Cargar todas las imágenes de las galerías
      const context = require.context('./galerias', true, /\.(jpg|jpeg|png|gif|webp)$/);
      const files = context.keys();
      
      // Crear un objeto temporal para almacenar las galerías
      const galeriasTemp = {};

      // Añadir la colección "ninguna" primero
      galeriasTemp.ninguna = colecciones.ninguna;

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

      // Si no hay galerías cargadas, usar las colecciones de ejemplo
      if (Object.keys(galeriasTemp).length <= 1) { // Solo la colección "ninguna"
        Object.assign(galeriasTemp, colecciones);
      }

      console.log('Galerías encontradas:', Object.keys(galeriasTemp));
      Object.entries(galeriasTemp).forEach(([nombre, galeria]) => {
        console.log(`Galería: ${nombre}, imágenes:`, galeria.imagenes);
      });
      setGalerias(galeriasTemp);
    } catch (error) {
      console.error('Error al cargar las galerías:', error);
      // En caso de error, usar las colecciones de ejemplo
      setGalerias(colecciones);
    }
  }, []);

  return galerias;
};

export default GaleriaLoader; 