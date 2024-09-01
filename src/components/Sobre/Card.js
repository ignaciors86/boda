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
        type: 'x,y,z',
        edgeResistance: 0.1,
        inertia: false,
        throwProps: true,
        onDrag() {
          cardElement.classList.add("dragged");
          const dragDistance = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
          if (dragDistance > window.innerHeight * 0.1) {
            flipCard();
          }
        },
        onRelease() {
          if (flipped) {
            resetCardPosition();
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

  const flipCard = () => {
    const cardElement = cardRef.current;
    const frontElement = frontRef.current;
    const backElement = backRef.current;

    setActiveCard(seccion);

    if (!flipped) {
      setFlipped(true);
      setIsOtherDraggableActive(seccion === "horarios");
      gsap.set(cardElement, { x: 0, y: 0, z: 0 });
      gsap.to(cardElement, {
        rotateY: 90,
        duration: 0.25,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(frontElement, { opacity: 0, visibility: "hidden" });
          gsap.set(backElement, { opacity: 1, visibility: "visible" });
          gsap.to(cardElement, {
            rotateY: 180,
            duration: 0.25,
            ease: 'power2.inOut'
          });
        }
      });
    } else {
      resetCardPosition();
    }
  };

  const resetCardPosition = () => {
    const cardElement = cardRef.current;
    const frontElement = frontRef.current;
    const backElement = backRef.current;

    gsap.to(cardElement, {
      rotateY: 90,
      duration: 0.25,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(frontElement, { opacity: 1, visibility: "visible" });
        gsap.set(backElement, { opacity: 0, visibility: "hidden" });
        gsap.to(cardElement, {
          rotateY: 0,
          duration: 0.25,
          ease: 'power2.inOut',
          onComplete: () => {
            gsap.set(cardElement, { x: 0, y: 0 });
            setFlipped(false);
            setIsOtherDraggableActive(false);
          }
        });
      }
    });
  };

  return (
    <div
      className={`card ${seccion} ${flipped ? 'flipped' : 'unflipped'}`}
      ref={cardRef}
      onClick={() => { cardRef.current.classList.remove("dragged"); flipCard() }}
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
