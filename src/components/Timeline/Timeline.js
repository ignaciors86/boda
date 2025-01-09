import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { throttle } from 'lodash';
import './Timeline.scss';
import Loading from './Loading.js';
import { imageUrls, items, renderItems } from "./items.js";
import ositosDrag from "./assets/images/ositos-drag.png";
import { useDragContext } from '../DragContext.js';
import Marquee from 'react-fast-marquee';
gsap.registerPlugin(Draggable);

const Timeline = ({ weedding }) => {
  const MAINCLASS = "timeline";
  const { activeCard, setActiveCard } = useDragContext();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [sliderValue, setSliderValue] = useState(0); // Control del slider con pasos pequeños
  const [currentIndex, setCurrentIndex] = useState(0); // Índice actual del elemento activo
  const [isMuted, setIsMuted] = useState(true);

  const audioRefs = useRef(
    items.map((item) => {
      const audio = new Audio(weedding && item.audioWedding ? item.audioWedding : item.audio);
      audio.preload = "auto";
      // audio.muted = isMuted;
      audio.loop = true;
      return audio;
    })
  );

  const playNextAudio = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % audioRefs.current.length; // Ciclo al primer audio después del último
      audioRefs.current[currentIndex].muted = isMuted;
      audioRefs.current[currentIndex].preload = "auto";
      audioRefs.current[currentIndex].play().catch(error => {
        // console.log('Error al reproducir el audio:', error);
      });
      return currentIndex;
    });
  };

  useEffect(() => {
    const preloadImages = (urls) =>
      Promise.all(
        urls.map((url) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = reject;
          });
        })
      );

    preloadImages(imageUrls)
      .then(() => setImagesLoaded(true))
      .catch(console.error);

    return () => audioRefs.current.forEach((audio) => audio.pause());
  }, []);

  useEffect(() => {
    // Actualiza el índice entero solo si cambia
    const newIndex = Math.round(sliderValue);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [sliderValue]);

  const play = () => {
    audioRefs.current.forEach((audio, index) => {
      if (index === currentIndex && activeCard === "horarios") {
        audio.play().catch(console.error);
        audio.muted = isMuted;
      } else {
        audio.muted = true;
        // audio.currentTime = 0;
      }
    });
  }
  useEffect(() => {
    play();
  }, [activeCard]);

  useEffect(() => {

  }, [currentIndex]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    audioRefs.current[currentIndex].muted = !isMuted;
  };

  useEffect(() => {
    isMuted && activeCard === "horarios" && handleMuteToggle();
  }, [activeCard]);

  const handleSliderChange = (e) => {
    setSliderValue(Number(e.target.value)); // Actualiza solo el valor del slider
    // gsap.to(".loading", { opacity: 0, duration: 0.3, delay: .3, }); // Reduce la opacidad al soltar
  };

  const handleMouseDown = () => {
    audioRefs.current[currentIndex].muted = true;
    gsap.to(".loading", { opacity: 1, duration: 0.15, delay: .15 }); // Aumenta la opacidad al hacer clic
    gsap.to(".elementsToHide", { opacity: 0, duration: 0.15, delay: 0, }); // Reduce la opacidad al soltar
  };

  const handleMouseUp = () => {
    play();
    gsap.to(".loading", { opacity: 0, duration: 0.3, delay: 0, }); // Reduce la opacidad al soltar
    gsap.to(".elementsToHide", { opacity: 1, duration: 0.3, delay: .3, }); // Reduce la opacidad al soltar
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      audioRefs.current[currentIndex].volume= document.hidden && !isMuted ? 0 : 1;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentIndex]);

  // Pausar todos los audios al minimizar o cambiar de pestaña
  useEffect(() => {

    const newDuration = currentIndex < 3 || currentIndex > 6 ? 3 : (8 - currentIndex) * .1;
    gsap.set(".progress-bar ", { animation: `shadowPulse ${newDuration}s ease-in-out infinite` });

  }, [currentIndex]);


  useEffect(() => {
    const sliderElement = document.querySelector(".slider");

    // Añadir eventos de mouse
    sliderElement.addEventListener("mousedown", handleMouseDown);
    sliderElement.addEventListener("mouseup", handleMouseUp);

    // Añadir eventos táctiles
    sliderElement.addEventListener("touchstart", handleMouseDown);
    sliderElement.addEventListener("touchend", handleMouseUp);

    // Limpiar eventos cuando el componente se desmonte
    return () => {
      sliderElement.removeEventListener("mousedown", handleMouseDown);
      sliderElement.removeEventListener("mouseup", handleMouseUp);
      sliderElement.removeEventListener("touchstart", handleMouseDown);
      sliderElement.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  return (
    <>
      <div className={`${MAINCLASS} seccion`}>

        {imagesLoaded && (
          <>
            <div className="elements">{renderItems(currentIndex, weedding || null)}</div>
            <Loading text={true} />
            <div className="progress-bar">
              <Marquee speed={50}>
                <span>
                  Arrastra la bolita hacia los lados para ver bien el finde que hemos planeado. Hay mucho gif y música en proceso de descarga y estoy usando un servidor gratuíto. Esto, al principio, provoca dolor de tripita en los iPhone{weedding ? " (como las setas)" : ""}, y sí, probablemente podría estar más optimizado, pero {!weedding ? "yo que se, algo tenía que malir sal..." : "me esta dando una pereza ya que flipas revisarlo más"}
                </span>
              </Marquee>
              <input
                type="range"
                min="0"
                max={items.length - 1}
                step={0.1}
                value={sliderValue}
                onChange={handleSliderChange}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
                className="slider"
              />
            </div>
          </>
        )}
      </div>
      <button className="back" onClick={() => setActiveCard("home")} />
      <button className={`back ${isMuted ? "play" : "stop"}`} onClick={handleMuteToggle} />
    </>
  );
};

export default Timeline;
