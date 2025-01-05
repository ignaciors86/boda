import gsap from "gsap";
import ositos from "./assets/images/ositos-drag.png";
import { useEffect, useRef } from "react";
import "./Loading.scss";
import { useDragContext } from "components/DragContext";

const Loading = ({ text = true }) => {

    const { activeCard } = useDragContext();
    // Referencia para almacenar la animación
    const animationRef = useRef(null);
    useEffect(() => {

        // Crear una nueva animación y almacenarla
        animationRef.current = gsap.to(".loading img", {
            scale: 1.3,
            repeat: -1,
            yoyo: true,
            duration: 0.5,
            ease: "linear",
        });
    }, []);
    return <div className="loading">
        {/* {text && <h2>Cargando... </h2>} */}
        <img src={ositos} alt="Ositos cargando" />
        {text && <p>Si estás usando una red lenta, ten paciencia.</p>}
    </div>
}

export default Loading;