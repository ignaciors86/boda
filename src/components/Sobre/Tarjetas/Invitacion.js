import React, { useEffect, useState } from "react";
import "./Invitacion.scss";
import nosotrosjpg from '../assets/images/nosotros.jpg';
import nosotrosjpgcolor from '../assets/images/invitacion-back.jpg';

import { ReactComponent as Nosotros } from '../assets/images/nosotros.svg'; // Importación del SVG como componente React
import { useDragContext } from "components/DragContext";
import gsap from "gsap";

const Invitacion = () => {
  const { activeCard } = useDragContext();
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (activeCard === "invitacion") {
      // Reinicia el SVG forzando un cambio en la clave
      setAnimationKey((prevKey) => prevKey + 1);

      const svgElement = document.querySelector('.nosotros-svg');
      const paths = svgElement?.querySelectorAll('path');

      // Aumentar opacidad del SVG
      gsap.to(svgElement, { opacity: 1, duration: 1, delay: 1, });

      paths?.forEach((path) => {
        const pathLength = path.getTotalLength();
        
        // Configuración inicial del trazo
        path.style.strokeDasharray = pathLength;
        path.style.strokeDashoffset = pathLength;

        // Animación del trazo
        setTimeout(() => {
          path.style.strokeDashoffset = 0; // Inicia la animación del trazo
          gsap.to(".nosotros-jpg", { opacity: 1, duration: .5, delay: 4, 
            onComplete: () => {
              gsap.to(".nosotros-jpg", { opacity: 0, duration: 1 });
              gsap.to(".nosotros-jpg-color", { opacity: 1, duration: 2 });
            }
          });
        }, 0);
      });
    }
  }, [activeCard]);

  return (
    <div
      className={`invitacion seccion ${
        activeCard === "invitacion" ? "active" : ""
      }`}
    >
      <Nosotros
        key={animationKey} // Fuerza el reinicio de la animación
        className="nosotros-svg"
        viewBox="0 0 843 840"
      />
      <img src={nosotrosjpg} alt="Nosotros" className="nosotros-jpg" />
      <img src={nosotrosjpgcolor} alt="Nosotros" className="nosotros-jpg-color" />

      <em>Queremos invitarte a nuestra boda. No sabemos si será la del año o no, pero sí que queremos que estés.</em>
      <p>
        En cada tarjeta tienes información relevante para ese día. Lo más
        importante es que confirmes tu asistencia lo antes posible, pero antes,
        mira con calma las demás.
      </p>
    </div>
  );
};

export default Invitacion;
