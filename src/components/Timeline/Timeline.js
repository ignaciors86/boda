import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Timeline.scss';
import Loading from './Loading.js';
import { imageUrls, items, renderItems } from "./items.js";
import ositosDrag from "./assets/images/ositos-drag.png";
import { useDragContext } from '../DragContext.js';
import Marquee from 'react-fast-marquee';

gsap.registerPlugin(Draggable);

const Timeline = () => {
  const MAINCLASS = "timeline";
  const { activeCard, setActiveCard } = useDragContext();
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasVibrated, setHasVibrated] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Estado para controlar la interacción
  const audioRef = useRef(new Audio());
  const [isMuted, setIsMuted] = useState(false); // Estado para controlar si el audio está muteado

  // Nuevos: Pre-cargar audios
  const preloadedAudios = useRef(
    items.map((item) => {
      const audio = new Audio(item.audio);
      audio.preload = "auto";
      audio.loop = true; // Configurar loop para todos los audios
      return audio;
    })
  );

  // Pre-cargar imágenes
  const preloadImages = (urls) => {
    const promises = urls.map(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    }));
    return Promise.all(promises);
  };

  const setupDraggableAndTimeline = () => {
    Draggable.get(sliderRef.current)?.kill();

    const totalItems = items.length;
    const durationPerItem = 2;
    const transitionDuration = 0;

    const commonTimeline = timelineRef.current.clear();

    items.forEach((item, index) => {
      const opacityStart = durationPerItem * index + transitionDuration * index;
      const opacityEnd = opacityStart + durationPerItem;
      const nextItemOpacityStart = opacityEnd + transitionDuration;

      commonTimeline
        .to(`.item${index + 1}`, { opacity: 1, duration: durationPerItem })
        .to(`.item${index + 1}`, { opacity: 0, duration: transitionDuration }, nextItemOpacityStart)
        .set(`.item${index}`, { opacity: 0 }, ">");
    });

    Draggable.create(sliderRef.current, {
      type: 'x',
      bounds: progressBarRef.current,
      onDrag() {
        document.querySelectorAll('.card').forEach(card => {
          card.classList.add('dragging');
        });

        setHasInteracted(true);

        const progressBarWidth = progressBarRef.current.clientWidth;
        const currentX = this.x;
        const progress = Math.min(Math.max(currentX / progressBarWidth, 0), 1);

        const porcentaje = (progress * 100).toFixed(2);
        console.log(`Posición en X: ${currentX.toFixed(2)}, Porcentaje del recorrido: ${porcentaje}%`);
        if (porcentaje < 10) {
          setCurrentIndex(0);
          preloadedAudios.current[0].play().catch(err => console.error("Error al reproducir el audio:", err));
        }

        timelineRef.current.progress(progress);

        const penultimateItemProgress = (totalItems - 2) / totalItems;
        const lastItemProgress = 1;
        if (progress >= penultimateItemProgress && progress < lastItemProgress || progress < 0.15) {
          gsap.to(sliderRef.current, { scale: 1, y: "-0dvh", duration: 0.3 });
        } else {
          gsap.to(sliderRef.current, { scale: 1.3, y: "-0dvh", duration: 0.3 });
        }

        const newIndex = Math.floor(progress * totalItems);
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
          setHasVibrated(false);
        }

        // Actualiza la duración de la animación de sombra
        const newDuration = progress < 0.87 ? 0.5 * (10 - (progress * 10)) : 10; // Esto asegura que la duración se reduzca entre 10 y 1 segundos
        gsap.set(sliderRef.current, { animation: `shadowPulse ${newDuration * .5}s ease-in-out infinite` });
      },
      onRelease() {
        document.querySelectorAll('.card').forEach(card => {
          card.classList.remove('dragging');
        });

        gsap.to(sliderRef.current, { scale: 1, duration: 0.3 });

        const progressBarWidth = progressBarRef.current.clientWidth; // Ancho de la barra de progreso
        const currentX = this.x; // Posición actual en x
        const progress = Math.min(Math.max(currentX / progressBarWidth, 0), 1); // Progreso normalizado
        const porcentaje = (progress * 100).toFixed(2);
        if (porcentaje < 10) {
        } else if (progress < 0.1) {
          // Cambia al segundo ítem si el slider se suelta a menos del 10% del recorrido
          setCurrentIndex(1);
          timelineRef.current.progress(0.1); // Resetea la línea de tiempo
          audioRef.current.src = items[1].audio; // Cambia el audio al del item 1
          audioRef.current.load(); // Carga el nuevo archivo
          audioRef.current.play().catch(err => console.error("Error al reproducir el audio:", err));
        } else if (this.x <= 0) {
          // Cambia al primer ítem si el slider está en la posición inicial
          setCurrentIndex(0);
          timelineRef.current.progress(0); // Resetea la línea de tiempo
          audioRef.current.src = items[0].audio; // Cambia el audio al del primer ítem
          audioRef.current.load(); // Carga el nuevo archivo
          audioRef.current.play().catch(err => console.error("Error al reproducir el audio:", err));
        } else {
          let ultimo = true;
          items.forEach((item, index) => {
            const element = document.querySelector(`.item${index}`);

            if (element) {
              const opacity = parseFloat(window.getComputedStyle(element).opacity);
              if (opacity > 0) {
                gsap.to(element, { opacity: 1, duration: 0.1 });
                gsap.to(sliderRef.current, { scale: 1, y: "-0dvh", duration: 0.1 });
                ultimo = false;
              }
            }
          });
          ultimo && gsap.to(`.item${items.length}`, { opacity: 1, duration: 0.1 });
        }
      },
    });

    const slider = sliderRef.current;
    const progressBar = progressBarRef.current;

    if (slider && progressBar) {
      const initialProgress = Math.min(Math.max(slider.x / progressBar.clientWidth, 0), 1);
      timelineRef.current.progress(initialProgress);
      setCurrentIndex(Math.floor(initialProgress * items.length));
    }
  };

  // Reproduce el audio del ítem actual cuando se setea activeCard
  useEffect(() => {
    if (activeCard && preloadedAudios.current[currentIndex]) {
      preloadedAudios.current.forEach((audio, index) => {
        if (index === currentIndex) {
          audio.play().catch(err => console.error("Error al reproducir el audio:", err));
        } else {
          audio.pause();
          audio.currentTime = 0; // Reinicia el audio
        }
      });

    }

    if (activeCard !== "horarios") {
      preloadedAudios.current[currentIndex]?.pause();
      preloadedAudios.current[0].pause()
    } else {
      if (imagesLoaded && preloadedAudios.current[0] && !hasInteracted) {
        preloadedAudios.current[0]
          .play()
          .catch((err) => console.error("Error al reproducir el audio inicial:", err));
      }
    }
  }, [activeCard, currentIndex]);

  // Función para alternar el estado de mute
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    preloadedAudios.current.forEach(audio => {
      audio.muted = !audio.muted;
    });
  };

  // NUEVO: Animación de movimiento de la bolita al inicio
  useEffect(() => {
    if (activeCard === "horarios") {
      gsap.fromTo(
        sliderRef.current,
        { left: '95%', opacity: 0, },
        {
          left: '0%',
          duration: 1,
          opacity: 1,
          delay: .5,
          yoyo: true,
          repeat: false,
          ease: 'power1.inOut',
          onComplete: function () {
            this.kill();
          }
        }
      );
    }
  }, [activeCard]);

  useEffect(() => {
    preloadImages(imageUrls)
      .then(() => setImagesLoaded(true))
      .catch(err => console.error(err));

    return () => {
      Draggable.get(sliderRef.current)?.kill();
      timelineRef.current.clear();
      preloadedAudios.current.forEach(audio => audio.pause());
    };
  }, []);

  useEffect(() => {
    if (imagesLoaded) {
      setupDraggableAndTimeline();
    }
  }, [imagesLoaded]);

  useEffect(() => {
    if (currentIndex > -1 && navigator.vibrate) {
      !hasVibrated && navigator?.vibrate(40);
      setHasVibrated(true);
    }
  }, [currentIndex]);

  useEffect(() => {
    !hasInteracted && gsap.timeline().to(sliderRef.current, {
      scale: 1.1,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
      paused: false,
    });
  }, [currentIndex]);

  useEffect(() => {
    hasInteracted && gsap.killTweensOf(sliderRef.current);
  }, [hasInteracted]);

  return !imagesLoaded ? <Loading /> : <>
    <div className={`${MAINCLASS} seccion`}>
      <div className="elements">
        { renderItems(currentIndex) }
      </div>
      <div className="progress-bar" ref={progressBarRef}>
        <Marquee speed={25} delay={0}>
          <span>
            Arrastra la bolita hacia los lados para ver bien el finde que hemos planeado. &nbsp;&nbsp;Llegar arrastrándose al domingo también es una opción...
          </span>
        </Marquee>
        <div className="slider" ref={sliderRef}>
          <img
            src={ositosDrag}
            alt="Slider"
          />
        </div>
      </div>
    </div>
    <button className="back" onClick={() => setActiveCard("home")} />
    <button className={`back ${isMuted ? "play" : "stop"}`} onClick={handleMuteToggle} />
  </>

};

export default Timeline;
