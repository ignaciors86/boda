import React, { useState, useEffect } from 'react';
import './Textos.scss';
import { BLOQUES_TEXTO } from './data';

const BloqueTexto = ({ bloque, audioRef, analyser }) => {
    const [visible, setVisible] = useState(false);
    const [textoActual, setTextoActual] = useState('');
    const [indiceFrase, setIndiceFrase] = useState(0);

    useEffect(() => {
        if (!audioRef.current) return;

        const audioElement = audioRef.current;
        let lastPulseTime = 0;

        const actualizarTexto = () => {
            const tiempoActual = audioElement.currentTime;
            const tiempoRelativo = tiempoActual - bloque.tiempoInicio;
            
            // Verificar si estamos dentro del rango de tiempo de este bloque
            const tiempoFin = bloque.tiempoInicio + bloque.duracionEntreFrases;
            const estaActivo = tiempoActual >= bloque.tiempoInicio && tiempoActual <= tiempoFin;

            if (estaActivo && !visible) {
                setVisible(true);
                setTextoActual('');
                setIndiceFrase(0);
            } else if (!estaActivo && visible) {
                setVisible(false);
                setTextoActual('');
                setIndiceFrase(0);
            }

            if (estaActivo) {
                if (bloque.tipo === 'olivetti' && analyser) {
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(dataArray);
                    const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
                    const intensidadNormalizada = intensidad / 255;

                    if (intensidadNormalizada > 0.15 && tiempoActual - lastPulseTime > 0.05) {
                        lastPulseTime = tiempoActual;
                        const fraseActual = bloque.frases[indiceFrase];
                        if (fraseActual) {
                            const caracteresMostrados = Math.floor(tiempoRelativo * 10);
                            setTextoActual(fraseActual.substring(0, Math.min(caracteresMostrados, fraseActual.length)));
                        }
                    }
                } else if (bloque.tipo === 'starwars') {
                    setTextoActual(bloque.frases.join('\n'));
                } else if (bloque.tipo === 'kamehameha') {
                    setTextoActual(bloque.frases[0]);
                } else {
                    const indiceFraseCalculado = Math.floor(tiempoRelativo / bloque.duracionEntreFrases);
                    if (indiceFraseCalculado !== indiceFrase) {
                        setIndiceFrase(indiceFraseCalculado);
                        const frase = bloque.frases[indiceFraseCalculado];
                        if (frase) {
                            setTextoActual(frase);
                        }
                    }
                }
            }
        };

        const intervalId = setInterval(actualizarTexto, 16);
        audioElement.addEventListener('seeking', actualizarTexto);
        audioElement.addEventListener('seeked', actualizarTexto);

        return () => {
            clearInterval(intervalId);
            audioElement.removeEventListener('seeking', actualizarTexto);
            audioElement.removeEventListener('seeked', actualizarTexto);
        };
    }, [bloque, audioRef, analyser, visible, indiceFrase]);

    if (!visible) return null;

    const getFontStyle = () => {
        return bloque.fuente ? { fontFamily: bloque.fuente } : {};
    };

    const getAnimationStyle = () => {
        return { '--duracion-animacion': `${bloque.duracionEntreFrases}s` };
    };

    return (
        <div 
            className={`bloque-texto ${bloque.tipo || 'default'} visible`}
            style={{...getFontStyle(), ...getAnimationStyle()}}
        >
            {bloque.tipo === 'starwars' ? (
                <p className="frase" style={getFontStyle()}>
                    {textoActual}
                </p>
            ) : (
                bloque.frases.map((frase, index) => (
                    <p 
                        key={index} 
                        className="frase" 
                        style={getFontStyle()}
                    >
                        {index === indiceFrase ? textoActual : 
                         index < indiceFrase ? frase : ''}
                    </p>
                ))
            )}
        </div>
    );
};

const Textos = ({ audioRef, analyser }) => {
    return (
        <div className="textos">
            {BLOQUES_TEXTO.map(bloque => (
                <BloqueTexto 
                    key={bloque.id}
                    bloque={bloque}
                    audioRef={audioRef}
                    analyser={analyser}
                />
            ))}
        </div>
    );
};

export default React.memo(Textos); 