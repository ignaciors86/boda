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
  const [preloadedAudios, setPreloadedAudios] = useState(false); // Estado para audios pre-cargados (todos los SO)
  const [preloadProgress, setPreloadProgress] = useState(0); // Progreso de pre-carga (0-100)
  
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
  const iosPreloadAudioElementsRef = useRef([]); // Refs para elementos Audio de pre-carga en iOS

  // El audioRef que se expone es siempre el actual
  const audioRef = currentAudioRef;

  // Función para pre-cargar todos los audios cuando hay múltiples (funciona en todos los SO)
  const preloadAllAudios = async (srcs) => {
    if (srcs.length <= 1) {
      setPreloadedAudios(true);
      setPreloadProgress(100);
      return;
    }
    
    // Limpiar audios anteriores si existen
    iosPreloadAudioElementsRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }
    });
    iosPreloadAudioElementsRef.current = [];
    setPreloadProgress(0);
    
    // Crear y pre-cargar cada audio de forma secuencial
    for (let i = 0; i < srcs.length; i++) {
      const audioSrc = srcs[i];
      const audioSrcString = typeof audioSrc === 'string' ? audioSrc : (audioSrc?.default || audioSrc);
      
      console.log(`[AudioContext] Pre-cargando audio ${i + 1}/${srcs.length}...`);
      
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = audioSrcString;
      
      // Esperar a que el audio esté suficientemente cargado usando eventos, no timeouts
      await new Promise((resolve) => {
        let resolved = false;
        
        const cleanup = () => {
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          audio.removeEventListener('loadeddata', handleLoadedData);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('error', handleError);
        };
        
        const handleCanPlay = () => {
          if (!resolved && audio.readyState >= 2) {
            resolved = true;
            cleanup();
            console.log(`[AudioContext] Audio ${i} pre-cargado (canplay, readyState: ${audio.readyState})`);
            resolve();
          }
        };
        
        const handleCanPlayThrough = () => {
          if (!resolved && audio.readyState >= 3) {
            resolved = true;
            cleanup();
            console.log(`[AudioContext] Audio ${i} pre-cargado (canplaythrough, readyState: ${audio.readyState})`);
            resolve();
          }
        };
        
        const handleLoadedData = () => {
          if (!resolved && audio.readyState >= 2) {
            resolved = true;
            cleanup();
            console.log(`[AudioContext] Audio ${i} pre-cargado (loadeddata, readyState: ${audio.readyState})`);
            resolve();
          }
        };
        
        const handleLoadedMetadata = () => {
          // Si tenemos metadata y duration, considerar listo
          if (!resolved && audio.readyState >= 1 && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            resolved = true;
            cleanup();
            console.log(`[AudioContext] Audio ${i} pre-cargado (loadedmetadata, readyState: ${audio.readyState})`);
            resolve();
          }
        };
        
        const handleError = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            console.warn(`[AudioContext] Error pre-cargando audio ${i}, continuando...`);
            resolve();
          }
        };
        
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('loadeddata', handleLoadedData);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);
        
        // Intentar cargar
        try {
          audio.load();
        } catch (error) {
          console.warn(`[AudioContext] Error al llamar load() en audio ${i}:`, error);
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve();
          }
        }
      });
      
      // Guardar referencia al audio pre-cargado
      iosPreloadAudioElementsRef.current.push(audio);
      
      // Actualizar progreso
      const progress = Math.round(((i + 1) / srcs.length) * 100);
      setPreloadProgress(progress);
    }
    
    console.log('[AudioContext] Todos los audios pre-cargados');
    setPreloadedAudios(true);
    setPreloadProgress(100);
  };

  // Cargar duraciones de todos los audios
  useEffect(() => {
    // Resetear estado de pre-carga cuando cambian los audios
    setPreloadedAudios(false);
    setPreloadProgress(0);
    
    if (!audioSrcs || audioSrcs.length === 0) {
      setAudioDurations([]);
      setPreloadedAudios(true); // Si no hay audios, marcar como listo
      setPreloadProgress(100);
      return;
    }

    const loadDurations = async () => {
      const durations = [];
      
      // Cargar duraciones usando eventos, no timeouts
      for (let i = 0; i < audioSrcs.length; i++) {
        const audioSrc = audioSrcs[i];
        const audio = new Audio(audioSrc);
        
        try {
          await new Promise((resolve) => {
            let resolved = false;
            
            const cleanup = () => {
              audio.removeEventListener('loadedmetadata', handleLoaded);
              audio.removeEventListener('error', handleError);
              audio.removeEventListener('canplay', handleCanPlay);
            };

            const handleLoaded = () => {
              if (!resolved) {
                cleanup();
                resolved = true;
                if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                  durations[i] = audio.duration;
                  console.log(`[AudioContext] Duration loaded for audio ${i}: ${audio.duration.toFixed(2)}s`);
                } else {
                  durations[i] = 0;
                }
                resolve();
              }
            };

            const handleError = (e) => {
              if (!resolved) {
                cleanup();
                resolved = true;
                console.warn(`[AudioContext] Error loading duration for audio ${i}:`, audio.error);
                durations[i] = 0;
                resolve();
              }
            };
            
            // Escuchar 'canplay' como fallback
            const handleCanPlay = () => {
              if (!resolved && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                handleLoaded();
              }
            };

            audio.addEventListener('loadedmetadata', handleLoaded);
            audio.addEventListener('error', handleError);
            audio.addEventListener('canplay', handleCanPlay);
            audio.load();
          });
        } catch (error) {
          console.warn(`[AudioContext] Error loading duration for audio ${i}:`, error);
          durations[i] = 0;
        }
      }

      setAudioDurations(durations);
      
      // Pre-cargar todos los audios cuando hay múltiples (funciona en todos los SO)
      if (audioSrcs.length > 1) {
        console.log('[AudioContext] Múltiples audios detectados: iniciando pre-carga...');
        preloadAllAudios(audioSrcs);
      } else {
        setPreloadedAudios(true); // Si solo hay un audio, marcar como listo
        setPreloadProgress(100);
      }
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
          
          // Cambiar el src del audio actual
          // En iOS, desconectar el AudioContext antes de cambiar el src para evitar problemas
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          
          if (isIOS && globalSourceNode) {
            try {
              console.log('[AudioContext] iOS: Desconectando AudioContext antes de cambiar src');
              globalSourceNode.disconnect();
              globalSourceNode = null;
              connectedAudioElement = null;
            } catch (e) {
              console.warn('[AudioContext] Error desconectando AudioContext en iOS:', e);
            }
          }
          
          currentAudio.pause();
          currentAudio.currentTime = 0; // Resetear el tiempo
          const nextSrcString = typeof nextSrc === 'string' ? nextSrc : (nextSrc?.default || nextSrc);
          
          console.log(`[AudioContext] Estableciendo nuevo src: ${nextSrcString}`);
          currentAudio.src = nextSrcString;
          currentAudio.load();
          
          // En iOS, el AudioContext se reconectará automáticamente en setupAudioContext cuando el audio esté listo
          
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
          // En iOS, el AudioContext se reconectará automáticamente en el useEffect principal
          const tryPlay = async () => {
            if (currentAudio.readyState >= 2) {
              console.log('[AudioContext] Reproduciendo siguiente audio');
              try {
                await currentAudio.play();
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
              } catch (playErr) {
                console.warn('[AudioContext] Error playing next audio:', playErr);
                // En iOS, reintentar una vez más después de un breve delay
                if (isIOS) {
                  setTimeout(async () => {
                    try {
                      await currentAudio.play();
                      currentAudio.volume = 0;
                      fadeInTweenRef.current = gsap.to(currentAudio, {
                        volume: 1,
                        duration: 0.4,
                        ease: 'power2.out',
                        onComplete: () => {
                          fadeInTweenRef.current = null;
                          setIsPlaying(true);
                        }
                      });
                    } catch (retryErr) {
                      console.error('[AudioContext] Error en reintento de play en iOS:', retryErr);
                    }
                  }, 200);
                }
              }
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
    
    // En iOS con múltiples audios, ser más estricto con la verificación
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const hasMultipleAudios = audioSrcs.length > 1;
    
    if ((normalizedCurrentSrc === normalizedNewSrc || currentAudioSrc === currentSrcString) && audio.readyState >= 1) {
      // En iOS con múltiples audios, verificar que realmente esté listo (readyState 2 y duration válida)
      if (isIOS && hasMultipleAudios) {
        if (audio.readyState < 2 || !audio.duration || !isFinite(audio.duration) || audio.duration <= 0) {
          // Forzar recarga si no está suficientemente cargado
          console.log('[AudioContext] iOS múltiples audios: readyState o duration insuficiente, forzando recarga');
          // No hacer return, continuar con la configuración
        } else {
          // El src ya está configurado y está realmente listo
          return;
        }
      } else {
        // El src ya está configurado y tiene metadata, no hacer nada
        return;
      }
    }

    let progressIntervalId = null;
    let audioCleanup = null;

    // Detección mejorada de navegadores y dispositivos (isIOS ya está definido arriba)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    audio.volume = 0;
    audio.muted = false;
    // Usar 'auto' para mejor compatibilidad, pero manejar la carga manualmente
    audio.preload = 'auto';
    audio.loop = false; // No loop, manejamos la playlist manualmente
    // Asegurar atributos de compatibilidad
    audio.crossOrigin = 'anonymous';
    audio.playsInline = true;

    const updateProgress = () => {
      if (!audio) return;
      
      // Ajustar minReadyState según el navegador para mejor compatibilidad
      let minReadyState = 2; // Por defecto, esperar metadata y datos
      if (isIOS || isSafari) {
        minReadyState = 1; // iOS/Safari puede funcionar con menos datos
      } else if (isChrome && isMobile) {
        minReadyState = 2; // Chrome mobile necesita más datos
      }
      
      if (audio.readyState >= minReadyState) {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const progress = Math.min((bufferedEnd / audio.duration) * 100, 100);
            setLoadingProgress(progress);
            
            // Para iOS/Safari, usar threshold más conservador para archivos grandes
            // Si el archivo es grande (>5 minutos), esperar más buffer
            const isLargeFile = audio.duration > 300; // 5 minutos
            const loadThreshold = (isIOS || isSafari) 
              ? (isLargeFile ? 0.95 : 0.85)  // Archivos grandes necesitan más buffer en iOS
              : 0.95;
            
            // En iOS, también verificar que tengamos suficiente buffer absoluto (al menos 30 segundos)
            const minBufferSeconds = isIOS && isLargeFile ? 30 : 0;
            const hasMinBuffer = bufferedEnd >= minBufferSeconds;
            
            if ((progress >= (loadThreshold * 100) || bufferedEnd >= audio.duration * loadThreshold) && hasMinBuffer) {
              if (!isLoaded) {
                setIsLoaded(true);
                setLoadingProgress(100);
                console.log(`[AudioContext] Audio marked as loaded. Progress: ${progress.toFixed(1)}%, Buffer: ${bufferedEnd.toFixed(1)}s/${audio.duration.toFixed(1)}s`);
              }
            }
          } else if (audio.readyState >= 3) {
            // Si readyState es suficiente, considerar cargado
            if (!isLoaded) {
              setIsLoaded(true);
              setLoadingProgress(100);
            }
          }
        } else if (audio.readyState >= 3 && !isLoaded) {
          // Si tenemos suficiente readyState pero no duration, aún considerar cargado
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
        // En iOS con múltiples audios, siempre reconectar si el elemento cambió
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const hasMultipleAudios = audioSrcs.length > 1;
        
        if (connectedAudioElement === audio && globalAudioContext && globalAnalyser && !(isIOS && hasMultipleAudios)) {
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
      // Marcar como cargado si tenemos suficiente readyState
      // En iOS con múltiples audios, verificar también duration
      if (audio.readyState >= 2) {
        if (isIOS && hasMultipleAudios) {
          // En iOS con múltiples audios, verificar duration antes de marcar como cargado
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            if (!isLoaded) {
              setIsLoaded(true);
              setLoadingProgress(100);
              console.log(`[AudioContext] Audio ${currentIndex} marcado como cargado en handleCanPlay (iOS múltiples audios)`);
            }
          }
        } else {
          if (!isLoaded) {
            setIsLoaded(true);
            setLoadingProgress(100);
          }
        }
      }
    };

    const handleProgress = () => updateProgress();
    const handleLoadedData = () => {
      updateProgress();
      // Para iOS/Safari, marcar como cargado con readyState 1
      // Para otros navegadores, esperar readyState 2
      const minReadyForLoaded = (isIOS || isSafari) ? 1 : 2;
      if (audio.readyState >= minReadyForLoaded) {
        if (!isLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      }
    };

    const handleCanPlayThrough = () => {
      updateProgress();
      setIsLoaded(true);
      setLoadingProgress(100);
    };
    
    // Handler adicional para loadedmetadata (importante para Safari/iOS)
    const handleLoadedMetadata = () => {
      updateProgress();
      if ((isIOS || isSafari) && audio.readyState >= 1) {
        if (!isLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      }
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
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    audioCleanup = () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      // ended se maneja en un useEffect separado
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };

    // En iOS con múltiples audios, siempre forzar load() y dar más tiempo
    if (audio.readyState === 0 || isIOS || (isIOS && hasMultipleAudios)) {
      try {
        console.log(`[AudioContext] Llamando load() para audio ${currentIndex} (iOS: ${isIOS}, múltiples: ${hasMultipleAudios}, readyState: ${audio.readyState})`);
        audio.load();
        
        // En iOS con múltiples audios, dar más tiempo y reintentar si es necesario
        if (isIOS && hasMultipleAudios) {
          // Reintentar múltiples veces si es necesario
          let retryCount = 0;
          const maxRetries = 3;
          const retryInterval = 1500; // 1.5 segundos entre reintentos
          
          const retryLoad = () => {
            setTimeout(() => {
              if (audio.readyState < 2 && retryCount < maxRetries) {
                retryCount++;
                console.warn(`[AudioContext] Audio ${currentIndex} aún no está listo (readyState: ${audio.readyState}), reintentando ${retryCount}/${maxRetries}...`);
                try {
                  audio.load();
                  if (retryCount < maxRetries) {
                    retryLoad();
                  }
                } catch (retryError) {
                  console.warn('[AudioContext] Error en reintento de load():', retryError);
                }
              } else if (audio.readyState >= 2) {
                console.log(`[AudioContext] Audio ${currentIndex} finalmente listo después de ${retryCount} reintentos`);
              }
            }, retryInterval);
          };
          
          retryLoad();
        }
      } catch (loadError) {
        console.warn('[AudioContext] Error calling load():', loadError);
      }
    }

    // Ajustar minReadyState y intervalo según navegador
    // En iOS con múltiples audios, ser más conservador (necesita readyState 2)
    const minReadyState = (isIOS || isSafari) 
      ? (hasMultipleAudios ? 2 : 1)  // Con múltiples audios, esperar más datos
      : 2;
    const progressInterval = (isIOS || isSafari) ? 200 : 100;
    
    progressIntervalId = setInterval(() => {
      if (isLoaded) {
        if (progressIntervalId) {
          clearInterval(progressIntervalId);
          progressIntervalId = null;
        }
        return;
      }
      
      updateProgress();
      
      // Para Chrome, esperar un poco más de buffer
      // Para Safari/iOS, aceptar con menos buffer, pero con múltiples audios ser más estricto
      const readyThreshold = (isChrome && !isMobile) 
        ? 3 
        : (isIOS && hasMultipleAudios ? 2 : minReadyState);  // iOS con múltiples audios necesita readyState 2
      
      if (audio.readyState >= readyThreshold && !isLoaded) {
        // En iOS con múltiples audios, verificar también que tenga duration válida
        if (isIOS && hasMultipleAudios) {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            setIsLoaded(true);
            setLoadingProgress(100);
            console.log(`[AudioContext] Audio ${currentIndex} marcado como cargado (iOS múltiples audios, readyState: ${audio.readyState}, duration: ${audio.duration.toFixed(2)}s)`);
            if (progressIntervalId) {
              clearInterval(progressIntervalId);
              progressIntervalId = null;
            }
          } else {
            console.log(`[AudioContext] Audio ${currentIndex} tiene readyState ${audio.readyState} pero sin duration válida, esperando...`);
          }
        } else {
          setIsLoaded(true);
          setLoadingProgress(100);
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
            progressIntervalId = null;
          }
        }
      }
    }, progressInterval);

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
          const hasMultipleAudios = audioSrcsRef.current.length > 1;
          
          // Con múltiples audios, esperar a que todos estén pre-cargados (usa estados, no timeouts)
          if (hasMultipleAudios && !preloadedAudios) {
            console.log('[AudioContext] Múltiples audios: esperando a que todos estén pre-cargados...');
            // Esperar usando un efecto que observe el estado preloadedAudios
            // Usar un intervalo corto solo para verificar el estado, no como timeout
            await new Promise((resolveWait) => {
              const checkInterval = setInterval(() => {
                if (preloadedAudios) {
                  clearInterval(checkInterval);
                  console.log('[AudioContext] Todos los audios pre-cargados, continuando con play()');
                  resolveWait();
                }
              }, 100); // Verificar cada 100ms el estado
            });
          }
          
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
          
          // Esperar a que el audio esté listo usando eventos, no timeouts
          if (currentAudioRef.current.readyState < 2) {
            await new Promise((resolveWait) => {
              const audio = currentAudioRef.current;
              let resolved = false;
              
              const cleanup = () => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('loadeddata', handleLoadedData);
                audio.removeEventListener('error', handleError);
              };
              
              const handleCanPlay = () => {
                if (!resolved && audio.readyState >= 2) {
                  resolved = true;
                  cleanup();
                  console.log(`[AudioContext] Audio listo (canplay, readyState: ${audio.readyState})`);
                  resolveWait();
                }
              };
              
              const handleLoadedData = () => {
                if (!resolved && audio.readyState >= 2) {
                  resolved = true;
                  cleanup();
                  console.log(`[AudioContext] Audio listo (loadeddata, readyState: ${audio.readyState})`);
                  resolveWait();
                }
              };
              
              const handleError = () => {
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  console.warn('[AudioContext] Error esperando audio listo, continuando...');
                  resolveWait();
                }
              };
              
              // Si ya está listo, resolver inmediatamente
              if (audio.readyState >= 2) {
                resolveWait();
                return;
              }
              
              audio.addEventListener('canplay', handleCanPlay);
              audio.addEventListener('loadeddata', handleLoadedData);
              audio.addEventListener('error', handleError);
              
              // Verificar periódicamente el estado (solo como fallback, los eventos deberían dispararse)
              const checkInterval = setInterval(() => {
                if (audio.readyState >= 2 && !resolved) {
                  resolved = true;
                  clearInterval(checkInterval);
                  cleanup();
                  console.log(`[AudioContext] Audio listo (verificación periódica, readyState: ${audio.readyState})`);
                  resolveWait();
                }
              }, 100);
            });
          }
          
          currentAudioRef.current.volume = 0;
          
          // En iOS con múltiples audios, intentar reproducir múltiples veces si es necesario
          let playAttempts = 0;
          const maxPlayAttempts = isIOS && hasMultipleAudios ? 5 : 1;
          
          while (playAttempts < maxPlayAttempts) {
            try {
              await currentAudioRef.current.play();
              console.log(`[AudioContext] Audio reproducido exitosamente (intento ${playAttempts + 1})`);
              break; // Éxito, salir del bucle
            } catch (playError) {
              playAttempts++;
              console.warn(`[AudioContext] Error en play() (intento ${playAttempts}/${maxPlayAttempts}):`, playError);
              
              if (isIOS && playError.name === 'NotAllowedError') {
                console.warn('[AudioContext] Play blocked - user interaction required');
                resolve();
                return;
              }
              
              // Si hay múltiples audios y aún hay intentos, esperar eventos y reintentar
              if (hasMultipleAudios && playAttempts < maxPlayAttempts) {
                console.log(`[AudioContext] Reintentando play() (intento ${playAttempts + 1}/${maxPlayAttempts})...`);
                
                // Asegurarse de que el audio esté listo antes de reintentar usando eventos
                if (currentAudioRef.current.readyState < 2) {
                  console.log('[AudioContext] Audio no está listo, forzando load() y esperando eventos...');
                  currentAudioRef.current.load();
                  
                  // Esperar a que esté listo usando eventos
                  await new Promise((resolveReady) => {
                    const audio = currentAudioRef.current;
                    let resolved = false;
                    
                    const cleanup = () => {
                      audio.removeEventListener('canplay', handleCanPlay);
                      audio.removeEventListener('loadeddata', handleLoadedData);
                    };
                    
                    const handleCanPlay = () => {
                      if (!resolved && audio.readyState >= 2) {
                        resolved = true;
                        cleanup();
                        resolveReady();
                      }
                    };
                    
                    const handleLoadedData = () => {
                      if (!resolved && audio.readyState >= 2) {
                        resolved = true;
                        cleanup();
                        resolveReady();
                      }
                    };
                    
                    if (audio.readyState >= 2) {
                      resolveReady();
                      return;
                    }
                    
                    audio.addEventListener('canplay', handleCanPlay);
                    audio.addEventListener('loadeddata', handleLoadedData);
                  });
                }
              } else {
                // No más intentos o no es iOS con múltiples audios
                console.error('[AudioContext] No se pudo reproducir el audio después de todos los intentos');
                resolve();
                return;
              }
            }
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
        console.log('[AudioContext] pause() llamado, iniciando fade out del volumen');
        if (volumeTweenRef.current) {
          volumeTweenRef.current.kill();
          volumeTweenRef.current = null;
        }
        
        const currentVolume = currentAudioRef.current.volume;
        console.log('[AudioContext] Volumen actual:', currentVolume);
        
        volumeTweenRef.current = gsap.to(currentAudioRef.current, {
          volume: 0,
          duration: 0.6,
          ease: 'power2.in',
          onComplete: () => {
            console.log('[AudioContext] Fade out del volumen completado');
            if (currentAudioRef.current) {
              currentAudioRef.current.pause();
              currentAudioRef.current.volume = 0;
            }
            volumeTweenRef.current = null;
            resolve();
          }
        });
      } else {
        console.log('[AudioContext] pause() llamado pero el audio ya está pausado o no existe');
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

