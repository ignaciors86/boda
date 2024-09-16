import gsap from "gsap";
import { useEffect } from "react";

let canAnimate = false;

const animateOpacity = () => {
    if (!canAnimate) {
        console.log("La animación no está disponible aún.");
        return; // No ejecutar la función si no está disponible
    }
    console.log(canAnimate);

    const tlInicial = gsap.timeline();
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
    canAnimate && tlInicial
      .to(".sobre", { opacity: 0, zIndex: 2, duration: 0, scale: .7 }, 0)
      .to(".prompt", { opacity: 0, duration: duracion*1 }, ">")
      .to("body", { background: "var(--greenSuperTransparent)", duration: duracion*2 }, ">")
      .to(".sobre", { opacity: 1, duration: duracion*2, scale: 1, y: 0, ease: "ease", delay: duracion/3 }, "<")
      .to("#myCanvas", { opacity: 0.5, duration: 1, delay: 0, ease: "ease",
        onComplete: () => canAnimate = false,
       }, "<");
}

    window.addEventListener('load', () => {
        gsap.delayedCall(1, () => canAnimate = true);
    });
// Inicializar el control de disponibilidad de la animación al cargar la página


export default animateOpacity;