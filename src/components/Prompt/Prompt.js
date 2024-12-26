import React, { useEffect } from 'react';
import './Prompt.scss';
import Typewriter from 'typewriter-effect';
import gsapWithCSS from 'gsap/all';

const Prompt = ({ weedding }) => {
    const phrases = [
        ``,
        `¡Hola! Esta web podría ser un PDF...\n`,
        `Tú lo sabes, yo lo sé. Claro que no hacía falta...\n`,
        `Pero me hacía una ilusión gordísima hacer algo así para mi boda\n`,
        `Así que aquí está\n`,
        `...la web con el código más sucio de la historia\n`,
        `"NO NOS CUENTES TU VIDA DE PROGRAMADOR VAGO", ok\n`,
        `🛑 Detén esta chapa arrastrando el dedo por la pantalla\n`,
        `Repito: Arrastra el dedo por la pantalla\n`,
        `Porfa porfa please 😊\n`,
        `¿Porfa please recubierto de nata?\n`,
        `Que arrastres, te digo...\n`,
        `¿Qué te pasa?\n`,
        `ARRASTRA, COÑO\n`,
        `NO ES TAN DIFÍCIL\n`,
        `PERO ARRASTRA, ¡¡${weedding ? "SUBNORMAL" : "JOLÍN"}!!\n`,
        `${weedding ? "Sí, acabo de insultarte mientras te invito a nuestra boda" : "No es que quiera ponerme impaciente, pero no va a pasar nada interesante hasta que lo hagas"}\n`,
        `${weedding ? "He dejado esto en la versión final porque existe una versión más formalita que será la que vean mis tíos..." : "...¿o sí?"}\n`,
        `Va, arrastra el dedo por la pantalla de una vez...\n`,
        `Y si has llegado hasta aquí, espero que al menos hayas pulsado el botón para activar el audio\n`,
        `Podemos estar así todo el día...\n`,
        `Tooooooodo el día...\n`,
        `Toooooooooooo\n`,
        `ooooooooooooo\nooooooooooooo\n`,
        `ooooooooooooo\nooooooooooooo\n`,
        `ooooooooooooodo el día...\n`,
        `Esto puede durar un par de frases más, o podría aprovechar para trolearte cuanto quiera. Depende de ti.`,
        `Tú sabrás cuánto más quieres quedarte aquí\n`,
        `...\n`,
        `En serio. Esto solo es la intro. Toca la pantalla, ¡haz algo!\n`,
        `¿Sigues aquí?\n`,
        `Ok, ya te abro yo la web...`,
    ];

    useEffect(() => {
        gsapWithCSS.set(".prompt", { opacity: 1, duration: 1, })
    }, []);

    return (
        <div className="prompt">
            <div className="placeholder">
                {/* Texto animado dentro del contenedor que ocupa todo el espacio */}
                <Typewriter
                    options={{
                        strings: phrases,
                        autoStart: true,
                        loop: true, // Cambia esto a false si no quieres que reinicie.
                        delay: 25, // Velocidad de escritura
                        deleteSpeed: 1, // Velocidad de borrado
                        pauseFor: 1500, // Pausa entre frases
                    }}
                />
            </div>
        </div>
    );
};

export default Prompt;
