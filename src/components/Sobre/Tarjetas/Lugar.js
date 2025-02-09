import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import mapa from "./Lugar/map.webp";
import "./Lugar.scss";
import { useDragContext } from "../../DragContext";

const Lugar = ({ weedding, hosteado }) => {
    const url = "https://maps.app.goo.gl/whoswYpUbrrjaCkm7";
    const mapRef = useRef(null);
    const claimRefs = useRef([]); // Referencias para las etiquetas con clase .claim
    const { activeCard, setActiveCard } = useDragContext();
    const duracion = 10;
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        if(activeCard !== "ubicaciones") return;
        // Resetear propiedades transform y opacity de los elementos antes de animarlos
        claimRefs.current.forEach((ref) => {
            if (ref) {
                gsap.set(ref, { clearProps: "all" }); // Limpia cualquier transformación previa en cada .claim
            }
        });
        if (mapRef.current) {
            gsap.set(mapRef.current, { clearProps: "all" }); // Limpia cualquier transformación previa en el mapa
        }

        // Animación para la imagen del mapa
        const animation = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        gsap.killTweensOf(mapRef.current);
        gsap.killTweensOf(".claim");
        animation.to(mapRef.current, {
            scale: 1.1,
            rotate: "4deg",
            duration: duracion / 3,
            ease: "power1.inOut",
            yoyo: true,
            repeat: -1,
            x: "-=2dvh",
            y: "+=2dvh",
        })
            .to(mapRef.current, {
                scale: 1,
                rotate: "0deg",
                duration: duracion / 3,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "+=2dvh",
                y: "-=2dvh",
            })
            .to(mapRef.current, {
                scale: 1.2,
                rotate: "-4deg",
                duration: duracion,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "-=2dvh",
                y: "-=2dvh",
            })
            .to(mapRef.current, {
                scale: 1,
                rotate: "0deg",
                duration: duracion / 3,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "+=2dvh",
                y: "+=2dvh",
            });

        // Animación para los elementos .claim
        const claimAnimation = gsap.timeline({ repeat: -1, repeatDelay: 1 });

        claimAnimation.to(claimRefs.current[0], {
            opacity: 1,
            scale: 1.05,
            rotate: "3deg",
            duration: duracion,
            ease: "power1.inOut",
            delay: 0.2,
            yoyo: true,
            repeat: -1,
            immediateRender: false,
            x: "-=2dvh",
            y: "-=2dvh",
        }, 0)
            .to(claimRefs.current[0], {
                scale: 1,
                rotate: "0deg",
                duration: duracion,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "+=2dvh",
                y: "+=2dvh",
            });

        claimAnimation.to(claimRefs.current[1], {
            scale: 1.1,
            rotate: "-3deg",
            duration: duracion,
            ease: "power1.inOut",
            delay: 0.5,
            yoyo: true,
            repeat: -1,
            immediateRender: false,
            x: "+=2dvh",
            y: "+=2dvh",
        }, 0)
            .to(claimRefs.current[1], {
                scale: 1,
                rotate: "0deg",
                duration: duracion,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "-=2dvh",
                y: "-=2dvh",
            });

        claimAnimation.to(claimRefs.current[2], {
            scale: 1.15,
            rotate: "2deg",
            duration: duracion / 2,
            ease: "power1.inOut",
            delay: 0.8,
            yoyo: true,
            repeat: -1,
            immediateRender: false,
            x: "+=2dvh",
            y: "+=2dvh",
        }, 0)
            .to(claimRefs.current[2], {
                scale: 1,
                rotate: "0deg",
                duration: duracion / 2,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "-=2dvh",
                y: "-=2dvh",
            });

        claimAnimation.to(claimRefs.current[4], {
            scale: 1.15,
            rotate: "2deg",
            duration: duracion / 2,
            ease: "power1.inOut",
            delay: 0.8,
            yoyo: true,
            repeat: -1,
            immediateRender: false,
            x: "+=2dvh",
            y: "+=2dvh",
        }, 0)
            .to(claimRefs.current[4], {
                scale: 1,
                rotate: "0deg",
                duration: duracion / 2,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "-=2dvh",
                y: "-=2dvh",
            });

        claimAnimation.to(claimRefs.current[3], {
            scale: 0.85,
            rotate: "3deg",
            duration: duracion,
            ease: "power1.inOut",
            delay: 0.2,
            yoyo: true,
            repeat: -1,
            immediateRender: false,
            x: "-=2dvh",
            y: "-=2dvh",
        }, 0)
            .to(claimRefs.current[3], {
                scale: 1,
                rotate: "0deg",
                duration: duracion,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                x: "+=2dvh",
                y: "+=2dvh",
            });

        // Animación de opacidad para los elementos
        const animationOpacity = gsap.timeline();
        animationOpacity
            .to(".lugar .imagen", { opacity: activeCard === "ubicaciones" ? 1 : 0, duration: 1, delay: 0.5, repeat: false, ease: "power1.inOut" }, 0)
            .to(".claim.bus", { opacity: activeCard === "ubicaciones" ? 1 : 0, duration: 1, delay: 0.5, repeat: false, ease: "power1.inOut" }, 0.3)
            .to(".claim.piscina", { opacity: activeCard === "ubicaciones" ? 1 : 0, duration: 1, delay: 0.5, repeat: false, ease: "power1.inOut" }, 0.5)
            .to(".claim.perretes", { opacity: activeCard === "ubicaciones" ? 1 : 0, duration: 1, delay: 0.5, repeat: false, ease: "power1.inOut" }, 0.2)
            .to(".claim.alojamiento", {
                opacity: activeCard === "ubicaciones" ? 1 : 0,
                duration: 1,
                delay: 0.5,
                repeat: false,
                ease: "power1.inOut",
                onComplete: function () {
                    this.kill();
                },
            }, 0.6);

        // console.log(activeCard);
    }, [activeCard]);

    useEffect(() => {
        !visible && gsap.to(".claim, .imagen", { opacity: 0, duration: .2, onStart: () => { setVisible(true) }, onComplete: () => { setActiveCard("sobre"); }, })
    }, [visible]);

    return (
        activeCard === "ubicaciones" && <>
            <div className="lugar seccion">
                <div className="titulo">
                    <h4><h2>Villas de Pomar</h2></h4>
                    <p>(Pedrosillo el Ralo,&nbsp;<b>Salamanca</b>)</p>
                </div>

                <a className="imagen" href={url} target="_blank" rel="noopener noreferrer" ref={mapRef}>
                    <img src={mapa} alt="Mapa del lugar" />
                    <h2>Cómo llegar</h2>
                </a>
                <a target="_blank" href="https://maps.app.goo.gl/VcP5TumYHdV7XPSE9" className="claim bus" ref={(el) => claimRefs.current[1] = el}>
                    <p>
                        { hosteado ?
                        <h4>El autobús saldrá a las 12:00 desde<br></br>El Corte Inglés <em>(aunque no lo necesitas)</em></h4>
                        :
                        <h4>El autobús saldrá a las 12:00 desde<br></br>El Corte Inglés</h4> }
                    </p>
                </a>


                <div className="claim alojamiento" ref={(el) => claimRefs.current[2] = el}>
                    {hosteado ?
                        <p>Si estás leyendo esto, tú y tu +1 tenéis el alojamiento ya reservado en el lugar de la boda (las dos noches)</p>
                        : <p>Os recomendamos buscar casa rural cerca de la finca, pero solo está a unos 12km de la ciudad</p>
                    }
                </div>

                <div className="claim piscina" ref={(el) => claimRefs.current[3] = el}>
                    <p>Hay piscina</p>
                </div>

                <div className="claim perretes" ref={(el) => claimRefs.current[4] = el}>
                    <p>Tu perrete es bienvenido (en caso de necesidad)</p>
                </div>
            </div>

            <button className="back" onClick={() => setVisible(false)} />
        </>
    );
};

export default Lugar;
