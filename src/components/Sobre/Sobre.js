import React, { useEffect, useState, useRef } from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion-vacio.png';
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
import bailarMorghulis from './assets/audio/bailarMorghulis.mp3';
import animateOpacity from '../functions';
import { useDragContext } from '../DragContext';
import Espiral from 'components/Backgrounds/Espiral/Espiral';
import Bubbles from 'components/Backgrounds/Bubles/Bubles';
import { CustomEase } from 'gsap/all';
import MobileDetect from "mobile-detect";

const Sobre = ({ weedding, hosteado, atajo, tipo, uri }) => {

  tipo && document.documentElement.style.setProperty('--tipo', 'VCR');

  const { activeCard, setActiveCard } = useDragContext();
  const [moving, setMoving] = useState(false);
  const [isOpen, setIsOpen] = useState(null);
  const [isMuted, setIsMuted] = useState(true); // Estado para el mute del audio
  const [isMutedGeneral, setIsMutedGeneral] = useState(true); // Estado para el mute del audio
  const audioRefs = useRef(
    // [new Audio(makeYourOwnKindOfMusic), new Audio(finisterre), new Audio(bailarMorghulis), new Audio(poetaHalley)]
    [new Audio(makeYourOwnKindOfMusic), new Audio(finisterre)]
  );
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0); // Índice del audio actual
  const tlSobre = useRef(gsap.timeline());
  const buttonRef = useRef(null); // Referencia para el botón del audio
  const sobreRef = useRef(null);  // Referencia para el sobre
  const envelopeRef = useRef(null); // Referencia para el sobre interactivo
  const escala = 1.1;
  const md = new MobileDetect(window.navigator.userAgent);
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

    const sello = document.querySelector('.wax-seal');
    sello.classList.remove('cierrame');
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
        // console.log('Error al reproducir el audio:', error);
      });
      return nextIndex;
    });
  };

  useEffect(() => {

    gsap.to(".next", { opacity: (isMuted || isOpen === null) ? 0 : 1, duration: .25, ease: "linear", });
    gsap.to(".fullscreen", { opacity: (isOpen === null) ? 1 : 1, duration: .25, ease: "linear", });
    gsap.to(".link-fino", { opacity: isOpen === null ? 0 : 1, duration: .25, ease: "linear", });

    const currentAudio = audioRefs.current[currentAudioIndex];
    currentAudio.muted = isMuted;
    currentAudio.loop = false; // Ningún audio se reproduce en bucle individualmente
    currentAudio.preload = 'auto';

    currentAudio.play().catch(error => {
      // console.log('Error al reproducir el audio:', error);
    });

    currentAudio.addEventListener('ended', playNextAudio);

    return () => {
      currentAudio.pause();
      currentAudio.removeEventListener('ended', playNextAudio);
    };
  }, [currentAudioIndex, isMuted, isOpen]);

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
    const bola4 = document.querySelector(".bola-3");

    if (bola4) {
      // Eliminar animaciones CSS aplicadas
      const tlBolita = gsap.timeline({ repeat: false, });
      // Mover con GSAP al centro de la pantalla


      tlBolita
        .to(".prompt.inicial", {
          opacity: 0, duration: .5, ease: "ease",
          y: "100vh",
        }, 0)

      tlBolita
        // .to(".bola", { clearProps: "all", animation: "none", opacity: 1, duration: 0,}, 0)
        .to(".bola", {

          scale: 5,
          opacity: 0,
          top: "50%",
          // position: "absolute",
          left: "calc(50% - " + (window.innerWidth / 2 - bola4.offsetWidth / 2) + ")", // Posición horizontal central
          marginTop: "-" + (bola4.offsetHeight / 2), // Posición vertical central
          duration: 3, // Duración de la animación
          ease: "power2.out",
          boxShadow: "0px 0px 2dvh rgba(255, 165, 0, 0.8)", // Añadimos brillo naranja
          rotation: "+=360", // Suma 360 grados al ángulo actual
          // repeat: -1,
          transformOrigin: "center center", // Asegura que el giro sea alrededor del centro del elemento
          transform: "none",
          animation: "none",
          onStart: function () {
            animateOpacity();
            // animateOpacity(startDrawing);
          },
        }, 0)

        .to(".bola", {
          opacity: 0,
          duration: 1,

          onComplete: function () {
            const bolas = document.querySelectorAll(".bola");

            bolas.forEach((bola) => {
              if (bola.parentNode) {
                bola.parentNode.removeChild(bola); // Elimina el elemento asegurando que tiene un padre
              }
            });
          },

        }, ">");
    }
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

    // Verificar si ya existe la clave 'skipea' en localStorage
    const skipeaStorage = localStorage.getItem("skipea");
    console.log(skipeaStorage)
    // Si no existe, la configuramos y la primera vez que se abra la página se debe ejecutar inicializar
    if (skipeaStorage || atajo) {

      inicializar();

    } else {

      setTimeout(() => {
        inicializar();
        localStorage.setItem("skipea", "true"); // Guardamos la clave 'skipea' con valor 'true'
      }, 20000);
    }




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

    gsap.to(".nosotros-svg-inicial path", {
      opacity: 1,
      duration: 2,
      delay: 1,
    });

  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar todos los audios cuando la ventana está oculta
        audioRefs.current.forEach(audio => audio.pause());
      } else {
        // Reanudar el audio actual cuando la ventana es visible
        audioRefs.current[currentAudioIndex].muted = isMuted;
        audioRefs.current[currentAudioIndex].play().catch(error => {
          // console.log('Error al reanudar el audio:', error);
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
    isOpen !== null && tlCierre.to(".link-fino", {
      opacity: 1, left: isOpen ? 0 : "45%", bottom: isOpen ? "0" : "80dvh",
      ease: CustomEase.create("custom", "M0,0,C0.126,0.382,0.282,0.674,0.44,0.822,0.632,1.002,0.818,1.001,1,1"),
      transform: "translateX(-50%)", duration: 4, zIndex: 5, delay: 2,
    }, 0);
    isOpen !== null && tlCierre

      .to(".prompt.final", { zIndex: 3, duration: 0, opacity: 0, }, 0)
      .to("#myCanvas", {
        opacity: isOpen ? 0.2 : 0.7,
        duration: 5,
        delay: 0,
        ease: "ease",
      }, ">")
      .to(".prompt.final", { y: "0vh", duration: 1, opacity: 1, }, "<")

    isOpen && setTimeout(() => {
      const sello = document.querySelector('.wax-seal');
      sello.classList.add('cierrame');
    }, 60000);
  }, [isOpen]);


  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {



    const toggleFullScreen = async () => {



      if(!md.mobile()){
        const boton = document.querySelector(".fullscreen");
        boton.classList.toggle("active");
        gsap.set(boton, { animation: "none", });
        const elem = document.documentElement;
        try {
          if (fullScreen) {
            if (elem.requestFullscreen) {
              await elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
              await elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
              await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
              await elem.msRequestFullscreen();
            }
          } else {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
              await document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
              await document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
              await document.msExitFullscreen();
            }
          }
        } catch (error) {
          console.error("Error toggling fullscreen mode:", error);
        }
      } 
    };

    toggleFullScreen();
  }, [fullScreen]);

  return (
    <>
      <Bubbles />
      {isOpen === null && <Espiral weedding={weedding} isOpen={isOpen} uri={uri} />}
      {isOpen === false && <Espiral weedding={weedding} isOpen={isOpen} option2={true} />}
      <div className={`sobre closed ${tipo ? "weedding" : ""}`} ref={sobreRef}>

        <div alt="Nosotros" className="nosotros-jpg" >
          {!isOpen && <Nosotros
            key={animationKey} // Fuerza el reinicio de la animación
            className="nosotros-svg nosotros-svg-inicial"
            viewBox="0 0 843 840"
          />}
          <img src={nosotrosjpg} alt="Nosotros" className="nosotros-jpg-imagen" />
        </div>

        <div className="envelope closed" ref={envelopeRef}>
          <div className="envelope-flap">
            <div className="wax-seal back cierrame" onClick={() => !moving && handleClick("sobre")} />
          </div>
          <div className="envelope-flap-bg"></div>
          <div className="envelope-body">
            <div className="envelope-content">
              <Card seccion="invitacion" onClick={() => handleClick("invitacion")} trasera={<Invitacion />}>
                <img src={invitacion} alt="Invitacion" />
                <span className='nombres'>Mario y Nacho</span>
                <span className="fecha">24 de Mayo<strong>2025</strong></span>
                <span className="lugar">Salamanca</span>
              </Card>
              <Card seccion="horarios" onClick={() => handleClick("horarios")} trasera={<Timeline weedding={weedding} />}>
                <h2>Agenda</h2>
              </Card>
              <Card seccion="regalo" onClick={() => handleClick("regalo")} trasera={<Regalo />}>
                <h2>Regalo</h2>
              </Card>
              <Card seccion="ubicaciones" onClick={() => handleClick("ubicaciones")} trasera={<Lugar weedding={weedding} hosteado={hosteado} />}>                <h2>Lugar</h2>
              </Card>
              <Card seccion={"asistencia"} onClick={() => handleClick("asistencia")} trasera={<Asistencia weedding={weedding} />}>
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
      <button
        className={`back next`}
        onClick={() => {
          gsap.to(".next", {
            scale: .85,
            duration: 0.1,
            ease: "linear",
            yoyo: true,
            repeat: 1, // Repite una vez, lo que causa el efecto de ida y vuelta
            onComplete: function () { this.kill() }
          });
          playNextAudio();
        }}
      >
      </button>

      { !md.mobile() && <button
        className={`back fullscreen`}
        onClick={() => {
          gsap.to(".fullscreen", {
            scale: .85,
            duration: 0.1,
            ease: "linear",
            yoyo: true,
            repeat: 1, // Repite una vez, lo que causa el efecto de ida y vuelta
            onComplete: function () { this.kill() }
          });
          setFullScreen(!fullScreen);
        }} 
      >
      </button> }

      {weedding && <p className="link-fino"><a href='/'>
        ir a la versión fina de la web
      </a></p>}
    </>
  );
};

export default Sobre;
