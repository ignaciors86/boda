import logo from './logo.svg';
import './App.scss';
import gsap from 'gsap';
import { useEffect, useState } from 'react';
import Timeline from './components/Horarios/Timeline';
import Sobre from './components/Sobre/Sobre';

const App = () => {

  const tlApp = gsap.timeline();
  // useEffect(() => {
  //   tlApp.to(".App-header", { opacity: 1, duration: 2, })
  // }, []);
  
  // const [articles, setArticles] = useState([]);

  // useEffect(() => {
  //   fetch('http://localhost:1337/invitados')
  //     .then(response => response.json())
  //     .then(data => setArticles(data));
  // }, []);      
  const [seccion, setSeccion] = useState("home");
  const duration = 1;
  useEffect(() => {
    console.log(seccion);
    seccion === "home" ? tlApp
      .to(".seccion", { opacity: 0, duration: duration, }, 0)
      .to(".seccion", { visibility: "hidden", duration: 0, }, ">")
    : tlApp
      .to(`.seccion.${seccion}, .back`, { x: "100vw", duration: 0, opacity: 1, visibility: "visible", }, 0)
      .to(`.seccion.${seccion}, .back`, { x: seccion ? 0 : "100vw", opacity: seccion ? 1 : 0, duration: duration, }, ">")
  
      tlApp.to(".back", { opacity: seccion !== "home" ? 1 : 0, duration: duration, }, 0)
    
  }, [seccion]);
  return (
    <div className="App">
      {/* <Timeline  /> */}
      {/* {articles?.map(article => (
        <div key={article.id}>
          <h2>{article.nombre}</h2>
        </div>
      ))} */}
      <Sobre setSeccion={setSeccion} />
      <Timeline />
      
      <button className="back" onClick={() => setSeccion("home")} />
      
    </div>
  );
}

export default App;
