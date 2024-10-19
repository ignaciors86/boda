import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Timeline.scss';
import Loading from './Loading.js';
import { imageUrls, items, renderItems } from "./items.js";
import ositosDrag from "./assets/images/ositos-drag.png";
import { useDragContext } from '../DragContext.js';

gsap.registerPlugin(Draggable);

const Timeline = () => {
  const MAINCLASS = "timeline";
  const { activeCard, setActiveCard } = useDragContext();
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext();
  const [hasVibrated, setHasVibrated] = useState(false);
  
  const audioRef = useRef(new Audio());
  const [isMuted, setIsMuted] = useState(false); // Estado para controlar si el audio está muteado

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

  // Configurar Draggable y la línea de tiempo
  const setupDraggableAndTimeline = () => {
    Draggable.get(sliderRef.current)?.kill();

    const totalItems = items.length;
    const durationPerItem = 6;
    const transitionDuration = 0.3;

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

        const progress = Math.min(
          Math.max(this.x / progressBarRef.current.clientWidth, 0), 
          1
        );
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
      },
      onRelease() {
        document.querySelectorAll('.card').forEach(card => {
          card.classList.remove('dragging');
        });

        gsap.to(sliderRef.current, { scale: 1, duration: 0.3 });

        let ultimo = true;
        items.forEach((item, index) => {
          const element = document.querySelector(`.item${index}`);

          if (element) {
            const opacity = parseFloat(window.getComputedStyle(element).opacity);
            if (opacity > 0) {
              gsap.to(element, { opacity: 1, duration: 0.3 });
              gsap.to(sliderRef.current, { scale: 1, y: "-0dvh", duration: 0.3 });
              ultimo = false;
            }
          }
        });
        ultimo && gsap.to(`.item${items.length}`, { opacity: 1, duration: 0.3 });
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
    console.log(currentIndex);
    !currentIndex && setCurrentIndex(0);
    const audio = audioRef.current;
    if (activeCard && items[currentIndex]?.audio) {
      audio.pause(); // Pausa el audio anterior si está reproduciéndose
      audio.src = items[currentIndex].audio;
      audio.loop = true; // Habilita la reproducción en bucle
      audio.muted = isMuted; // Aplica el estado de mute
      audio.load(); // Carga el nuevo archivo
      audio.play().catch(err => console.error("Error al reproducir el audio:", err));
    }

    if(activeCard!=="horarios"){
      audio.pause();
    }
  }, [activeCard, currentIndex, isMuted]);

  // Función para alternar el estado de mute
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    audioRef.current.muted = !audioRef.current.muted; // Cambia el estado de mute del audio
  };

  useEffect(() => {
    preloadImages(imageUrls)
      .then(() => setImagesLoaded(true))
      .catch(err => console.error(err));

    return () => {
      Draggable.get(sliderRef.current)?.kill();
      timelineRef.current.clear();
      audioRef.current.pause(); // Asegúrate de pausar el audio al desmontar el componente
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

  if (!imagesLoaded) {
    return <Loading />;
  }

  return (
    <>
      <div className={`${MAINCLASS} seccion`}>
        <div className="elements">
          {renderItems()}
        </div>
        <div className="progress-bar" ref={progressBarRef}>
          <div className="slider" ref={sliderRef}>
            <img
              src={ositosDrag}
              alt="Slider"
            />
          </div>
        </div>
      </div>
      <button className="back" onClick={() => setActiveCard("home")} />
      <button className={`back ${!isMuted ? "play" : "stop" }`} onClick={handleMuteToggle} /> {/* Botón para mutear */}
    </>
  );
};

export default Timeline;
