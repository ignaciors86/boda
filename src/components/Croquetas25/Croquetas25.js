import React, { useState, useRef, useEffect } from 'react';
import './Croquetas25.scss';
import Background from './components/Background/Background';
import AudioAnalyzer from './components/AudioAnalyzer/AudioAnalyzer';
import Seek from './components/Seek/Seek';
import LoadingIndicator from './components/LoadingIndicator/LoadingIndicator';
import { AudioProvider, useAudio } from './context/AudioContext';
import audioSrc from './assets/audio/lodo.mp3';

const LoadingProgressHandler = ({ onTriggerCallbackRef }) => {
  const { loadingProgress, isLoaded } = useAudio();
  const lastProgressRef = useRef(0);

  useEffect(() => {
    const hasCallback = !!onTriggerCallbackRef;
    const hasCallbackCurrent = !!(onTriggerCallbackRef && onTriggerCallbackRef.current);
    console.log(`[LoadingProgressHandler] useEffect triggered | loadingProgress: ${loadingProgress} | isLoaded: ${isLoaded} | lastProgress: ${lastProgressRef.current} | hasCallback: ${hasCallback} | hasCallbackCurrent: ${hasCallbackCurrent}`);
    
    if (!onTriggerCallbackRef || !onTriggerCallbackRef.current) {
      console.warn(`[LoadingProgressHandler] Missing callback ref | onTriggerCallbackRef: ${!!onTriggerCallbackRef} | current: ${!!(onTriggerCallbackRef && onTriggerCallbackRef.current)}`);
      return;
    }
    if (isLoaded) {
      console.log(`[LoadingProgressHandler] Audio already loaded, skipping progress trigger`);
      return;
    }

    const progressDiff = loadingProgress - lastProgressRef.current;
    const shouldTrigger = progressDiff >= 5 || (progressDiff > 0 && loadingProgress > 0 && lastProgressRef.current === 0);
    
    console.log(`[LoadingProgressHandler] Progress check | progressDiff: ${progressDiff} | shouldTrigger: ${shouldTrigger} | condition1 (>=5): ${progressDiff >= 5} | condition2 (initial): ${progressDiff > 0 && loadingProgress > 0 && lastProgressRef.current === 0}`);
    
    // Generar cuadro cada 5% de progreso o cuando hay un salto significativo
    if (shouldTrigger) {
      try {
        console.log(`[LoadingProgressHandler] Triggering progress square | progress: ${loadingProgress} | progressDiff: ${progressDiff}`);
        onTriggerCallbackRef.current('progress', { 
          progress: loadingProgress,
          progressDiff 
        });
        lastProgressRef.current = loadingProgress;
        console.log(`[LoadingProgressHandler] Progress trigger executed successfully | new lastProgress: ${lastProgressRef.current}`);
      } catch (error) {
        console.error(`[LoadingProgressHandler] ERROR triggering progress: ${error.message} | stack: ${error.stack} | error object: ${JSON.stringify({ name: error.name, message: error.message })}`);
      }
    }
  }, [loadingProgress, isLoaded, onTriggerCallbackRef]);

  return null;
};

