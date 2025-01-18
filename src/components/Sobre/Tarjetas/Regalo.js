import React, { useEffect, useState } from "react";
import "./Regalo.scss";
import regalo from "../assets/images/Gift_box_present-512.webp";
import { useDragContext } from "components/DragContext";
import AccountInput from "./Regalo/AccountInput";
import Typewriter from "typewriter-effect"; // Importa el Typewriter

const Regalo = () => {
    const { activeCard, setActiveCard } = useDragContext();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        
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
                        "Agradeceremos vuestra ayuda y cada penique recibido aliviará la hostia de la boda. Vamos a emplearlo en que la disfrutéis al máximo."
                    )
                    .pauseFor(500) // Pausa después de escribir una parte
                    .typeString("<br /><br />Y si alguien muy cercano se plantea no asistir por cuestiones económicas, que nos lo diga en confianza, por favor.")
                    .start();
            }}
            options={{
                autoStart: true,
                loop: false, // No repetir la animación
                delay: 25, // Velocidad de escritura
                // cursor: "", // Elimina el cursor al finalizar
            }}
        />
    );

    return (
        <>
            <div className="regalo seccion">
                <img src={regalo} alt="Imagen 1" />
                <em>
                {visible ? TypewriterContent() : null}
                </em>
                <AccountInput />
            </div>
            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default Regalo;
