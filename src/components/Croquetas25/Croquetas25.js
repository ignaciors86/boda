import React, { useState, useRef, useEffect } from 'react';
import './Croquetas25.scss';
import Background from './components/Background/Background';
import AudioAnalyzer from './components/AudioAnalyzer/AudioAnalyzer';
import Seek from './components/Seek/Seek';
import LoadingIndicator from './components/LoadingIndicator/LoadingIndicator';
import Intro from './components/Intro/Intro';
import { AudioProvider, useAudio } from './context/AudioContext';
import { useGallery } from './components/Gallery/Gallery';
import { useTracks } from './hooks/useTracks';
import Prompt from './components/Prompt/Prompt';

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
  const [selectedTrack, setSelectedTrack] = useState(null); // null = mostrar selector
  const triggerCallbackRef = useRef(null);
  const voiceCallbackRef = useRef(null);
  const lastSquareTimeRef = useRef(0);
  const minTimeBetweenSquares = 600; // Tiempo mínimo entre cuadros: 0.6 segundos (muy reducido para máxima frecuencia)
  
  // Cargar tracks automáticamente desde carpetas
  const { tracks, isLoading: tracksLoading } = useTracks();
  
  // Precargar imágenes del track seleccionado (o todas si no hay track seleccionado)
  const { isLoading: imagesLoading, preloadProgress: imagesProgress } = useGallery(selectedTrack);

  // Calcular el src del audio del track seleccionado
  const currentAudioSrc = selectedTrack?.src;
  
  // Estado para rastrear la carga del audio
  const [audioLoadingProgress, setAudioLoadingProgress] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const handleTrackSelect = (track) => {
    console.log(`[Croquetas25] Track selected: ${track.name}`, track);
    setSelectedTrack(track);
    // Resetear estados de carga
    setAudioLoadingProgress(0);
    setIsAudioReady(false);
    setAudioStarted(false);
  };

  // Monitorear la carga del audio cuando se selecciona un track
  useEffect(() => {
    if (!selectedTrack || !currentAudioSrc) {
      setIsAudioReady(false);
      setAudioLoadingProgress(0);
      return;
    }

    // Crear un elemento audio temporal para precargar
    const audio = new Audio(currentAudioSrc);
    audio.preload = 'auto';
    
    const updateAudioProgress = () => {
      if (audio.buffered.length > 0 && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const progress = Math.min((bufferedEnd / audio.duration) * 100, 100);
        setAudioLoadingProgress(progress);
        
        if (progress >= 95 || bufferedEnd >= audio.duration * 0.95) {
          setIsAudioReady(true);
          setAudioLoadingProgress(100);
        }
      } else if (audio.readyState >= 2) {
        let progress = 0;
        if (audio.readyState === 2) progress = 25;
        else if (audio.readyState === 3) progress = 75;
        else if (audio.readyState === 4) progress = 100;
        
        setAudioLoadingProgress(progress);
        if (audio.readyState >= 4) {
          setIsAudioReady(true);
          setAudioLoadingProgress(100);
        }
      }
    };

    const progressInterval = setInterval(updateAudioProgress, 100);
    
    audio.addEventListener('canplaythrough', () => {
      setIsAudioReady(true);
      setAudioLoadingProgress(100);
      clearInterval(progressInterval);
    });

    audio.addEventListener('error', () => {
      console.warn('[Croquetas25] Error al precargar audio');
      setIsAudioReady(true); // Continuar aunque haya error
      setAudioLoadingProgress(100);
      clearInterval(progressInterval);
    });

    // Iniciar la carga
    audio.load();

    return () => {
      clearInterval(progressInterval);
      audio.removeEventListener('canplaythrough', () => {});
      audio.removeEventListener('error', () => {});
    };
  }, [selectedTrack, currentAudioSrc]);

  // Calcular progreso combinado (imágenes + audio)
  const combinedProgress = selectedTrack 
    ? Math.round((imagesProgress + audioLoadingProgress) / 2)
    : imagesProgress;

  // Iniciar audio automáticamente cuando tanto las imágenes como el audio estén listos
  // IMPORTANTE: Esperar a que imagesLoading sea false Y preloadProgress sea 100
  useEffect(() => {
    if (selectedTrack && !imagesLoading && imagesProgress >= 100 && isAudioReady && currentAudioSrc && !audioStarted) {
      console.log(`[Croquetas25] Imágenes (${imagesProgress}%) y audio cargados, iniciando reproducción para: ${selectedTrack.name}`);
      setAudioStarted(true);
    }
  }, [selectedTrack, imagesLoading, imagesProgress, isAudioReady, currentAudioSrc, audioStarted]);

  const handleClick = () => {
    console.log(`[Croquetas25] handleClick called | audioStarted: ${audioStarted} | triggerCallbackRef.current exists: ${!!triggerCallbackRef.current} | timestamp: ${Date.now()}`);
    if (!audioStarted && selectedTrack) {
      console.log(`[Croquetas25] Setting audioStarted to true | audioSrc: ${selectedTrack.src} | triggerCallbackRef: ${JSON.stringify({ hasCurrent: !!triggerCallbackRef.current })}`);
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
      {/* Mostrar indicador de carga mientras se cargan los tracks */}
      {tracksLoading && (
        <div className="image-preloader">
          <div className="image-preloader__content">
            <div className="image-preloader__text">Cargando canciones...</div>
          </div>
        </div>
      )}
      
      {/* Mostrar indicador de carga mientras se precargan las imágenes y el audio */}
      {!tracksLoading && selectedTrack && (imagesLoading || !isAudioReady) && (
        <div className="image-preloader">
          <div className="image-preloader__content">
            <div className="image-preloader__text">
              {imagesLoading && !isAudioReady 
                ? 'Cargando imágenes y audio...' 
                : imagesLoading 
                  ? 'Cargando imágenes...' 
                  : 'Cargando audio...'}
            </div>
            <div className="image-preloader__bar">
              <div 
                className="image-preloader__fill" 
                style={{ width: `${combinedProgress}%` }}
              />
            </div>
            <div className="image-preloader__percentage">
              {combinedProgress}%
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay de selección de canción - solo cuando los tracks y las imágenes estén cargadas */}
      {!tracksLoading && !imagesLoading && !selectedTrack && (
        <Intro tracks={tracks} onTrackSelect={handleTrackSelect} />
      )}
      
      {/* Cuando se selecciona un track, cargar sus imágenes y luego iniciar audio */}
      {selectedTrack && !imagesLoading && currentAudioSrc && (
        <AudioProvider audioSrc={currentAudioSrc}>
          <BackgroundWrapper 
            onTriggerCallbackRef={triggerCallbackRef} 
            onVoiceCallbackRef={voiceCallbackRef}
            selectedTrack={selectedTrack}
          />
          <LoadingProgressHandler onTriggerCallbackRef={triggerCallbackRef} />
          <LoadingIndicator />
          <AudioAnalyzer onBeat={handleBeat} onVoice={handleVoice} />
          <SeekWrapper />
          {/* Mostrar Prompt si el track tiene guion */}
          {selectedTrack.guion && selectedTrack.guion.textos && (
            <Prompt textos={selectedTrack.guion.textos} />
          )}
        </AudioProvider>
      )}
      
      {/* Fondo por defecto cuando no hay track seleccionado */}
      {!selectedTrack && (
        <Background onTriggerCallbackRef={triggerCallbackRef} />
      )}
    </div>
  );
};

// Wrapper para Background que tiene acceso al contexto de audio
const BackgroundWrapper = ({ onTriggerCallbackRef, onVoiceCallbackRef, selectedTrack }) => {
  const { analyserRef, dataArrayRef, isInitialized } = useAudio();
  
  return (
    <Background 
      onTriggerCallbackRef={onTriggerCallbackRef}
      onVoiceCallbackRef={onVoiceCallbackRef}
      analyserRef={analyserRef}
      dataArrayRef={dataArrayRef}
      isInitialized={isInitialized}
      selectedTrack={selectedTrack}
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

