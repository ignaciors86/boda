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
import Croqueta from './components/Croqueta/Croqueta';
import BackButton from './components/BackButton/BackButton';

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
  const [wasSelectedFromIntro, setWasSelectedFromIntro] = useState(false); // Track si fue seleccionado desde Intro
  const [loadingFadedOut, setLoadingFadedOut] = useState(false); // Estado para controlar el fadeout del loading
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
  
  // NO seleccionar automáticamente el track cuando entramos por URI directa
  // Solo se seleccionará cuando el usuario haga clic en la croqueta desde el Intro

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    setAudioStarted(false); // NO iniciar audio todavía, esperar a que todo esté cargado
    setShowStartButton(false); // No mostrar botón cuando se selecciona desde botones
    setWasSelectedFromIntro(true); // Marcar que fue seleccionado desde Intro
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
          // Iniciar el audio inmediatamente después de desvanecer el botón
          // El loading ya debería haber hecho fadeout antes de mostrar el botón
          console.log(`[Croquetas25] Setting audioStarted to true | audioSrc: ${selectedTrack.src}`);
          setAudioStarted(true);
        }
      });
    }
  };

  // Componente interno para manejar la pausa al mantener presionado (necesita acceso al contexto de audio)
  const HoldToPauseHandler = ({ isPausedByHold, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef }) => {
    const { audioRef, isPlaying, pause, play } = useAudio();
    const isPausingRef = useRef(false); // Ref para rastrear si estamos en proceso de pausar
    const mouseDownTimeRef = useRef(0); // Para detectar si es un clic simple o un hold
    const isHoldRef = useRef(false); // Para saber si fue un hold o un clic simple
    const holdTimeoutRef = useRef(null); // Para cancelar el timeout del hold

    useEffect(() => {
      const container = document.querySelector('.croquetas25');
      if (!container) return;

      const pauseEverything = async () => {
        if (isPausingRef.current) return; // Evitar múltiples pausas simultáneas
        
        isPausingRef.current = true;
        wasPlayingBeforeHoldRef.current = isPlaying;
        
        // Pausar audio con fade-out y esperar a que termine
        if (audioRef?.current && !audioRef.current.paused) {
          await pause(); // Esperar el fade-out
        }
        
        // Pausar todas las animaciones GSAP (excepto las del Intro si está visible)
        // No pausar animaciones del Intro para que las croquetas sigan siendo clicables
        const introOverlay = document.querySelector('.intro');
        if (!introOverlay || window.getComputedStyle(introOverlay).opacity === '0' || introOverlay.style.display === 'none') {
          // Solo pausar animaciones GSAP si el Intro no está visible
          gsap.globalTimeline.pause();
        }
        
        // Pausar typewriter si existe (usando la instancia del componente)
        if (typewriterInstanceRef?.current) {
          try {
            typewriterInstanceRef.current.pause();
          } catch (error) {
            console.warn('[HoldToPauseHandler] Error pausing typewriter:', error);
          }
        }
        
        setIsPausedByHold(true);
        isPausingRef.current = false;
      };

      const resumeEverything = () => {
        // Solo reanudar si realmente estaba pausado por el hold
        // Si no está pausado por hold, no hacer nada
        if (!isPausedByHold) {
          return;
        }
        
        // Reanudar inmediatamente las animaciones GSAP (sin esperar)
        gsap.globalTimeline.resume();
        
        // Reanudar typewriter inmediatamente si existe
        if (typewriterInstanceRef?.current) {
          try {
            typewriterInstanceRef.current.start();
          } catch (error) {
            console.warn('[HoldToPauseHandler] Error resuming typewriter:', error);
          }
        }
        
        // Resetear estado inmediatamente
        setIsPausedByHold(false);
        isPausingRef.current = false;
        
        // Reanudar audio solo si estaba reproduciéndose antes del hold
        // Si estaba pausado antes del hold, no reanudar el audio
        if (wasPlayingBeforeHoldRef.current && audioRef?.current && audioRef.current.paused) {
          play(); // Sin await - se ejecuta en paralelo
        }
        
        wasPlayingBeforeHoldRef.current = false;
      };

      const togglePauseResume = async () => {
        // Verificar el estado real del audio
        const isCurrentlyPaused = audioRef?.current?.paused || isPausedByHold;
        
        if (isCurrentlyPaused) {
          // Si está pausado, reanudar
          // Primero asegurarse de que wasPlayingBeforeHoldRef esté en true para que resumeEverything funcione
          wasPlayingBeforeHoldRef.current = true;
          resumeEverything();
        } else {
          // Si está reproduciendo, pausar
          await pauseEverything();
        }
      };

      // Helper para verificar si el evento debe ignorarse
      const shouldIgnoreEvent = (e) => {
        if (!e) return false;
        const ignoredSelectors = ['.seek', '.croquetas25-start-croqueta', '.intro__button', '.croqueta', '.intro'];
        return ignoredSelectors.some(selector => e.target.closest(selector));
      };

      // Handler unificado para inicio (mouse/touch)
      const handleStart = (e) => {
        if (shouldIgnoreEvent(e)) return;
        
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        
        mouseDownTimeRef.current = Date.now();
        isHoldRef.current = false;
        
        holdTimeoutRef.current = setTimeout(() => {
          const elapsed = Date.now() - mouseDownTimeRef.current;
          if (elapsed >= 200) {
            isHoldRef.current = true;
            pauseEverything();
          }
          holdTimeoutRef.current = null;
        }, 200);
      };

      // Handler unificado para fin (mouse/touch)
      const handleEnd = (e) => {
        if (shouldIgnoreEvent(e)) return;
        
        const elapsed = mouseDownTimeRef.current > 0 ? Date.now() - mouseDownTimeRef.current : 0;
        const wasHold = isHoldRef.current;
        
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        
        if (wasHold || elapsed >= 200) {
          resumeEverything();
        } else if (elapsed > 0 && elapsed < 200) {
          togglePauseResume();
        }
        
        mouseDownTimeRef.current = 0;
        isHoldRef.current = false;
      };

      container.addEventListener('mousedown', handleStart);
      container.addEventListener('mouseup', handleEnd);
      container.addEventListener('mouseleave', handleEnd);
      container.addEventListener('touchstart', handleStart, { passive: true });
      container.addEventListener('touchend', handleEnd);
      container.addEventListener('touchcancel', handleEnd);

      return () => {
        container.removeEventListener('mousedown', handleStart);
        container.removeEventListener('mouseup', handleEnd);
        container.removeEventListener('mouseleave', handleEnd);
        container.removeEventListener('touchstart', handleStart);
        container.removeEventListener('touchend', handleEnd);
        container.removeEventListener('touchcancel', handleEnd);
      };
    }, [isPausedByHold, isPlaying, audioRef, pause, play, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef]);

    return null;
  };

  const lastDiagonalTimeRef = useRef(0);
  const minTimeBetweenDiagonals = 30000; // 30 segundos - mucho menos frecuente

  // Helper para llamar callback de cuadros
  const triggerSquare = (type, data) => {
    const timestamp = Date.now();
    const timeSinceLastSquare = timestamp - lastSquareTimeRef.current;
    if (timeSinceLastSquare >= minTimeBetweenSquares && triggerCallbackRef.current) {
      try {
        triggerCallbackRef.current(type, { timestamp, ...data });
        lastSquareTimeRef.current = timestamp;
      } catch (error) {
        console.error(`[Croquetas25] ${type} square callback ERROR:`, error.message);
      }
    }
  };

  // Helper para llamar callback de diagonales
  const triggerDiagonal = (intensity, voiceEnergy = 0, type = '') => {
    const timestamp = Date.now();
    const timeSinceLastDiagonal = timestamp - lastDiagonalTimeRef.current;
    if (timeSinceLastDiagonal >= minTimeBetweenDiagonals && 
        voiceCallbackRef.current && 
        typeof voiceCallbackRef.current === 'function') {
      try {
        voiceCallbackRef.current(intensity, voiceEnergy);
        lastDiagonalTimeRef.current = timestamp;
      } catch (error) {
        console.error(`[Croquetas25] ${type} diagonal callback ERROR:`, error.message);
      }
    }
  };

  const handleBeat = (intensity = 0.5, shouldBeSolid = false) => {
    if (isPausedByHold) return;
    triggerSquare('beat', { intensity, shouldBeSolid });
    triggerDiagonal(intensity, 0, 'beat');
  };

  const handleVoice = (intensity = 0.5, voiceEnergy = 0) => {
    if (isPausedByHold) return;
    triggerDiagonal(intensity, voiceEnergy, 'voice');
    triggerSquare('voice', { intensity, voiceEnergy });
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
      
      {/* Background siempre visible - muestra las diagonales */}
      {!selectedTrack && (
        <Background onTriggerCallbackRef={triggerCallbackRef} />
      )}
      
      {/* Intro - cuando no hay track seleccionado (pantalla inicial o URI directa) */}
      {!tracksLoading && !selectedTrack && tracks.length > 0 && (
        <Intro 
          tracks={tracks} 
          onTrackSelect={handleTrackSelect}
          selectedTrackId={trackId ? trackId.toLowerCase().replace(/\s+/g, '-') : 'croquetas25'}
          isDirectUri={isDirectUri}
        />
      )}
      
      {/* Cuando se selecciona un track, cargar sus imágenes y luego iniciar audio */}
      {/* Montar AudioProvider siempre que haya track seleccionado y audio src, incluso antes de que empiece */}
      {selectedTrack && currentAudioSrc && (
        <AudioProvider audioSrc={currentAudioSrc}>
          <BackgroundWrapper 
            onTriggerCallbackRef={triggerCallbackRef} 
            onVoiceCallbackRef={voiceCallbackRef}
            selectedTrack={selectedTrack}
          />
          <UnifiedLoadingIndicator 
            imagesLoading={imagesLoading}
            imagesProgress={imagesProgress}
            isDirectUri={isDirectUri}
            audioStarted={audioStarted}
            showStartButton={showStartButton}
            loadingFadedOut={loadingFadedOut}
            setLoadingFadedOut={setLoadingFadedOut}
            selectedTrack={selectedTrack}
          />
          <UnifiedContentManager
            imagesLoading={imagesLoading}
            imagesProgress={imagesProgress}
            audioStarted={audioStarted}
            setAudioStarted={setAudioStarted}
            showStartButton={showStartButton}
            setShowStartButton={setShowStartButton}
            isDirectUri={isDirectUri}
            wasSelectedFromIntro={wasSelectedFromIntro}
            startButtonRef={startButtonRef}
            handleClick={handleClick}
            selectedTrack={selectedTrack}
            loadingFadedOut={loadingFadedOut}
          />
          <AudioStarter audioStarted={audioStarted} />
          <HoldToPauseHandler 
            isPausedByHold={isPausedByHold}
            setIsPausedByHold={setIsPausedByHold}
            wasPlayingBeforeHoldRef={wasPlayingBeforeHoldRef}
            typewriterInstanceRef={typewriterInstanceRef}
          />
          <LoadingProgressHandler onTriggerCallbackRef={triggerCallbackRef} />
          <AudioAnalyzer onBeat={handleBeat} onVoice={handleVoice} />
          <SeekWrapper />
          {/* Mostrar Prompt si el track tiene guion - solo cuando el audio haya empezado */}
          {audioStarted && selectedTrack.guion && selectedTrack.guion.textos && (
            <PromptWrapper textos={selectedTrack.guion.textos} typewriterInstanceRef={typewriterInstanceRef} isPausedByHold={isPausedByHold} />
          )}
          
          {/* Botón de volver durante la reproducción */}
          {audioStarted && (
            <BackButton 
              onBack={() => {
                setAudioStarted(false);
                setSelectedTrack(null);
                setShowStartButton(false);
                setWasSelectedFromIntro(false);
              }}
            />
          )}
        </AudioProvider>
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
const UnifiedLoadingIndicator = ({ imagesLoading, imagesProgress, isDirectUri, audioStarted, loadingFadedOut, setLoadingFadedOut, selectedTrack }) => {
  const { loadingProgress: audioProgress, isLoaded: audioLoaded, isInitialized, audioRef } = useAudio();
  const loadingRef = useRef(null);
  const fadeoutStartedRef = useRef(false);
  
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
  
  // Efecto para iniciar el fadeout cuando todo esté listo
  useEffect(() => {
    if (!isLoading && !fadeoutStartedRef.current && loadingRef.current && !loadingFadedOut) {
      fadeoutStartedRef.current = true;
      // Iniciar fadeout con GSAP
      gsap.to(loadingRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => {
          setLoadingFadedOut(true);
        }
      });
    }
  }, [isLoading, loadingFadedOut, setLoadingFadedOut]);
  
  // Resetear el fadeout cuando cambia el track
  useEffect(() => {
    fadeoutStartedRef.current = false;
    setLoadingFadedOut(false);
    if (loadingRef.current) {
      gsap.set(loadingRef.current, { opacity: 1 });
    }
  }, [selectedTrack, setLoadingFadedOut]);
  
  // Si el audio ya empezó o el loading ya hizo fadeout, no renderizar
  if (audioStarted || loadingFadedOut) {
    return null;
  }
  
  return (
    <div className="image-preloader" ref={loadingRef}>
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
  wasSelectedFromIntro,
  startButtonRef,
  handleClick,
  selectedTrack,
  loadingFadedOut
}) => {
  const { isInitialized, isLoaded, loadingProgress: audioProgress, audioRef } = useAudio();
  const buttonRef = useRef(null);
  const buttonAnimationStartedRef = useRef(false);
  
  // Verificar si TODO está completamente listo
  // Usamos readyState >= 2 (metadata cargada) porque readyState >= 3 puede no alcanzarse hasta el primer gesto del usuario
  // No requerimos isInitialized porque el AudioContext puede estar suspendido hasta el primer gesto del usuario
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= 2;
  const everythingReady = !imagesLoading && imagesProgress >= 100 && isLoaded && audioHasMetadata;
  
  // Efecto para manejar auto-play o mostrar botón cuando todo esté listo Y el loading haya hecho fadeout
  useEffect(() => {
    if (!everythingReady || !loadingFadedOut) {
      return;
    }
    
    if (isDirectUri && !wasSelectedFromIntro) {
      // Si entramos por URI directa Y NO fue seleccionado desde Intro, mostrar botón
      if (!showStartButton && !audioStarted) {
        setShowStartButton(true);
      }
    } else {
      // Si entramos desde pantalla inicial o fue seleccionado desde Intro, auto-play
      // PERO SOLO cuando TODO esté completamente listo (imágenes y audio) Y el loading haya hecho fadeout
      // Y FORZAR que el botón NO se muestre
      if (showStartButton) {
        setShowStartButton(false);
      }
      // Solo iniciar audio si TODO está listo (imágenes al 100% y audio con metadata) Y el loading haya hecho fadeout
      if (!audioStarted && everythingReady && loadingFadedOut) {
        setAudioStarted(true);
      }
    }
  }, [everythingReady, loadingFadedOut, isDirectUri, showStartButton, audioStarted, wasSelectedFromIntro, setShowStartButton, setAudioStarted]);
  
  // Efecto para mostrar y animar el botón cuando sea necesario
  useEffect(() => {
    // Solo mostrar si es URI directa, NO fue seleccionado desde Intro, todo está listo, loading hizo fadeout, y no ha empezado
    if (isDirectUri && !wasSelectedFromIntro && everythingReady && loadingFadedOut && showStartButton && !audioStarted) {
      if (!buttonAnimationStartedRef.current && buttonRef.current) {
        buttonAnimationStartedRef.current = true;
        // Animar entrada del botón
        gsap.fromTo(buttonRef.current, 
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
        );
      }
    } else {
      buttonAnimationStartedRef.current = false;
    }
  }, [isDirectUri, wasSelectedFromIntro, everythingReady, loadingFadedOut, showStartButton, audioStarted]);
  
  // Resetear la animación cuando cambia el track
  useEffect(() => {
    buttonAnimationStartedRef.current = false;
  }, [selectedTrack]);
  
  // Solo renderizar el botón si cumple todas las condiciones
  if (!(isDirectUri && !wasSelectedFromIntro && everythingReady && loadingFadedOut && showStartButton && !audioStarted)) {
    return null;
  }
  
  return (
    <div 
      className="croquetas25-start-croqueta" 
      ref={(el) => {
        startButtonRef.current = el;
        buttonRef.current = el;
      }}
      onClick={handleClick}
    >
      <Croqueta
        index={selectedTrack ? 0 : 999}
        text={selectedTrack?.name || "Comenzar"}
        onClick={handleClick}
        rotation={0}
        className="croquetas25-start-croqueta__button"
      />
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
  const { audioRef, analyserRef, isInitialized } = useAudio();
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

  const analyser = isInitialized && analyserRef?.current ? analyserRef.current : null;
  
  return <Prompt textos={textos} currentTime={currentTime} duration={duration} typewriterInstanceRef={typewriterInstanceRef} isPaused={isPausedByHold} analyser={analyser} />;
};

export default Croquetas25;

