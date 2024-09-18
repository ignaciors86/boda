import gsap from "gsap";
import { useEffect } from "react";

let canAnimate = false; // Controla si la animación puede ejecutarse

const animateOpacity = () => {
    // Si la animación no está disponible, evita ejecutar la función
    if (!canAnimate) {
        console.log("La animación no está disponible aún.");
        return;
    }

    console.log("Ejecutando animación...");

    const tlInicial = gsap.timeline();
    // Obtiene la duración de la animación desde CSS (personalizable vía variables CSS)
    const duracion = getComputedStyle(document.documentElement)
        .getPropertyValue('--duration')
        .trim()
        .replace('s', ''); // Elimina la "s" del valor de segundos

    // Definir la animación utilizando la librería GSAP
    if (canAnimate) {
        tlInicial
            .to(".sobre", { opacity: 0, zIndex: 2, duration: 0, scale: 0.7 }, 0)
            .to(".prompt", { opacity: 0, duration: duracion * 1 }, ">")
            .to("body", { background: "cadetblue", duration: duracion * 2 }, ">")
            .to(".sobre", { opacity: 1, duration: duracion * 2, scale: 1, y: 0, ease: "ease", delay: duracion / 3 }, "<")
            .to("#myCanvas", {
                opacity: 0.5,
                duration: 1,
                delay: 0,
                ease: "ease",
                onComplete: () => {
                    canAnimate = false; // Evitar que la animación se ejecute nuevamente hasta que esté lista
                    console.log("Animación completada.");
                }
            }, "<");
    }
};

// Listener para asegurar que la animación pueda ejecutarse después de que la página ha cargado completamente
window.addEventListener('load', () => {
    // Se usa un retraso de 1 segundo para habilitar la animación
    gsap.delayedCall(1, () => {
        canAnimate = true;
        console.log("La animación está lista.");
    });
});

export default animateOpacity;
