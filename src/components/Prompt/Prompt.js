import React, { useEffect, useState } from 'react';
import './Prompt.scss';
import Typewriter from 'typewriter-effect';
import { gsap } from 'gsap';
import animateOpacity from 'components/functions';

const Prompt = ({ weedding, option2=false, isOpen, uri }) => {
    const phrases1 = [
        `¡Hola! Esta web podría ser un PDF...`,
        `Tú lo sabes, yo lo sé. Claro que no hacía falta...`,
        `Pero me hacía una ilusión gordísima hacer algo así para mi boda`,
        `Así que aquí está`,
        `...la web con el código más sucio de la historia`,
        `"NO NOS CUENTES TU VIDA DE PROGRAMADOR VAGO", ok`,
        `Detén esta chapa arrastrando el dedo por la pantalla`,
        `o, en caso de que vayas a ver la web en PC, moviendo el ratón...`,
        `Te recomiendo lo último (o girar el móvil), así luce más, la verdad...`,
        `Repito: Arrastra el dedo por la pantalla`,
        `Porfa porfa please`,
        `¿Porfa please recubierto de nata?`,
        `Que arrastres, te digo...`,
        `¿Qué te pasa?`,
        `ARRASTRA, COÑO`,
        `NO ES TAN DIFÍCIL`,
        `PERO ARRASTRA, ¡¡${weedding ? "SUBNORMAL" : "JOLÍN"}!!`,
        `${weedding ? "Sí, acabo de insultarte mientras te invito a nuestra boda" : 
            "No quiero ser brasas, pero no va a pasar nada interesante hasta que lo hagas"}`,
        `${weedding ? "Tranquis, existe una versión más formalita que será la que vean mis tíos..." : "...¿o sí?"}`,
        `${weedding ? ("Si quieres verla, solo tienes que volver a entrar, pero quita el /"+uri+" en la URL que has recibido") : "Nah... la verdad es que no mucho"}`,
        `Va, arrastra el dedo por la pantalla de una vez...`,
        `Y si has llegado hasta aquí, espero que al menos hayas pulsado el botón para activar el audio`,
        `y, en el caso de PC, al botoncico de ver a pantalla completa`,
        `Podemos estar así todo el día...`,
        `Tooooooodo el día...`,
        `Toooooooooo`,
        `ooooooooooo`,
        `ooooooooooo`,
        `ooooooooooo`,
        `ooooooooodo el día...`,
        `Esto puede durar un par de frases más, o podría aprovechar para trolearte cuanto quiera. Depende de ti.`,
        `Tú sabrás cuánto más quieres quedarte aquí`,
        `...`,
        `En serio. Esto solo es la intro. Toca la pantalla, ¡haz algo!`,
        `¿Sigues aquí?`,
        `Ok, ya te abro yo la web...`,
    ];
    const phrases2 = [
        ``,
        `Esto es todo (por ahora)`,
        `Gracias a los que habéis participado en el testing de la invitación`,
        `especialmente a Sandra, Lu, la Wilka y Gabi`,
        `Por los consejitos de UX (Andrea), y la ilustración de Tesi`,
        `(que obviamente colgaremos en casa de recuerdo)`,
        `Y a Matu, por ayudarme con el hosting, y porque tiene mucha culpa, junto a Gonzalo, de que a estas alturas disfrute tanto de mi trabajo como para meterle estas horas por capricho`,
        `Al final he tardado un cojón más de lo que esperaba`,
        `Pero llevaba más de 20 años sin hacer una web solico y con libertad absoluta, han sido meses muy locos para sacar tiempo, 
        y quería que quedase guapa de verdad`,
        `Me lo he pasado que flipas haciéndola e imaginando como va a ser ese finde`,
        `Y tanto si vienes, como si no...`,
        `ese día se habrá planeado pensando en todos vosotros`,
        `Y ahora, ¿será posible que alargue esta vaina más?`,
        `Ya está todo dicho, ¿no?`,
        `Podría aprovechar a contarte cosas super irrelevantes`,
        `...`,
        `Por ejemplo: ¿te has dado cuenta de que el sobre cerrado se parece a Freezer?`,
        `Lo que me recuerda que esta ni siquiera es la forma final de la web...`,
        `Also, los colores que he usado son los de Namek`,
        `Ha sido puta casualidad, la verdad...`,
        `...`,
        `Os quiero mucho`,
        `Mogollón`,
        `A ti, osillo, más que a nada, y tengo unas ganas locas de que llegue el día`,
        `Qué fuerte tronco, nos vamos a casar...`,
        `¡Nos vemos el 24 de mayo!`,
        `...`,
        `...`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `... mira detrás de ti...`,
        `¡HAY UN MONO CON TRES CABEZAS!`,
        `jejeje...`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡aquí ya no hay nada!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡QUE YA ESTÁ TODO!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
        `¡Apaga el ordenador y vete a la cama!`,
    ];

    useEffect(() => {
        gsap.set(".prompt.inicial", { opacity: 1, duration: 1 });
    }, []);

    return !isOpen && (
        <div className={`prompt ${option2 ? "final" : "inicial"} ${weedding ? "weedding-prompt" : ""}`} >
            <div className="placeholder">
                {/* Texto animado dentro del contenedor que ocupa todo el espacio */}
                { !option2 ? <Typewriter
                    onInit={(typewriter) => {
                        phrases1.forEach((phrase, index) => {
                            typewriter
                                .typeString(phrase)
                                .pauseFor(1500)
                                .callFunction(() => {
                                    if (index < phrases1.length - 1) {
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
                /> : 
                <Typewriter
                    onInit={(typewriter) => {
                        phrases2.forEach((phrase, index) => {
                            typewriter
                                .typeString(phrase)
                                .pauseFor(2500)
                                .callFunction(() => {
                                    if (index < phrases2.length - 1) {
                                        const container = document.querySelector('.Typewriter__wrapper');
                                        if (container) {
                                            container.textContent = ''; // Borra el texto inmediatamente
                                        }
                                    }
                                });
                        });
                        typewriter
                            .callFunction(() => {
                            })
                            .start();
                    }}
                    options={{
                        autoStart: true,
                        loop: false, // No reinicia
                        delay: 25, // Velocidad de escritura
                    }}
                /> }
            </div>
        </div>
    );
};

export default Prompt;
