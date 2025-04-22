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
                        "Número de socio: " + invitado?.id
                    )
                    .pauseFor(500) // Pausa después de escribir una parte
                    .typeString("<br /><br />Pásate cuando quieras. Terraza de la casa grande de madera.")
                    .pauseFor(500) // Pausa después de escribir una parte
                    .typeString("<br /><br />Durante el Tercer Tiempo (al acabar el baile), visita la casita del fondo para probar las delicias de MonkeyCakes")
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
            <div className="regalo seccion clubSecreto">
                {visible ? TypewriterContent() : null}
                <a target="_blank" href="https://chat.whatsapp.com/IEL7BQUSRtzFiF1N5sGUxO">Grupo de whatsApp</a>
            </div>
            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default ClubSecreto;
