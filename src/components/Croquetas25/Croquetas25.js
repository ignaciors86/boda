import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import './Croquetas25.scss';
import Background from './components/Background/Background';
import AudioAnalyzer from './components/AudioAnalyzer/AudioAnalyzer';
import Seek from './components/Seek/Seek';
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
  const { trackId } = useParams(); // Obtener el trackId de la URL
  const navigate = useNavigate();
  const [audioStarted, setAudioStarted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null); // null = mostrar selector
  const [isPausedByHold, setIsPausedByHold] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const wasPlayingBeforeHoldRef = useRef(false);
  const startButtonRef = useRef(null);
  const triggerCallbackRef = useRef(null);
  const voiceCallbackRef = useRef(null);
  const lastSquareTimeRef = useRef(0);
  const minTimeBetweenSquares = 600; // Tiempo mínimo entre cuadros: 0.6 segundos (muy reducido para máxima frecuencia)
  const typewriterInstanceRef = useRef(null); // Ref para la instancia del typewriter
  
  // Cargar tracks automáticamente desde carpetas
  const { tracks, isLoading: tracksLoading } = useTracks();
  
  // Precargar imágenes del track seleccionado (o todas si no hay track seleccionado)
  const { isLoading: imagesLoading, preloadProgress: imagesProgress } = useGallery(selectedTrack);

  // Calcular el src del audio del track seleccionado
  const currentAudioSrc = selectedTrack?.src;
  
  // Determinar si entramos por URI directa (trackId presente en URL)
  const isDirectUri = !!trackId;
  
  // Efecto para seleccionar automáticamente el track si hay trackId en la URL
  useEffect(() => {
    if (trackId && tracks.length > 0 && !selectedTrack) {
      // Buscar el track por ID o nombre (normalizado)
      const normalizedTrackId = trackId.toLowerCase().replace(/\s+/g, '-');
      const track = tracks.find(t => 
        t.id === normalizedTrackId || 
        t.name.toLowerCase().replace(/\s+/g, '-') === normalizedTrackId
      );
      
      if (track) {
        console.log(`[Croquetas25] Auto-selecting track from URL: ${track.name}`);
        setSelectedTrack(track);
        setAudioStarted(false); // No iniciar automáticamente si viene de URL
        setShowStartButton(true); // Mostrar botón cuando se entra por URI directa
      } else {
        console.warn(`[Croquetas25] Track not found for trackId: ${trackId}`);
      }
    }
  }, [trackId, tracks, selectedTrack]);

  const handleTrackSelect = (track) => {
    console.log(`[Croquetas25] Track selected: ${track.name}`, track);
    setSelectedTrack(track);
    setAudioStarted(false);
    setShowStartButton(false); // No mostrar botón cuando se selecciona desde botones
    // Actualizar la URL con el trackId
    const trackIdForUrl = track.id || track.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/nachitos-de-nochevieja/${trackIdForUrl}`, { replace: true });
  };

  const handleClick = () => {
    console.log(`[Croquetas25] handleClick called | audioStarted: ${audioStarted} | selectedTrack: ${!!selectedTrack} | showStartButton: ${showStartButton} | timestamp: ${Date.now()}`);
    if (!audioStarted && selectedTrack && showStartButton && startButtonRef.current) {
      // Desvanecer el botón y luego iniciar el audio
      gsap.to(startButtonRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          setShowStartButton(false);
          // Esperar 1.5 segundos antes de iniciar el audio
          setTimeout(() => {
            console.log(`[Croquetas25] Setting audioStarted to true after delay | audioSrc: ${selectedTrack.src}`);
            setAudioStarted(true);
          }, 1500);
        }
      });
    }
  };

  // Componente interno para manejar la pausa al mantener presionado (necesita acceso al contexto de audio)
  const HoldToPauseHandler = ({ isPausedByHold, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef }) => {
    const { audioRef, isPlaying, pause, play } = useAudio();

    useEffect(() => {
      const container = document.querySelector('.croquetas25');
      if (!container) return;

      const pauseEverything = () => {
        if (isPausedByHold) return;
        
        wasPlayingBeforeHoldRef.current = isPlaying;
        
        // Pausar audio
        if (audioRef?.current && !audioRef.current.paused) {
          pause();
        }
        
        // Pausar todas las animaciones GSAP
        gsap.globalTimeline.pause();
        
        // Pausar typewriter si existe (usando la instancia del componente)
        if (typewriterInstanceRef?.current) {
          try {
            typewriterInstanceRef.current.pause();
          } catch (error) {
            console.warn('[HoldToPauseHandler] Error pausing typewriter:', error);
          }
        }
        
        setIsPausedByHold(true);
      };

      const resumeEverything = () => {
        if (!isPausedByHold) return;
        
        // Reanudar audio si estaba reproduciéndose
        if (wasPlayingBeforeHoldRef.current && audioRef?.current && audioRef.current.paused) {
          play();
        }
        
        // Reanudar todas las animaciones GSAP
        gsap.globalTimeline.resume();
        
        // Reanudar typewriter si existe (usando la instancia del componente)
        if (typewriterInstanceRef?.current) {
          try {
            typewriterInstanceRef.current.start();
          } catch (error) {
            console.warn('[HoldToPauseHandler] Error resuming typewriter:', error);
          }
        }
        
        setIsPausedByHold(false);
      };

      const handleMouseDown = (e) => {
        // No pausar si se hace clic en el seek bar o en el botón de inicio
        if (e.target.closest('.seek') || e.target.closest('.croquetas25-start-button')) return;
        pauseEverything();
      };

      const handleMouseUp = () => {
        resumeEverything();
      };

      const handleTouchStart = (e) => {
        // No pausar si se toca el seek bar o el botón de inicio
        if (e.target.closest('.seek') || e.target.closest('.croquetas25-start-button')) return;
        pauseEverything();
      };

      const handleTouchEnd = () => {
        resumeEverything();
      };

      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseUp);
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd);
      container.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseUp);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [isPausedByHold, isPlaying, audioRef, pause, play, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef]);

    return null;
  };

  const lastDiagonalTimeRef = useRef(0);
  const minTimeBetweenDiagonals = 30000; // 30 segundos - mucho menos frecuente

  const handleBeat = (intensity = 0.5, shouldBeSolid = false) => {
    // No generar nada si está pausado
    if (isPausedByHold) return;
    
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
    // No generar nada si está pausado
    if (isPausedByHold) return;
    
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
      
      {/* El indicador de carga unificado se muestra dentro del AudioProvider */}
      
      {/* Overlay de selección de canción - solo cuando los tracks y las imágenes estén cargadas */}
      {!tracksLoading && !imagesLoading && !selectedTrack && (
        <Intro tracks={tracks} onTrackSelect={handleTrackSelect} />
      )}
      
      {/* Cuando se selecciona un track, cargar sus imágenes y luego iniciar audio */}
      {/* Montar AudioProvider siempre que haya track seleccionado y audio src, incluso antes de que empiece */}
      {selectedTrack && currentAudioSrc && (
        <AudioProvider audioSrc={currentAudioSrc}>
          <UnifiedLoadingIndicator 
            imagesLoading={imagesLoading}
            imagesProgress={imagesProgress}
            isDirectUri={isDirectUri}
            audioStarted={audioStarted}
          />
          <UnifiedContentManager
            imagesLoading={imagesLoading}
            imagesProgress={imagesProgress}
            audioStarted={audioStarted}
            setAudioStarted={setAudioStarted}
            showStartButton={showStartButton}
            setShowStartButton={setShowStartButton}
            isDirectUri={isDirectUri}
            startButtonRef={startButtonRef}
            handleClick={handleClick}
          />
          <AudioStarter audioStarted={audioStarted} />
          <HoldToPauseHandler 
            isPausedByHold={isPausedByHold}
            setIsPausedByHold={setIsPausedByHold}
            wasPlayingBeforeHoldRef={wasPlayingBeforeHoldRef}
            typewriterInstanceRef={typewriterInstanceRef}
          />
          <BackgroundWrapper 
            onTriggerCallbackRef={triggerCallbackRef} 
            onVoiceCallbackRef={voiceCallbackRef}
            selectedTrack={selectedTrack}
          />
          <LoadingProgressHandler onTriggerCallbackRef={triggerCallbackRef} />
                 <AudioAnalyzer onBeat={handleBeat} onVoice={handleVoice} />
                 <SeekWrapper />
          {/* Mostrar Prompt si el track tiene guion */}
          {selectedTrack.guion && selectedTrack.guion.textos && (
            <PromptWrapper textos={selectedTrack.guion.textos} typewriterInstanceRef={typewriterInstanceRef} isPausedByHold={isPausedByHold} />
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

// Componente para iniciar el audio cuando audioStarted cambia a true
// IMPORTANTE: Solo reproduce cuando audioStarted es true Y se ha hecho clic (no automáticamente)
const AudioStarter = ({ audioStarted }) => {
  const { play, isLoaded, audioRef } = useAudio();
  const hasAttemptedPlayRef = useRef(false);

  useEffect(() => {
    if (!audioStarted) {
      hasAttemptedPlayRef.current = false;
      return;
    }

    if (audioStarted && isLoaded && !hasAttemptedPlayRef.current && audioRef?.current) {
      hasAttemptedPlayRef.current = true;
      const audio = audioRef.current;
      
      const tryPlay = () => {
        if (audio.readyState >= 2) {
          play().catch(error => {
            console.error('[AudioStarter] Error playing audio:', error);
            hasAttemptedPlayRef.current = false;
          });
        } else if (audioStarted) {
          setTimeout(tryPlay, 100);
        }
      };
      
      tryPlay();
    }
  }, [audioStarted, isLoaded, play, audioRef]);

  return null;
};

// Componente unificado de loading que combina imágenes y audio del AudioProvider
const UnifiedLoadingIndicator = ({ imagesLoading, imagesProgress, isDirectUri, audioStarted }) => {
  const { loadingProgress: audioProgress, isLoaded: audioLoaded, isInitialized, audioRef } = useAudio();
  
  // Verificar si el audio tiene metadata cargada (readyState >= 2 es suficiente para considerar que está listo)
  // No requerimos readyState >= 3 porque el AudioContext puede estar suspendido hasta el primer gesto del usuario
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= 2;
  
  // Calcular si todavía está cargando
  // Consideramos que está listo si: imágenes cargadas, audio tiene metadata cargada, y audio marcado como loaded
  // No requerimos isInitialized porque el AudioContext puede estar suspendido hasta el primer gesto del usuario
  // Si el audio tiene metadata (readyState >= 2) y está marcado como loaded, está listo
  const isLoading = imagesLoading || !audioLoaded || !audioHasMetadata || imagesProgress < 100;
  
  // Calcular progreso combinado (50% imágenes, 50% audio)
  // Si uno está al 100%, usar ese valor para evitar que se quede atascado
  let combinedProgress;
  if (imagesProgress >= 100 && audioProgress >= 95) {
    combinedProgress = 100;
  } else if (imagesProgress >= 100) {
    // Si imágenes están al 100%, mostrar progreso del audio
    combinedProgress = Math.round(50 + (audioProgress / 2));
  } else if (audioProgress >= 95) {
    // Si audio está al 95%+, mostrar progreso de imágenes
    combinedProgress = Math.round(imagesProgress / 2 + 50);
  } else {
    // Ambos están cargando
    combinedProgress = Math.round((imagesProgress + audioProgress) / 2);
  }
  
  // Si el audio ya empezó, ocultar el loading
  if (audioStarted) {
    return null;
  }
  
  // Si todo está listo, ocultar el loading (el botón o auto-play se manejará en UnifiedContentManager)
  if (!isLoading) {
    return null;
  }
  
  return (
    <div className="image-preloader">
      <div className="image-preloader__content">
        <div className="image-preloader__text">
          {imagesLoading && !audioLoaded 
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
  );
};

// Componente que gestiona el contenido unificado: loading, botón o auto-play
const UnifiedContentManager = ({ 
  imagesLoading, 
  imagesProgress, 
  audioStarted, 
  setAudioStarted,
  showStartButton,
  setShowStartButton,
  isDirectUri,
  startButtonRef,
  handleClick
}) => {
  const { isInitialized, isLoaded, loadingProgress: audioProgress, audioRef } = useAudio();
  
  // Verificar si TODO está completamente listo
  // Usamos readyState >= 2 (metadata cargada) porque readyState >= 3 puede no alcanzarse hasta el primer gesto del usuario
  // No requerimos isInitialized porque el AudioContext puede estar suspendido hasta el primer gesto del usuario
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= 2;
  const everythingReady = !imagesLoading && imagesProgress >= 100 && isLoaded && audioHasMetadata;
  
  // Efecto para manejar auto-play o mostrar botón cuando todo esté listo
  useEffect(() => {
    if (!everythingReady) {
      return;
    }
    
    if (isDirectUri) {
      // Si entramos por URI directa, mostrar botón si no está ya mostrado
      // IMPORTANTE: NO iniciar audio automáticamente, solo mostrar botón
      if (!showStartButton && !audioStarted) {
        setShowStartButton(true);
      }
    } else {
      // Si entramos desde pantalla inicial, auto-play solo cuando TODO esté listo
      if (!audioStarted) {
        setAudioStarted(true);
      }
    }
  }, [everythingReady, isDirectUri, showStartButton, audioStarted, setShowStartButton, setAudioStarted]);
  
  // Mostrar botón solo si es URI directa, todo está listo, y no ha empezado
  // Usar useMemo para evitar re-renders innecesarios que causan parpadeo
  const shouldShowButton = useMemo(() => {
    return isDirectUri && everythingReady && showStartButton && !audioStarted;
  }, [isDirectUri, everythingReady, showStartButton, audioStarted]);
  
  if (!shouldShowButton) {
    return null;
  }
  
  return (
    <div 
      className="croquetas25-start-button" 
      ref={startButtonRef}
      onClick={handleClick}
    >
      <div className="croquetas25-start-button__content">
        <div className="croquetas25-start-button__text">Comenzar</div>
      </div>
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

// Componente wrapper para Prompt que necesita el tiempo del audio
const PromptWrapper = ({ textos, typewriterInstanceRef, isPausedByHold }) => {
  const { audioRef } = useAudio();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioRef?.current) return;

    const audio = audioRef.current;

    const updateTime = () => {
      if (audio.currentTime !== undefined) {
        setCurrentTime(audio.currentTime);
      }
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => updateTime();
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('seeked', handleTimeUpdate);

    // Actualizar inmediatamente
    updateTime();

    // Actualizar periódicamente para capturar cambios de seek
    const interval = setInterval(updateTime, 100);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('seeked', handleTimeUpdate);
      clearInterval(interval);
    };
  }, [audioRef]);

  return <Prompt textos={textos} currentTime={currentTime} duration={duration} typewriterInstanceRef={typewriterInstanceRef} isPaused={isPausedByHold} />;
};

export default Croquetas25;

