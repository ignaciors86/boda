import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Timeline.scss';
import preboda from "./preboda.jpg";
import ceremonia from "./ceremonia.jpg";
import coctel from "./coctel.jpg";
import comida from "./comida.jpg";
import baile from "./baile.jpg";
import tercerTiempo from "./tercerTiempo.jpg";
import paella from "./paella.jpg";

import ositosDrag from "./ositos-drag.png";
import ositosDragPreboda from "./ositos-drag-preboda.png";
import ositosDragPostboda from "./ositos-drag-postboda.png";

gsap.registerPlugin(Draggable);

const Timeline = () => {
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));
  const [isPortrait, setIsPortrait] = useState(window.matchMedia('(orientation: portrait)').matches);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const imageUrls = [
    preboda,
    ceremonia,
    coctel,
    comida,
    baile,
    tercerTiempo,
    paella,
  ];

  const preloadImages = (urls) => {
    const promises = urls.map(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    }));
    return Promise.all(promises);
  };

  const renderItems = () => {
    const items = [
      { title: "Preboda", description: "Preparativos de la boda", buttonText: "Inicio", bgImage: preboda },
      { title: "Ceremonia", description: "Ceremonia", buttonText: "Botón 1", bgImage: ceremonia },
      { title: "Cóctel", description: "Cóctel", buttonText: "Botón 2", bgImage: coctel },
      { title: "Comida", description: "Comida", buttonText: "Botón 3", bgImage: comida },
      { title: "Baile", description: "Baile", buttonText: "Botón 4", bgImage: baile },
      { title: "3er Tiempo", description: "3er Tiempo", buttonText: "¿?", bgImage: tercerTiempo },
      { title: "Paellada", description: "Paellada final", buttonText: "Final", bgImage: paella }
    ];

    return items.map((item, index) => (
      <div key={index} className={`item item${index + 1}`}>
        <div className="info">
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <button>{item.buttonText}</button>
        </div>
      </div>
    ));
  };

  const setupDraggableAndTimeline = () => {
    Draggable.get(sliderRef.current)?.kill();

    const totalItems = 7;
    const durationPerItem = 3;
    const transitionDuration = 0.5;
    const totalDuration = totalItems * durationPerItem + (totalItems - 1) * transitionDuration;

    const items = [
      { bgImage: preboda },
      { bgImage: ceremonia },
      { bgImage: coctel },
      { bgImage: comida },
      { bgImage: baile },
      { bgImage: tercerTiempo },
      { bgImage: paella }
    ];

    const commonTimeline = timelineRef.current.clear();

    items.forEach((item, index) => {
      const opacityStart = durationPerItem * index + transitionDuration * index;
      const opacityEnd = opacityStart + durationPerItem;
      const nextItemOpacityStart = opacityEnd + transitionDuration;

      commonTimeline
        .set(`.item${index + 1}`, { opacity: 0 })
        .to(`.item${index + 1}`, { opacity: 1, duration: durationPerItem }, ">")
        .to(`.item${index + 1}`, { opacity: 0, duration: transitionDuration }, nextItemOpacityStart)
        .set('.elements', { className: `elements background-${index + 1}` }, opacityStart)
        .to('.elements', { opacity: 1, duration: 0.5 }, ">")
        .to('.elements', { opacity: 0, duration: transitionDuration }, nextItemOpacityStart);
        index > 1 && commonTimeline.set(`.slider`, { paddingTop: 0 })
    });

    Draggable.create(sliderRef.current, {
      type: isPortrait ? 'y' : 'x',
      bounds: progressBarRef.current,
      onDrag() {
        const progress = Math.min(
          Math.max(
            isPortrait 
              ? this.y / progressBarRef.current.clientHeight
              : this.x / progressBarRef.current.clientWidth,
            0
          ), 
          1
        );
        timelineRef.current.progress(progress);

        // Cambia el tamaño de la imagen durante el arrastre
        const penultimateItemProgress = (totalItems - 3) / totalItems;
        const lastItemProgress = 1;

        if (progress >= penultimateItemProgress && progress < lastItemProgress || progress < 0.15) {
          gsap.to(sliderRef.current, { scale: 1, duration: 0.3 });
        } else {
          gsap.to(sliderRef.current, { scale: 1.6, duration: 0.3 });
        }
      },
      onRelease() {
        // Restaura el tamaño de la imagen al soltar
        gsap.to(sliderRef.current, { scale: 1, duration: 0.3 });
      },
    });

    const slider = sliderRef.current;
    const progressBar = progressBarRef.current;

    if (slider && progressBar) {
      const initialProgress = Math.min(
        Math.max(
          isPortrait 
            ? slider.y / progressBar.clientHeight
            : slider.x / progressBar.clientWidth,
          0
        ), 
        1
      );
      timelineRef.current.progress(initialProgress);
    }
  };

  useEffect(() => {
    preloadImages(imageUrls)
      .then(() => setImagesLoaded(true))
      .catch(err => console.error(err));

    const handleResize = () => {
      setIsPortrait(window.matchMedia('(orientation: portrait)').matches);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      Draggable.get(sliderRef.current)?.kill();
      timelineRef.current.clear();
    };
  }, [isPortrait]);

  useEffect(() => {
    if (imagesLoaded) {
      setupDraggableAndTimeline();
    }
  }, [imagesLoaded, isPortrait]);

  if (!imagesLoaded) {
    return <div className="loading">Loading...</div>;
  }

  const orientationClass = isPortrait ? 'portrait' : 'landscape';

  return (
    <div className={`container ${orientationClass}`}>
      <div className={`elements ${orientationClass} background-1`}>
        {renderItems()}
      </div>
      <div className={`progress-bar ${orientationClass}`} ref={progressBarRef}>
        <img
          src={ositosDrag}
          alt="Slider"
          ref={sliderRef}
          className={`slider ${orientationClass}`}
        />
      </div>
    </div>
  );
};

export default Timeline;

