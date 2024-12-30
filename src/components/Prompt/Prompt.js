import React, { useEffect } from 'react';
import './Prompt.scss';
import Typewriter from 'typewriter-effect';
import { gsap } from 'gsap';
import animateOpacity from 'components/functions';

const Prompt = ({ weedding }) => {
    const phrases = [
        `¡Hola! Esta web podría ser un PDF...`,
        `Tú lo sabes, yo lo sé. Claro que no hacía falta...`,
        `Pero me hacía una ilusión gordísima hacer algo así para mi boda`,
        `Así que aquí está`,
        `...la web con el código más sucio de la historia`,
        `"NO NOS CUENTES TU VIDA DE PROGRAMADOR VAGO", ok`,
        `Detén esta chapa arrastrando el dedo por la pantalla`,
        `Repito: Arrastra el dedo por la pantalla`,
        `Porfa porfa please 😊`,
        `¿Porfa please recubierto de nata?`,
        `Que arrastres, te digo...`,
        `¿Qué te pasa?`,
        `ARRASTRA, COÑO`,
        `NO ES TAN DIFÍCIL`,
        `PERO ARRASTRA, ¡¡${weedding ? "SUBNORMAL" : "JOLÍN"}!!`,
        `${weedding ? "Sí, acabo de insultarte mientras te invito a nuestra boda" : "No es que quiera ponerme impaciente, pero no va a pasar nada interesante hasta que lo hagas"}`,
        `${weedding ? "He dejado esto en la versión final porque existe una versión más formalita que será la que vean mis tíos..." : "...¿o sí?"}`,
        `Va, arrastra el dedo por la pantalla de una vez...`,
        `Y si has llegado hasta aquí, espero que al menos hayas pulsado el botón para activar el audio`,
        `Podemos estar así todo el día...`,
        `Tooooooodo el día...`,
        `Toooooooooooo`,
        `ooooooooooooo\nooooooooooooo`,
        `ooooooooooooo\nooooooooooooo`,
        `ooooooooooooodo el día...`,
        `Esto puede durar un par de frases más, o podría aprovechar para trolearte cuanto quiera. Depende de ti.`,
        `Tú sabrás cuánto más quieres quedarte aquí`,
        `...`,
        `En serio. Esto solo es la intro. Toca la pantalla, ¡haz algo!`,
        `¿Sigues aquí?`,
        `Ok, ya te abro yo la web...`,
    ];

    useEffect(() => {
        gsap.set(".prompt", { opacity: 1, duration: 1 });
    }, []);

    return (
        <div className="prompt">
            <div className="placeholder">
                {/* Texto animado dentro del contenedor que ocupa todo el espacio */}
                <Typewriter
                    onInit={(typewriter) => {
                        phrases.forEach((phrase, index) => {
                            typewriter
                                .typeString(phrase)
                                .pauseFor(1500)
                                .callFunction(() => {
                                    if (index < phrases.length - 1) {
                                        const container = document.querySelector('.Typewriter__wrapper');
                                        if (container) {
                                            container.textContent = ''; // Borra el texto inmediatamente
                                        }
                                    }
                                });
                        });
                        typewriter
                            .callFunction(() => {
                                animateOpacity(); // Ejecuta el callback aquí
                            })
                            .start();
                    }}
                    options={{
                        autoStart: true,
                        loop: false, // No reinicia
                        delay: 25, // Velocidad de escritura
                    }}
                />
            </div>
        </div>
    );
};

export default Prompt;
