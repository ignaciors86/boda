import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import Sobre from './components/Sobre/Sobre';
import './App.scss';
import { DragProvider } from './components/DragContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FondosBaile from './components/FondosBaile/FondosBaile'; // Importa tu nuevo componente
import { renderItems } from 'components/Timeline/items';
import { items } from './components/Timeline/items'; // Asegúrate de importar correctamente

const App = () => {
  const tlApp = gsap.timeline();
  const [articles, setArticles] = useState([]);

  // useEffect(() => {
  //   fetch('https://strapi-boda-production.up.railway.app/invitados')
  //     .then(response => response.json())
  //     .then(data => setArticles(data));
  // }, []);  

  const duration = 1;
  // console.log(articles);

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

  return (
    <Router>
      <DragProvider>
        {/* <div className="App"> */}
        {/* {articles?.map(article => (
            <div key={article.id}>
              <h2>{article.nombre}</h2>
            </div>
          ))}  */}

        <Routes>
          <Route path="/" element={<>
            <Sobre />
          </>} />
          <Route path="/weedding" element={<>
            <Sobre weedding={true} tipo={true} uri="weedding" />
          </>} />
          <Route path="/weedding-house" element={<>
            <Sobre weedding={true} tipo={true} hosteado={true} uri="weedding-house" />
          </>} />
          <Route path="/atajo" element={<>
            <Sobre atajo={true} />
          </>} />
          <Route path="/prueba-tipo" element={<>
            <Sobre atajo={true} tipo={true} />
          </>} />
          <Route path="/fondos-baile" element={<FondosBaile />} /> {/* Nueva ruta */}
        </Routes>
        {/* </div> */}
      </DragProvider>
    </Router>
  );
}

export default App;
