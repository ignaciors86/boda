import React, { useEffect, useState, useRef } from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion.png';
import bubuDudu from './assets/images/bubu-dudu.jpg';
import Card from './Card';
import Timeline from '../Timeline/Timeline';
import Lugar from './Tarjetas/Lugar';
import Regalo from './Tarjetas/Regalo';
import Invitacion from './Tarjetas/Invitacion';
import gsap from 'gsap';
import Asistencia from './Tarjetas/Asistencia';
import finisterre from './assets/audio/finisterre.mp3';
import makeYourOwnKindOfMusic from './assets/audio/makeYourOwnKindOfMusic.mp3';
import animateOpacity from '../functions';
import { useDragContext } from '../DragContext';
import { imageUrls, items, renderItems } from "../Timeline/items.js";

const Sobre = ({ weedding }) => {
  const { activeCard, setActiveCard } = useDragContext();
  const [moving, setMoving] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Estado para el mute del audio
  const [isMutedGeneral, setIsMutedGeneral] = useState(true); // Estado para el mute del audio
  const audioRefs = useRef([new Audio(finisterre), new Audio(makeYourOwnKindOfMusic)]); // Referencias para los audios
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0); // Índice del audio actual
  const tlSobre = useRef(gsap.timeline());
  const buttonRef = useRef(null); // Referencia para el botón del audio
  const sobreRef = useRef(null);  // Referencia para el sobre
  const envelopeRef = useRef(null); // Referencia para el sobre interactivo
  const escala = 1.1;

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

  const playNextAudio = () => {
    setCurrentAudioIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % audioRefs.current.length; // Ciclo al primer audio después del último
      audioRefs.current[nextIndex].muted = isMuted;
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

    const waxSeal = document.querySelector('.wax-seal');
    const sobre = document.querySelector('.sobre.closed');
    const prompt = document.querySelector('.prompt');
    if (waxSeal && sobre) {
      gsap.killTweensOf(prompt);
      sobre && gsap.to(prompt, {
        y: "100vh",
        duration: 3,
      });
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleDrag);

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchmove', handleDrag);
    };
  }, []);

  useEffect(() => {
    const canvas = document.getElementById('myCanvas');
    const root = document.getElementById('root');

    canvas.addEventListener('mouseenter', animateOpacity);
    canvas.addEventListener('mouseleave', animateOpacity);

    canvas.addEventListener('touchstart', (event) => {
      animateOpacity();
      event.preventDefault();
    });

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

  renderItems();

  return (
    <>
      <div className="sobre closed" ref={sobreRef}>
        <img src={bubuDudu} alt="Bubu y Dudu" className="bubu-dudu" />
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
              <Card seccion="ubicaciones" onClick={() => handleClick("ubicaciones")} trasera={<Lugar weedding={weedding}/>}>                <h2>Lugar</h2>
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
