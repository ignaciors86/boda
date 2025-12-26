import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import './AudioContext.scss';

const AudioContextReact = createContext(null);

export const useAudio = () => {
  const context = useContext(AudioContextReact);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

// Singleton para el AudioContext global - SOLO UNO
let globalAudioContext = null;
let globalSourceNode = null;
let globalAnalyser = null;
let connectedAudioElement = null;

export const AudioProvider = ({ children, audioSrcs = [] }) => {
  // Dos elementos audio: uno actual y uno siguiente para transiciones suaves
  const currentAudioRef = useRef(null);
  const nextAudioRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioDurations, setAudioDurations] = useState([]);
  
  // Refs que se compartirán con los componentes
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const timeDataArrayRef = useRef(null);
  const volumeTweenRef = useRef(null);
  const fadeOutTweenRef = useRef(null);
  const fadeInTweenRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const handleEndedRef = useRef(null); // Ref estable para handleEnded
  const audioSrcsRef = useRef(audioSrcs); // Ref para audioSrcs
  const currentIndexRef = useRef(currentIndex); // Ref para currentIndex
  const isChangingFromEndedRef = useRef(false); // Flag para evitar interferencia del useEffect principal

  // El audioRef que se expone es siempre el actual
  const audioRef = currentAudioRef;

  // Cargar duraciones de todos los audios
  useEffect(() => {
    if (!audioSrcs || audioSrcs.length === 0) {
      setAudioDurations([]);
      return;
    }

    const loadDurations = async () => {
      const durations = [];
      for (let i = 0; i < audioSrcs.length; i++) {
        const audioSrc = audioSrcs[i];
        const audio = new Audio(audioSrc);
        
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout'));
            }, 5000);

            audio.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              if (audio.duration && isFinite(audio.duration)) {
                durations[i] = audio.duration;
              } else {
                durations[i] = 0;
              }
              resolve();
            });

            audio.addEventListener('error', () => {
              clearTimeout(timeout);
              durations[i] = 0;
              resolve();
            });

            audio.load();
          });
        } catch (error) {
          console.warn(`[AudioContext] Error loading duration for audio ${i}:`, error);
          durations[i] = 0;
        }
      }

      setAudioDurations(durations);
    };

    loadDurations();
  }, [audioSrcs]);

  // Sincronizar refs cuando cambian desde fuera (seekToAudio, etc.)
  useEffect(() => {
    // Solo actualizar si no estamos en medio de un cambio desde handleEnded
    if (!isChangingFromEndedRef.current) {
      audioSrcsRef.current = audioSrcs;
      // Actualizar currentIndexRef solo si realmente cambió (para evitar sobrescribir cambios de seekToAudio que ya lo actualizaron)
      if (currentIndexRef.current !== currentIndex) {
        console.log(`[AudioContext] Sincronizando currentIndexRef: ${currentIndexRef.current} -> ${currentIndex}`);
        currentIndexRef.current = currentIndex;
      }
    }
  }, [audioSrcs, currentIndex]);

  // Precargar el siguiente audio
  useEffect(() => {
    if (!audioSrcs || audioSrcs.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % audioSrcs.length;
    const nextSrc = audioSrcs[nextIndex];
    
    if (nextAudioRef.current && nextSrc && audioSrcs.length > 1) {
      nextAudioRef.current.src = nextSrc;
      nextAudioRef.current.load();
    }
  }, [audioSrcs, currentIndex]);

  // Listener estable para el evento 'ended' - separado del useEffect principal
  useEffect(() => {
    const audio = currentAudioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      console.log('[AudioContext] Audio ended event fired');
      const currentAudio = currentAudioRef.current;
      if (!currentAudio) return;
      
      setIsPlaying(false);
      
      // Usar refs para obtener valores actuales sin depender de closures
      const srcs = audioSrcsRef.current;
      const idx = currentIndexRef.current;
      
      if (!srcs || srcs.length <= 1) {
        console.log('[AudioContext] Solo hay un audio, no cambiar');
        return;
      }
      
      console.log(`[AudioContext] Cambiando de audio ${idx} a ${(idx + 1) % srcs.length}`);
      
      // Hacer fade out breve del actual
      if (fadeOutTweenRef.current) {
        fadeOutTweenRef.current.kill();
      }
      
      fadeOutTweenRef.current = gsap.to(currentAudio, {
        volume: 0,
        duration: 0.3, // Fade out breve
        ease: 'power2.in',
        onComplete: () => {
          // Cambiar al siguiente audio
          const nextIndex = (idx + 1) % srcs.length;
          const nextSrc = srcs[nextIndex];
          
          console.log(`[AudioContext] Audio ${idx} terminó. Cambiando a índice ${nextIndex} de ${srcs.length} audios`);
          console.log(`[AudioContext] Src actual: ${currentAudio.src}`);
          console.log(`[AudioContext] Src siguiente: ${nextSrc}`);
          
          // Marcar que estamos cambiando desde handleEnded para evitar interferencia
          isChangingFromEndedRef.current = true;
          
          // Actualizar refs ANTES de cambiar el src para evitar que el useEffect principal interfiera
          currentIndexRef.current = nextIndex;
          audioSrcsRef.current = srcs; // Asegurar que el ref esté actualizado
          
          // Cambiar el src del audio actual (mantener la conexión del AudioContext)
          currentAudio.pause();
          currentAudio.currentTime = 0; // Resetear el tiempo
          const nextSrcString = typeof nextSrc === 'string' ? nextSrc : (nextSrc?.default || nextSrc);
          
          console.log(`[AudioContext] Estableciendo nuevo src: ${nextSrcString}`);
          currentAudio.src = nextSrcString;
          currentAudio.load();
          
          // Usar setTimeout para asegurar que el cambio de estado no interfiera
          setTimeout(() => {
            setCurrentIndex(nextIndex);
            // Resetear el flag después de un momento para permitir futuros cambios
            setTimeout(() => {
              isChangingFromEndedRef.current = false;
              console.log('[AudioContext] Flag isChangingFromEndedRef reseteado');
            }, 200);
          }, 0);
          
          fadeOutTweenRef.current = null;
          
          // Esperar a que el nuevo audio esté listo y reproducir con fade in breve
          const tryPlay = () => {
            if (currentAudio.readyState >= 2) {
              console.log('[AudioContext] Reproduciendo siguiente audio');
              currentAudio.play().then(() => {
                currentAudio.volume = 0;
                fadeInTweenRef.current = gsap.to(currentAudio, {
                  volume: 1,
                  duration: 0.4, // Fade in breve
                  ease: 'power2.out',
                  onComplete: () => {
                    fadeInTweenRef.current = null;
                    setIsPlaying(true);
                    console.log('[AudioContext] Siguiente audio reproduciéndose');
                  }
                });
              }).catch(err => console.warn('[AudioContext] Error playing next audio:', err));
            } else {
              setTimeout(tryPlay, 50);
            }
          };
          
          setTimeout(tryPlay, 50);
        }
      });
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []); // Sin dependencias - el listener se mantiene estable y usa refs para valores actuales

  // Configurar el audio actual
  useEffect(() => {
    if (!audioSrcs || audioSrcs.length === 0) return;

    const currentSrc = audioSrcs[currentIndex];
    if (!currentSrc) return;

    const audio = currentAudioRef.current;
    if (!audio) return;
    
    // Si estamos cambiando desde handleEnded, no hacer nada aquí para evitar interferencia
    if (isChangingFromEndedRef.current) {
      console.log('[AudioContext] Ignorando useEffect principal porque el cambio viene de handleEnded');
      return;
    }
    
    // Verificar si el src ya está configurado correctamente (para evitar resetear cuando handleEnded cambia el src)
    const currentSrcString = typeof currentSrc === 'string' ? currentSrc : (currentSrc?.default || currentSrc);
    const currentAudioSrc = audio.src || '';
    // Comparar normalizando las URLs (pueden ser absolutas o relativas)
    const normalizedCurrentSrc = currentAudioSrc.split('/').pop() || currentAudioSrc;
    const normalizedNewSrc = currentSrcString.split('/').pop() || currentSrcString;
    
    if ((normalizedCurrentSrc === normalizedNewSrc || currentAudioSrc === currentSrcString) && audio.readyState >= 1) {
      // El src ya está configurado y tiene metadata, no hacer nada
      return;
    }

    let progressIntervalId = null;
    let audioCleanup = null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    audio.volume = 0;
    audio.muted = false;
    audio.preload = isIOS ? 'metadata' : 'auto';
    audio.loop = false; // No loop, manejamos la playlist manualmente

    const updateProgress = () => {
      if (!audio) return;
      
      const minReadyState = isIOS ? 1 : 2;
      
      if (audio.readyState >= minReadyState) {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const progress = Math.min((bufferedEnd / audio.duration) * 100, 100);
            setLoadingProgress(progress);
            
            if (progress >= 95 || bufferedEnd >= audio.duration * 0.95) {
              if (!isLoaded) {
                setIsLoaded(true);
                setLoadingProgress(100);
              }
            } else if (!isLoaded) {
              setIsLoaded(true);
              setLoadingProgress(100);
            }
          } else if (!isLoaded) {
            setIsLoaded(true);
            setLoadingProgress(100);
          }
        } else if (!isLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      } else {
        const progress = Math.min((audio.readyState / 4) * 100, 95);
        setLoadingProgress(progress);
      }
    };

    const setupAudioContext = async () => {
      try {
        if (connectedAudioElement === audio && globalAudioContext && globalAnalyser) {
          console.log('[AudioContext] Reusing existing connection');
          audioContextRef.current = globalAudioContext;
          analyserRef.current = globalAnalyser;
          const bufferLength = globalAnalyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          timeDataArrayRef.current = new Uint8Array(bufferLength);
          setIsInitialized(true);
          return;
        }

        if (globalAudioContext && connectedAudioElement && connectedAudioElement !== audio) {
          console.log('[AudioContext] Disconnecting previous audio');
          try {
            if (globalSourceNode) {
              globalSourceNode.disconnect();
            }
          } catch (e) {
            console.warn('[AudioContext] Error disconnecting:', e);
          }
          globalSourceNode = null;
          connectedAudioElement = null;
        }

        if (!globalAudioContext || globalAudioContext.state === 'closed') {
          try {
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[AudioContext] Created AudioContext | state:', globalAudioContext.state);
          } catch (error) {
            console.error('[AudioContext] Error creating AudioContext:', error);
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
        }

        if (!globalAnalyser) {
          globalAnalyser = globalAudioContext.createAnalyser();
          globalAnalyser.fftSize = 2048;
          globalAnalyser.smoothingTimeConstant = 0.3;
          console.log('[AudioContext] Created AnalyserNode');
        }

        try {
          globalSourceNode = globalAudioContext.createMediaElementSource(audio);
          connectedAudioElement = audio;

          globalSourceNode.connect(globalAnalyser);
          globalAnalyser.connect(globalAudioContext.destination);

          if (globalAudioContext.state === 'suspended') {
            try {
              await globalAudioContext.resume();
              if (globalAudioContext.state === 'suspended') {
                setTimeout(async () => {
                  try {
                    await globalAudioContext.resume();
                  } catch (e) {
                    console.warn('[AudioContext] Error resuming AudioContext (retry):', e);
                  }
                }, 100);
              }
            } catch (resumeError) {
              console.warn('[AudioContext] Error resuming AudioContext:', resumeError);
            }
          }

          audioContextRef.current = globalAudioContext;
          analyserRef.current = globalAnalyser;
          const bufferLength = globalAnalyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          timeDataArrayRef.current = new Uint8Array(bufferLength);

          setIsInitialized(true);
          console.log('[AudioContext] Setup successful');

        } catch (connectError) {
          if (connectError.name === 'InvalidStateError') {
            console.error('[AudioContext] Audio already connected');
            setIsInitialized(true);
          } else {
            throw connectError;
          }
        }

      } catch (error) {
        console.error('[AudioContext] Error setting up AudioContext:', error);
        setIsInitialized(true);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleCanPlay = async () => {
      updateProgress();
      await setupAudioContext();
      if (!isIOS && audio.readyState >= 3) {
        // No reproducir automáticamente
      }
    };

    const handleProgress = () => updateProgress();
    const handleLoadedData = () => {
      updateProgress();
      if (isIOS && audio.readyState >= 1) {
        setIsLoaded(true);
        setLoadingProgress(100);
      }
    };

    const handleCanPlayThrough = () => {
      updateProgress();
      setIsLoaded(true);
      setLoadingProgress(100);
    };
    
    const handleError = (e) => {
      console.error('[AudioContext] Audio error:', e);
      const error = audio.error;
      if (error) {
        console.error('[AudioContext] Error code:', error.code, '| Message:', error.message);
        if (isIOS && error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          console.warn('[AudioContext] Format not supported, trying to reload');
          setTimeout(() => {
            if (audio.src) {
              audio.load();
            }
          }, 1000);
        }
      }
    };

    // El handleEnded ahora está en un useEffect separado para evitar problemas de closure

    // Configurar el src del audio actual solo si ha cambiado (currentSrcString ya está declarado arriba)
    if (normalizedCurrentSrc !== normalizedNewSrc && currentAudioSrc !== currentSrcString) {
      console.log(`[AudioContext] Cambiando src de ${normalizedCurrentSrc} a ${normalizedNewSrc}`);
      audio.src = currentSrcString;
      audio.load();
    }

    // Event listeners (ended está en un useEffect separado)
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    
    if (isIOS) {
      audio.addEventListener('loadedmetadata', () => {
        updateProgress();
        const minReadyState = 1;
        if (audio.readyState >= minReadyState && !isLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      });
    }

    audioCleanup = () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      // ended se maneja en un useEffect separado
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      if (isIOS) {
        audio.removeEventListener('loadedmetadata', () => {});
      }
    };

    if (audio.readyState === 0 || isIOS) {
      try {
        audio.load();
      } catch (loadError) {
        console.warn('[AudioContext] Error calling load():', loadError);
      }
    }

    const minReadyState = isIOS ? 1 : 2;
    progressIntervalId = setInterval(() => {
      if (isLoaded) {
        if (progressIntervalId) {
          clearInterval(progressIntervalId);
          progressIntervalId = null;
        }
        return;
      }
      
      updateProgress();
      
      if (audio.readyState >= minReadyState && !isLoaded) {
        setIsLoaded(true);
        setLoadingProgress(100);
        if (progressIntervalId) {
          clearInterval(progressIntervalId);
          progressIntervalId = null;
        }
      }
    }, isIOS ? 200 : 100);

    return () => {
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
      }
      if (audioCleanup) {
        audioCleanup();
      }
      if (fadeOutTweenRef.current) {
        fadeOutTweenRef.current.kill();
      }
      if (fadeInTweenRef.current) {
        fadeInTweenRef.current.kill();
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [audioSrcs, currentIndex]);

  const play = async () => {
    return new Promise(async (resolve) => {
      if (currentAudioRef.current && currentAudioRef.current.paused) {
        try {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
            volumeTweenRef.current = null;
          }
          
          if (globalAudioContext) {
            if (globalAudioContext.state === 'suspended') {
              try {
                await globalAudioContext.resume();
                if (isIOS && globalAudioContext.state === 'suspended') {
                  setTimeout(async () => {
                    try {
                      await globalAudioContext.resume();
                    } catch (e) {
                      console.warn('[AudioContext] Error resuming AudioContext (retry in play):', e);
                    }
                  }, 100);
                }
              } catch (resumeError) {
                console.warn('[AudioContext] Error resuming AudioContext in play:', resumeError);
              }
            }
          }
          
          if (isIOS && currentAudioRef.current.readyState < 2) {
            await new Promise((resolveWait) => {
              const timeout = setTimeout(() => {
                resolveWait();
              }, 2000);
              
              const checkReady = () => {
                if (currentAudioRef.current.readyState >= 2) {
                  clearTimeout(timeout);
                  resolveWait();
                } else {
                  setTimeout(checkReady, 50);
                }
              };
              checkReady();
            });
          }
          
          currentAudioRef.current.volume = 0;
          
          try {
            await currentAudioRef.current.play();
          } catch (playError) {
            console.error('[AudioContext] Error in play():', playError);
            if (isIOS && playError.name === 'NotAllowedError') {
              console.warn('[AudioContext] Play blocked - user interaction required');
            }
            resolve();
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, isIOS ? 100 : 50));
          
          volumeTweenRef.current = gsap.to(currentAudioRef.current, {
            volume: 1,
            duration: 2.5,
            ease: 'sine.out',
            onComplete: () => {
              volumeTweenRef.current = null;
              resolve();
            }
          });
        } catch (error) {
          console.error('[AudioContext] Error playing:', error);
          resolve();
        }
      } else {
        resolve();
      }
    });
  };

  const pause = () => {
    return new Promise((resolve) => {
      if (currentAudioRef.current && !currentAudioRef.current.paused) {
        if (volumeTweenRef.current) {
          volumeTweenRef.current.kill();
          volumeTweenRef.current = null;
        }
        
        volumeTweenRef.current = gsap.to(currentAudioRef.current, {
          volume: 0,
          duration: 0.6,
          ease: 'power2.in',
          onComplete: () => {
            if (currentAudioRef.current) {
              currentAudioRef.current.pause();
              currentAudioRef.current.volume = 0;
            }
            volumeTweenRef.current = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  // Función para cambiar a un audio específico de la playlist
  const seekToAudio = async (index, targetTime = 0) => {
    if (index < 0 || index >= audioSrcs.length) return;
    if (index === currentIndex && targetTime === 0) return; // Si es el mismo y no hay tiempo específico, no hacer nada
    
    const audio = currentAudioRef.current;
    if (!audio) return;
    
    const wasPlaying = isPlaying && !audio.paused;
    
    if (index === currentIndex) {
      // Mismo audio, solo cambiar el tiempo
      if (audio.readyState >= 2) {
        audio.currentTime = targetTime;
      } else {
        // Esperar a que esté listo
        const setTimeWhenReady = () => {
          if (audio.readyState >= 2) {
            audio.currentTime = targetTime;
            audio.removeEventListener('canplay', setTimeWhenReady);
            audio.removeEventListener('loadedmetadata', setTimeWhenReady);
          }
        };
        audio.addEventListener('canplay', setTimeWhenReady);
        audio.addEventListener('loadedmetadata', setTimeWhenReady);
      }
      return;
    }
    
    // Cambiar de audio
    if (!audio.paused) {
      // Fade out breve del actual
      if (fadeOutTweenRef.current) {
        fadeOutTweenRef.current.kill();
      }
      
      fadeOutTweenRef.current = gsap.to(audio, {
        volume: 0,
        duration: 0.3, // Fade out breve
        ease: 'power2.in',
        onComplete: () => {
          audio.pause();
          audio.currentTime = 0;
          // Actualizar el ref ANTES de setCurrentIndex para que handleEnded use el valor correcto
          currentIndexRef.current = index;
          setCurrentIndex(index);
          fadeOutTweenRef.current = null;
          
          // Esperar a que el nuevo audio esté listo
          const waitAndPlay = () => {
            const newAudio = currentAudioRef.current;
            if (newAudio && newAudio.readyState >= 2) {
              if (targetTime > 0) {
                newAudio.currentTime = targetTime;
              }
              if (wasPlaying) {
                newAudio.play().then(() => {
                  newAudio.volume = 0;
                  fadeInTweenRef.current = gsap.to(newAudio, {
                    volume: 1,
                    duration: 0.4,
                    ease: 'power2.out',
                    onComplete: () => {
                      fadeInTweenRef.current = null;
                    }
                  });
                }).catch(err => console.warn('[AudioContext] Error playing after seek:', err));
              }
            } else {
              setTimeout(waitAndPlay, 50);
            }
          };
          
          setTimeout(waitAndPlay, 50);
        }
      });
    } else {
      // Si está pausado, cambiar directamente
      // Actualizar el ref ANTES de setCurrentIndex para que handleEnded use el valor correcto
      currentIndexRef.current = index;
      setCurrentIndex(index);
      if (targetTime > 0) {
        setTimeout(() => {
          const newAudio = currentAudioRef.current;
          if (newAudio && newAudio.readyState >= 2) {
            newAudio.currentTime = targetTime;
          }
        }, 100);
      }
    }
  };

  // Función para obtener el tiempo total de la playlist
  const getTotalDuration = () => {
    return audioDurations.reduce((sum, dur) => sum + dur, 0);
  };

  // Función para obtener el tiempo transcurrido total
  const getTotalElapsed = () => {
    if (!currentAudioRef.current || audioDurations.length === 0) return 0;
    
    const previousTime = audioDurations
      .slice(0, currentIndex)
      .reduce((sum, dur) => sum + dur, 0);
    
    return previousTime + (currentAudioRef.current.currentTime || 0);
  };

  // Controles de teclado para audio
  useEffect(() => {
    if (!audioSrcs || audioSrcs.length === 0) return;

    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      const audio = currentAudioRef.current;
      if (!audio) return;

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          // Retroceder 5 segundos
          if (audio.readyState >= 2 && audio.duration) {
            audio.currentTime = Math.max(0, audio.currentTime - 5);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          // Avanzar 5 segundos
          if (audio.readyState >= 2 && audio.duration) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          // Aumentar volumen (con suavidad usando GSAP)
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
          }
          const newVolume = Math.min(1, audio.volume + 0.1);
          volumeTweenRef.current = gsap.to(audio, {
            volume: newVolume,
            duration: 0.2,
            ease: 'power2.out',
            onComplete: () => {
              volumeTweenRef.current = null;
            }
          });
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          // Disminuir volumen (con suavidad usando GSAP)
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
          }
          const newVolume = Math.max(0, audio.volume - 0.1);
          volumeTweenRef.current = gsap.to(audio, {
            volume: newVolume,
            duration: 0.2,
            ease: 'power2.out',
            onComplete: () => {
              volumeTweenRef.current = null;
            }
          });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [audioSrcs]);

  const value = {
    audioRef,
    audioContextRef,
    analyserRef,
    dataArrayRef,
    timeDataArrayRef,
    isPlaying,
    isInitialized,
    loadingProgress,
    isLoaded,
    play,
    pause,
    togglePlayPause,
    currentIndex,
    audioSrcs,
    audioDurations,
    seekToAudio,
    getTotalDuration,
    getTotalElapsed
  };

  return (
    <AudioContextReact.Provider value={value}>
      {children}
      <audio
        ref={currentAudioRef}
        crossOrigin="anonymous"
        playsInline
        className="audio-context"
      />
      <audio
        ref={nextAudioRef}
        crossOrigin="anonymous"
        playsInline
        className="audio-context"
        style={{ display: 'none' }}
      />
    </AudioContextReact.Provider>
  );
};
