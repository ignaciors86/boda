import { useEffect, useRef } from "react";
import gsap from "gsap";
import mapa from "./Lugar/map.webp";
import "./Lugar.scss";

const Lugar = () => {
    const url = "https://maps.app.goo.gl/whoswYpUbrrjaCkm7";
    const mapRef = useRef(null);
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
    useEffect(() => {
        const animation = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        animation.to(mapRef.current, { scale: 1.2, rotate: "4deg", duration: duracion/2, ease: "power1.inOut" })
                 .to(mapRef.current, { scale: 1, rotate: "0deg", duration: duracion/2, ease: "power1.inOut" })
                 .to(mapRef.current, { scale: 1.2, rotate: "-4deg", duration: duracion/2, ease: "power1.inOut" })
                 .to(mapRef.current, { scale: 1, rotate: "0deg", duration: duracion/2, ease: "power1.inOut" });
    }, []);

    return (
        <div className="lugar seccion">
            <p>Tendrás que venir a Villas de Pomar</p>
            <a className="imagen" href={url} target="_blank" rel="noopener noreferrer">
                <img src={mapa} alt="Mapa del lugar" ref={mapRef} />
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer">
                <em>(Pedrosillo el Ralo, Salamanca)</em>
            </a>
        </div>
    );
};

export default Lugar;
