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
    const duracion = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '')) * 4;

    useEffect(() => {
        // Animación para la imagen del mapa
        const animation = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        animation.to(mapRef.current, { scale: 1.1, rotate: "4deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1 })
            .to(mapRef.current, { scale: 1, rotate: "0deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1 })
            .to(mapRef.current, { scale: 1.2, rotate: "-4deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1 })
            .to(mapRef.current, { scale: 1, rotate: "0deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1 });

        // Animación para los elementos .claim
        const claimAnimation = gsap.timeline({ repeat: -1, repeatDelay: 1 });

        // Animación para la primera .claim
        claimAnimation.to(claimRefs.current[0], {
            scale: 1.05, rotate: "3deg", duration: duracion / 2, ease: "power1.inOut", delay: 0.2, yoyo: true, repeat: -1, immediateRender: false
        })
            .to(claimRefs.current[0], {
                scale: 1, rotate: "0deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1
            });

        // Animación para la segunda .claim
        claimAnimation.to(claimRefs.current[1], {
            scale: 1.1, rotate: "-3deg", duration: duracion / 2, ease: "power1.inOut", delay: 0.5, yoyo: true, repeat: -1, immediateRender: false
        })
            .to(claimRefs.current[1], {
                scale: 1, rotate: "0deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1
            });

        // Animación para la tercera .claim
        claimAnimation.to(claimRefs.current[2], {
            scale: 1.15, rotate: "2deg", duration: duracion / 2, ease: "power1.inOut", delay: 0.8, yoyo: true, repeat: -1, immediateRender: false
        })
            .to(claimRefs.current[2], {
                scale: 1, rotate: "0deg", duration: duracion / 2, ease: "power1.inOut", yoyo: true, repeat: -1
            });
    }, [duracion]);

    return (
        <>
            <div className="lugar seccion">
                <h4>Donde:<br></br><h2>Villas de Pomar</h2></h4>
                <a className="imagen" href={url} target="_blank" rel="noopener noreferrer">
                    <img src={mapa} alt="Mapa del lugar" ref={mapRef} />
                </a>
                <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <em className="claim" ref={(el) => claimRefs.current[0] = el}>(Pedrosillo el Ralo, Salamanca)</em>
                </a>

                <em className="claim" ref={(el) => claimRefs.current[1] = el}>
                    <a target="_blank" href="https://maps.app.goo.gl/VcP5TumYHdV7XPSE9">El autobús saldrá a las 12:00 desde El Corte Inglés</a>
                </em>

                {weedding && <em className="claim secundario" ref={(el) => claimRefs.current[2] = el}>Si estás leyendo esto, tú y tu +1 tenéis el alojamiento ya reservado en el mismo sitio de la boda</em>}
            </div>

            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default Lugar;
