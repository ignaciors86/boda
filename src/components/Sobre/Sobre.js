import React, { useEffect, useState, useRef } from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion.png';
// import bubuDudu from '../assets/images/bubu-dudu.jpg';
import nosotrosjpg from './assets/images/nosotros.jpg';
import { ReactComponent as Nosotros } from './assets/images/nosotros.svg';
import Card from './Card';
import Timeline from '../Timeline/Timeline';
import Lugar from './Tarjetas/Lugar';
import Regalo from './Tarjetas/Regalo';
import Invitacion from './Tarjetas/Invitacion';
import gsap from 'gsap';
import Asistencia from './Tarjetas/Asistencia';
import introAudio from './assets/audio/makeYourOwnKindOfMusic.mp3'; // Importar el audio
import animateOpacity from '../functions';
import { useDragContext } from '../DragContext';
import { imageUrls, items, renderItems } from "../Timeline/items.js";

const Sobre = ({weedding}) => {
  const { activeCard, setActiveCard } = useDragContext();
  const [moving, setMoving] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Estado para el mute del audio
  const [isMutedGeneral, setIsMutedGeneral] = useState(true); // Estado para el mute del audio
  const audioRef = useRef(new Audio(introAudio)); // Referencia al audio
  const tlSobre = useRef(gsap.timeline());
  const buttonRef = useRef(null); // Referencia para el botón del audio
  const sobreRef = useRef(null);  // Referencia para el sobre
  const envelopeRef = useRef(null); // Referencia para el sobre interactivo
  const escala = 1.1;

  const [animationKey, setAnimationKey] = useState(1);

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
    setActiveCard("sobre");
    setMoving(false);
  };

  const getRandomValues = () => {
    const angle = Math.floor(Math.random() * (16 - 6 + 1)) + 6;
    const sign = Math.random() < 0.5 ? -1 : 1;
    return angle * sign;
  };

  const handleClick = () => {    
    
    setMoving(true);
    const sobre = document.querySelector('.sobre.closed');
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');

    gsap.to(".bubbles", { opacity: 1, duration: 1, delay: 1, ease: "ease" });
    gsap.to(".espiral", {
      opacity: 0, duration: 1, delay: 0, ease: "ease",
      onComplete: () => {
        const espiral = document.querySelector('.espiral');
        if (espiral) {
          espiral.remove();
        }
        const prompt = document.querySelector('.prompt');
        if (prompt) {
          prompt.remove();
        }
      }
    });

    if (sobre) {
      tlSobre.current.to(sobre, {
        scale: 1.05,
        rotate: () => getRandomValues(),
        x: () => getRandomValues(),
        y: () => getRandomValues(),
        duration: duracion * 0.1,
        yoyo: true,
        repeat: 7,
        ease: "power1.inOut",
        repeatRefresh: true,

      }).to(sobre, {
        scale: 1,
        rotate: 0,
        y: 0,
        x: 0,
        duration: duracion,
        onComplete: () => {
          toggle();
          sobre.classList.toggle('closed');
        },
      }, ">")
        .to(".wax-seal", { transition: "calc(var(--duration-envelope)*.5) ease calc(var(--duration-envelope)*3.5)", }, 0)

    } else {
      toggle();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted); // Cambia el estado del mute
    setIsMutedGeneral(!isMutedGeneral); // Cambia el estado del mute
  };

  const fadeOutVolume = (desmutear) => {
    gsap.to(audioRef.current, {
      volume: desmutear ? 1 : 0,
      duration: 3,
    })
  }

  useEffect(() => {
      activeCard === "invitacion" && gsap.set(".card.invitacion", { animation: "none" });
      !isMutedGeneral && setIsMuted(activeCard !== "horarios" ? isMutedGeneral : !isMuted)
  }, [activeCard])

  // Función para manejar el arrastre del sobre
  const handleDrag = (event) => {
    // Verifica si el evento proviene del botón de volumen
    if (event.target === buttonRef.current) {
      return; // No hacer nada si se está interactuando con el botón de volumen
    }

    const waxSeal = document.querySelector('.wax-seal');
    const sobre = document.querySelector('.sobre.closed');
    const prompt = document.querySelector('.prompt');
    if (waxSeal && sobre) {
      gsap.killTweensOf(prompt);
      sobre && gsap.to(prompt, {
        y: "100vh",
        duration: 3,
      });
      // fadeOutVolume();
    }
  };

  useEffect(() => {
    audioRef.current.muted = isMuted; // Aplica el mute o desmute
    audioRef.current.loop = true; // Hacer que el audio se reproduzca en bucle
    audioRef.current.play().catch(error => {
      console.log('Error al reproducir el audio:', error);
    });

    return () => {
      audioRef.current.pause(); // Pausar el audio al desmontar el componente
    };
  }, [isMuted]);

  // Agregar eventos de arrastre o movimiento
  useEffect(() => {
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleDrag);

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchmove', handleDrag);
    };
  }, []);

  useEffect(() => {
    // Función para animar la opacidad de #root

    // Seleccionar elementos
    const canvas = document.getElementById('myCanvas');
    const root = document.getElementById('root');

    // Evento de hover en escritorio
    canvas.addEventListener('mouseenter', animateOpacity);
    canvas.addEventListener('mouseleave', animateOpacity);

    // Evento de touch en dispositivos móviles
    canvas.addEventListener('touchstart', (event) => {
      animateOpacity();
      event.preventDefault(); // Prevenir el comportamiento por defecto del touch
    });

    const waxSeal = document.querySelector('.wax-seal');
    const sobre = document.querySelector('.sobre.closed');
    // console.log(seccion);
    if (waxSeal && sobre) {
      gsap.to(waxSeal, {
        scale: escala,
        repeat: -1,
        yoyo: true,
        duration: 0.5,
        paused: !sobre.classList.contains('closed'),
      });
    }
  }, []);

  const startDrawing = () => {
    
      // Reinicia el SVG forzando un cambio en la clave
      setAnimationKey((animationKey) => animationKey + 1);

        };

  renderItems();

  useEffect(() => {
    startDrawing()
  }, []);

  useEffect(() => {
    const svgElement = document.querySelector('.sobre .nosotros-svg');
    const paths = svgElement?.querySelectorAll('path');

    // Aumentar opacidad del SVG
    gsap.to(svgElement, { opacity: 1, duration: 1, delay: 1, });

    paths?.forEach((path) => {
      const pathLength = path.getTotalLength();
      
      // Configuración inicial del trazo
      path.style.strokeDasharray = pathLength;
      path.style.strokeDashoffset = pathLength;

      // Animación del trazo
      setTimeout(() => {
        
        gsap.to(".sobre .nosotros-svg", { 
          opacity: 0, 
          duration: 3, 
          delay: 0,
          repeat: false, 
          onComplete: () => {
            path.style.strokeDashoffset = 0; // Inicia la animación del trazo
            const svgElement = document.querySelector(".sobre .nosotros-svg");
            if (svgElement) {
              gsap.set(svgElement, { display: "none", zIndex: -1, });
              // svgElement?.remove(); // Elimina el elemento del DOM
            }
          }
        });
      }, 0);
      
    });
  

  }, [animationKey]);
  
  return (
    <>
      <div className="sobre closed" ref={sobreRef}>
        {/* <img src={bubuDudu} alt="Bubu y Dudu" className="bubu-dudu" /> */}
        <img src={nosotrosjpg} alt="Nosotros" className="nosotros-jpg" />
        <Nosotros
        key={animationKey} // Fuerza el reinicio de la animación
        className="nosotros-svg"
        viewBox="0 0 843 840"
      />
      
        <div className="envelope closed" ref={envelopeRef}>
          <div className="envelope-flap">
            <div className="wax-seal back" onClick={() => !moving && handleClick("sobre")} />
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
              <Card seccion="ubicaciones" onClick={() => handleClick("ubicaciones")} trasera={<Lugar weedding={weedding}/>}>
                <h2>Lugar</h2>
              </Card>
              <Card seccion={"asistencia"} onClick={() => handleClick("asistencia")} trasera={<Asistencia />}>
                <h2>Asistencia</h2>
              </Card>
            </div>
          </div>
          <h2 className="nombre-invitado">M&N</h2>
        </div>
      </div>

      {/* Botón para mutear/desmutear el audio */}
      <button
        className={`back volumen ${isMuted ? 'play' : 'stop'}`}  // Cambia clase según mute/desmute
        onClick={toggleMute}
        disabled={activeCard === "horarios"}
        ref={buttonRef}  // Referencia para aplicar animación
      >
      </button>
    </>
  );
};

export default Sobre;
