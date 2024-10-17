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
  const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration-card').trim().replace('s', '');
  const duracionSeg = getComputedStyle(document.documentElement).getPropertyValue('--duration-card-seg');
  // useEffect(() => {
  //   const cardElement = cardRef.current;
  //     const dragInstance = Draggable.create(cardElement, {
  //       type: 'x,y,z',
  //       edgeResistance: 0.1,
  //       inertia: false,
  //       onDrag(e) {
  //         e.preventDefault();
  //         const dragDistance = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  //         if (dragDistance > window.innerHeight * 0.2) {
  //           flipCard();
  //         }
  //       },
  //     });

  //     return () => {
  //       dragInstance[0].kill();
  //     };
  // }, [activeCard]);

  useEffect(() => {

   
    
    if (seccion !== activeCard && flipped) {
      // console.log("reset")
      resetCardPosition();
      if(seccion !== "horarios" && seccion !== "asistencia" && seccion !== "ubicaciones"){
        setIsOtherDraggableActive(false);
      }

    }
    // if (seccion === activeCard) {
    //   flipCard();
    // }

    


  }, [flipped, activeCard]);

// useEffect(() => {
  // console.log("isOtherDraggableActive")
  //   console.log(isOtherDraggableActive)
  //   console.log("activeCard")
  //   console.log(activeCard)
// }, [isOtherDraggableActive]);

  const flipCard = () => {
    const cardElement = cardRef.current;
    const frontElement = frontRef.current;
    const backElement = backRef.current;
    console.log("flipcard");
    if (!flipped) {
      setFlipped(true);
      setActiveCard(seccion);
      setIsOtherDraggableActive(seccion === "horarios" || seccion === "asistencia" || seccion === "ubicaciones");
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
      onDrag={() => !flipped && flipCard()}
      onClick={() => !flipped && flipCard()}
      style={{ zIndex: flipped ? 10 : 1, }}
    >
      <div className="card-front" ref={frontRef}>
        {children}
      </div>
      <div className="card-back" ref={backRef} onClick={() => !isOtherDraggableActive && flipCard()}>
        {trasera}
      </div>
    </div>
  );
};

export default Card;
