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
        setSelectedTrack(track);
        setAudioStarted(false);
        // Solo mostrar botón si NO fue seleccionado desde Intro
        if (!wasSelectedFromIntro) {
          setShowStartButton(true);
        }
      }
    }
  }, [trackId, tracks, selectedTrack]);

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
    const isPausingRef = useRef(false); // Ref para rastrear si estamos en proceso de pausar

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
        const introOverlay = document.querySelector('.intro-overlay');
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
        // Verificar wasPlayingBeforeHoldRef para saber si debemos reanudar
        if (!wasPlayingBeforeHoldRef.current) {
          // Si no estaba reproduciéndose antes, solo resetear el estado
          setIsPausedByHold(false);
          isPausingRef.current = false;
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
        
        // Reanudar audio en paralelo (sin await para que sea inmediato)
        if (audioRef?.current && audioRef.current.paused) {
          play(); // Sin await - se ejecuta en paralelo
        }
        
        wasPlayingBeforeHoldRef.current = false;
      };

      const handleMouseDown = (e) => {
        // No pausar si se hace clic en el seek bar, botón de inicio, o croquetas del Intro
        if (e.target.closest('.seek') || 
            e.target.closest('.croquetas25-start-croqueta') || 
            e.target.closest('.intro__button') ||
            e.target.closest('.croqueta') ||
            e.target.closest('.intro-overlay')) return;
        pauseEverything();
      };

      const handleMouseUp = (e) => {
        // Asegurarse de que no se está haciendo clic en una croqueta
        if (e && (e.target.closest('.intro__button') || 
                  e.target.closest('.croqueta') || 
                  e.target.closest('.intro-overlay'))) {
          // Si se suelta sobre una croqueta, no hacer nada (el click se manejará por el onClick de la croqueta)
          return;
        }
        resumeEverything();
      };

      const handleTouchStart = (e) => {
        // No pausar si se toca el seek bar, botón de inicio, o croquetas del Intro
        if (e.target.closest('.seek') || 
            e.target.closest('.croquetas25-start-croqueta') || 
            e.target.closest('.intro__button') ||
            e.target.closest('.croqueta') ||
            e.target.closest('.intro-overlay')) return;
        pauseEverything();
      };

      const handleTouchEnd = (e) => {
        // Asegurarse de que no se está tocando una croqueta
        if (e && (e.target.closest('.intro__button') || 
                  e.target.closest('.croqueta') || 
                  e.target.closest('.intro-overlay'))) {
          // Si se suelta sobre una croqueta, no hacer nada (el touch se manejará por el onClick de la croqueta)
          return;
        }
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
        <Intro tracks={tracks} onTrackSelect={handleTrackSelect} isDirectUri={isDirectUri} />
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
            showStartButton={showStartButton}
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
          
          {/* Intro se muestra en el nivel superior cuando !audioStarted */}
        </AudioProvider>
      )}
      
      {/* Fondo por defecto cuando no hay track seleccionado */}
      {!selectedTrack && (
        <Background onTriggerCallbackRef={triggerCallbackRef} />
      )}
      
      {/* Mostrar Intro superpuesto cuando no hay audio iniciado - siempre visible con overlay glass */}
      {!audioStarted && tracks.length > 0 && (
        <Intro 
          tracks={tracks} 
          onTrackSelect={handleTrackSelect}
          selectedTrackId={selectedTrack?.id || selectedTrack?.name?.toLowerCase().replace(/\s+/g, '-') || "cachitos25"}
          isDirectUri={isDirectUri}
        />
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
  wasSelectedFromIntro,
  startButtonRef,
  handleClick,
  selectedTrack
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
    
    if (isDirectUri && !wasSelectedFromIntro) {
      // Si entramos por URI directa Y NO fue seleccionado desde Intro, mostrar botón
      if (!showStartButton && !audioStarted) {
        setShowStartButton(true);
      }
    } else {
      // Si entramos desde pantalla inicial o fue seleccionado desde Intro, auto-play
      // PERO SOLO cuando TODO esté completamente listo (imágenes y audio)
      // Y FORZAR que el botón NO se muestre
      if (showStartButton) {
        setShowStartButton(false);
      }
      // Solo iniciar audio si TODO está listo (imágenes al 100% y audio con metadata)
      if (!audioStarted && everythingReady) {
        setAudioStarted(true);
      }
    }
  }, [everythingReady, isDirectUri, showStartButton, audioStarted, wasSelectedFromIntro, setShowStartButton, setAudioStarted]);
  
  // Mostrar botón solo si es URI directa, todo está listo, y no ha empezado
  const [buttonVisible, setButtonVisible] = useState(false);
  const buttonRef = useRef(null);
  
  useEffect(() => {
    // Solo mostrar si es URI directa, NO fue seleccionado desde Intro, todo está listo, y no ha empezado
    if (isDirectUri && !wasSelectedFromIntro && everythingReady && showStartButton && !audioStarted) {
      // Mostrar con delay para transición suave desde el loading
      const timer = setTimeout(() => {
        setButtonVisible(true);
        // Animar entrada del botón
        if (buttonRef.current) {
          gsap.fromTo(buttonRef.current, 
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
          );
        }
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setButtonVisible(false);
    }
  }, [isDirectUri, wasSelectedFromIntro, everythingReady, showStartButton, audioStarted]);
  
  if (!buttonVisible) {
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

