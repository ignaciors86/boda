import React, { useEffect, useState } from "react";
import "./ClubSecreto.scss";
import { useDragContext } from "components/DragContext";
import Typewriter from "typewriter-effect"; // Importa el Typewriter

const ClubSecreto = ({invitado}) => {
    const { activeCard, setActiveCard } = useDragContext();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        console.log(invitado.id)
    }, []);


    useEffect(() => {
        activeCard !== "regalo" ? setVisible(false)
        : setTimeout(() => {
            setVisible(true);
        }, 1000);
    }, [activeCard]);
    const TypewriterContent = () => (
        <Typewriter
            onInit={(typewriter) => {
                typewriter
                    .typeString(
                        "Pásate cuando quieras. Terraza de la casa blanca."
                    )
                    .pauseFor(500)
                    .typeString("<br /><br />Especialmente en elTercer Tiempo (al acabar el baile)")
                    .start();
            }}
            options={{
                autoStart: true,
                loop: false,
                delay: 25,
            }}
        />
    );

    return (
        <>
            <div className="regalo seccion clubSecreto">
                {/* <div style={{fontSize: '2.2em', marginBottom: '0.2em'}}>🌿</div> */}
                <div className="numero-socio">
                    Número de socio: {invitado?.id}
                </div>
                {visible ? <div className="typewriter"><TypewriterContent /></div> : null}
                <a target="_blank" href="https://chat.whatsapp.com/IEL7BQUSRtzFiF1N5sGUxO" rel="noopener noreferrer">
                    <span role="img" aria-label="whatsapp">💬</span> Grupo de WhatsApp
                </a>
            </div>
            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default ClubSecreto;
