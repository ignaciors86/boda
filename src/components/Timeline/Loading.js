import gsap from "gsap";
import ositos from "./assets/images/ositos-drag.png";
import { useEffect } from "react";
import "./Loading.scss";

const Loading = ({text=true}) => {

    useEffect(() => {
        gsap.to(".loading img", {
            scale: 1.3,
            repeat: -1,
            yoyo: true,
            duration: 0.5,
            ease: "linear",
        });
    }, []);
    return <div className="loading">
        { text && <h2>Cargando... </h2>}
        <img src={ositos} alt="Ositos cargando" />
        { text && <em>Si estás usando una red lenta, ten paciencia.</em>}
    </div>
}

export default Loading;