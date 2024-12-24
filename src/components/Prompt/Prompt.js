import React, { useState, useEffect, useRef } from 'react';
import './Prompt.scss';
import animateOpacity from '../functions';
import gsap from 'gsap';
import gsapWithCSS from 'gsap/all';

// Función para detectar si el dispositivo es móvil
const isMobileDevice = () => {
    return /Mobi|Android/i.test(navigator.userAgent);
};

const Prompt = ({weedding}) => {
    const typingSpeed = 15; // Velocidad de escritura ajustada

    const pauseAfterTyping = 1000; // Pausa tras escribir cada frase (milisegundos)
    const pauseBeforeNextScreen = 1000; // Tiempo antes de la siguiente frase (milisegundos)

    const phrases = [
        ``,
        `¡Hola! Esta web podría ser un PDF...\n`,
        `Tú lo sabes, yo lo se. Claro que no hacía falta...\n`,
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
        `${weedding ? "He dejado esto en la versión final porque existe una versión más formalita que será la que vean mis tios...":"...¿o sí?"}\n`,
        `Va, arrastra el dedo por la pantalla de una vez...\n`,
        `Y si has llegado hasta aquí, espero que al menos hayas pulsado el botón para activar el audio\n`,
        `Podemos estar así todo el día...\n`,
        `Tooooooodo el día...\n`,
        `Toooooooooooo\n`,
        `ooooooooooooo\nooooooooooooo\n`,
        `ooooooooooooo\nooooooooooooo\n`,
        `ooooooooooooodo el día...\n`,
        `Esto puede durar un par de frases más, o podría aprovechar para trolearte cuanto quiera. Depende de ti.`,
        `Tu sabrás cuanto más quieres quedarte aquí\n`,
        `...\n`,
        `En serio. Esto solo es la intro. Toca la pantalla, ¡haz algo!\n`,
        `¿Sigues aquí?\n`,
        `Ok, ya te abro yo la web...`,
    ];

    const [displayedText, setDisplayedText] = useState(''); // Texto que se va mostrando
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0); // Índice de la frase actual
    const [letterIndex, setLetterIndex] = useState(0); // Índice de la letra actual
    const [isAnimating, setIsAnimating] = useState(true); // Controlar la animación

    useEffect(() => {
        if(isAnimating){
            const interval = setInterval(() => {
                if (letterIndex < phrases[currentPhraseIndex].length) {
                    setDisplayedText((prev) => prev + phrases[currentPhraseIndex][letterIndex]);
                    setLetterIndex(letterIndex + 1);
                } else {
                    clearInterval(interval);
                    // Pausa antes de cambiar a la siguiente frase
                    setTimeout(() => {
                        setLetterIndex(0);
                        setDisplayedText('');
                        setCurrentPhraseIndex((prevIndex) => {
                            const newIndex = (prevIndex + 1) % phrases.length;
                            if (newIndex === 0) {
                                setIsAnimating(false); // Fin de la animación
                            }
                            return newIndex;
                        });
                    }, pauseAfterTyping);
                }
            }, typingSpeed);
            return () => clearInterval(interval);
        }



    }, [letterIndex, currentPhraseIndex, phrases]);

    useEffect(() => {
        // Ejecutar functionMia cuando todas las frases se han mostrado
        if (!isAnimating && currentPhraseIndex === 0) {
            animateOpacity();
        }
    }, [isAnimating, currentPhraseIndex]);

    useEffect(() => {
        gsapWithCSS.set(".prompt", { opacity: 1, duration: 1,})
    }, []);


    return (
        <div className="prompt">
            {/* Contenedor que establece el tamaño final */}
            <div className="placeholder">
                {phrases[currentPhraseIndex]}

                {/* Texto animado dentro del contenedor que ocupa todo el espacio */}
                <div className="typing-wrapper">
                    <div className="typing">
                        {displayedText}
                        {/* <span>|</span>  */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Prompt;
