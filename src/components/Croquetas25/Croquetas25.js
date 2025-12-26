import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import KITTLoader from './components/KITTLoader/KITTLoader';

const LoadingProgressHandler = ({ onTriggerCallbackRef, audioStarted }) => {
  const { loadingProgress, isLoaded } = useAudio();

  useEffect(() => {
    if (!audioStarted || !isLoaded || !onTriggerCallbackRef?.current) return;
    
    // Solo generar cuadros después de que el audio haya empezado y esté cargado
    // Este handler ya no genera cuadros durante el loading
  }, [loadingProgress, isLoaded, onTriggerCallbackRef, audioStarted]);

  return null;
};

const Croquetas25 = () => {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const [audioStarted, setAudioStarted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isPausedByHold, setIsPausedByHold] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [wasSelectedFromIntro, setWasSelectedFromIntro] = useState(false);
  const [loadingFadedOut, setLoadingFadedOut] = useState(false);
  const wasPlayingBeforeHoldRef = useRef(false);
  const startButtonRef = useRef(null);
  const triggerCallbackRef = useRef(null);
  const voiceCallbackRef = useRef(null);
  const lastSquareTimeRef = useRef(0);
  const minTimeBetweenSquares = 600;
  const typewriterInstanceRef = useRef(null);
  
  const { tracks, isLoading: tracksLoading } = useTracks();
  const { isLoading: imagesLoading, preloadProgress: imagesProgress } = useGallery(selectedTrack);
  const currentAudioSrc = selectedTrack?.src;
  const isDirectUri = !!trackId;

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    setAudioStarted(false);
    setShowStartButton(false);
    setWasSelectedFromIntro(true);
    setLoadingFadedOut(false);
    const trackIdForUrl = track.id || track.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/nachitos-de-nochevieja/${trackIdForUrl}`, { replace: true });
  };

  const handleClick = () => {
    if (!audioStarted && selectedTrack && showStartButton && startButtonRef.current) {
      gsap.to(startButtonRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          setShowStartButton(false);
          setAudioStarted(true);
        }
      });
    }
  };

  const HoldToPauseHandler = ({ isPausedByHold, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef }) => {
    const { audioRef, isPlaying, pause, play } = useAudio();
    const isPausingRef = useRef(false);
    const eventStartTimeRef = useRef(0);
    const isHoldRef = useRef(false);
    const holdTimeoutRef = useRef(null);

    const shouldIgnoreEvent = useCallback((e) => {
      return e.target.closest('.seek') ||
             e.target.closest('.croquetas25-start-croqueta') ||
             e.target.closest('.intro__button') ||
             e.target.closest('.croqueta') ||
             e.target.closest('.intro');
    }, []);

    const pauseEverything = useCallback(async () => {
      if (isPausingRef.current) return;
      isPausingRef.current = true;
      wasPlayingBeforeHoldRef.current = isPlaying;
      if (audioRef?.current && !audioRef.current.paused) await pause();
      
      const introOverlay = document.querySelector('.intro');
      if (!introOverlay || window.getComputedStyle(introOverlay).opacity === '0' || introOverlay.style.display === 'none') {
        gsap.globalTimeline.pause();
      }
      if (typewriterInstanceRef?.current) typewriterInstanceRef.current.pause();
      setIsPausedByHold(true);
      isPausingRef.current = false;
    }, [isPlaying, audioRef, pause, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef]);

    const resumeEverything = useCallback(() => {
      if (!isPausedByHold) return;
      gsap.globalTimeline.resume();
      if (typewriterInstanceRef?.current) typewriterInstanceRef.current.start();
      setIsPausedByHold(false);
      isPausingRef.current = false;
      if (wasPlayingBeforeHoldRef.current && audioRef?.current?.paused) play();
      wasPlayingBeforeHoldRef.current = false;
    }, [isPausedByHold, audioRef, play, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef]);

    const togglePauseResume = useCallback(async () => {
      if (audioRef?.current?.paused || isPausedByHold) {
        wasPlayingBeforeHoldRef.current = true;
        resumeEverything();
      } else {
        await pauseEverything();
      }
    }, [audioRef, isPausedByHold, pauseEverything, resumeEverything, wasPlayingBeforeHoldRef]);

    const handleStart = useCallback((e) => {
      if (shouldIgnoreEvent(e)) return;
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      eventStartTimeRef.current = Date.now();
      isHoldRef.current = false;
      holdTimeoutRef.current = setTimeout(() => {
        if (Date.now() - eventStartTimeRef.current >= 200) {
          isHoldRef.current = true;
          pauseEverything();
        }
        holdTimeoutRef.current = null;
      }, 200);
    }, [pauseEverything, shouldIgnoreEvent]);

    const handleEnd = useCallback((e) => {
      if (shouldIgnoreEvent(e)) return;
      const timeSinceStart = eventStartTimeRef.current > 0 ? Date.now() - eventStartTimeRef.current : 0;
      const wasHold = isHoldRef.current;
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      
      (wasHold || timeSinceStart >= 200) ? resumeEverything() : (timeSinceStart > 0 && timeSinceStart < 200 && togglePauseResume());
      
      eventStartTimeRef.current = 0;
      isHoldRef.current = false;
    }, [resumeEverything, togglePauseResume, shouldIgnoreEvent]);

    useEffect(() => {
      const container = document.querySelector('.croquetas25');
      if (!container) return;
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
    }, [handleStart, handleEnd]);

    return null;
  };

  const lastDiagonalTimeRef = useRef(0);
  const minTimeBetweenDiagonals = 500; // 0.5 segundos - permitir más diagonales

  const triggerSquare = (type, data) => {
    if (!audioStarted) return;
    
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

  const triggerDiagonal = (intensity, voiceEnergy = 0, type = '') => {
    const timestamp = Date.now();
    const timeSinceLastDiagonal = timestamp - lastDiagonalTimeRef.current;
    
    // Calcular tiempo mínimo dinámico basado en la intensidad
    // Intensidad alta (1.0) = 100ms mínimo, intensidad baja (0.0) = 2000ms mínimo
    // Esto permite más diagonales cuando la música es más intensa
    const dynamicMinTime = 100 + (1900 * (1 - intensity));
    
    if (timeSinceLastDiagonal >= dynamicMinTime && 
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
    if (isPausedByHold || !audioStarted) return;
    triggerSquare('beat', { intensity, shouldBeSolid });
    triggerDiagonal(intensity, 0, 'beat');
  };

  const handleVoice = (intensity = 0.5, voiceEnergy = 0) => {
    if (isPausedByHold || !audioStarted) return;
    triggerDiagonal(intensity, voiceEnergy, 'voice');
    triggerSquare('voice', { intensity, voiceEnergy });
  };

  return (
    <div className="croquetas25" onClick={handleClick}>
      {tracksLoading && (
        <div className="image-preloader">
          <div className="image-preloader__content">
            <div className="image-preloader__text">Cargando canciones...</div>
          </div>
        </div>
      )}
      
      {!tracksLoading && tracks.length > 0 && (
        <Intro 
          tracks={tracks} 
          onTrackSelect={handleTrackSelect}
          selectedTrackId={trackId ? trackId.toLowerCase().replace(/\s+/g, '-') : 'croquetas25'}
          isDirectUri={isDirectUri}
          isVisible={!selectedTrack}
        />
      )}
      
      {/* Background siempre visible para mostrar diagonales - dentro de AudioProvider si hay track, fuera si no */}
      {selectedTrack && currentAudioSrc ? (
        <AudioProvider audioSrc={currentAudioSrc}>
          <BackgroundWrapper 
            onTriggerCallbackRef={audioStarted ? triggerCallbackRef : null} 
            onVoiceCallbackRef={audioStarted ? voiceCallbackRef : null}
            selectedTrack={audioStarted ? selectedTrack : null}
            showOnlyDiagonales={!audioStarted}
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
          <LoadingProgressHandler onTriggerCallbackRef={triggerCallbackRef} audioStarted={audioStarted} />
          <AudioAnalyzer onBeat={handleBeat} onVoice={handleVoice} />
          <SeekWrapper />
          {audioStarted && selectedTrack.guion && selectedTrack.guion.textos && (
            <PromptWrapper textos={selectedTrack.guion.textos} typewriterInstanceRef={typewriterInstanceRef} isPausedByHold={isPausedByHold} />
          )}
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
      ) : (
        // Cuando no hay track seleccionado, mostrar solo diagonales sin AudioProvider
        <DiagonalesOnly />
      )}
    </div>
  );
};

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

const UnifiedLoadingIndicator = ({ imagesLoading, imagesProgress, isDirectUri, audioStarted, loadingFadedOut, setLoadingFadedOut, selectedTrack }) => {
  const { loadingProgress: audioProgress, isLoaded: audioLoaded, audioRef } = useAudio();
  const loadingRef = useRef(null);
  const fadeoutStartedRef = useRef(false);
  const hasCheckedReadyRef = useRef(false);
  
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= 2;
  const everythingReady = !imagesLoading && imagesProgress >= 100 && audioLoaded && audioHasMetadata;
  
  // Debug logging
  useEffect(() => {
    console.log('[UnifiedLoadingIndicator] Estado:', {
      imagesLoading,
      imagesProgress,
      audioLoaded,
      audioHasMetadata: audioRef?.current?.readyState >= 2,
      audioReadyState: audioRef?.current?.readyState,
      audioProgress,
      everythingReady
    });
  }, [imagesLoading, imagesProgress, audioLoaded, audioProgress, everythingReady, audioRef]);
  
  useEffect(() => {
    if (selectedTrack) {
      fadeoutStartedRef.current = false;
      hasCheckedReadyRef.current = false;
      setLoadingFadedOut(false);
      if (loadingRef.current) {
        // Fade-in suave del loading cuando aparece
        gsap.set(loadingRef.current, { opacity: 0 });
        gsap.to(loadingRef.current, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out'
        });
      }
    }
  }, [selectedTrack, setLoadingFadedOut]);
  
  useEffect(() => {
    if (everythingReady && !fadeoutStartedRef.current && !hasCheckedReadyRef.current && loadingRef.current && !loadingFadedOut) {
      hasCheckedReadyRef.current = true;
      fadeoutStartedRef.current = true;
      
      gsap.to(loadingRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => {
          setLoadingFadedOut(true);
        }
      });
    }
  }, [everythingReady, loadingFadedOut, setLoadingFadedOut]);
  
  if (audioStarted || loadingFadedOut) {
    return null;
  }
  
  const combinedProgress = everythingReady ? 100 : Math.round((imagesProgress + audioProgress) / 2);
  const showFast = combinedProgress >= 95;
  
  return (
    <div className="image-preloader" ref={loadingRef}>
      <div className="image-preloader__content">
        <KITTLoader fast={showFast} />
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
  const { isLoaded, audioRef } = useAudio();
  const buttonRef = useRef(null);
  const buttonAnimationStartedRef = useRef(false);
  
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= 2;
  const everythingReady = !imagesLoading && imagesProgress >= 100 && isLoaded && audioHasMetadata;
  
  useEffect(() => {
    if (!everythingReady || !loadingFadedOut) return;
    
    if (isDirectUri && !wasSelectedFromIntro) {
      if (!showStartButton && !audioStarted) {
        setShowStartButton(true);
      }
    } else {
      if (showStartButton) {
        setShowStartButton(false);
      }
      if (!audioStarted && everythingReady && loadingFadedOut) {
        setAudioStarted(true);
      }
    }
  }, [everythingReady, loadingFadedOut, isDirectUri, showStartButton, audioStarted, wasSelectedFromIntro, setShowStartButton, setAudioStarted]);
  
  useEffect(() => {
    if (isDirectUri && !wasSelectedFromIntro && everythingReady && loadingFadedOut && showStartButton && !audioStarted) {
      if (!buttonAnimationStartedRef.current && buttonRef.current) {
        buttonAnimationStartedRef.current = true;
        gsap.fromTo(buttonRef.current, 
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
        );
      }
    } else {
      buttonAnimationStartedRef.current = false;
    }
  }, [isDirectUri, wasSelectedFromIntro, everythingReady, loadingFadedOut, showStartButton, audioStarted]);
  
  useEffect(() => {
    buttonAnimationStartedRef.current = false;
  }, [selectedTrack]);
  
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

const BackgroundWrapper = ({ onTriggerCallbackRef, onVoiceCallbackRef, selectedTrack, showOnlyDiagonales = false }) => {
  const { analyserRef, dataArrayRef, isInitialized } = useAudio();
  
  return (
    <Background 
      onTriggerCallbackRef={showOnlyDiagonales ? null : onTriggerCallbackRef}
      onVoiceCallbackRef={showOnlyDiagonales ? null : onVoiceCallbackRef}
      analyserRef={analyserRef}
      dataArrayRef={dataArrayRef}
      isInitialized={isInitialized}
      selectedTrack={showOnlyDiagonales ? null : selectedTrack}
      showOnlyDiagonales={showOnlyDiagonales}
    />
  );
};

// Componente para mostrar solo diagonales sin necesidad de AudioProvider
const DiagonalesOnly = () => {
  return (
    <Background 
      onTriggerCallbackRef={null}
      onVoiceCallbackRef={null}
      analyserRef={null}
      dataArrayRef={null}
      isInitialized={false}
      selectedTrack={null}
      showOnlyDiagonales={true}
    />
  );
};

const SeekWrapper = () => {
  const { analyserRef } = useAudio();
  const [squares, setSquares] = useState([]);
  
  useEffect(() => {
    const updateSquares = () => {
      const squareElements = document.querySelectorAll('[data-square-id]');
      setSquares(Array.from(squareElements).map(el => ({
        gradient: {
          color1: el.style.getPropertyValue('--square-color-1') || '#00ffff',
          color2: el.style.getPropertyValue('--square-color-2') || '#00ffff'
        }
      })));
    };
    
    const interval = setInterval(updateSquares, 100);
    return () => clearInterval(interval);
  }, []);
  
  return <Seek squares={squares} />;
};

const PromptWrapper = ({ textos, typewriterInstanceRef, isPausedByHold }) => {
  const { audioRef, analyserRef } = useAudio();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  useEffect(() => {
    if (!audioRef?.current) return;
    
    const audio = audioRef.current;
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setDuration(audio.duration);
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration) setDuration(audio.duration);
    });
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', () => {});
    };
  }, [audioRef]);
  
  return (
    <Prompt 
      textos={textos} 
      currentTime={currentTime}
      duration={duration}
      typewriterInstanceRef={typewriterInstanceRef}
      isPaused={isPausedByHold}
      analyser={analyserRef?.current}
    />
  );
};

export default Croquetas25;
