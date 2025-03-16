import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Textos.scss';
import { BLOQUES_TEXTO } from './data';

const Textos = ({ audioRef }) => {
    const [textosMostrados, setTextosMostrados] = useState({});
    const [bloqueActivo, setBloqueActivo] = useState(null);
    const lastUpdateRef = useRef(0);
    const textosRef = useRef({});

    const actualizarTextos = useCallback((tiempoActual) => {
        const nuevosTextos = { ...textosRef.current };
        let hayCambios = false;
        let nuevoBloqueActivo = null;

        // Encontrar el bloque activo
        BLOQUES_TEXTO.forEach(bloque => {
            const tiempoFinBloque = bloque.tiempoInicio + (bloque.frases.length * bloque.duracionEntreFrases);
            
            if (tiempoActual >= bloque.tiempoInicio && tiempoActual <= tiempoFinBloque) {
                nuevoBloqueActivo = bloque;
            }
        });

        // Actualizar el bloque activo
        if (nuevoBloqueActivo) {
            const tiempoRelativo = tiempoActual - nuevoBloqueActivo.tiempoInicio;
            
            nuevoBloqueActivo.frases.forEach((texto, index) => {
                const key = `${nuevoBloqueActivo.id}-${index}`;
                const tiempoInicioFrase = index * nuevoBloqueActivo.duracionEntreFrases;
                const tiempoFinFrase = tiempoInicioFrase + nuevoBloqueActivo.duracionEntreFrases;
                
                if (tiempoRelativo >= tiempoInicioFrase && tiempoRelativo <= tiempoFinFrase) {
                    let textoFinal = '';
                    if (nuevoBloqueActivo.olivetti) {
                        const tiempoTranscurridoEnFrase = tiempoRelativo - tiempoInicioFrase;
                        if (tiempoTranscurridoEnFrase < nuevoBloqueActivo.duracionEntreFrases) {
                            const progreso = tiempoTranscurridoEnFrase / nuevoBloqueActivo.duracionEntreFrases;
                            const caracteresVisibles = Math.floor(progreso * texto.length);
                            textoFinal = texto.substring(0, caracteresVisibles);
                        } else {
                            textoFinal = texto;
                        }
                    } else {
                        textoFinal = texto;
                    }

                    if (textosRef.current[key] !== textoFinal) {
                        nuevosTextos[key] = textoFinal;
                        hayCambios = true;
                    }
                }
            });
        }

        if (hayCambios || bloqueActivo !== nuevoBloqueActivo) {
            textosRef.current = nuevosTextos;
            setTextosMostrados(nuevosTextos);
            setBloqueActivo(nuevoBloqueActivo);
        }
    }, [bloqueActivo]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handleTimeUpdate = () => {
            const tiempoActual = audioElement.currentTime;
            
            // Evitamos actualizaciones muy frecuentes
            if (tiempoActual - lastUpdateRef.current < 0.016) return;
            lastUpdateRef.current = tiempoActual;

            actualizarTextos(tiempoActual);
        };

        const handleSeeking = () => {
            lastUpdateRef.current = 0;
            textosRef.current = {};
            setTextosMostrados({});
            setBloqueActivo(null);
            actualizarTextos(audioElement.currentTime);
        };

        audioElement.addEventListener("timeupdate", handleTimeUpdate);
        audioElement.addEventListener("seeking", handleSeeking);
        audioElement.addEventListener("seeked", handleTimeUpdate);

        // Inicialización
        handleTimeUpdate();

        return () => {
            audioElement.removeEventListener("timeupdate", handleTimeUpdate);
            audioElement.removeEventListener("seeking", handleSeeking);
            audioElement.removeEventListener("seeked", handleTimeUpdate);
        };
    }, [audioRef, actualizarTextos]);

    if (!bloqueActivo) return null;

    return (
        <div className="textos">
            <div className="bloque-texto">
                {bloqueActivo.frases.map((texto, index) => (
                    <p key={`${bloqueActivo.id}-${index}`} className="frase">
                        {textosMostrados[`${bloqueActivo.id}-${index}`] || ''}
                    </p>
                ))}
            </div>
        </div>
    );
};

export default React.memo(Textos); 