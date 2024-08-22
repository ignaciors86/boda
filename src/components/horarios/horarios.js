import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Horarios.scss';  // Importa el archivo SCSS

gsap.registerPlugin(Draggable);

const Horarios = () => {
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));

  const [isPortrait, setIsPortrait] = useState(window.matchMedia('(orientation: portrait)').matches);
  const [activeItem, setActiveItem] = useState(-1); // Estado para el elemento activo
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const imageUrls = [
    'https://picsum.photos/50',
    'https://picsum.photos/100',
    'https://picsum.photos/150',
    'https://picsum.photos/250',
    'https://picsum.photos/150'
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

  const setupDraggableAndTimeline = () => {
    Draggable.get(sliderRef.current)?.kill();

    const commonTimeline = timelineRef.current.clear();
    commonTimeline
      .to('.item1', { opacity: 1, duration: 0.5 }, 0)
      .to('.item2', { opacity: 1, duration: 0.5 }, 0.2)
      .to('.item1', { opacity: 0, duration: 0.5 }, 0.4)
      .to('.item3', { opacity: 1, duration: 0.5 }, 0.4)
      .to('.item2', { opacity: 0, duration: 0.5 }, 0.6)
      .to('.item4', { opacity: 1, duration: 0.5 }, 0.6)
      .to('.item3', { opacity: 0, duration: 0.5 }, 0.8)
      .to('.item5', { opacity: 1, duration: 0.5 }, 0.8)
      .to('.item4', { opacity: 0, duration: 0.5 }, 1)
      .to('.item5', { opacity: 1, duration: 0.5 }, 1);

    Draggable.create(sliderRef.current, {
      type: isPortrait ? 'y' : 'x',
      bounds: progressBarRef.current,
      onDrag() {
        const progress = isPortrait ? this.y / progressBarRef.current.clientHeight : this.x / progressBarRef.current.clientWidth;
        timelineRef.current.progress(progress);
        updateActiveItem(progress);
      },
    });
  };

  const updateActiveItem = (progress) => {
    const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
    const index = Math.min(Math.floor(progress * items.length), items.length - 1);
    setActiveItem(index);
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
      timelineRef.current.clear(); // Cleanup timeline as well
    };
  }, [isPortrait]);

  useEffect(() => {
    if (imagesLoaded) {
      setupDraggableAndTimeline();
    }
  }, [imagesLoaded, isPortrait]);

  // Generar la clase de fondo correcta basada en el elemento activo
  const backgroundClass = activeItem > -1 ? `background-${activeItem + 1}` : '';

  if (!imagesLoaded) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className={`container ${isPortrait ? 'portrait' : 'landscape'} ${backgroundClass}`}>
      <div
        className={`progress-bar ${isPortrait ? 'portrait' : 'landscape'}`}
        ref={progressBarRef}
      >
        <img
          src="https://picsum.photos/50" // Placeholder image
          alt="Slider"
          ref={sliderRef}
          className={`slider ${isPortrait ? 'portrait' : 'landscape'}`}
        />
      </div>

      <div className={`elements ${isPortrait ? 'portrait' : 'landscape'}`}>
        <div className="item item1">
          <p>Descripción del Elemento 1</p>
          <button>Botón 1</button>
        </div>
        <div className="item item2">
          <p>Descripción del Elemento 2</p>
          <button>Botón 2</button>
        </div>
        <div className="item item3">
          <p>Descripción del Elemento 3</p>
          <button>Botón 3</button>
        </div>
        <div className="item item4">
          <p>Descripción del Elemento 4</p>
          <button>Botón 4</button>
        </div>
        <div className="item item5">
          <p>Descripción del Elemento 5</p>
          <button>Botón 5</button>
        </div>
      </div>
    </div>
  );
};

export default Horarios;
