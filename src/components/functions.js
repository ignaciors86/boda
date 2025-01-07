import gsap from "gsap";

let canAnimate = true; // Controla si la animación puede ejecutarse
let animationRunning = false; // Controla si la animación ya está en curso

const animateOpacity = (callback) => {
    // Si la animación no está disponible o ya está en ejecución, evita ejecutar la función
    if (!canAnimate || animationRunning) {
        return;
    }

    // Marcar que la animación está en curso
    animationRunning = true;

    const tlInicial = gsap.timeline();
    // Obtiene la duración de la animación desde CSS (personalizable vía variables CSS)
    const duracion = getComputedStyle(document.documentElement)
        .getPropertyValue('--duration')
        .trim()
        .replace('s', '') * 1; // Elimina la "s" del valor de segundos

    if (canAnimate) {
        tlInicial
            .set(".sobre .nosotros-jpg-imagen", { borderRadius: "50%",})
            .to(".prompt.inicial", {
                opacity: 0, duration: 15, ease: "ease-out",
                y: "100vh",
              }, 0)
            .to("#myCanvas", {
                opacity: 0.7,
                duration: 1,
                delay: 0,
                ease: "ease",
            }, 0)
            
            .to("body", { background: "cadetblue", duration: duracion * .5 }, ">")
        
            .to(".sobre", { opacity: 0, zIndex: 2, duration: 0, scale: 3 }, ">")
            .to(".sobre", { opacity: 1, duration: duracion*5, scale: 1, y: 0, ease: "ease",  onStart: callback}, ">")
            
            .to(".sobre .nosotros-svg", {
                opacity: 1, 
                duration: 3,
               
            }, "<")
            .to(".sobre .nosotros-jpg-imagen", { opacity: 1, duration: 4, delay: 2, }, "<")
            .to(".sobre .nosotros-jpg-imagen", { borderRadius: 0, duration: 2, delay: 1.5, }, "<")

            
            .to(".sobre .nosotros-svg", { opacity: 0, duration: .5, }, ">")
            
            
            .to(".sobre .nosotros-jpg", {
                rotateY: 90,
                duration: duracion * 1,
                ease: "ease-out",
                delay: 2,
            }, ">-=1")
            // .to(".sobre .nosotros-svg", { display: "none", visibility: "hidden", duration: 0, }, "<")
            .to(".envelope", {
                rotateY: 0,
                duration: duracion * 1,
                ease: "ease-in",
                onComplete: () => {
                    canAnimate = false; // Evitar que la animación se ejecute nuevamente
                    animationRunning = false; // Marcar la animación como terminada
                }
            }, "<");
    }
};

// Función para restablecer la animación
export const resetAnimation = () => {
    canAnimate = true; // Restablece el control de animación para permitir una nueva ejecución
};

export default animateOpacity;
