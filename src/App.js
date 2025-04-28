import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import Sobre from './components/Sobre/Sobre';
import './App.scss';
import { DragProvider } from './components/DragContext';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import FondosBaile from './components/FondosBaile/FondosBaile'; // Importa tu nuevo componente
import { renderItems } from 'components/Timeline/items';
import { items } from './components/Timeline/items'; // Asegúrate de importar correctamente
import Creditos from 'components/Creditos/Creditos';
import KITT from 'components/KITT/KITT';
import { InvitadoImageProvider } from './contexts/InvitadoImageContext';
import DrumHero from 'components/DrumHero/DrumHero';
import Kudos from './components/GaticosYMonetes/Kudos';
import Controles from './components/GaticosYMonetes/Controles';
import SimpleWebRTCTest from './components/SimpleWebRTCTest';

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
    // console.log(articles);
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
    const [allInvitados, setAllInvitados] = useState([]); // Estado para todos los invitados
    const [mesasOrganizadas, setMesasOrganizadas] = useState({}); // Estado para mesas organizadas

    useEffect(() => {
      if (!documentId || localInvitado) return;

      setIsLoading(true);
      fetch('https://boda-strapi-production.up.railway.app/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate=imagen')
        .then((response) => response.json())
        .then((data) => {
          // console.log('Datos de invitados:', data); // Verifica los datos recibidos
          setAllInvitados(data);

          // Organizar los datos por mesas
          const mesas = {};
          data.data.forEach((invitado) => {
            
            const mesa = invitado.mesa?.nombre || 'Sin mesa'; // Usa "Sin mesa" si no tiene mesa asignada
            
            if (!mesas[mesa]) {
              mesas[mesa] = {
                nombre: mesa,
                himno: invitado.himno,
                imagen: invitado.imagen,
                capitan: invitado.capitan,
                invitados: []
              }; // Crear array para esta mesa si no existe
            }
            // console.log(mesas[mesa])
            mesas[mesa].invitados.push(invitado); // Añadir el invitado a la mesa correspondiente
          });

          setMesasOrganizadas(mesas); // Guardar el objeto en el estado
          console.log('Mesas organizadas:', mesas); // Mostrar el resultado en consola

          // Buscar invitado específico por documentId
          const invitadoConcreto = data.data.find((invitado) => invitado.documentId === documentId);
          // console.log('documentId buscado:', documentId); // Verifica el valor del documentId
          if (invitadoConcreto) {
            console.log('DEBUG_INVITADO_ENCONTRADO', {
              invitadoCompleto: invitadoConcreto,
              attributes: invitadoConcreto.attributes,
              imagen: invitadoConcreto.attributes?.imagen,
              personaje: invitadoConcreto.attributes?.personaje
            });
            setLocalInvitado(invitadoConcreto);
            // console.log('Invitado encontrado:', invitadoConcreto);
          } else {
            console.error('No se encontró el invitado con el documentId proporcionado.');
          }

          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error al obtener los datos de los invitados:', error);
          setIsLoading(false);
        });
    }, [documentId, localInvitado]);

    // Renderizar mientras se cargan los datos
    if (isLoading) {
      return null;
    }

    // Si no hay invitado, redirigir a la página principal
    if (!localInvitado) {
      return <Sobre />;
    }

    // Renderizar el componente <Sobre> una vez que los datos están disponibles
    return <Sobre casandonos={true} weedding={localInvitado.weedding} mesas={mesasOrganizadas} invitado={localInvitado} />;
  };

  const SIGNAL_SERVER_URL = 'ws://localhost:8080';

  return (
    <InvitadoImageProvider>
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
              path="/creditos-finales"
              element={
                <>
                  <Creditos />
                </>
              }
            />
            <Route path="/fondos-baile" element={<FondosBaile />} />
            <Route path="/kitt" element={<KITT />} />
            <Route path="/gaticos-y-monetes" element={<DrumHero />} />
            <Route path="/gaticos-y-monetes/enar" element={<DrumHero />} />
            <Route path="/gaticos-y-monetes/kudos" element={<Kudos />} />
            <Route path="/gaticos-y-monetes/controles" element={<Controles />} />
            <Route path="/emitter" element={<SimpleWebRTCTest isEmitting={true} />} />
            <Route path="/receiver" element={<SimpleWebRTCTest isEmitting={false} />} />
            <Route path="/:documentId" element={<LoadInvitado />} />
          </Routes>
        </DragProvider>
      </Router>
    </InvitadoImageProvider>
  );
};

export default App;
