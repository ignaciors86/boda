import React, { useEffect, useState } from 'react';
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

const Sobre = () => {
  const [envelopeClosed, setEnvelopeClosed] = useState(null);
  const [seccion, setSeccion] = useState("sobre");
  // const { activeCard, setActiveCard } = useDragContext();
  const tlSobre = gsap.timeline(); 
  console.log(seccion);

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
    const sobre = document.querySelector('.sobre.closed');

    // Animación de palpitación con GSAP
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
    console.log(duracion);

    setSeccion(seccion);

    if (sobre) {
      // Usar función para rotación aleatoria
      tlSobre.to(sobre, {
        scale: 1.05,
        rotate: () => getRandomValues(),  // Aplicar rotación aleatoria en cada iteración
        x: () => getRandomValues(),
        y: () => getRandomValues(),
        duration: duracion * 0.1,
        yoyo: true,
        repeat: 7, // Hacer palpitaciones durante 5 segundos
        ease: "power1.inOut",
        repeatRefresh: true // Asegurar que la animación se actualice para cada repetición
      }).to(sobre, {
        scale: 1,
        rotate: 0, // Asegurarse de que la rotación vuelva a 0
        y: 0,
        x: 0,
        duration: duracion,
        onComplete: () => {
          toggle();
          sobre.classList.toggle('closed');
        },
      }, ">");
    } else {
      toggle();
    }
  };

  useEffect(() => {
    // Función para animar la opacidad de #root
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
  function animateOpacity() {
    gsap.timeline()
      .to("body", { background: "var(--greenSuperTransparent)", duration: duracion }, 0)
      .to(".sobre", { opacity: 1, zIndex: 0, duration: duracion, delay: duracion }, ">");
  
  }

  // Variables para manejar el temporizador
  let hoverTimer;
  let touchTimer;

  // Seleccionar elementos
  const canvas = document.getElementById('myCanvas');
  const root = document.getElementById('root');

  // Evento de hover en escritorio
  canvas.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(() => {
      animateOpacity();
    }, 1000); // 1 segundo
  });

  canvas.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
  });

  // Evento de touch en dispositivos móviles
  canvas.addEventListener('touchstart', (event) => {
    touchTimer = setTimeout(() => {
      animateOpacity();
    }, 1000); // 1 segundo
    event.preventDefault(); // Prevenir el comportamiento por defecto del touch
  });

  // canvas.addEventListener('touchend', () => {
  //   clearTimeout(touchTimer);
  // });

  // canvas.addEventListener('touchmove', () => {
  //   // Mantener el temporizador activo mientras el usuario mueve el dedo
  //   clearTimeout(touchTimer);
  //   touchTimer = setTimeout(() => {
  //     animateOpacity();
  //   }, 1000); // 1 segundo
  // });
  }, [])

  return (
    <div className="sobre closed">
      <div className="envelope closed">
        <div className="envelope-flap">
          <div className="wax-seal back" onClick={() => handleClick("sobre")} />
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
      {/* <button className="back" onClick={() => setActiveCard("sobre")} /> */}
    </div>
  );
}

export default Sobre;
