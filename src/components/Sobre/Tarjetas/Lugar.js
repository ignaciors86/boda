import { useEffect, useRef } from "react";
import gsap from "gsap";
import mapa from "./Lugar/map.webp";
import "./Lugar.scss";
import { useDragContext } from "../../DragContext";

const Lugar = ({ weedding }) => {
    const url = "https://maps.app.goo.gl/whoswYpUbrrjaCkm7";
    const mapRef = useRef(null);
    const claimRefs = useRef([]); // Referencias para las etiquetas con clase .claim
    const { activeCard, setActiveCard, isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext();
    const duracion = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '')) * 10;

    useEffect(() => {
        // Animación para la imagen del mapa
        const animation = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        animation.to(mapRef.current, {
            scale: 1.1, rotate: "4deg", duration: duracion / 3, ease: "power1.inOut", yoyo: true, repeat: -1,
            x: "-=2dvh", y: "+=2dvh" // Mover el mapa 2dvh en ambas direcciones
        })
            .to(mapRef.current, {
                scale: 1, rotate: "0deg", duration: duracion / 3, ease: "power1.inOut", yoyo: true, repeat: -1,
                x: "+=2dvh", y: "-=2dvh" // Volver a la posición original
            })
            .to(mapRef.current, {
                scale: 1.2, rotate: "-4deg", duration: duracion, ease: "power1.inOut", yoyo: true, repeat: -1,
                x: "-=2dvh", y: "-=2dvh"
            })
            .to(mapRef.current, {
                scale: 1, rotate: "0deg", duration: duracion / 3, ease: "power1.inOut", yoyo: true, repeat: -1,
                x: "+=2dvh", y: "+=2dvh"
            });

        // Animación para los elementos .claim
        const claimAnimation = gsap.timeline({ repeat: -1, repeatDelay: 1 });

        // Animación para la primera .claim
        claimAnimation.to(claimRefs.current[0], {
            scale: 1.05, rotate: "3deg", duration: duracion, ease: "power1.inOut", delay: 0.2, yoyo: true, repeat: -1, immediateRender: false,
            x: "-=2dvh", y: "-=2dvh" // Mover la primera .claim
        })
            .to(claimRefs.current[0], {
                scale: 1, rotate: "0deg", duration: duracion, ease: "power1.inOut", yoyo: true, repeat: -1,
                x: "+=2dvh", y: "+=2dvh" // Volver a la posición original
            });

        // Animación para la segunda .claim
        claimAnimation.to(claimRefs.current[1], {
            scale: 1.1, rotate: "-3deg", duration: duracion, ease: "power1.inOut", delay: 0.5, yoyo: true, repeat: -1, immediateRender: false,
            x: "+=2dvh", y: "+=2dvh" // Mover la segunda .claim
        })
            .to(claimRefs.current[1], {
                scale: 1, rotate: "0deg", duration: duracion, ease: "power1.inOut", yoyo: true, repeat: -1,
                x: "-=2dvh", y: "-=2dvh" // Volver a la posición original
            });

        // Animación para la tercera .claim
        claimAnimation.to(claimRefs.current[2], {
            scale: 1.15, rotate: "2deg", duration: duracion / 2, ease: "power1.inOut", delay: 0.8, yoyo: true, repeat: -1, immediateRender: false,
            x: "+=2dvh", y: "+=2dvh" // Mover la tercera .claim
        })
            .to(claimRefs.current[2], {
                scale: 1, rotate: "0deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1,
                x: "-=2dvh", y: "-=2dvh" // Volver a la posición original
            });
    }, [duracion]);

    return (
        <>
            <div className="lugar seccion">
                <div>
                    <h4>Donde:<br /><h2>Villas de Pomar</h2></h4>
                    <em>(Pedrosillo el Ralo, Salamanca)</em>
                </div>

                <a className="imagen" href={url} target="_blank" rel="noopener noreferrer" ref={mapRef}>
                    <img src={mapa} alt="Mapa del lugar" />
                    <em><h4>Villas de Pomar</h4></em>
                </a>
                <a target="_blank" href="https://maps.app.goo.gl/VcP5TumYHdV7XPSE9" className="claim" ref={(el) => claimRefs.current[1] = el}>
                    <em>El autobús saldrá a las 12:00 desde El Corte Inglés</em>
                </a>

                {weedding && 
                    <div className="claim alojamiento" ref={(el) => claimRefs.current[2] = el}>
                        <em>Si estás leyendo esto, tú y tu +1 tenéis el alojamiento ya reservado en el lugar de la boda (las dos noches)</em>
                    </div>}
            </div>

            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default Lugar;
