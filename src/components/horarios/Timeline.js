import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Timeline.scss';
import Loading from './Loading.js';
import {imageUrls, items, renderItems} from "./items.js"
import ositosDrag from "./assets/images/ositos-drag.png";



gsap.registerPlugin(Draggable);

const Timeline = () => {
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));
  const [imagesLoaded, setImagesLoaded] = useState(false);

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

    const totalItems = 7;
    const durationPerItem = 6;
    const transitionDuration = 0.5;

    const commonTimeline = timelineRef.current.clear();

    items.forEach((item, index) => {
      const opacityStart = durationPerItem * index + transitionDuration * index;
      const opacityEnd = opacityStart + durationPerItem;
      const nextItemOpacityStart = opacityEnd + transitionDuration;

      commonTimeline
        .set(`.item${index + 1}`, { opacity: 0 })
        .to(`.item${index + 1}`, { opacity: 1, duration: durationPerItem }, ">")
        .to(`.item${index + 1}`, { opacity: 0, duration: transitionDuration, }, nextItemOpacityStart)
        .to('.elements', { opacity: 0, duration: transitionDuration }, nextItemOpacityStart)
        .to('.elements', { opacity: 1, duration: 0.5 }, ">")

    });

    Draggable.create(sliderRef.current, {
      type: 'y', // Siempre vertical, independientemente de la orientación
      bounds: progressBarRef.current,
      onDrag() {
        const progress = Math.min(
          Math.max(this.y / progressBarRef.current.clientHeight, 0), 
          1
        );
        timelineRef.current.progress(progress);

        // Cambia el tamaño de la imagen durante el arrastre
        const penultimateItemProgress = (totalItems - 2) / totalItems;
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
        Math.max(slider.y / progressBar.clientHeight, 0), 
        1
      );
      timelineRef.current.progress(initialProgress);
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

  if (!imagesLoaded) {
    return <Loading></Loading>;
  }

  return (
    <div className="container">
      <div className="elements">
        {renderItems()}
      </div>
      <div className="progress-bar" ref={progressBarRef}>
        <img
          src={ositosDrag}
          alt="Slider"
          ref={sliderRef}
          className="slider"
        />
      </div>
    </div>
  );
};

export default Timeline;
