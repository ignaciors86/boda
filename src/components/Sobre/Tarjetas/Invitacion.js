import React, { useEffect, useState } from "react";
import "./Invitacion.scss";
import nosotrosjpg from '../assets/images/nosotros.jpg';
import nosotrosjpgcolor from '../assets/images/invitacion-back.jpg';

import { ReactComponent as Nosotros } from '../assets/images/nosotros.svg'; // Importación del SVG como componente React
import { useDragContext } from "components/DragContext";
import gsap from "gsap";
import Loading from "components/Timeline/Loading";
import Typewriter from "typewriter-effect";

const Invitacion = () => {
  const { activeCard, setActiveCard } = useDragContext();
  const [animationKey, setAnimationKey] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (activeCard === "invitacion") {
      // Reinicia el SVG forzando un cambio en la clave
      setAnimationKey((prevKey) => prevKey + 1);

      const svgElement = document.querySelector('.invitacion .nosotros-svg');
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
    
          gsap.to(".invitacion .nosotros-jpg", {
            opacity: 0, duration: .5, delay: .5,
            onComplete: () => {
              path.style.strokeDashoffset = 0; 
              const tlCaretos = gsap.timeline();
              const duration = .2 ;
              tlCaretos.to(".invitacion .nosotros-svg", { opacity: 1, duration: duration*2, })
                .to(".invitacion .nosotros-jpg-color", { opacity: 1, duration: duration*3 }, "<")
                .to(".invitacion h2", { opacity: 1, duration: duration*1, })
                .to(".invitacion h2", { duration: duration*3, color: "white", }, ">")
                .to(".invitacion p, .invitacion em", { opacity: 1, duration: duration*2, delay: duration*1, });
            }
          });
        }, 0);
      });
    }
  }, [activeCard]);

  const ocultar = () => {
    gsap.to(".seccion.invitacion", {
      opacity: 0,
      duration: .25,
      onComplete: () => {
        setVisible(true);
        setActiveCard("sobre")
      },
    });
  }


  useEffect(() => {
    console.log(visible);
  }, [visible]);
  
  const TypewriterContent = () => (
    <Typewriter
      onInit={(typewriter) => {
        setTimeout(() => {
          typewriter
            .typeString(
              "En cada tarjeta tienes información relevante para ese día. Si tienes alguna duda, no dudes en preguntar..."
            )
            .start();
        }, 3000); // Retraso de 2 segundos antes de empezar a escribir
      }}
      options={{
        autoStart: false, // Desactivar autoStart, ya que vamos a controlar manualmente el inicio
        loop: false, // No repetir la animación
        delay: 40, // Velocidad de escritura
      }}
    />
  );

  return (
    <>
    <Loading text={false}/>
    {activeCard === "invitacion" && <><div
      className={`invitacion seccion ${activeCard === "invitacion" ? "active" : ""
        }`}
    >
      <Nosotros
        key={animationKey} // Fuerza el reinicio de la animación
        className="nosotros-svg"
        viewBox="0 0 843 840"
      />
      <img src={nosotrosjpg} alt="Nosotros" className="nosotros-jpg" />
      <img src={nosotrosjpgcolor} alt="Nosotros" className="nosotros-jpg-color" />

      <h2>
        Nos casamos. Molaría que vengas
      </h2>
      
      <p className="fijo">
      {visible ? TypewriterContent() : null}
       
      </p>

    </div>
      <button className="back" onClick={ocultar} />
    </>}</>
  );
};

export default Invitacion;
