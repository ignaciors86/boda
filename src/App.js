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

  return (
    <div className="App">
      {/* <Timeline  /> */}
      {/* {articles?.map(article => (
        <div key={article.id}>
          <h2>{article.nombre}</h2>
        </div>
      ))} */}

      <Sobre />

    </div>
  );
}

export default App;
