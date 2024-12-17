import { useEffect, useRef } from "react";
import gsap from "gsap";
import mapa from "./Lugar/map.webp";
import "./Lugar.scss";
import { useDragContext } from "../../DragContext";

const Lugar = ({weeding}) => {
    const url = "https://maps.app.goo.gl/whoswYpUbrrjaCkm7";
    const mapRef = useRef(null);
    const { activeCard, setActiveCard, isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext();
    const duracion = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim().replace('s', '');
    useEffect(() => {
        const animation = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        animation.to(mapRef.current, { scale: 1.2, rotate: "4deg", duration: duracion/2, ease: "power1.inOut" })
                 .to(mapRef.current, { scale: 1, rotate: "0deg", duration: duracion/2, ease: "power1.inOut" })
                 .to(mapRef.current, { scale: 1.2, rotate: "-4deg", duration: duracion/2, ease: "power1.inOut" })
                 .to(mapRef.current, { scale: 1, rotate: "0deg", duration: duracion/2, ease: "power1.inOut" });

    }, []);

    return (<>
        <div className="lugar seccion">
            <h4>Donde:<br></br><h2>Villas de Pomar</h2></h4>
            <a className="imagen" href={url} target="_blank" rel="noopener noreferrer">
                <img src={mapa} alt="Mapa del lugar" ref={mapRef} />
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                <em>(Pedrosillo el Ralo, Salamanca)</em>
            </a>

            <em className="claim"><a target= "_blank" href="https://maps.app.goo.gl/VcP5TumYHdV7XPSE9">El autobús saldrá a las 12:00 desde El Corte Inglés</a></em>
            { weeding && <em className="claim">Si estás leyendo esto, tú y tu +1 tenéis el alojamiento ya reservado en el mismo sitio de la boda</em> }
        </div>
        
        <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default Lugar;
