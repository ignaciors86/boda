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
  const [activeItem, setActiveItem] = useState(-1);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [sliderImage, setSliderImage] = useState(ositosDrag);

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
      { title: "Preboda", description: "Preparativos de la boda", buttonText: "Inicio" },
      { title: "Ceremonia", description: "Ceremonia", buttonText: "Botón 1" },
      { title: "Cóctel", description: "Cóctel", buttonText: "Botón 2" },
      { title: "Comida", description: "Comida", buttonText: "Botón 3" },
      { title: "Baile", description: "Baile", buttonText: "Botón 4" },
      { title: "3er Tiempo", description: "3er Tiempo", buttonText: "¿?" },
      { title: "Paellada", description: "Paellada final", buttonText: "Final" }
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
  
    const commonTimeline = timelineRef.current.clear();
  
    commonTimeline
      .set('.item1', { opacity: 1 })
      .set('.item2, .item3, .item4, .item5, .item6, .item7', { opacity: 0 })
      .to('.item1', { opacity: 0, duration: transitionDuration }, durationPerItem * 1)
      .to('.item2', { opacity: 1, duration: durationPerItem }, durationPerItem * 1 + transitionDuration)
      .to('.item2', { opacity: 0, duration: transitionDuration }, durationPerItem * 2)
      .to('.item3', { opacity: 1, duration: durationPerItem }, durationPerItem * 2 + transitionDuration)
      .to('.item3', { opacity: 0, duration: transitionDuration }, durationPerItem * 3)
      .to('.item4', { opacity: 1, duration: durationPerItem }, durationPerItem * 3 + transitionDuration)
      .to('.item4', { opacity: 0, duration: transitionDuration }, durationPerItem * 4)
      .to('.item5', { opacity: 1, duration: durationPerItem }, durationPerItem * 4 + transitionDuration)
      .to('.item5', { opacity: 0, duration: transitionDuration }, durationPerItem * 5)
      .to('.item6', { opacity: 1, duration: durationPerItem }, durationPerItem * 5 + transitionDuration)
      .to('.item6', { opacity: 0, duration: transitionDuration }, durationPerItem * 6)
      .to('.item7', { opacity: 1, duration: durationPerItem }, durationPerItem * 6 + transitionDuration)
      .to('.item7', { opacity: 1, duration: 2 }, totalDuration);
  
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
        updateActiveItem(progress);
  
        // Cambia el tamaño de la imagen durante el arrastre
        const totalItems = 7;
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
      updateActiveItem(initialProgress);
    }
  };
  

  const updateActiveItem = (progress) => {
    const items = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7'];
    const itemCount = items.length;
    const newIndex = Math.min(Math.floor(progress * itemCount), itemCount - 1);

    if (newIndex !== activeItem) {
      setActiveItem(newIndex);
      updateSliderImage(newIndex);
    }
  };

  const updateSliderImage = (index) => {
    if (index === 0) {
      gsap.to(sliderRef.current, { opacity: 0, duration: 0.5, onComplete: () => setSliderImage(ositosDragPreboda) });
      gsap.to(sliderRef.current, { opacity: 1, duration: 0.5 });
    } else if (index === 6) {
      gsap.to(sliderRef.current, { opacity: 0, duration: 0.5, onComplete: () => setSliderImage(ositosDragPostboda) });
      gsap.to(sliderRef.current, { opacity: 1, duration: 0.5 });
    } else {
      setSliderImage(ositosDrag);
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

  const backgroundClass = activeItem > -1 ? `background-${activeItem + 1}` : '';

  if (!imagesLoaded) {
    return <div className="loading">Loading...</div>;
  }

  const orientationClass = isPortrait ? 'portrait' : 'landscape';

  return (
    <div className={`container ${orientationClass}`}>
      <div className={`elements ${orientationClass} ${backgroundClass}`}>
        {renderItems()}
      </div>
      <div className={`progress-bar ${orientationClass}`} ref={progressBarRef}>
        <img
          src={sliderImage}
          alt="Slider"
          ref={sliderRef}
          className={`slider ${orientationClass}`}
        />
      </div>
    </div>
  );
};

export default Timeline;
