import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import './Croquetas25.scss';
import Background from './components/Background/Background';
import AudioAnalyzer from './components/AudioAnalyzer/AudioAnalyzer';
import Seek from './components/Seek/Seek';
import Intro from './components/Intro/Intro';
import { useGallery } from './components/Gallery/Gallery';
import { useTracks } from './hooks/useTracks';
import Prompt from './components/Prompt/Prompt';
import Croqueta from './components/Croqueta/Croqueta';
import BackButton from './components/BackButton/BackButton';
import KITTLoader from './components/KITTLoader/KITTLoader';

// Hook simple para crear AudioContext solo para análisis
const useAudioAnalysis = (audioRef) => {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const timeDataArrayRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const connectedAudioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) {
      if (isInitialized) {
        setIsInitialized(false);
      }
      return;
    }
    
    // Crear AudioContext solo una vez
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        timeDataArrayRef.current = new Uint8Array(bufferLength);
      }
    }

    // Si ya está conectado este audio, no hacer nada
    if (connectedAudioRef.current === audio) {
      if (!isInitialized) {
        setIsInitialized(true);
      }
      return;
    }

    // Conectar audio al AudioContext cuando esté listo
    const connectAudio = () => {
      if (!audioContextRef.current || !analyserRef.current || !audio) return;
      
      // Si el contexto está cerrado, no intentar conectar
      if (audioContextRef.current.state === 'closed') {
        console.warn('[useAudioAnalysis] AudioContext está cerrado');
        return;
      }
      
      try {
        // Desconectar fuente anterior si existe
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.disconnect();
          } catch (e) {
            // Ignorar errores
          }
        }

        // Crear nueva fuente
        const source = audioContextRef.current.createMediaElementSource(audio);
        sourceNodeRef.current = source;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        
        connectedAudioRef.current = audio;
        setIsInitialized(true);
        console.log('[useAudioAnalysis] Audio conectado al AudioContext para análisis');
      } catch (error) {
        if (error.message && !error.message.includes('already connected')) {
          console.warn('[useAudioAnalysis] Error conectando audio:', error);
        } else {
          // Si ya está conectado, marcar como inicializado
          connectedAudioRef.current = audio;
          setIsInitialized(true);
        }
      }
    };

    // Intentar conectar cuando el audio tenga metadata
    if (audio.readyState >= 1) {
      connectAudio();
    } else {
      const onLoadedMetadata = () => {
        connectAudio();
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
    }
  }, [audioRef?.current]);

  return {
    audioContextRef,
    analyserRef,
    dataArrayRef,
    timeDataArrayRef,
    isInitialized,
    sourceNodeRef,
    connectedAudioRef
  };
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioDurations, setAudioDurations] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const wasPlayingBeforeHoldRef = useRef(false);
  const startButtonRef = useRef(null);
  const triggerCallbackRef = useRef(null);
  const voiceCallbackRef = useRef(null);
  const lastSquareTimeRef = useRef(0);
  const minTimeBetweenSquares = 600;
  const typewriterInstanceRef = useRef(null);
  
  // Refs para elementos Audio
  const audioRefs = useRef([]);
  const audioRef = useRef(null);
  
  const { tracks, isLoading: tracksLoading } = useTracks();
  
  // Hook para análisis de audio
  const audioAnalysis = useAudioAnalysis(audioRef);
  
  // Callback para cuando se completa una subcarpeta
  const handleSubfolderComplete = useCallback((completedSubfolder) => {
    if (!selectedTrack || !selectedTrack.subfolderToAudioIndex) return;
    
    const audioIndex = selectedTrack.subfolderToAudioIndex[completedSubfolder];
    if (audioIndex === undefined) return;
    
    const subfolderOrder = selectedTrack.subfolderOrder || [];
    const currentSubfolderIndex = subfolderOrder.indexOf(completedSubfolder);
    
    if (currentSubfolderIndex === -1) return;
    
    let nextAudioIndex = null;
    for (let i = currentSubfolderIndex + 1; i < subfolderOrder.length; i++) {
      const nextSubfolder = subfolderOrder[i];
      const nextAudio = selectedTrack.subfolderToAudioIndex[nextSubfolder];
      if (nextAudio !== undefined) {
        nextAudioIndex = nextAudio;
        break;
      }
    }
    
    if (nextAudioIndex !== null && typeof window !== 'undefined' && window.__subfolderCompleteHandler) {
      window.__subfolderCompleteHandler(completedSubfolder, nextAudioIndex);
    }
  }, [selectedTrack]);
  
  const handleAllCompleteRef = useRef(null);
  
  const handleAllComplete = useCallback(async () => {
    console.log('[Croquetas25] Todas las subcarpetas completadas, volviendo a Intro');
    
    if (handleAllCompleteRef?.current) {
      await handleAllCompleteRef.current();
    }
    
    setAudioStarted(false);
    setSelectedTrack(null);
    setShowStartButton(false);
    setWasSelectedFromIntro(false);
    setLoadingFadedOut(false);
    
    console.log('[Croquetas25] Navegando a /nachitos-de-nochevieja');
    navigate('/nachitos-de-nochevieja', { replace: true });
  }, [navigate]);
  
  const { isLoading: imagesLoading, preloadProgress: imagesProgress, seekToImagePosition } = useGallery(selectedTrack, handleSubfolderComplete, handleAllComplete);
  const audioSrcs = selectedTrack?.srcs || (selectedTrack?.src ? [selectedTrack.src] : []);
  const isDirectUri = !!trackId;
  
  // Ref para evitar múltiples cargas simultáneas
  const isLoadingAudiosRef = useRef(false);
  const currentTrackIdRef = useRef(null);

  // Cargar audios cuando cambian los refs
  useEffect(() => {
    const trackId = selectedTrack?.name || selectedTrack?.id;
    
    if (!selectedTrack || audioSrcs.length === 0) {
      if (currentTrackIdRef.current !== null) {
        setAudioDurations([]);
        setIsLoaded(false);
        setLoadingProgress(0);
        currentTrackIdRef.current = null;
        isLoadingAudiosRef.current = false;
      }
      return;
    }

    // Si ya estamos cargando este track, no hacer nada
    if (isLoadingAudiosRef.current && currentTrackIdRef.current === trackId) {
      return;
    }

    // Esperar a que los elementos Audio estén renderizados
    const checkAudios = () => {
      // Asegurar que audioRefs.current es un array
      if (!audioRefs.current || !Array.isArray(audioRefs.current)) {
        audioRefs.current = [];
      }
      
      const audios = audioRefs.current.filter(audio => audio !== null && audio !== undefined);
      
      if (audios.length === 0 || audios.length !== audioSrcs.length) {
        // Reintentar después de un pequeño delay (máximo 10 intentos)
        const retryCount = checkAudios.retryCount || 0;
        if (retryCount < 10) {
          checkAudios.retryCount = retryCount + 1;
          setTimeout(checkAudios, 100);
        } else {
          isLoadingAudiosRef.current = false;
          console.warn(`[Croquetas25] No se pudieron encontrar ${audioSrcs.length} elementos Audio después de 10 intentos. Encontrados: ${audios.length}`);
        }
        return;
      }

      // Verificar que todos los audios tengan src asignado y asignarlo si falta
      audios.forEach((audio, index) => {
        const expectedSrc = typeof audioSrcs[index] === 'string' ? audioSrcs[index] : (audioSrcs[index]?.default || String(audioSrcs[index]));
        if (expectedSrc && (!audio.src || audio.src !== expectedSrc)) {
          console.log(`[Croquetas25] Asignando src a audio ${index}:`, expectedSrc);
          audio.src = expectedSrc;
        }
      });

      checkAudios.retryCount = 0;
      isLoadingAudiosRef.current = true;
      currentTrackIdRef.current = trackId;
      
      setIsLoaded(false);
      setLoadingProgress(0);
      setAudioDurations(new Array(audios.length).fill(0));

      // Cargar todos los audios
      const loadPromises = audios.map((audio, index) => {
        return new Promise((resolve) => {
          let resolved = false;
          
          // Asegurar que el src esté asignado
          const expectedSrc = typeof audioSrcs[index] === 'string' ? audioSrcs[index] : (audioSrcs[index]?.default || String(audioSrcs[index]));
          if (expectedSrc && (!audio.src || audio.src !== expectedSrc)) {
            audio.src = expectedSrc;
          }

          const onCanPlay = () => {
            if (!resolved) {
              resolved = true;
              const duration = audio.duration || 0;
              setAudioDurations(prev => {
                const newDurations = [...prev];
                newDurations[index] = duration;
                return newDurations;
              });

              setLoadingProgress(prev => {
                const loaded = audios.filter(a => a.readyState >= 2).length;
                return Math.min(100, (loaded / audios.length) * 100);
              });

              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('loadedmetadata', onMetadata);
              audio.removeEventListener('error', onError);
              resolve();
            }
          };

          const onMetadata = () => {
            const duration = audio.duration || 0;
            if (duration > 0) {
              setAudioDurations(prev => {
                const newDurations = [...prev];
                newDurations[index] = duration;
                return newDurations;
              });
            }
          };

          const onError = (e) => {
            if (!resolved) {
              resolved = true;
              const errorInfo = {
                src: audio.src,
                currentSrc: audio.currentSrc,
                error: audio.error,
                errorCode: audio.error?.code,
                errorMessage: audio.error?.message,
                networkState: audio.networkState,
                readyState: audio.readyState,
                expectedSrc: expectedSrc
              };
              console.error(`[Croquetas25] Error cargando audio ${index}:`, e, errorInfo);
              setAudioDurations(prev => {
                const newDurations = [...prev];
                newDurations[index] = 0;
                return newDurations;
              });
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('loadedmetadata', onMetadata);
              audio.removeEventListener('error', onError);
              resolve();
            }
          };

          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('canplaythrough', onCanPlay);
          audio.addEventListener('loadedmetadata', onMetadata);
          audio.addEventListener('error', onError);

          // Verificar que el src esté asignado antes de cargar
          if (!audio.src || audio.src.length === 0) {
            console.warn(`[Croquetas25] Audio ${index} no tiene src asignado, intentando asignar:`, expectedSrc);
            if (expectedSrc && expectedSrc.length > 0) {
              audio.src = expectedSrc;
            } else {
              console.error(`[Croquetas25] No se puede asignar src a audio ${index}: src inválido`);
              resolved = true;
              resolve();
              return;
            }
          }
          
          // Verificar que el src sea una URL válida
          try {
            new URL(audio.src, window.location.origin);
          } catch (urlError) {
            console.error(`[Croquetas25] Audio ${index} tiene src inválido:`, audio.src, urlError);
            resolved = true;
            resolve();
            return;
          }

          audio.load();

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('loadedmetadata', onMetadata);
              audio.removeEventListener('error', onError);
              resolve();
            }
          }, 10000);
        });
      });

      Promise.all(loadPromises).then(() => {
        const allLoaded = audios.every(a => a.readyState >= 2 || a.duration > 0);
        if (allLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
          isLoadingAudiosRef.current = false;
          console.log('[Croquetas25] Todos los audios cargados:', {
            count: audios.length,
            durations: audioDurations
          });
        } else {
          isLoadingAudiosRef.current = false;
        }
      });
    };

    checkAudios();
    
    return () => {
      isLoadingAudiosRef.current = false;
    };
  }, [selectedTrack?.name, selectedTrack?.id, audioSrcs.length]);

  // Funciones de control de audio
  const play = useCallback(async () => {
    if (!audioRef.current) {
      console.warn('[Croquetas25] play: audioRef.current es null');
      return;
    }
    
    const audio = audioRef.current;
    
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafariIOS = isIOS && !/CriOS/.test(navigator.userAgent);
      const minReadyState = (isIOS || isSafariIOS) ? 1 : 2;
      
      console.log('[Croquetas25] play: intentando reproducir', {
        readyState: audio.readyState,
        minReadyState,
        paused: audio.paused,
        src: audio.src,
        currentSrc: audio.currentSrc,
        error: audio.error
      });
      
      if (audio.error) {
        console.error('[Croquetas25] play: audio tiene error', {
          error: audio.error,
          code: audio.error?.code,
          message: audio.error?.message
        });
        return;
      }
      
      if (audio.readyState < minReadyState) {
        console.log(`[Croquetas25] play: audio no está listo (readyState: ${audio.readyState} < ${minReadyState}), reintentando...`);
        setTimeout(() => play(), 100);
        return;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      setIsPlaying(true);
      console.log('[Croquetas25] play: audio reproducido correctamente');
    } catch (error) {
      console.error('[Croquetas25] Error reproduciendo audio:', error);
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(async () => {
    if (!audioRef.current) return;
    
    try {
      audioRef.current.pause();
      setIsPlaying(false);
    } catch (error) {
      console.error('[Croquetas25] Error pausando audio:', error);
    }
  }, []);

  const switchToAudio = useCallback(async (index, time = 0) => {
    if (index < 0 || index >= audioRefs.current.length) {
      console.warn(`[Croquetas25] switchToAudio: índice inválido ${index}`);
      return;
    }

    const wasPlaying = isPlaying;
    const previousAudio = audioRef.current;

    if (previousAudio && !previousAudio.paused) {
      previousAudio.pause();
    }

    const newAudio = audioRefs.current[index];
    if (!newAudio) {
      console.warn(`[Croquetas25] switchToAudio: audio en índice ${index} no existe`);
      return;
    }
    
    console.log(`[Croquetas25] switchToAudio: cambiando a audio ${index}`, {
      wasPlaying,
      newAudioReadyState: newAudio.readyState,
      newAudioDuration: newAudio.duration
    });
    
    // Forzar reconexión al AudioContext para análisis ANTES de cambiar el audio
    // Desconectar fuente anterior para que el hook se reconecte
    if (audioAnalysis.sourceNodeRef?.current) {
      try {
        audioAnalysis.sourceNodeRef.current.disconnect();
        audioAnalysis.sourceNodeRef.current = null;
      } catch (e) {
        // Ignorar errores
      }
    }
    
    // Resetear el flag de audio conectado para forzar reconexión
    if (audioAnalysis.connectedAudioRef) {
      audioAnalysis.connectedAudioRef.current = null;
    }
    
    // Cambiar el audio actual
    audioRef.current = newAudio;
    setCurrentIndex(index);

    if (time >= 0 && newAudio.duration) {
      newAudio.currentTime = Math.min(time, newAudio.duration);
    } else if (time >= 0) {
      // Si no tiene duración aún, esperar a que la tenga
      const waitForDuration = () => {
        if (newAudio.duration > 0) {
          newAudio.currentTime = Math.min(time, newAudio.duration);
        } else {
          setTimeout(waitForDuration, 100);
        }
      };
      waitForDuration();
    }

    // Pequeño delay para asegurar que el hook se reconecte
    await new Promise(resolve => setTimeout(resolve, 200));

    if (wasPlaying) {
      await play();
    }
  }, [isPlaying, play, audioAnalysis]);

  const seekToAudio = useCallback(async (audioIndex, timeInAudio = 0) => {
    if (audioIndex < 0 || audioIndex >= audioRefs.current.length) return;

    const wasPlaying = isPlaying;

    if (audioIndex !== currentIndex) {
      await switchToAudio(audioIndex, timeInAudio);
      return;
    }

    if (audioRef.current) {
      const targetTime = Math.max(0, Math.min(timeInAudio, audioRef.current.duration || 0));
      audioRef.current.currentTime = targetTime;

      if (wasPlaying && audioRef.current.paused) {
        await play();
      }
    }
  }, [currentIndex, isPlaying, switchToAudio, play]);

  const getTotalDuration = useCallback(() => {
    return audioDurations.reduce((total, duration) => total + (duration || 0), 0);
  }, [audioDurations]);

  const getTotalElapsed = useCallback(() => {
    if (!audioRef.current || audioDurations.length === 0) return 0;

    let elapsed = 0;
    for (let i = 0; i < currentIndex; i++) {
      elapsed += audioDurations[i] || 0;
    }
    elapsed += audioRef.current.currentTime || 0;
    return elapsed;
  }, [currentIndex, audioDurations]);

  // Manejar cuando termina un audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (currentIndex < audioRefs.current.length - 1) {
        switchToAudio(currentIndex + 1, 0);
      } else {
        setIsPlaying(false);
        setCurrentIndex(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      }
    };

    audio.addEventListener('ended', handleEnded);
      return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, switchToAudio]);

  // Sincronizar isPlaying con el estado del audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioRef.current]);

  useEffect(() => {
    if (selectedTrack && audioSrcs.length > 0) {
      console.log(`[Croquetas25] Track seleccionado: ${selectedTrack.name}`);
      console.log(`[Croquetas25] AudioSrcs:`, audioSrcs);
    }
  }, [selectedTrack, audioSrcs]);

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    setAudioStarted(false);
    setShowStartButton(false);
    setWasSelectedFromIntro(true);
    setLoadingFadedOut(false);
    const trackIdForUrl = track.id || track.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/nachitos-de-nochevieja/${trackIdForUrl}`, { replace: true });
  };

  const handleClick = async (e) => {
    if (!audioStarted && selectedTrack && showStartButton && startButtonRef.current) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS && audioRef.current) {
        try {
          if (audioRef.current.paused) {
            await audioRef.current.play();
          }
        } catch (playErr) {
          console.warn('[Croquetas25] Error iniciando audio:', playErr);
        }
      }
      
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
      if (audioRef.current && !audioRef.current.paused) await pause();
      
      const introOverlay = document.querySelector('.intro');
      if (!introOverlay || window.getComputedStyle(introOverlay).opacity === '0' || introOverlay.style.display === 'none') {
        gsap.globalTimeline.pause();
      }
      if (typewriterInstanceRef?.current) typewriterInstanceRef.current.pause();
      setIsPausedByHold(true);
      isPausingRef.current = false;
    }, [isPlaying, pause, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef]);

    const resumeEverything = useCallback(() => {
      if (!isPausedByHold) return;
      gsap.globalTimeline.resume();
      if (typewriterInstanceRef?.current) typewriterInstanceRef.current.start();
      setIsPausedByHold(false);
      isPausingRef.current = false;
      if (wasPlayingBeforeHoldRef.current && audioRef.current?.paused) play();
      wasPlayingBeforeHoldRef.current = false;
    }, [isPausedByHold, play, setIsPausedByHold, wasPlayingBeforeHoldRef, typewriterInstanceRef]);

    const togglePauseResume = useCallback(async () => {
      if (audioRef.current?.paused || isPausedByHold) {
        wasPlayingBeforeHoldRef.current = true;
        resumeEverything();
      } else {
        await pauseEverything();
      }
    }, [isPausedByHold, pauseEverything, resumeEverything, wasPlayingBeforeHoldRef]);

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
  const minTimeBetweenDiagonals = 500;

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

  // Props de audio para pasar a componentes
  const audioProps = {
    audioRef,
    audioRefs,
    currentIndex,
    isPlaying,
    isLoaded,
    loadingProgress,
    audioDurations,
    play,
    pause,
    seekToAudio,
    getTotalDuration,
    getTotalElapsed,
    switchToAudio
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
      
      {selectedTrack && audioSrcs.length > 0 ? (
        <>
          {/* Renderizar elementos Audio */}
          {audioSrcs.map((src, index) => {
            const audioSrc = typeof src === 'string' ? src : (src?.default || String(src));
            if (!audioSrc || audioSrc.length === 0) {
              console.warn(`[Croquetas25] Audio src inválido en índice ${index}:`, src);
              return null;
            }
            
            return (
              <audio
                key={`${selectedTrack?.name || 'track'}-${index}-${audioSrc}`}
                ref={el => {
                  if (el) {
                    if (!audioRefs.current || !Array.isArray(audioRefs.current)) {
                      audioRefs.current = [];
                    }
                    // Solo actualizar si el elemento cambió para evitar re-renders innecesarios
                    if (audioRefs.current[index] !== el) {
                      audioRefs.current[index] = el;
                      if (index === 0 && audioRef.current !== el) {
                        audioRef.current = el;
                      }
                    }
                  }
                }}
                src={audioSrc}
                preload="auto"
                crossOrigin="anonymous"
                playsInline
                style={{ display: 'none' }}
              />
            );
          })}
          
          <AllCompleteHandler pause={pause} handleAllCompleteRef={handleAllCompleteRef} />
          <BackgroundWrapper 
            onTriggerCallbackRef={audioStarted ? triggerCallbackRef : null} 
            onVoiceCallbackRef={audioStarted ? voiceCallbackRef : null}
            selectedTrack={audioStarted ? selectedTrack : null}
            showOnlyDiagonales={!audioStarted}
            onAllComplete={handleAllComplete}
            audioAnalysis={audioAnalysis}
            currentAudioIndex={audioStarted ? currentIndex : null}
            pause={audioStarted ? pause : null}
          />
          <UnifiedLoadingIndicator 
            imagesLoading={imagesLoading}
            imagesProgress={imagesProgress}
            isDirectUri={isDirectUri}
            audioStarted={audioStarted}
            showStartButton={showStartButton}
            loadingFadedOut={loadingFadedOut}
            setLoadingFadedOut={setLoadingFadedOut}
            setAudioStarted={setAudioStarted}
            selectedTrack={selectedTrack}
            audioProps={audioProps}
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
            audioProps={audioProps}
          />
          <AudioStarter audioStarted={audioStarted} audioProps={audioProps} />
          <HoldToPauseHandler 
            isPausedByHold={isPausedByHold}
            setIsPausedByHold={setIsPausedByHold}
            wasPlayingBeforeHoldRef={wasPlayingBeforeHoldRef}
            typewriterInstanceRef={typewriterInstanceRef}
          />
          <AudioAnalyzer 
            onBeat={handleBeat} 
            onVoice={handleVoice}
            audioRef={audioRef}
            audioAnalysis={audioAnalysis}
            isPlaying={isPlaying}
            currentIndex={currentIndex}
          />
          <SeekWrapper 
            selectedTrack={selectedTrack}
            audioProps={audioProps}
            seekToImagePosition={seekToImagePosition}
          />
          {audioStarted && selectedTrack && (
            <SubfolderAudioController 
              selectedTrack={selectedTrack}
              audioProps={audioProps}
            />
          )}
          {audioStarted && (
            <GuionManager 
              selectedTrack={selectedTrack}
              typewriterInstanceRef={typewriterInstanceRef}
              isPausedByHold={isPausedByHold}
              audioProps={audioProps}
              audioAnalysis={audioAnalysis}
            />
          )}
          {(isDirectUri || audioStarted) && (
            <BackButton 
              onBack={() => {
                setAudioStarted(false);
                setSelectedTrack(null);
                setShowStartButton(false);
                setWasSelectedFromIntro(false);
                setLoadingFadedOut(false);
              }}
              audioRef={audioRef}
              pause={pause}
            />
          )}
        </>
      ) : (
        <DiagonalesOnly />
      )}
    </div>
  );
};

const AllCompleteHandler = ({ pause, handleAllCompleteRef }) => {
  useEffect(() => {
    handleAllCompleteRef.current = async () => {
      console.log('[AllCompleteHandler] Pausando audio antes de volver a home');
      try {
        await pause();
      } catch (error) {
        console.warn('[AllCompleteHandler] Error pausando audio:', error);
      }
    };
    
    return () => {
      handleAllCompleteRef.current = null;
    };
  }, [pause, handleAllCompleteRef]);
  
  return null;
};

const AudioStarter = ({ audioStarted, audioProps }) => {
  const { audioRef, isLoaded, play, audioDurations } = audioProps;
  const hasAttemptedPlayRef = useRef(false);

  useEffect(() => {
    if (!audioStarted) {
      hasAttemptedPlayRef.current = false;
      return;
    }

    if (audioStarted && isLoaded && !hasAttemptedPlayRef.current && audioRef?.current) {
      const audio = audioRef.current;
      
      // Verificar que el audio tenga metadata al menos
      const hasMetadata = audio.readyState >= 1 || audioDurations.length > 0;
      
      if (!hasMetadata) {
        console.log('[AudioStarter] Esperando metadata del audio...');
        const checkMetadata = () => {
          if (audio.readyState >= 1 || audioDurations.length > 0) {
            hasAttemptedPlayRef.current = true;
            play().catch(error => {
              console.error('[AudioStarter] Error playing audio:', error);
              hasAttemptedPlayRef.current = false;
            });
          } else if (audioStarted) {
            setTimeout(checkMetadata, 100);
          }
        };
        setTimeout(checkMetadata, 100);
        return;
      }
      
      hasAttemptedPlayRef.current = true;
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafariIOS = isIOS && !/CriOS/.test(navigator.userAgent);
      
      const tryPlay = async () => {
        const minReadyState = (isIOS || isSafariIOS) ? 1 : 2;
        
        console.log('[AudioStarter] Intentando reproducir', {
          readyState: audio.readyState,
          minReadyState,
          paused: audio.paused,
          hasError: !!audio.error
        });
        
        if (audio.error) {
          console.error('[AudioStarter] Audio tiene error:', {
            error: audio.error,
            code: audio.error?.code,
            message: audio.error?.message
          });
          hasAttemptedPlayRef.current = false;
          return;
        }
        
        if (audio.readyState >= minReadyState) {
          play().catch(error => {
            console.error('[AudioStarter] Error playing audio:', error);
            hasAttemptedPlayRef.current = false;
          });
        } else if (audioStarted) {
          const waitTime = (isIOS || isSafariIOS) ? 50 : 100;
          setTimeout(tryPlay, waitTime);
        }
      };
      
      tryPlay();
    }
  }, [audioStarted, isLoaded, play, audioRef, audioDurations]);

  return null;
};

const UnifiedLoadingIndicator = ({ 
  imagesLoading, 
  imagesProgress, 
  isDirectUri, 
  audioStarted, 
  loadingFadedOut, 
  setLoadingFadedOut, 
  setAudioStarted, 
  selectedTrack,
  audioProps
}) => {
  const { loadingProgress: audioProgress, isLoaded: audioLoaded, audioRef } = audioProps;
  const loadingRef = useRef(null);
  const fadeoutStartedRef = useRef(false);
  const hasCheckedReadyRef = useRef(false);
  
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafariIOS = isIOS && !/CriOS/.test(navigator.userAgent);
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768)
  );
  
  const minReadyState = (isIOS || isSafariIOS) ? 1 : 2;
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= minReadyState;
  
  const minImagesProgress = isMobile ? 10 : 20;
  const imagesReady = !imagesLoading && imagesProgress >= minImagesProgress;
  
  const audioReady = isMobile 
    ? (audioLoaded || audioHasMetadata) 
    : (audioLoaded && audioHasMetadata);
  
  const everythingReady = imagesReady && audioReady;
  
  useEffect(() => {
    if (selectedTrack) {
      fadeoutStartedRef.current = false;
      hasCheckedReadyRef.current = false;
      setLoadingFadedOut(false);
      if (loadingRef.current) {
        gsap.set(loadingRef.current, { opacity: isMobile ? 1 : 0 });
        if (!isMobile) {
          gsap.to(loadingRef.current, {
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
      }
    }
  }, [selectedTrack, setLoadingFadedOut, isMobile]);
  
  useEffect(() => {
    if (everythingReady && !fadeoutStartedRef.current && !hasCheckedReadyRef.current && loadingRef.current && !loadingFadedOut) {
      hasCheckedReadyRef.current = true;
      fadeoutStartedRef.current = true;
      
      const fadeOutDelay = isMobile ? 300 : 0;
      
      setTimeout(() => {
        gsap.to(loadingRef.current, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            setLoadingFadedOut(true);
          }
        });
      }, fadeOutDelay);
    }
  }, [everythingReady, loadingFadedOut, setLoadingFadedOut, isMobile]);
  
  useEffect(() => {
    if (!selectedTrack || audioStarted || loadingFadedOut) return;
    
    const safetyTimeout = setTimeout(() => {
      const maxWaitTime = isMobile ? 10000 : 15000;
      const minProgress = isMobile ? 30 : 50;
      
      if (loadingRef.current && !loadingFadedOut && !fadeoutStartedRef.current) {
        const currentProgress = Math.round((imagesProgress + audioProgress) / 2);
        if (currentProgress >= minProgress) {
          console.warn('[UnifiedLoadingIndicator] Timeout de seguridad: forzando fade out del loading y iniciando audio');
          hasCheckedReadyRef.current = true;
          fadeoutStartedRef.current = true;
          
          gsap.to(loadingRef.current, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: () => {
              setLoadingFadedOut(true);
              if (!audioStarted) {
                console.log('[UnifiedLoadingIndicator] Iniciando audio después de timeout de seguridad');
                setAudioStarted(true);
              }
            }
          });
        }
      }
    }, isMobile ? 10000 : 15000);
    
    return () => clearTimeout(safetyTimeout);
  }, [selectedTrack, audioStarted, loadingFadedOut, imagesProgress, audioProgress, isMobile, setLoadingFadedOut, setAudioStarted]);
  
  if (audioStarted || loadingFadedOut) {
    return null;
  }
  
  const combinedProgress = everythingReady ? 100 : Math.round((imagesProgress + audioProgress) / 2);
  const showFast = combinedProgress >= 95;
  const displayProgress = isMobile && combinedProgress === 0 ? 5 : combinedProgress;
  
  return (
    <div className="image-preloader" ref={loadingRef}>
      <div className="image-preloader__content">
        <KITTLoader fast={showFast} progress={displayProgress} />
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
  loadingFadedOut,
  audioProps
}) => {
  const { isLoaded, audioRef } = audioProps;
  const buttonRef = useRef(null);
  const buttonAnimationStartedRef = useRef(false);
  
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafariIOS = isIOS && !/CriOS/.test(navigator.userAgent);
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768)
  );
  
  const minReadyState = (isIOS || isSafariIOS) ? 1 : 2;
  const audioHasMetadata = audioRef?.current && audioRef.current.readyState >= minReadyState;
  
  const minImagesProgress = isMobile ? 10 : 20;
  const imagesReady = !imagesLoading && imagesProgress >= minImagesProgress;
  
  const audioReady = isMobile 
    ? (isLoaded || audioHasMetadata) 
    : (isLoaded && audioHasMetadata);
  
  const everythingReady = imagesReady && audioReady;
  
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

const BackgroundWrapper = ({ 
  onTriggerCallbackRef, 
  onVoiceCallbackRef, 
  selectedTrack, 
  showOnlyDiagonales = false, 
  onAllComplete,
  audioAnalysis,
  currentAudioIndex,
  pause
}) => {
  return (
    <Background 
      onTriggerCallbackRef={showOnlyDiagonales ? null : onTriggerCallbackRef} 
      onVoiceCallbackRef={showOnlyDiagonales ? null : onVoiceCallbackRef}
      analyserRef={audioAnalysis.analyserRef}
      dataArrayRef={audioAnalysis.dataArrayRef}
      isInitialized={audioAnalysis.isInitialized}
      selectedTrack={showOnlyDiagonales ? null : selectedTrack}
      showOnlyDiagonales={showOnlyDiagonales}
      currentAudioIndex={currentAudioIndex}
      onAllComplete={onAllComplete}
      pause={showOnlyDiagonales ? null : pause}
    />
  );
};

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

const SeekWrapper = ({ selectedTrack, audioProps, seekToImagePosition }) => {
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
  
  return <Seek squares={squares} seekToImagePosition={seekToImagePosition} selectedTrack={selectedTrack} audioProps={audioProps} />;
};

const SubfolderAudioController = ({ selectedTrack, audioProps }) => {
  const { seekToAudio, currentIndex } = audioProps;
  const completedSubfoldersRef = useRef(new Set());

  useEffect(() => {
    if (!selectedTrack || !selectedTrack.subfolderToAudioIndex) return;
    
    completedSubfoldersRef.current.clear();
    
    window.__subfolderCompleteHandler = (completedSubfolder, nextAudioIndex) => {
      if (completedSubfoldersRef.current.has(completedSubfolder)) {
        console.log(`[SubfolderAudioController] Subcarpeta ${completedSubfolder} ya procesada`);
        return;
      }
      
      if (nextAudioIndex !== null && currentIndex !== nextAudioIndex) {
        completedSubfoldersRef.current.add(completedSubfolder);
        console.log(`[SubfolderAudioController] Cambiando de audio ${currentIndex} a ${nextAudioIndex}`);
        seekToAudio(nextAudioIndex, 0);
      } else {
        completedSubfoldersRef.current.add(completedSubfolder);
        console.log(`[SubfolderAudioController] No hay siguiente audio o ya estamos en el correcto`);
      }
    };
    
    return () => {
      window.__subfolderCompleteHandler = null;
    };
  }, [selectedTrack, seekToAudio, currentIndex]);

  return null;
};

const GuionManager = ({ selectedTrack, typewriterInstanceRef, isPausedByHold, audioProps, audioAnalysis }) => {
  const [currentSubfolder, setCurrentSubfolder] = useState(null);
  const { currentIndex } = audioProps;
  
  useEffect(() => {
    if (!selectedTrack || !selectedTrack.subfolderToAudioIndex || !selectedTrack.subfolderOrder) return;
    
    const subfolderOrder = selectedTrack.subfolderOrder || [];
    let foundSubfolder = null;
    
    for (const subfolder of subfolderOrder) {
      const audioIndex = selectedTrack.subfolderToAudioIndex[subfolder];
      if (audioIndex === currentIndex) {
        foundSubfolder = subfolder;
        break;
      }
    }
    
    if (!foundSubfolder && subfolderOrder.length > 0) {
      foundSubfolder = subfolderOrder[0];
    }
    
    setCurrentSubfolder(foundSubfolder);
  }, [selectedTrack, currentIndex]);
  
  const getCurrentGuion = () => {
    if (!selectedTrack || !selectedTrack.guionesBySubfolder) {
      return selectedTrack?.guion;
    }
    
    const rootGuion = selectedTrack.guionesBySubfolder['__root__'];
    if (rootGuion && rootGuion.textos) {
      return rootGuion;
    }
    
    if (currentSubfolder) {
      const subfolderGuion = selectedTrack.guionesBySubfolder[currentSubfolder];
      if (subfolderGuion && subfolderGuion.textos) {
        return subfolderGuion;
      }
    }
    
    return selectedTrack?.guion;
  };
  
  const currentGuion = getCurrentGuion();
  
  if (!currentGuion || !currentGuion.textos) {
    return null;
  }
  
  return (
    <PromptWrapper 
      textos={currentGuion.textos} 
      typewriterInstanceRef={typewriterInstanceRef} 
      isPausedByHold={isPausedByHold} 
      audioProps={audioProps}
      audioAnalysis={audioAnalysis}
    />
  );
};

const PromptWrapper = ({ textos, typewriterInstanceRef, isPausedByHold, audioProps, audioAnalysis }) => {
  const { audioRef } = audioProps;
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
      analyser={audioAnalysis?.analyserRef?.current}
    />
  );
};

export default Croquetas25;
