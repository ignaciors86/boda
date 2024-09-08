import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import Sobre from './components/Sobre/Sobre';
import './App.scss';
import { DragProvider } from './components/DragContext';

const App = () => {
  const tlApp = gsap.timeline();
  // useEffect(() => {
  //   tlApp.to(".App-header", { opacity: 1, duration: 2, });
  // }, []);

  // const [articles, setArticles] = useState([]);

  // useEffect(() => {
  //   fetch('http://localhost:1337/invitados')
  //     .then(response => response.json())
  //     .then(data => setArticles(data));
  // }, []);

  const [seccion, setSeccion] = useState("sobre");
  const duration = 1;

  // useEffect(() => {
  //   console.log(seccion);
  //   seccion === "sobre" ? tlApp
  //     .to(".seccion", { opacity: 0, duration: duration })
  //     .to(".seccion", { visibility: "hidden", duration: 0 }, ">")
  //   : tlApp
  //     .to(`.seccion.${seccion}, .back`, { x: "100vw", duration: 0, opacity: 1, visibility: "visible" })
  //     .to(`.seccion.${seccion}, .back`, { x: seccion ? 0 : "100vw", opacity: seccion ? 1 : 0, duration: duration }, ">")
  //     .to(".back", { opacity: seccion !== "sobre" ? 1 : 0, duration: duration }, 0);
  // }, [seccion]);

  return (
    <DragProvider>
      {/* <div className="App"> */}
        {/* {articles?.map(article => (
          <div key={article.id}>
            <h2>{article.nombre}</h2>
          </div>
        ))} */}
        <Sobre setSeccion={setSeccion} />
      {/* </div> */}
    </DragProvider>
  );
}

export default App;
