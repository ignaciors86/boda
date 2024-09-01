import React from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion.jpg';
import Card from './Card';
import Timeline from '../Horarios/Timeline';
import Lugar from './Tarjetas/Lugar';
import Regalo from './Tarjetas/Regalo';
import Invitacion from './Tarjetas/Invitacion';
import gsap from 'gsap';

const Sobre = ({ setSeccion }) => {
  const tlSobre = gsap.timeline();

  const toggle = () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.classList.remove('flipped');
      card.classList.remove('unflipped');
      card.style.transform = 'none';
    });
    const envelope = document.querySelector('.envelope');
    envelope.classList.toggle('open');
  };

  // Función para obtener un ángulo de rotación aleatorio
  const getRandomRotation = () => {
    // Generar un número entero aleatorio entre 6 y 16
    const angle = Math.floor(Math.random() * (16 - 6 + 1)) + 6;
    // Decidir aleatoriamente si el ángulo será positivo o negativo
    const sign = Math.random() < 0.5 ? -1 : 1;
    return angle * sign;
  };

  const handleClick = () => {
    const home = document.querySelector('.home.closed');

    // Animación de palpitación con GSAP
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
    console.log(duracion);

    if (home) {
      // Usar función para rotación aleatoria
      tlSobre.to(home, {
        scale: 1.1,
        rotate: () => getRandomRotation(),  // Aplicar rotación aleatoria en cada iteración
        duration: duracion * 0.1,
        yoyo: true,
        repeat: 8, // Hacer palpitaciones durante 5 segundos
        ease: "power1.inOut",
        repeatRefresh: true // Asegurar que la animación se actualice para cada repetición
      }).to(home, {
        scale: 1,
        rotate: 0, // Asegurarse de que la rotación vuelva a 0
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
      <div className="envelope">
        <div className="envelope-flap">
          <div className="wax-seal back" onClick={handleClick} />
        </div>
        <div className="envelope-flap-bg"></div>
        <div className="envelope-body">
          <div className="envelope-content">
            <Card seccion="invitacion" onClick={handleClick} trasera={<Invitacion />}>
              <img src={invitacion} alt="Invitacion" />
            </Card>
            <Card seccion="horarios" onClick={handleClick} trasera={<Timeline />}>
              <h2>Agenda</h2>
            </Card>
            <Card seccion="regalo" onClick={handleClick} trasera={<Regalo />}>
              <h2>Regalo</h2>
            </Card>
            <Card seccion="ubicaciones" onClick={handleClick} trasera={<Lugar />}>
              <h2>Lugar</h2>
            </Card>
            <Card seccion="asistencia" onClick={handleClick} trasera={<Lugar />}>
              <h2>Asistencia</h2>
            </Card>
          </div>
        </div>
        <p className="nombre-invitado">Invitados 1 y 2</p>
      </div>
    </div>
  );
}

export default Sobre;
