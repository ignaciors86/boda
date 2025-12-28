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

// Singleton para el AudioContext global (Web Audio API)
let globalAudioContext = null;
let globalSourceNode = null;
let globalAnalyser = null;
let connectedAudioElement = null;

if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__globalAudioContext', {
    get: () => globalAudioContext,
    configurable: true
  });
}

export const AudioProvider = ({ children, audioSrcs = [] }) => {
  // Detectar dispositivo móvil
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  
  // Estados
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [audioDurations, setAudioDurations] = useState([]);
  const [preloadedAudios, setPreloadedAudios] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  
  // Refs
  const currentAudioRef = useRef(null);
  const audioElementsRef = useRef([]); // Array de elementos audio para múltiples audios
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const timeDataArrayRef = useRef(null);
  const volumeTweenRef = useRef(null);
  const fadeOutTweenRef = useRef(null);
  const fadeInTweenRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const handleEndedRef = useRef(null);
  const audioSrcsRef = useRef(audioSrcs);
  const currentIndexRef = useRef(currentIndex);
  const preloadCheckIntervalRef = useRef(null);
  
  // Actualizar refs cuando cambian los valores
  useEffect(() => {
    audioSrcsRef.current = audioSrcs;
  }, [audioSrcs]);
  
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  // Estado para los srcs de los elementos audio (para renderizado en React)
  const [audioSrcsForRender, setAudioSrcsForRender] = useState([]);
  const audioElementRefs = useRef({}); // Refs para cada elemento audio renderizado
  
  // Función para obtener el elemento audio actual
  const getCurrentAudio = () => {
    if (isMobile && audioSrcsForRender.length > 0) {
      // En móviles, obtener el elemento del DOM por su índice
      const audioElement = audioElementRefs.current[currentIndex];
      return audioElement || null;
    }
    return currentAudioRef.current;
  };
  
  // Pre-cargar todos los audios (monitorear elementos renderizados)
  const preloadAllAudios = async (srcs) => {
    if (!srcs || srcs.length === 0) {
      setPreloadedAudios(true);
      setPreloadProgress(100);
      setIsLoaded(true);
      return;
    }
    
    console.log('[AudioContext] Iniciando pre-carga de audios:', srcs.length);
    setPreloadProgress(0);
    setPreloadedAudios(false);
    setIsLoaded(false);
    
    const durations = [];
    let loadedCount = 0;
    const totalCount = srcs.length;
    
    const checkAllLoaded = () => {
      if (loadedCount === totalCount) {
        setPreloadedAudios(true);
        setPreloadProgress(100);
        setIsLoaded(true);
        setAudioDurations(durations);
        console.log('[AudioContext] Todos los audios pre-cargados');
        
        if (preloadCheckIntervalRef.current) {
          clearInterval(preloadCheckIntervalRef.current);
          preloadCheckIntervalRef.current = null;
        }
      }
    };
    
    // Función para verificar carga de un elemento audio
    const checkAudioLoad = (audio, index) => {
      if (!audio) return false;
      
      if (audio.readyState >= 2 && durations[index] === undefined) {
        loadedCount++;
        const duration = audio.duration && isFinite(audio.duration) ? audio.duration : 0;
        durations[index] = duration;
        
        const progress = Math.round((loadedCount / totalCount) * 100);
        setPreloadProgress(progress);
        
        console.log(`[AudioContext] Audio ${index} cargado: ${duration.toFixed(2)}s`);
        
        checkAllLoaded();
        return true;
      }
      
      return false;
    };
    
    // Configurar listeners para elementos audio cuando se rendericen
    const setupAudioListeners = (audio, index) => {
      if (!audio || audioElementRefs.current[index]) return;
      
      audioElementRefs.current[index] = audio;
      
      const handleCanPlay = () => {
        checkAudioLoad(audio, index);
      };
      
      const handleError = () => {
        console.warn(`[AudioContext] Error cargando audio ${index}`);
        if (durations[index] === undefined) {
          loadedCount++;
          durations[index] = 0;
          
          const progress = Math.round((loadedCount / totalCount) * 100);
          setPreloadProgress(progress);
          
          checkAllLoaded();
        }
      };
      
            audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('canplaythrough', handleCanPlay);
      audio.addEventListener('error', handleError);
      
      // Verificar si ya está cargado
      checkAudioLoad(audio, index);
    };
    
    // Verificación periódica de elementos renderizados
    preloadCheckIntervalRef.current = setInterval(() => {
      // Verificar todos los elementos audio disponibles
      Object.keys(audioElementRefs.current).forEach(key => {
        const index = parseInt(key);
        const audio = audioElementRefs.current[index];
        if (audio) {
          checkAudioLoad(audio, index);
        }
      });
      
      // Si todos están listos, detener el intervalo
      if (loadedCount === totalCount) {
        checkAllLoaded();
      }
    }, 200);
    
    // Timeout de seguridad
    setTimeout(() => {
      if (!preloadedAudios) {
        console.warn('[AudioContext] Timeout de pre-carga, marcando como cargado');
        Object.keys(audioElementRefs.current).forEach(key => {
          const index = parseInt(key);
          const audio = audioElementRefs.current[index];
          if (audio && durations[index] === undefined) {
            durations[index] = audio.duration && isFinite(audio.duration) ? audio.duration : 0;
            loadedCount++;
          }
        });
        
        // Completar los que faltan
        for (let i = 0; i < totalCount; i++) {
          if (durations[i] === undefined) {
            durations[i] = 0;
            loadedCount++;
          }
        }
        
        setPreloadedAudios(true);
        setPreloadProgress(100);
        setIsLoaded(true);
        setAudioDurations(durations);
        
        if (preloadCheckIntervalRef.current) {
          clearInterval(preloadCheckIntervalRef.current);
          preloadCheckIntervalRef.current = null;
        }
      }
    }, 15000);
  };
  
  // Pre-cargar cuando cambian los audioSrcs o cuando se renderizan los elementos
  useEffect(() => {
    if (audioSrcs && audioSrcs.length > 0 && audioSrcsForRender.length > 0) {
      // Esperar un poco para que los elementos estén en el DOM
      const timer = setTimeout(() => {
        preloadAllAudios(audioSrcs);
      }, 200);
      
      return () => {
        clearTimeout(timer);
        if (preloadCheckIntervalRef.current) {
          clearInterval(preloadCheckIntervalRef.current);
          preloadCheckIntervalRef.current = null;
        }
      };
    } else if (!audioSrcs || audioSrcs.length === 0) {
      setPreloadedAudios(true);
      setIsLoaded(true);
    }
  }, [audioSrcs, audioSrcsForRender]);

  // Inicializar Web Audio API cuando el audio esté listo
  useEffect(() => {
    const audio = getCurrentAudio();
    if (!audio || !isLoaded) return;
    
    const initWebAudio = async () => {
      try {
        // Crear o reutilizar AudioContext global
        if (!globalAudioContext) {
          globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        audioContextRef.current = globalAudioContext;
        
        // Si el contexto está suspendido, intentar resumirlo
        if (globalAudioContext.state === 'suspended') {
          await globalAudioContext.resume();
        }
        
        // Conectar el elemento audio al AudioContext
        if (connectedAudioElement !== audio) {
            if (globalSourceNode) {
            try {
              globalSourceNode.disconnect();
          } catch (e) {
              // Ignorar errores de desconexión
            }
          }
          
          globalSourceNode = globalAudioContext.createMediaElementSource(audio);
          globalAnalyser = globalAudioContext.createAnalyser();
          globalAnalyser.fftSize = 2048;
          globalAnalyser.smoothingTimeConstant = 0.8;

          globalSourceNode.connect(globalAnalyser);
          globalAnalyser.connect(globalAudioContext.destination);

          analyserRef.current = globalAnalyser;
          connectedAudioElement = audio;
          
          const bufferLength = globalAnalyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          timeDataArrayRef.current = new Uint8Array(bufferLength);

          setIsInitialized(true);
          console.log('[AudioContext] Web Audio API inicializado');
        }
      } catch (error) {
        console.warn('[AudioContext] Error inicializando Web Audio API:', error);
        setIsInitialized(false);
      }
    };
    
    initWebAudio();
  }, [isLoaded, currentIndex, isMobile]);
  
  // Manejar cuando termina un audio
  const handleEnded = () => {
    const nextIndex = (currentIndexRef.current + 1) % audioSrcsRef.current.length;
    
    if (nextIndex !== currentIndexRef.current) {
      setCurrentIndex(nextIndex);
      setIsPlaying(false);
      
      // Reproducir el siguiente audio automáticamente
          setTimeout(() => {
        play();
      }, 100);
    } else {
      setIsPlaying(false);
    }
  };
  
  // Asignar handler de ended al audio actual
  useEffect(() => {
    const audio = getCurrentAudio();
    if (!audio) return;
    
    audio.addEventListener('ended', handleEnded);
    handleEndedRef.current = handleEnded;
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, isLoaded]);
  
  // Play
  const play = async () => {
    const audio = getCurrentAudio();
    if (!audio || !isLoaded) {
      console.warn('[AudioContext] No se puede reproducir: audio no disponible o no cargado');
        return;
      }
      
    try {
      // En móviles, asegurar que el AudioContext esté activo
      if (isMobile && audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Fade in
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
      }
      
      audio.volume = 0;
      await audio.play();
      
      volumeTweenRef.current = gsap.to(audio, {
            volume: 1,
            duration: 2.5,
        ease: 'sine.out'
      });
      
      setIsPlaying(true);
      console.log('[AudioContext] Reproduciendo audio:', currentIndex);
        } catch (error) {
      console.error('[AudioContext] Error al reproducir:', error);
      setIsPlaying(false);
    }
  };
  
  // Pause
  const pause = async () => {
    const audio = getCurrentAudio();
    if (!audio) return;
    
    try {
      // Fade out
        if (volumeTweenRef.current) {
          volumeTweenRef.current.kill();
        }
        
      fadeOutTweenRef.current = gsap.to(audio, {
          volume: 0,
        duration: 1.5,
        ease: 'sine.in',
          onComplete: () => {
          audio.pause();
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('[AudioContext] Error al pausar:', error);
      audio.pause();
      setIsPlaying(false);
    }
  };
  
  // Toggle play/pause
  const togglePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  // Seek to audio index
  const seekToAudio = async (index) => {
    if (index < 0 || index >= audioSrcsRef.current.length) return;
    
    const wasPlaying = isPlaying;
    await pause();
    
          setCurrentIndex(index);
    
              if (wasPlaying) {
        setTimeout(() => {
        play();
        }, 100);
    }
  };

  // Get total duration
  const getTotalDuration = () => {
    return audioDurations.reduce((sum, dur) => sum + dur, 0);
  };

  // Get total elapsed time
  const getTotalElapsed = () => {
    let total = 0;
    
    for (let i = 0; i < currentIndex; i++) {
      total += audioDurations[i] || 0;
    }
    
    const audio = getCurrentAudio();
    if (audio && audio.currentTime) {
      total += audio.currentTime;
    }
    
    return total;
  };
  
  // Valor del contexto
  const value = {
    audioRef: currentAudioRef,
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
    getTotalElapsed,
    preloadProgress,
    preloadedAudios
  };
  
  // Actualizar srcs cuando se pre-cargan los audios
  useEffect(() => {
    if (audioSrcs && audioSrcs.length > 0) {
      const srcs = audioSrcs.map(src => {
        if (typeof src !== 'string') {
          return src?.default || src;
        }
        return src;
      });
      setAudioSrcsForRender(srcs);
      
      // Limpiar refs anteriores
      audioElementRefs.current = {};
    }
  }, [audioSrcs]);
  
  // Configurar listeners cuando se renderizan los elementos audio
  useEffect(() => {
    if (isMobile && audioSrcsForRender.length > 0) {
      // Usar setTimeout para asegurar que los elementos estén en el DOM
      const timer = setTimeout(() => {
        audioSrcsForRender.forEach((src, index) => {
          const audioId = `audio-mobile-${index}`;
          const audio = document.getElementById(audioId);
          if (audio && !audioElementRefs.current[index]) {
            audioElementRefs.current[index] = audio;
            
            const handleCanPlay = () => {
              if (audio.readyState >= 2) {
                const duration = audio.duration && isFinite(audio.duration) ? audio.duration : 0;
                console.log(`[AudioContext] Audio ${index} detectado: ${duration.toFixed(2)}s`);
              }
            };
            
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('canplaythrough', handleCanPlay);
            audio.addEventListener('error', () => {
              console.warn(`[AudioContext] Error en audio ${index}`);
            });
          }
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, audioSrcsForRender]);
  
  // Actualizar src del elemento audio cuando cambia currentIndex (desktop)
  useEffect(() => {
    if (!isMobile && currentAudioRef.current && audioSrcsForRender.length > 0) {
      const audioSrc = audioSrcsForRender[currentIndex];
      if (currentAudioRef.current.src !== audioSrc) {
        currentAudioRef.current.src = audioSrc;
        currentAudioRef.current.load();
      }
    }
  }, [currentIndex, audioSrcsForRender, isMobile]);

  return (
    <AudioContextReact.Provider value={value}>
      {children}
      {/* Renderizar elementos audio */}
      {isMobile && audioSrcsForRender.length > 0 ? (
        // Móvil: renderizar todos los elementos audio con sus src
        audioSrcsForRender.map((src, index) => {
          const audioRef = index === currentIndex ? currentAudioRef : null;
          return (
            <audio
              key={`audio-mobile-${index}`}
              id={`audio-mobile-${index}`}
              ref={(el) => {
                if (audioRef) {
                  audioRef.current = el;
                }
                if (el) {
                  audioElementRefs.current[index] = el;
                }
              }}
              src={src}
              crossOrigin="anonymous"
              playsInline
              preload="auto"
              className="audio-context"
              style={{ display: 'none' }}
            />
          );
        })
      ) : (
        // Desktop: un solo elemento audio (src se actualiza en useEffect)
      <audio
          ref={currentAudioRef}
        crossOrigin="anonymous"
        playsInline
        className="audio-context"
      />
      )}
    </AudioContextReact.Provider>
  );
};