const Croquetas25 = () => {
  const [audioStarted, setAudioStarted] = useState(false);
  const triggerCallbackRef = useRef(null);
  const voiceCallbackRef = useRef(null);
  const lastSquareTimeRef = useRef(0);
  const minTimeBetweenSquares = 600; // Tiempo mínimo entre cuadros: 0.6 segundos (muy reducido para máxima frecuencia)

  const handleClick = () => {
    console.log(`[Croquetas25] handleClick called | audioStarted: ${audioStarted} | triggerCallbackRef.current exists: ${!!triggerCallbackRef.current} | timestamp: ${Date.now()}`);
    if (!audioStarted) {
      console.log(`[Croquetas25] Setting audioStarted to true | audioSrc: ${audioSrc} | triggerCallbackRef: ${JSON.stringify({ hasCurrent: !!triggerCallbackRef.current })}`);
      setAudioStarted(true);
    } else {
      console.log(`[Croquetas25] Audio already started, ignoring click`);
    }
  };

  const lastDiagonalTimeRef = useRef(0);
  const minTimeBetweenDiagonals = 30000; // 30 segundos - mucho menos frecuente

  const handleBeat = (intensity = 0.5, shouldBeSolid = false) => {
    const timestamp = Date.now();
    const timeSinceLastSquare = timestamp - lastSquareTimeRef.current;
    
    // Generar cuadros (con tiempo mínimo entre cuadros)
    if (timeSinceLastSquare >= minTimeBetweenSquares) {
      if (triggerCallbackRef.current) {
        try {
          triggerCallbackRef.current('beat', { timestamp, intensity, shouldBeSolid });
          lastSquareTimeRef.current = timestamp;
        } catch (error) {
          console.error(`[Croquetas25] handleBeat ERROR: ${error.message}`);
        }
      }
    }
    
    // Generar diagonales (con tiempo mínimo mucho menor para más frecuencia)
    const timeSinceLastDiagonal = timestamp - lastDiagonalTimeRef.current;
    
    if (timeSinceLastDiagonal >= minTimeBetweenDiagonals) {
      // El callback está directamente en voiceCallbackRef.current, no en voiceCallbackRef.current.current
      if (voiceCallbackRef.current && typeof voiceCallbackRef.current === 'function') {
        try {
          console.log(`[Croquetas25] Calling diagonal callback from beat | intensity: ${intensity}`);
          voiceCallbackRef.current(intensity, 0);
          lastDiagonalTimeRef.current = timestamp;
        } catch (error) {
          console.error(`[Croquetas25] handleBeat diagonal callback ERROR: ${error.message} | stack: ${error.stack}`);
        }
      } else {
        console.warn(`[Croquetas25] Cannot call diagonal callback | voiceCallbackRef.current exists: ${!!voiceCallbackRef.current} | is function: ${!!(voiceCallbackRef.current && typeof voiceCallbackRef.current === 'function')}`);
      }
    }
  };

  const handleVoice = (intensity = 0.5, voiceEnergy = 0) => {
    // Llamar directamente al callback de diagonales
    // El callback está directamente en voiceCallbackRef.current, no en voiceCallbackRef.current.current
    if (voiceCallbackRef.current && typeof voiceCallbackRef.current === 'function') {
      try {
        console.log(`[Croquetas25] Calling voice callback for diagonals | intensity: ${intensity} | voiceEnergy: ${voiceEnergy}`);
        voiceCallbackRef.current(intensity, voiceEnergy);
      } catch (error) {
        console.error(`[Croquetas25] handleVoice diagonal callback ERROR: ${error.message} | stack: ${error.stack}`);
      }
    }
    
    // También llamar al callback de cuadros si existe (con control de frecuencia)
    const timestamp = Date.now();
    const timeSinceLastSquare = timestamp - lastSquareTimeRef.current;
    
    if (timeSinceLastSquare >= minTimeBetweenSquares) {
      if (triggerCallbackRef.current) {
        try {
          triggerCallbackRef.current('voice', { timestamp, intensity, voiceEnergy });
          lastSquareTimeRef.current = timestamp;
        } catch (error) {
          console.error(`[Croquetas25] handleVoice square callback ERROR: ${error.message}`);
        }
      }
    }
  };

  return (
    <div className="croquetas25" onClick={handleClick}>
      {audioStarted ? (
        <AudioProvider audioSrc={audioSrc}>
          <BackgroundWrapper onTriggerCallbackRef={triggerCallbackRef} onVoiceCallbackRef={voiceCallbackRef} />
                 <LoadingProgressHandler onTriggerCallbackRef={triggerCallbackRef} />
                 <LoadingIndicator />
                 <AudioAnalyzer onBeat={handleBeat} onVoice={handleVoice} />
                 <SeekWrapper />
        </AudioProvider>
      ) : (
        <Background onTriggerCallbackRef={triggerCallbackRef} />
      )}
    </div>
  );
};

// Wrapper para Background que tiene acceso al contexto de audio
const BackgroundWrapper = ({ onTriggerCallbackRef, onVoiceCallbackRef }) => {
  const { analyserRef, dataArrayRef, isInitialized } = useAudio();
  
  return (
    <Background 
      onTriggerCallbackRef={onTriggerCallbackRef}
      onVoiceCallbackRef={onVoiceCallbackRef}
      analyserRef={analyserRef}
      dataArrayRef={dataArrayRef}
      isInitialized={isInitialized}
    />
  );
};

// Componente wrapper para Seek que necesita los squares
const SeekWrapper = () => {
  const [squares, setSquares] = useState([]);
  const squaresRef = useRef([]);
  
  // Escuchar cambios en los squares del Background
  useEffect(() => {
    const checkSquares = () => {
      // Buscar elementos square en el DOM
      const squareElements = document.querySelectorAll('.square');
      const currentSquares = Array.from(squareElements).map((el, index) => ({
        id: el.getAttribute('data-square-id') || `square-${index}`,
        gradient: {
          color1: getComputedStyle(el).getPropertyValue('--square-color-1') || '#00ffff',
          color2: getComputedStyle(el).getPropertyValue('--square-color-2') || '#00ffff'
        }
      }));
      
      if (currentSquares.length !== squaresRef.current.length || 
          currentSquares.length > 0 && currentSquares[0].gradient.color1 !== squaresRef.current[0]?.gradient?.color1) {
        squaresRef.current = currentSquares;
        setSquares([...currentSquares]);
      }
    };
    
    const interval = setInterval(checkSquares, 100);
    return () => clearInterval(interval);
  }, []);
  
  return <Seek squares={squaresRef.current} />;
};

export default Croquetas25;

