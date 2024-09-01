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
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); // Estado para seguir el ítem actual
  const { isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext();
  const [hasVibrated, setHasVibrated] = useState(false); // Estado para controlar la vibración

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
        setIsOtherDraggableActive(true);
        document.querySelectorAll('.card').forEach(card => {
          card.classList.add('dragging');
        });

        const progress = Math.min(
          Math.max(this.x / progressBarRef.current.clientWidth, 0), 
          1
        );
        timelineRef.current.progress(progress);

        // Cambia el tamaño de la imagen durante el arrastre
        const penultimateItemProgress = (totalItems - 2) / totalItems;
        const lastItemProgress = 1;

        if (progress >= penultimateItemProgress && progress < lastItemProgress || progress < 0.15) {
          gsap.to(sliderRef.current, { scale: 1, y: "-0dvh", duration: 0.3 });
        } else {
          gsap.to(sliderRef.current, { scale: 1.6, y: "-0dvh", duration: 0.3 });
        }

        // Detectar el cambio de ítem
        const newIndex = Math.floor(progress * totalItems);
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
          setHasVibrated(false); // Asegúrate de que la vibración se pueda activar en el siguiente punto de cambio
        }
      },
      onRelease() {
        setIsOtherDraggableActive(false);
        document.querySelectorAll('.card').forEach(card => {
          card.classList.remove('dragging');
        });

        // Restaura el tamaño de la imagen al soltar
        gsap.to(sliderRef.current, { scale: 1, duration: 0.3 });

        let ultimo = true;
        // Verificar qué item tiene opacidad mayor que 0 y ajustarlo a 1
        items.forEach((item, index) => {
          const element = document.querySelector(`.item${index}`);

          // Verifica si el elemento existe en el DOM antes de acceder a su opacidad
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
      const initialProgress = Math.min(
        Math.max(slider.x / progressBar.clientWidth, 0), 
        1
      );
      timelineRef.current.progress(initialProgress);
      setCurrentIndex(Math.floor(initialProgress * items.length)); // Establecer el índice inicial
    }
  };

  useEffect(() => {
    preloadImages(imageUrls)
      .then(() => setImagesLoaded(true))
      .catch(err => console.error(err));

    return () => {
      Draggable.get(sliderRef.current)?.kill();
      timelineRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (imagesLoaded) {
      setupDraggableAndTimeline();
    }
  }, [imagesLoaded]);

  useEffect(() => {
    // Vibrar solo si ha cambiado el índice y no ha vibrado aún
    if (currentIndex > -1 && navigator.vibrate) {
      !hasVibrated && navigator.vibrate(40); // Vibración de 40 milisegundos
      setHasVibrated(true); // Marca como vibrado para evitar vibraciones repetidas
    }
  }, [currentIndex]);

  if (!imagesLoaded) {
    return <Loading />;
  }

  return (
    <div className={`${MAINCLASS} seccion`}>
      <div className="elements">
        {renderItems()}
      </div>
      <div className="progress-bar" ref={progressBarRef}>
        <div className="slider" ref={sliderRef}>
          <img
            src={ositosDrag}
            alt="Slider"
            // onClick={() => setIsOtherDraggableActive(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
