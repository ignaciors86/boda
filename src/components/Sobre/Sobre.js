import React, { useState } from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion.jpg';
import Card from './Card';
import Timeline from '../Horarios/Timeline';
import Lugar from './Tarjetas/Lugar';
import Regalo from './Tarjetas/Regalo';
import Invitacion from './Tarjetas/Invitacion';
import gsap from 'gsap';
import Asistencia from './Tarjetas/Asistencia';
import { useDragContext } from '../DragContext';

const Sobre = ({ setSeccion }) => {
  const [envelopeClosed, setEnvelopeClosed] = useState(null);
  // const { activeCard, setActiveCard } = useDragContext();
  const tlSobre = gsap.timeline(); 

  const toggle = () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.classList.remove('flipped');
      card.classList.remove('unflipped');
      card.style.transform = 'none';
      const front = card.querySelector('.card-front');
      const back = card.querySelector('.card-back');
      front.style.visibility = 'visible';
      front.style.opacity = '1';
      back.style.visibility = 'hidden';
      back.style.opacity = '0';
    });
    const envelope = document.querySelector('.envelope');
    envelope.classList.toggle('open');
    envelope.classList.remove('closed');
    
  };

  // Función para obtener un ángulo de rotación aleatorio
  const getRandomValues = () => {
    // Generar un número entero aleatorio entre 6 y 16
    const angle = Math.floor(Math.random() * (16 - 6 + 1)) + 6;
    // Decidir aleatoriamente si el ángulo será positivo o negativo
    const sign = Math.random() < 0.5 ? -1 : 1;
    return angle * sign;
  };

  const handleClick = (seccion) => {
    const home = document.querySelector('.home.closed');

    // Animación de palpitación con GSAP
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
    console.log(duracion);

    setSeccion(seccion);

    if (home) {
      // Usar función para rotación aleatoria
      tlSobre.to(home, {
        scale: 1.05,
        rotate: () => getRandomValues(),  // Aplicar rotación aleatoria en cada iteración
        x: () => getRandomValues(),
        y: () => getRandomValues(),
        duration: duracion * 0.1,
        yoyo: true,
        repeat: 7, // Hacer palpitaciones durante 5 segundos
        ease: "power1.inOut",
        repeatRefresh: true // Asegurar que la animación se actualice para cada repetición
      }).to(home, {
        scale: 1,
        rotate: 0, // Asegurarse de que la rotación vuelva a 0
        y: 0,
        x: 0,
        duration: duracion,
        onComplete: () => {
          toggle();
          home.classList.toggle('closed');
        },
      }, ">");
    } else {
      toggle();
    }
  };

  return (
    <div className="home closed">
      <div className="envelope closed">
        <div className="envelope-flap">
          <div className="wax-seal back" onClick={() => handleClick("home")} />
        </div>
        <div className="envelope-flap-bg"></div>
        <div className="envelope-body">
          <div className="envelope-content">
            <Card seccion="invitacion" onClick={() => handleClick("invitacion")} trasera={<Invitacion />}>
              <img src={invitacion} alt="Invitacion" />
            </Card>
            <Card seccion="horarios" onClick={() => handleClick("horarios")} trasera={<Timeline />}>
              <h2>Agenda</h2>
            </Card>
            <Card seccion="regalo" onClick={() => handleClick("regalo")} trasera={<Regalo />}>
              <h2>Regalo</h2>
            </Card>
            <Card seccion="ubicaciones" onClick={() => handleClick("ubicaciones")} trasera={<Lugar />}>
              <h2>Lugar</h2>
            </Card>
            <Card seccion={"asistencia"} onClick={() => handleClick("asistencia")} trasera={<Asistencia />}>
              <h2>Asistencia</h2>
            </Card>
          </div>
        </div>
        <p className="nombre-invitado">Invitados 1 y 2</p>
      </div>
      {/* <button className="back" onClick={() => setActiveCard("home")} /> */}
    </div>
  );
}

export default Sobre;
