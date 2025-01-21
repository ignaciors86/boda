import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import Sobre from './components/Sobre/Sobre';
import './App.scss';
import { DragProvider } from './components/DragContext';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import FondosBaile from './components/FondosBaile/FondosBaile'; // Importa tu nuevo componente
import { renderItems } from 'components/Timeline/items';
import { items } from './components/Timeline/items'; // Asegúrate de importar correctamente

const App = () => {
  const tlApp = gsap.timeline();
  const [articles, setArticles] = useState([]);
  const [casandonos, setCasandonos] = useState(true);

  // Estado para datos de invitado
  const [invitado, setInvitado] = useState(null);

  // Hook para el fetch general (comentado según lo requerido)
  // useEffect(() => {
  //   fetch('https://boda-strapi-production.up.railway.app/api/invitados?populate=*')
  //     .then((response) => response.json())
  //     .then((data) => setArticles(data));
  // }, []);

  const duration = 1;

  useEffect(() => {
    console.log(articles);
  }, [articles]);

  // Precarga de audios
  useEffect(() => {
    const audioCache = [];
    items.forEach((item) => {
      if (item.audioWedding) {
        const audioWedding = new Audio(item.audioWedding);
        audioCache.push(audioWedding); // Guardar para evitar recolección de basura
      }
    });
    items.forEach((item) => {
      if (item.audio) {
        const audio = new Audio(item.audio);
        audioCache.push(audio); // Guardar para evitar recolección de basura
      }
    });
    items.forEach((item) => {
      if (item.imagesWeedding) {
        const imagen = new Image(item.imagesWeedding);
        audioCache.push(imagen); // Guardar para evitar recolección de basura
      }
    });
    items.forEach((item) => {
      if (item.images) {
        const imagen = new Image(item.images);
        audioCache.push(imagen); // Guardar para evitar recolección de basura
      }
    });
  }, []);

  // Ruta que obtiene el documentId y carga los datos de invitado
  const LoadInvitado = () => {
    const { documentId } = useParams(); // Obtener el parámetro de la URL
    const [localInvitado, setLocalInvitado] = useState(null); // Estado local para el invitado
    const [isLoading, setIsLoading] = useState(true); // Estado para controlar la carga
  
    useEffect(() => {
      if (!documentId || localInvitado) return; // Evita hacer el fetch si ya tienes datos o falta el ID
  
      // Realiza el fetch solo si no hay datos
      setIsLoading(true); // Inicia el estado de carga
      fetch(`https://boda-strapi-production.up.railway.app/api/invitados/${documentId}?populate=*`)
        .then((response) => response.json())
        .then((data) => {
          setLocalInvitado(data); // Guarda los datos en el estado local
          setIsLoading(false); // Termina la carga
        })
        .catch((error) => {
          console.error('Error al obtener los datos del invitado:', error);
          setIsLoading(false); // Maneja el error y termina la carga
        });
    }, [documentId, localInvitado]); // Se ejecuta solo si cambia documentId o localInvitado
  
    // Renderizar mientras se cargan los datos
    if (isLoading) {
      return <div>Cargando invitado...</div>;
    }
  
    // Renderizar el componente <Sobre> una vez que los datos están disponibles
    return <Sobre casandonos={true} invitado={localInvitado} />;
  };
  
  return (
    <Router>
      <DragProvider>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Sobre />
              </>
            }
          />
          <Route
            path="/weedding"
            element={
              <>
                <Sobre weedding={true} uri="weedding" />
              </>
            }
          />
          <Route
            path="/weedding-house"
            element={
              <>
                <Sobre weedding={true} hosteado={true} uri="weedding-house" />
              </>
            }
          />
          <Route
            path="/atajo"
            element={
              <>
                <Sobre atajo={true} weedding={true} />
              </>
            }
          />
          <Route path="/fondos-baile" element={<FondosBaile />} />
          {/* Ruta para cargar los datos del invitado */}
          <Route path="/:documentId" element={<LoadInvitado />} />
        </Routes>
      </DragProvider>
    </Router>
  );
};

export default App;
