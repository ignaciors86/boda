import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './Card.scss';
import { useDragContext } from '../DragContext';

const Card = ({ seccion, children, trasera }) => {
  const cardRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [flipped, setFlipped] = useState(null);
  const { activeCard, setActiveCard } = useDragContext();
  const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration-card').trim().replace('s', '');
  const duracionSeg = getComputedStyle(document.documentElement).getPropertyValue('--duration-card-seg');

  useEffect(() => {
    if (seccion !== activeCard && flipped) {
      // console.log("reset")
      resetCardPosition();

    }  


  }, [flipped, activeCard]);

  const flipCard = () => {
    const cardElement = cardRef.current;
    const frontElement = frontRef.current;
    const backElement = backRef.current;
    // console.log("flipcard");
    if (!flipped) {
      setFlipped(true);
      setActiveCard(seccion);
      gsap.set(cardElement, { x: 0, y: 0, z: 0, });
      gsap.to(cardElement, {
        rotateY: 90,
        duration: duracion,
        // ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(frontElement, { opacity: 0, visibility: "hidden" });
          gsap.set(backElement, { opacity: 1, visibility: "visible" });
          gsap.to(cardElement, {
            rotateY: 180,
            duration: duracion,
            // ease: 'power2.inOut,',
          });
          setTimeout(() => {
            const cardContainer = cardElement.parentNode;
            cardContainer.appendChild(cardElement);
          }, duracionSeg*1000);
        }
      });
    } else {
      resetCardPosition();
      setActiveCard("");
    }
  };

  const resetCardPosition = () => {
    const cardElement = cardRef.current;
    const frontElement = frontRef.current;
    const backElement = backRef.current;
    // activeCard !== seccion && setActiveCard("");
    gsap.to(cardElement, {
      rotateY: 90,
      duration: duracion,
      // ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(frontElement, { opacity: 1, visibility: "visible" });
        gsap.set(backElement, { opacity: 0, visibility: "hidden" });
        gsap.to(cardElement, {
          rotateY: 0,
          duration: duracion,
          // ease: 'power2.inOut',
          onComplete: () => {
            gsap.set(cardElement, { x: 0, y: 0, });
            setFlipped(false);
          }
        });
      }
    });
  };

  return (
    <div
      className={`card ${seccion} ${flipped ? 'flipped' : 'unflipped'}`}
      ref={cardRef}
      onDrag={() => !flipped && flipCard()}
      onClick={() => !flipped && flipCard()}
      style={{ zIndex: flipped ? 10 : 1, }}
    >
      <div className="card-front" ref={frontRef}>
        {children}
      </div>
      <div className="card-back" ref={backRef} onClick={() => !flipped && flipCard()}>
        {trasera}
      </div>
    </div>
  );
};

export default Card;
