import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Card.scss';
import { useDragContext } from './DragContext'; // Importa el contexto

gsap.registerPlugin(Draggable);

const Card = ({ seccion, children, trasera }) => {
  const cardRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const { isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext(); // Usa el contexto
  const [draggableInstance, setDraggableInstance] = useState(null);

  useEffect(() => {
    const cardElement = cardRef.current;

    // Solo crea una instancia Draggable si no está activada otra carta
    if (!flipped && !isOtherDraggableActive) {
      const dragInstance = Draggable.create(cardElement, {
        type: 'x,y',
        edgeResistance: 0.05,
        throwProps: true,
        onDrag() {
          const dragDistance = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
          if (dragDistance > window.innerHeight * 0.3 && !flipped && !isOtherDraggableActive) {
            flipCard();
          }
        },
        onRelease() {
          gsap.to(cardElement, {
            duration: 0.05,
            x: 0,
            y: 0,
            ease: 'power2.out'
          });
        }
      });

      setDraggableInstance(dragInstance[0]);

      return () => {
        dragInstance[0].kill();
      };
    } else if (draggableInstance && isOtherDraggableActive) {
      draggableInstance.disable();
    }

  }, [flipped, isOtherDraggableActive]);

  function flipCard() {
    const cardElement = cardRef.current;

    // Evita girar la carta si otra ya está girada
    if (!flipped && !isOtherDraggableActive) {
      setFlipped(true);
      setIsOtherDraggableActive(true);

      // Restablece la posición antes de girar
      gsap.set(cardElement, { x: 0, y: 0 });

      // Anima la rotación de la carta
      gsap.to(cardElement, {
        rotateY: 180,
        duration: 0.15,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.to(cardElement, {
            scale: 1.2,
            duration: 0.3,
            ease: 'power2.inOut'
          });
        }
      });
    } else {
      resetCardPosition();
    }
  }

  function resetCardPosition() {
    if (flipped) {
      setFlipped(false);
      const cardElement = cardRef.current;

      gsap.to(cardElement, {
        rotateY: 0,
        scale: 1,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          if (draggableInstance) {
            draggableInstance.enable();
          }
          setIsOtherDraggableActive(false); // Permite que otras cartas puedan girarse nuevamente
        }
      });
    }
  }

  return (
    <div
      className={`card ${seccion} ${flipped ? 'flipped' : ''}`}
      ref={cardRef}
      onClick={flipCard}
      style={{ zIndex: flipped ? 10 : 1 }} // Ajusta el z-index
    >
      <div className="card-front">
        {children}
      </div>
      <div className="card-back">
        {trasera}
      </div>
    </div>
  );
};

export default Card;
