import React, { useEffect, useRef, useState } from 'react';
import './Prompt.scss';
import Typewriter from 'typewriter-effect';
import { gsap } from 'gsap';

const Prompt = ({ textos = [], currentTime = 0, duration = 0, typewriterInstanceRef: externalTypewriterRef, isPaused = false }) => {
  const promptRef = useRef(null);
  const typewriterKeyRef = useRef(0);
  const currentTextIndexRef = useRef(-1);
  const [currentTextIndex, setCurrentTextIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isIntentionallyHidden, setIsIntentionallyHidden] = useState(false);
  const internalTypewriterRef = useRef(null);
  const lastShownTextIndexRef = useRef(-1);
  const pausedTextRef = useRef(null); // Guardar el texto parcial cuando se pausa
  
  // Usar el ref externo si se proporciona, sino usar el interno
  const typewriterInstanceRef = externalTypewriterRef || internalTypewriterRef;
  
  // Efecto para pausar/reanudar el typewriter
  useEffect(() => {
    if (isPaused && typewriterInstanceRef.current) {
      // Pausar: guardar el texto actual y detener el typewriter
      try {
        const typewriterElement = document.querySelector('.croquetas25-prompt .Typewriter__wrapper');
        if (typewriterElement) {
          const currentText = typewriterElement.textContent || '';
          // Solo guardar si hay texto (no está vacío)
          if (currentText.length > 0) {
            pausedTextRef.current = currentText;
          }
        }
        // Detener el typewriter usando deleteAll (esto detiene la animación)
        if (typeof typewriterInstanceRef.current.deleteAll === 'function') {
          typewriterInstanceRef.current.deleteAll();
        }
        // Forzar re-render para mostrar el texto pausado
        typewriterKeyRef.current += 1;
      } catch (error) {
        console.warn('[Prompt] Error pausing typewriter:', error);
      }
    } else if (!isPaused && pausedTextRef.current) {
      // Reanudar: forzar re-render para continuar desde el texto pausado
      typewriterKeyRef.current += 1;
    }
  }, [isPaused]);

  // Calcular qué texto mostrar según el tiempo
  const getCurrentTextIndex = () => {
    if (!textos || textos.length === 0 || !duration || duration === 0) {
      return -1;
    }

    // Dividir la duración entre el número de textos
    const timePerText = duration / textos.length;
    
    // Encontrar el índice del texto correspondiente al tiempo actual
    const index = Math.floor(currentTime / timePerText);
    
    // Asegurar que el índice esté dentro del rango válido
    return Math.min(index, textos.length - 1);
  };

  // Efecto para actualizar el índice del texto cuando cambia el tiempo
  useEffect(() => {
    const textIndex = getCurrentTextIndex();
    
    if (textIndex !== currentTextIndexRef.current) {
      currentTextIndexRef.current = textIndex;
      setCurrentTextIndex(textIndex);
      
      // Forzar re-render del typewriter cambiando la key
      typewriterKeyRef.current += 1;
    }
  }, [currentTime, duration, textos.length]);

  // Función para desvanecer el prompt cuando termina de escribir y no hay más texto
  const handleTypewriterComplete = (completedTextIndex) => {
    setIsTyping(false);
    
    // Esperar un momento antes de verificar si desvanecer (para evitar desincronización)
    setTimeout(() => {
      // Verificar el índice actual del texto basado en el tiempo en este momento
      const timePerText = duration > 0 && textos.length > 0 ? duration / textos.length : 0;
      const currentTimeBasedIndex = timePerText > 0 
        ? Math.min(Math.floor(currentTime / timePerText), textos.length - 1)
        : -1;
      
      // Verificar si hay más texto después del que acaba de terminar
      const hasMoreText = currentTimeBasedIndex > completedTextIndex;
      const hasEnded = duration > 0 && currentTime >= duration;
      
      // Solo desvanecer si no hay más texto que mostrar y no ha terminado completamente
      // Y solo si el índice no ha cambiado (para evitar desincronización)
      if (!hasMoreText && !hasEnded && isVisible && promptRef.current && 
          currentTimeBasedIndex === completedTextIndex) {
        gsap.to(promptRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.4,
          ease: 'power2.in'
        });
        setIsIntentionallyHidden(true); // Marcar que fue ocultado intencionalmente
      }
    }, 1000); // Pausa suficiente para asegurar que no hay más texto inmediatamente
  };

  // Efecto para mostrar el prompt cuando cambia el texto (solo si hay texto nuevo y no está pausado)
  useEffect(() => {
    // No actualizar si está pausado
    if (isPaused) return;
    
    const hasText = currentTextIndex >= 0 && currentTextIndex < textos.length;
    const hasEnded = duration > 0 && currentTime >= duration;
    const textIndexChanged = currentTextIndex !== lastShownTextIndexRef.current;
    const isFirstText = lastShownTextIndexRef.current === -1 && currentTextIndex >= 0;
    
    if (hasText && !hasEnded && (textIndexChanged || isFirstText)) {
      // Mostrar si cambió el índice del texto (hay texto nuevo) o es el primer texto
      lastShownTextIndexRef.current = currentTextIndex;
      setIsIntentionallyHidden(false); // Resetear el flag cuando hay texto nuevo
      
      if (promptRef.current) {
        gsap.to(promptRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: 'power2.out'
        });
        setIsVisible(true);
        setIsTyping(true);
      }
    } else if (hasEnded) {
      // Ocultar el prompt cuando terminó completamente el audio
      if (isVisible && promptRef.current && !isTyping) {
        gsap.to(promptRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.4,
          ease: 'power2.in'
        });
        setIsVisible(false);
        setIsIntentionallyHidden(true);
      }
    }
  }, [currentTextIndex, textos.length, isVisible, currentTime, duration, isTyping, isPaused]);

  // Inicializar el prompt
  useEffect(() => {
    if (promptRef.current) {
      gsap.set(promptRef.current, { opacity: 0, y: 20 });
    }
  }, []);

  if (!textos || textos.length === 0) {
    return null;
  }

  const textToShow = currentTextIndex >= 0 && currentTextIndex < textos.length 
    ? textos[currentTextIndex] 
    : '';

  if (!textToShow) {
    return null;
  }

  // No renderizar el typewriter si está pausado y ya hay texto parcial
  const shouldRenderTypewriter = !isPaused || !pausedTextRef.current;

  return (
    <div className="croquetas25-prompt" ref={promptRef}>
      <div className="croquetas25-prompt__placeholder">
        {shouldRenderTypewriter ? (
          <Typewriter
            key={typewriterKeyRef.current} // Forzar re-render cuando cambia el texto
            onInit={(typewriter) => {
              typewriterInstanceRef.current = typewriter;
              setIsTyping(true);
              
              // Si hay texto pausado, continuar desde ahí
              const textToType = pausedTextRef.current 
                ? textos[currentTextIndex]?.substring(pausedTextRef.current.length) || textToShow
                : textToShow;
              
              if (pausedTextRef.current && pausedTextRef.current.length > 0) {
                // Si hay texto pausado, primero mostrar el texto ya escrito
                const placeholder = document.querySelector('.croquetas25-prompt__placeholder');
                if (placeholder) {
                  placeholder.textContent = pausedTextRef.current;
                }
              }
              
              typewriter
                .typeString(textToType)
                .callFunction(() => {
                  // Cuando termina de escribir, verificar si desvanecer
                  // Pasar el índice del texto que acaba de terminar
                  handleTypewriterComplete(currentTextIndex);
                  pausedTextRef.current = null; // Limpiar el texto pausado
                })
                .start();
            }}
            options={{
              autoStart: !isPaused, // No iniciar automáticamente si está pausado
              loop: false,
              delay: 25,
            }}
          />
        ) : (
          // Mostrar el texto pausado mientras está pausado
          <span>{pausedTextRef.current}</span>
        )}
      </div>
    </div>
  );
};

export default Prompt;

