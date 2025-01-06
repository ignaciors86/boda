import React, { useEffect, useState, useRef } from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion-vacio.png';
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
import finisterre from './assets/audio/finisterre.mp3';
import poetaHalley from "./assets/audio/poetaHalley.mp3";
import makeYourOwnKindOfMusic from './assets/audio/makeYourOwnKindOfMusic.mp3';
import animateOpacity from '../functions';
import { useDragContext } from '../DragContext';
import Espiral from 'components/Backgrounds/Espiral/Espiral';
import Bubbles from 'components/Backgrounds/Bubles/Bubles';
import { renderItems } from 'components/Timeline/items';

const Sobre = ({ weedding, hosteado, atajo, tipo }) => {

  tipo && document.documentElement.style.setProperty('--tipo', 'evelins');

  const { activeCard, setActiveCard } = useDragContext();
  const [moving, setMoving] = useState(false);
  const [isOpen, setIsOpen] = useState(null);
  const [isMuted, setIsMuted] = useState(true); // Estado para el mute del audio
  const [isMutedGeneral, setIsMutedGeneral] = useState(true); // Estado para el mute del audio
  const audioRefs = useRef([new Audio(makeYourOwnKindOfMusic), new Audio(finisterre), new Audio(poetaHalley)]); // Referencias para los audios
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0); // Índice del audio actual
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

    setIsOpen(!isOpen);

    gsap.set(".wax-seal", { animation: "none" });
    const sobre = document.querySelector('.sobre.closed');
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');


    gsap.to(".bubbles", { opacity: 1, duration: 1, delay: 1, ease: "ease" });
    gsap.to(".espiral", {
      opacity: 0, duration: 1, delay: 0, ease: "ease",
      onComplete: () => {
        const espiral = document.querySelector('.espiral');

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

  const playNextAudio = () => {
    setCurrentAudioIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % audioRefs.current.length; // Ciclo al primer audio después del último
      audioRefs.current[nextIndex].muted = isMuted;
      audioRefs.current[nextIndex].preload = "auto";
      audioRefs.current[nextIndex].play().catch(error => {
        console.log('Error al reproducir el audio:', error);
      });
      return nextIndex;
    });
  };

  useEffect(() => {
    const currentAudio = audioRefs.current[currentAudioIndex];
    currentAudio.muted = isMuted;
    currentAudio.loop = false; // Ningún audio se reproduce en bucle individualmente
    currentAudio.preload = 'auto';

    currentAudio.play().catch(error => {
      console.log('Error al reproducir el audio:', error);
    });

    currentAudio.addEventListener('ended', playNextAudio);

    return () => {
      currentAudio.pause();
      currentAudio.removeEventListener('ended', playNextAudio);
    };
  }, [currentAudioIndex, isMuted]);

  useEffect(() => {
    activeCard === "invitacion" && gsap.set(".card.invitacion", { animation: "none" });
    !isMutedGeneral && setIsMuted(activeCard !== "horarios" ? isMutedGeneral : !isMuted);
  }, [activeCard]);

  const handleDrag = (event) => {
    if (event.target === buttonRef.current) {
      return;
    }

    // Obtenemos el elemento .sobre y sus límites
    const sobre = document.querySelector('.sobre');
    const rect = sobre.getBoundingClientRect();  // Obtiene las coordenadas del contenedor

    // Verificamos si el evento ocurrió dentro del área de .sobre
    const isInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    // Si el evento está dentro de .sobre, ejecutamos la lógica
    if (isInside && isOpen === null) {
      const prompt = document.querySelector('.prompt.inicial');

      isOpen === null && gsap.to(prompt, {
        y: "100vh",
        opacity: 0,
        duration: 3,
      });

    }
  };

  useEffect(() => {
    
    const sobre = document.querySelector('.sobre');
    // Añadimos los eventos para ratón y toque
    sobre.addEventListener('mousemove', handleDrag);
    sobre.addEventListener('touchmove', handleDrag);

    return () => {
      // Limpiamos los eventos cuando el componente se desmonte
      sobre.removeEventListener('mousemove', handleDrag);
      sobre.removeEventListener('touchmove', handleDrag);
    };
  }, []);


  const pasoPrevio = () => {
    animateOpacity(startDrawing);
  }

  const inicializar = () => {
    const canvas = document.getElementById('myCanvas');
    if (canvas) {
      canvas.addEventListener('mouseenter', pasoPrevio);
      canvas.addEventListener('mouseleave', pasoPrevio);

      canvas.addEventListener('touchstart', (event) => {
        pasoPrevio();
        event.preventDefault();
      });
    }
  }

  useEffect(() => {
    atajo && inicializar();
    setTimeout(() => {
      inicializar();
    }, 20000);

    const waxSeal = document.querySelector('.wax-seal');
    const sobre = document.querySelector('.sobre.closed');

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
    const svgElement = document.querySelector('.sobre .nosotros-svg');
    const paths = svgElement?.querySelectorAll('path');

    // Aumentar opacidad del SVG
    // gsap.to(svgElement, { opacity: 1, duration: 1, delay: 1, });

    paths?.forEach((path) => {
      const pathLength = path.getTotalLength();

      // Configuración inicial del trazo
      path.style.strokeDasharray = pathLength;
      path.style.strokeDashoffset = pathLength;

      path.style.strokeDashoffset = 0; // Inicia la animación del trazo

    });

  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar todos los audios cuando la ventana está oculta
        audioRefs.current.forEach(audio => audio.pause());
      } else {
        // Reanudar el audio actual cuando la ventana es visible
        audioRefs.current[currentAudioIndex].muted = isMuted;
        audioRefs.current[currentAudioIndex].play().catch(error => {
          console.log('Error al reanudar el audio:', error);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentAudioIndex, isMuted]);


  useEffect(() => {
    isOpen !== null && gsap.killTweensOf(".prompt.inicial");
    const tlCierre = gsap.timeline();
    isOpen !== null && tlCierre
    .to(".prompt.final", { zIndex: 3,duration: 0,opacity: 0,}, 0)
      .to("#myCanvas", {
        opacity: isOpen ? 0.2 : 0.7,
        duration: 5,
        delay: 0,
        ease: "ease",
      }, ">")
      .to(".prompt.final", { y: "0vh", duration: 1, opacity: 1,}, "<")
      console.log(isOpen)
  }, [isOpen]);

  useEffect(() => {
    renderItems();
  }, []);

  return (
    <>
      <Bubbles />
      {isOpen === null && <Espiral weedding={weedding} isOpen={isOpen} />}
      {isOpen === false && <Espiral weedding={weedding} isOpen={isOpen} option2={true} />}
      <div className="sobre closed" ref={sobreRef}>

        <div alt="Nosotros" className="nosotros-jpg" >
          {!isOpen && <Nosotros
            key={animationKey} // Fuerza el reinicio de la animación
            className="nosotros-svg"
            viewBox="0 0 843 840"
          />}
          <img src={nosotrosjpg} alt="Nosotros" className="nosotros-jpg-imagen" />
        </div>

        <div className="envelope closed" ref={envelopeRef}>
          <div className="envelope-flap">
            <div className="wax-seal back" onClick={() => !moving && handleClick("sobre")} />
          </div>
          <div className="envelope-flap-bg"></div>
          <div className="envelope-body">
            <div className="envelope-content">
              <Card seccion="invitacion" onClick={() => handleClick("invitacion")} trasera={<Invitacion />}>
                <img src={invitacion} alt="Invitacion" />
                <span className='nombres'>Mario y Nacho</span>
                <span className="fecha">25 de Mayo<strong>2025</strong></span>
                <span className="lugar">Salamanca</span>
              </Card>
              <Card seccion="horarios" onClick={() => handleClick("horarios")} trasera={<Timeline />}>
                <h2>Agenda</h2>
              </Card>
              <Card seccion="regalo" onClick={() => handleClick("regalo")} trasera={<Regalo />}>
                <h2>Regalo</h2>
              </Card>
              <Card seccion="ubicaciones" onClick={() => handleClick("ubicaciones")} trasera={<Lugar weedding={weedding} hosteado={hosteado}/>}>                <h2>Lugar</h2>
              </Card>
              <Card seccion={"asistencia"} onClick={() => handleClick("asistencia")} trasera={<Asistencia />}>
                <h2>Asistencia</h2>
              </Card>
            </div>
          </div>
          <h2 className="nombre-invitado">M<em>&</em>N</h2>
        </div>
      </div>

      <button
        className={`back volumen ${isMuted ? 'play' : 'stop'}`}
        onClick={toggleMute}
        disabled={activeCard === "horarios"}
        ref={buttonRef}
      >
      </button>
    </>
  );
};

export default Sobre;
