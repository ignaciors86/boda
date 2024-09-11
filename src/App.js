import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import Sobre from './components/Sobre/Sobre';
import './App.scss';
import { DragProvider } from './components/DragContext';
import Espiral from './components/Backgrounds/Espiral/Espiral';
import Bubbles from './components/Backgrounds/Bubles/Bubles';

const App = () => {
  const tlApp = gsap.timeline();
  // const [articles, setArticles] = useState([]);

  // useEffect(() => {
  //   fetch('http://localhost:1337/invitados')
  //     .then(response => response.json())
  //     .then(data => setArticles(data));
  // }, []);  
  const duration = 1;

  return (
    <DragProvider>
      {/* <div className="App"> */}
        {/* {articles?.map(article => (
          <div key={article.id}>
            <h2>{article.nombre}</h2>
          </div>
        ))} */}
        <Bubbles/>
        <Espiral/>
        <Sobre />
      {/* </div> */}
    </DragProvider>
  );
}

export default App;
