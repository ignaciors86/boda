import gsap from "gsap";
import { useEffect } from "react";

let canAnimate = true; // Controla si la animación puede ejecutarse

const animateOpacity = () => {
    // Si la animación no está disponible, evita ejecutar la función
    if (!canAnimate) {
      // console.log("La animación no está disponible aún.");
      return;
    }

    // console.log("Ejecutando animación...");

    const tlInicial = gsap.timeline();
    // Obtiene la duración de la animación desde CSS (personalizable vía variables CSS)
    const duracion = getComputedStyle(document.documentElement)
      .getPropertyValue('--duration')
      .trim()
      .replace('s', '') * 1; // Elimina la "s" del valor de segundos

    // Definir la animación utilizando la librería GSAP
    // console.log(canAnimate);
    if (canAnimate) {
      tlInicial
        .to("#myCanvas", {
            opacity: 0.2,
            duration: 1,
            delay: 0,
            ease: "ease",
            
        }, 0)
        .to("body", { background: "cadetblue", duration: duracion * .5 }, ">")
        .to(".sobre", { opacity: 0, zIndex: 2, duration: 0, scale: 0.7 }, ">")
        .to(".prompt", { opacity: 0, duration: 0 }, ">")
        
        .to(".bubu-dudu", {
          duration: 0,
          ease: "ease-in",
        }, ">")
        

        .to(".sobre", { opacity: 1, duration: duracion *2, scale: 1, y: 0, ease: "ease", }, ">")
        .to(".bubu-dudu", {
          rotateY: 90,
          duration: duracion * 1,
          ease: "ease-out",
        }, ">")

        .to(".envelope", {
          rotateY: 0,
          duration: duracion * 1,
          ease: "ease-in",
          onComplete: () => {
            canAnimate = false; // canAnimate = false; // Evitar que la animación se ejecute nuevamente hasta que esté lista
            // console.log("Animación completada.");
          }
        }, "<")

        
    }
  };

export default animateOpacity;
