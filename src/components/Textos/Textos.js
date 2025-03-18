import React, { useState, useEffect, useRef } from 'react';
import './Textos.scss';
import { BLOQUES_TEXTO } from './data';

const Textos = ({ audioRef, analyser }) => {
    const [textoActual, setTextoActual] = useState('');
    const [indiceFrase, setIndiceFrase] = useState(0);
    const [bloqueActual, setBloqueActual] = useState(null);
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const lastPulseRef = useRef(0);
    const caracteresRef = useRef(0);
    const lastTimeRef = useRef(0);
    const tiempoFinRef = useRef(0);
    const bloqueAnteriorRef = useRef(null);

    const calcularCaracteresSegunTiempo = (tiempoActual, bloque) => {
        const tiempoRelativoEnBloque = tiempoActual - bloque.tiempoInicio;
        const indiceFraseCalculado = Math.floor(tiempoRelativoEnBloque / bloque.duracionEntreFrases);
        
        if (indiceFraseCalculado !== indiceFrase) {
            setIndiceFrase(indiceFraseCalculado);
            caracteresRef.current = 0;
            setTextoActual('');
            return;
        }
    };

    useEffect(() => {
        if (!audioRef.current || !analyser) return;

        const audioElement = audioRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const handleSeek = () => {
            const tiempoActual = audioElement.currentTime;
            if (Math.abs(tiempoActual - lastTimeRef.current) > 0.1) {
                const bloque = BLOQUES_TEXTO.find(b => {
                    return tiempoActual >= b.tiempoInicio && 
                           tiempoActual <= (b.tiempoInicio + b.duracionEntreFrases * b.frases.length);
                });

                if (bloque) {
                    if (bloqueAnteriorRef.current?.id !== bloque.id) {
                        setBloqueActual(bloque);
                        setVisible(true);
                        setFadeOut(false);
                        calcularCaracteresSegunTiempo(tiempoActual, bloque);
                        tiempoFinRef.current = bloque.tiempoInicio + (bloque.duracionEntreFrases * bloque.frases.length);
                        bloqueAnteriorRef.current = bloque;
                    }
                } else {
                    setBloqueActual(null);
                    setVisible(false);
                    setFadeOut(false);
                    setTextoActual('');
                    caracteresRef.current = 0;
                    setIndiceFrase(0);
                    bloqueAnteriorRef.current = null;
                }
            }
            lastTimeRef.current = tiempoActual;
        };

        const actualizarTexto = () => {
            const tiempoActual = audioElement.currentTime;
            handleSeek();

            const bloque = BLOQUES_TEXTO.find(b => {
                return tiempoActual >= b.tiempoInicio && 
                       tiempoActual <= (b.tiempoInicio + b.duracionEntreFrases * b.frases.length);
            });

            // Si estamos cerca del final del bloque actual, iniciamos el desvanecimiento
            if (bloqueActual && tiempoActual >= tiempoFinRef.current - 0.5) {
                setVisible(false);
                if (bloqueActual.tipo === 'starwars') {
                    setFadeOut(true);
                }
            }

            if (!bloque) {
                if (bloqueActual) {
                    setBloqueActual(null);
                    setVisible(false);
                    setFadeOut(false);
                    setTextoActual('');
                    caracteresRef.current = 0;
                    setIndiceFrase(0);
                    bloqueAnteriorRef.current = null;
                }
                return;
            }

            if (!bloqueActual || bloqueActual.id !== bloque.id) {
                if (bloqueAnteriorRef.current?.id !== bloque.id) {
                    setBloqueActual(bloque);
                    setVisible(true);
                    setFadeOut(false);
                    setTextoActual('');
                    caracteresRef.current = 0;
                    setIndiceFrase(0);
                    lastPulseRef.current = tiempoActual;
                    tiempoFinRef.current = bloque.tiempoInicio + (bloque.duracionEntreFrases * bloque.frases.length);
                    bloqueAnteriorRef.current = bloque;
                }
                return;
            }

            if (bloque.tipo === 'olivetti') {
                analyser.getByteFrequencyData(dataArray);
                const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
                const intensidadNormalizada = intensidad / 255;

                const MIN_TIEMPO_ENTRE_PULSOS = 0.05;
                const UMBRAL_PULSO = 0.15;

                if (intensidadNormalizada > UMBRAL_PULSO && 
                    tiempoActual - lastPulseRef.current > MIN_TIEMPO_ENTRE_PULSOS) {
                    lastPulseRef.current = tiempoActual;

                    const fraseActual = bloque.frases[indiceFrase];
                    if (!fraseActual) return;

                    if (caracteresRef.current < fraseActual.length) {
                        caracteresRef.current++;
                        setTextoActual(fraseActual.substring(0, caracteresRef.current));
                    } else if (indiceFrase < bloque.frases.length - 1) {
                        setIndiceFrase(prev => prev + 1);
                        caracteresRef.current = 0;
                        setTextoActual('');
                    }
                }
            } else if (bloque.tipo === 'default' || bloque.tipo === 'parpadeo') {
                const fraseActual = bloque.frases[indiceFrase];
                if (fraseActual && textoActual !== fraseActual) {
                    setTextoActual(fraseActual);
                }
            }
        };

        const intervalId = setInterval(actualizarTexto, 8);

        audioElement.addEventListener('seeking', handleSeek);
        audioElement.addEventListener('seeked', handleSeek);

        return () => {
            clearInterval(intervalId);
            audioElement.removeEventListener('seeking', handleSeek);
            audioElement.removeEventListener('seeked', handleSeek);
        };
    }, [audioRef, analyser, bloqueActual, indiceFrase]);

    if (!bloqueActual) return null;

    const getFontStyle = () => {
        if (bloqueActual.fuente) {
            return { fontFamily: bloqueActual.fuente };
        }
        return {};
    };

    return (
        <div className="textos">
            <div 
                className={`bloque-texto ${bloqueActual.tipo} ${visible ? 'visible' : ''} ${fadeOut ? 'fade-out' : ''}`}
                style={getFontStyle()}
            >
                {bloqueActual.tipo === 'starwars' ? (
                    bloqueActual.frases.map((frase, index) => (
                        <p key={index} className="frase" style={getFontStyle()}>{frase}</p>
                    ))
                ) : (
                    bloqueActual.frases.map((frase, index) => (
                        <p key={index} className="frase" style={getFontStyle()}>
                            {index === indiceFrase ? textoActual : 
                             index < indiceFrase ? frase : ''}
                        </p>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(Textos); 