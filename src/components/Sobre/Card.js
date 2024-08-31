import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Card.scss';
import { useDragContext } from '../DragContext';

gsap.registerPlugin(Draggable);

const Card = ({ seccion, children, trasera }) => {
  const cardRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [flipped, setFlipped] = useState(null);
  const { isOtherDraggableActive, setIsOtherDraggableActive, activeCard, setActiveCard } = useDragContext();

  useEffect(() => {
    const cardElement = cardRef.current;

    if (!isOtherDraggableActive) {
      const dragInstance = Draggable.create(cardElement, {
        type: 'x,y',
        edgeResistance: 0.65,
        inertia: true,
        throwProps: true,
        onDrag() {
          cardElement.classList.remove("undragged");
          const dragDistance = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
          if (dragDistance > window.innerHeight * 0.1) {
            flipCard();
          }
        },
        onRelease() {
          cardElement.classList.add("undragged");
          if (flipped) {
            gsap.to(cardElement, {
              rotateY: 0,
              scale: 1,
              duration: 0.5,
              ease: 'power2.inOut',
              onComplete: () => {
                gsap.set(cardElement, { x: 0, y: 0 });
              }
            });
            setFlipped(false);
            setIsOtherDraggableActive(false);
          } else {
            gsap.to(cardElement, {
              duration: 0.2,
              x: 0,
              y: 0,
              ease: 'power2.out'
            });
          }
        }
      });

      return () => {
        dragInstance[0].kill();
      };
    }
  }, [flipped, isOtherDraggableActive]);

  useEffect(() => {
    if (seccion !== activeCard && flipped) {
      resetCardPosition();
    }
  }, [seccion, activeCard]);

  const giroTarjeta = (back) => {
    const cardElement = cardRef.current;
    const frontElement = frontRef.current;
    const backElement = backRef.current;
    console.log("girotarjeta" + back);
    gsap.timeline()
    .to(cardElement, {
      rotateY: !back ? 90 : 0,
      duration: 0.125,
      ease: 'power2.inOut',
    }, 0)
    .to(frontElement, {
      opacity: !back ? 0 : 1,
      duration: 0,
      ease: 'power2.inOut',
    }, ">")
    .to(backElement, {
      opacity: !back ? 1 : 0,
      visibility: !back ? "visible" : "hidden",
      duration: 0,
      ease: 'power2.inOut',
    }, "<")
    .to(cardElement, {
      rotateY: !back ? 180 : 0,
      duration: !back ? 0 : 0.125,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(cardElement, { x: 0, y: 0 });
      }
    }, ">")
  }

  function flipCard() {
    const cardElement = cardRef.current;
    setActiveCard(seccion);

    if (!flipped) {
      setFlipped(true);
      gsap.set(cardElement, { x: 0, y: 0, z: 0 });
      giroTarjeta();
    }else{
      resetCardPosition();
    }
  }

  function resetCardPosition() {
    console.log("reset");
    giroTarjeta(true);
    setIsOtherDraggableActive(false);
    setFlipped(false);
  }

  return (
    <div
      className={`card ${seccion} ${flipped ? 'flipped' : flipped === false ? 'unflipped' : ''}`}
      ref={cardRef}
      onClick={flipCard}
      style={{ zIndex: flipped ? 10 : 1 }}
    >
      <div className="card-front" ref={frontRef}>
        {children}
      </div>
      <div className="card-back" ref={backRef}>
        {trasera}
      </div>
    </div>
  );
};

export default Card;
