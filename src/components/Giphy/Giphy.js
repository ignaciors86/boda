import React, { useEffect, useState } from 'react';
import './Giphy.scss';

const Giphy = () => {
  const [gifs, setGifs] = useState([]);
  const [currentGifIndex, setCurrentGifIndex] = useState(0);

  const apiKey = 'VgAQaRv2iDTQMz5Fv5dA6ehM09ws2Yfn'; // Reemplaza con tu clave API de Giphy
  const query = 'tv show'; // Cambia esto por lo que quieras buscar

  // Función para obtener los GIFs de la API
  const fetchGifs = async () => {
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&username=afv`
      );
      const data = await response.json();
      setGifs(data.data.map(gif => gif.images.original.url));
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    }
  };

  // Cambia el GIF cada 5 segundos
  useEffect(() => {
    if (gifs.length > 0) {
      const interval = setInterval(() => {
        setCurrentGifIndex(prevIndex => (prevIndex + 1) % gifs.length);
      }, 5000); // Cambia el GIF cada 5 segundos
      return () => clearInterval(interval); // Limpia el intervalo cuando se desmonta el componente
    }
  }, [gifs]);

  // Llama a la API cuando se monta el componente
  useEffect(() => {
    fetchGifs();
  }, []);

  return (
    <div className="gif-container">
      {gifs.length > 0 && (
        <img
          className="gif"
          src={gifs[currentGifIndex]}
          alt="Giphy loop"
        />
      )}
    </div>
  );
};

export default Giphy;
