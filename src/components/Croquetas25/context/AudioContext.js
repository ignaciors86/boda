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

export const AudioProvider = ({ children, audioSrc }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Refs que se compartirán con los componentes
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const timeDataArrayRef = useRef(null);
  const volumeTweenRef = useRef(null); // Ref para la animación de volumen

  useEffect(() => {
    if (!audioSrc) return;

    const audio = audioRef.current;
    if (!audio) {
      // Esperar a que el elemento audio esté disponible
      const timeoutId = setTimeout(() => {
        // Reintentar en el siguiente render
      }, 50);
      return () => clearTimeout(timeoutId);
    }

    let progressIntervalId = null;
    let audioCleanup = null;

    // Detectar iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Configurar el elemento audio
    audio.volume = 0; // Empezar en 0 para que el fade funcione correctamente
    audio.muted = false;
    // iOS funciona mejor con 'metadata' en lugar de 'auto'
    audio.preload = isIOS ? 'metadata' : 'auto';

    // Función para actualizar el progreso de carga
    const updateProgress = () => {
      if (!audio) return;
      
      // En iOS, readyState puede ser más lento, así que ser más permisivo
      const minReadyState = isIOS ? 1 : 2;
      
      // Si tiene metadata cargada (readyState >= minReadyState) y duración, considerarlo listo
      if (audio.readyState >= minReadyState && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        // Si tiene buffer, usar el progreso del buffer
        if (audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const progress = Math.min((bufferedEnd / audio.duration) * 100, 100);
          setLoadingProgress(progress);
          
          if (progress >= 95 || bufferedEnd >= audio.duration * 0.95) {
            setIsLoaded(true);
            setLoadingProgress(100);
          } else if (audio.readyState >= minReadyState) {
            // Si tiene metadata pero buffer incompleto, marcar como 100% de todas formas
            // porque el buffer se cargará durante la reproducción
            setIsLoaded(true);
            setLoadingProgress(100);
          }
        } else {
          // Si tiene metadata pero no buffer aún, marcar como listo (el buffer se cargará después)
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      } else if (audio.readyState >= minReadyState) {
        // Si tiene metadata pero no duración aún, usar readyState como indicador
        let progress = 0;
        if (audio.readyState >= minReadyState) progress = 100; // Metadata cargada = listo
        
        setLoadingProgress(progress);
        if (audio.readyState >= minReadyState) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      }
    };

    // Configurar AudioContext y AnalyserNode
    const setupAudioContext = async () => {
      try {
        // Si ya está conectado y todo está bien, reutilizar
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

        // Si hay un audio diferente conectado, desconectarlo primero
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

        // Crear AudioContext si no existe o está cerrado
        if (!globalAudioContext || globalAudioContext.state === 'closed') {
          try {
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[AudioContext] Created AudioContext | state:', globalAudioContext.state);
          } catch (error) {
            console.error('[AudioContext] Error creating AudioContext:', error);
            // En iOS, si falla, intentar crear sin opciones
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
        }

        // Crear AnalyserNode si no existe
        if (!globalAnalyser) {
          globalAnalyser = globalAudioContext.createAnalyser();
          globalAnalyser.fftSize = 2048;
          globalAnalyser.smoothingTimeConstant = 0.3;
          console.log('[AudioContext] Created AnalyserNode');
        }

        // Conectar el audio al AudioContext
        try {
          globalSourceNode = globalAudioContext.createMediaElementSource(audio);
          connectedAudioElement = audio;

          // Conectar: source -> analyser -> destination
          globalSourceNode.connect(globalAnalyser);
          globalAnalyser.connect(globalAudioContext.destination);

          // Asegurar que el AudioContext esté en estado 'running'
          // En iOS, puede necesitar múltiples intentos
          if (globalAudioContext.state === 'suspended') {
            try {
              await globalAudioContext.resume();
              // Si todavía está suspendido, intentar de nuevo después de un delay
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
              // Continuar de todas formas, el audio puede funcionar sin AudioContext
            }
          }

          // Establecer los refs inmediatamente
          audioContextRef.current = globalAudioContext;
          analyserRef.current = globalAnalyser;
          const bufferLength = globalAnalyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          timeDataArrayRef.current = new Uint8Array(bufferLength);

          setIsInitialized(true);
          console.log('[AudioContext] Setup successful | analyserRef:', !!analyserRef.current, '| bufferLength:', bufferLength);

        } catch (connectError) {
          if (connectError.name === 'InvalidStateError') {
            console.error('[AudioContext] Audio already connected - this should not happen');
            // Si el audio ya está conectado, no podemos crear un AnalyserNode funcional
            // Pero aún podemos reproducir el audio directamente
            setIsInitialized(true);
          } else {
            throw connectError;
          }
        }

      } catch (error) {
        console.error('[AudioContext] Error setting up AudioContext:', error);
        setIsInitialized(true); // Permitir reproducción directa
      }
    };

    // Función para reproducir el audio con fade in
    const playAudio = async () => {
      try {
        // En iOS, asegurar que el AudioContext esté activo
        if (globalAudioContext) {
          if (globalAudioContext.state === 'suspended') {
            try {
              await globalAudioContext.resume();
            } catch (e) {
              console.warn('[AudioContext] Error resuming AudioContext in playAudio:', e);
            }
          }
        }

        if (audio.paused) {
          // Asegurar que el volumen esté en 0 antes de reproducir
          audio.volume = 0;
          
          // En iOS, puede necesitar que el audio esté cargado primero
          if (isIOS && audio.readyState < 2) {
            // Esperar a que tenga metadata
            await new Promise((resolve) => {
              const checkReady = () => {
                if (audio.readyState >= 2) {
                  resolve();
                } else {
                  setTimeout(checkReady, 50);
                }
              };
              checkReady();
            });
          }
          
          // Reproducir el audio con manejo de errores mejorado
          try {
            await audio.play();
            setIsPlaying(true);
            
            // Pequeño delay para asegurar que el audio haya empezado
            await new Promise(resolve => setTimeout(resolve, isIOS ? 100 : 50));
            
            // Animar el volumen de 0 a 1 con fade muy suave y largo
            gsap.to(audio, {
              volume: 1,
              duration: 2.5, // Fade más largo para que sea super suave
              ease: 'sine.out' // Ease muy suave
            });
            
            if (!isLoaded) {
              setIsLoaded(true);
              setLoadingProgress(100);
            }
          } catch (playError) {
            console.error('[AudioContext] Error in audio.play():', playError);
            // En iOS, puede fallar si no hay interacción del usuario
            // Intentar de nuevo después de un delay
            if (isIOS && playError.name === 'NotAllowedError') {
              console.warn('[AudioContext] Play blocked - user interaction required');
            }
            throw playError;
          }
        }
      } catch (error) {
        console.error('[AudioContext] Error playing audio:', error);
      }
    };

    // Event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleCanPlay = async () => {
      updateProgress();
      await setupAudioContext();
      // En iOS, no intentar reproducir automáticamente desde canplay
      // Esperar a que el usuario interactúe
      if (!isIOS && audio.readyState >= 3) {
        await playAudio();
      }
    };

    const handleProgress = () => updateProgress();
    const handleLoadedData = () => {
      updateProgress();
      // En iOS, loadeddata puede ser más confiable que canplay
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
    
    // Manejar errores de carga en iOS
    const handleError = (e) => {
      console.error('[AudioContext] Audio error:', e);
      const error = audio.error;
      if (error) {
        console.error('[AudioContext] Error code:', error.code, '| Message:', error.message);
        // En iOS, algunos errores pueden ser temporales
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

    // Configurar event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    // En iOS, loadedmetadata puede ser más confiable
    if (isIOS) {
      audio.addEventListener('loadedmetadata', () => {
        updateProgress();
        if (audio.readyState >= 1) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      });
    }

    audioCleanup = () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      if (isIOS) {
        audio.removeEventListener('loadedmetadata', () => {});
      }
    };

    // Cargar el audio explícitamente
    // En iOS, es importante llamar a load() explícitamente
    if (audio.readyState === 0 || isIOS) {
      try {
        audio.load();
      } catch (loadError) {
        console.warn('[AudioContext] Error calling load():', loadError);
      }
    }

    // Actualizar progreso periódicamente
    const minReadyState = isIOS ? 1 : 2;
    progressIntervalId = setInterval(() => {
      updateProgress();
      // Si el audio tiene metadata cargada (readyState >= minReadyState), considerarlo completamente listo
      // No esperamos a que el buffer esté al 100% porque puede cargarse durante la reproducción
      if (audio.readyState >= minReadyState) {
        if (!isLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      }
      if (isLoaded) {
        clearInterval(progressIntervalId);
      }
    }, isIOS ? 200 : 100); // En iOS, verificar menos frecuentemente

    // Cleanup
    return () => {
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
      }
      if (audioCleanup) {
        audioCleanup();
      }
    };
  }, [audioSrc, isLoaded]);

  const play = async () => {
    return new Promise(async (resolve) => {
      if (audioRef.current && audioRef.current.paused) {
        try {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          
          // Cancelar cualquier animación de volumen en curso
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
            volumeTweenRef.current = null;
          }
          
          // Asegurar que el AudioContext esté activo
          if (globalAudioContext) {
            if (globalAudioContext.state === 'suspended') {
              try {
                await globalAudioContext.resume();
                // En iOS, puede necesitar un segundo intento
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
          
          // En iOS, asegurar que el audio tenga metadata antes de reproducir
          if (isIOS && audioRef.current.readyState < 2) {
            // Esperar a que tenga metadata con timeout
            await new Promise((resolveWait) => {
              const timeout = setTimeout(() => {
                resolveWait(); // Continuar incluso si no carga
              }, 2000);
              
              const checkReady = () => {
                if (audioRef.current.readyState >= 2) {
                  clearTimeout(timeout);
                  resolveWait();
                } else {
                  setTimeout(checkReady, 50);
                }
              };
              checkReady();
            });
          }
          
          // Fade in del volumen - super suave
          audioRef.current.volume = 0;
          
          // Intentar reproducir con manejo de errores mejorado
          try {
            await audioRef.current.play();
          } catch (playError) {
            console.error('[AudioContext] Error in play():', playError);
            // En iOS, si falla por falta de interacción, intentar de nuevo
            if (isIOS && playError.name === 'NotAllowedError') {
              console.warn('[AudioContext] Play blocked - user interaction required');
            }
            resolve(); // Resolver para no bloquear
            return;
          }
          
          // Pequeño delay para asegurar que el audio haya empezado
          await new Promise(resolve => setTimeout(resolve, isIOS ? 100 : 50));
          
          // Animar el volumen de 0 a 1 con fade muy suave y largo
          volumeTweenRef.current = gsap.to(audioRef.current, {
            volume: 1,
            duration: 2.5, // Fade más largo para que sea super suave
            ease: 'sine.out', // Ease muy suave
            onComplete: () => {
              volumeTweenRef.current = null;
              resolve(); // Resolver cuando el fade-in termine
            }
          });
        } catch (error) {
          console.error('[AudioContext] Error playing:', error);
          resolve(); // Resolver incluso si hay error
        }
      } else {
        // Si ya está reproduciéndose, resolver inmediatamente
        resolve();
      }
    });
  };

  const pause = () => {
    return new Promise((resolve) => {
      if (audioRef.current && !audioRef.current.paused) {
        // Cancelar cualquier animación de volumen en curso
        if (volumeTweenRef.current) {
          volumeTweenRef.current.kill();
          volumeTweenRef.current = null;
        }
        
        // Fade out del volumen antes de pausar - más rápido
        volumeTweenRef.current = gsap.to(audioRef.current, {
          volume: 0,
          duration: 0.6, // Fade más rápido
          ease: 'power2.in',
          onComplete: () => {
            if (audioRef.current) {
              audioRef.current.pause();
              // Dejar volumen en 0 para que el próximo play empiece desde 0
              audioRef.current.volume = 0;
            }
            volumeTweenRef.current = null;
            resolve(); // Resolver la Promise cuando el fade-out termine
          }
        });
      } else {
        // Si ya está pausado, resolver inmediatamente
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
    togglePlayPause
  };

  return (
    <AudioContextReact.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={audioSrc}
        crossOrigin="anonymous"
        loop
        playsInline
        className="audio-context"
      />
    </AudioContextReact.Provider>
  );
};
