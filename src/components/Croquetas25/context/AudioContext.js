import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import './AudioContext.scss';

const AudioContext = createContext();

/**
 * AudioProvider para Croquetas25
 * Maneja uno o varios archivos de audio con soporte completo para dispositivos móviles
 * Similar a cómo funciona Timeline en producción, pero con Web Audio API para análisis
 */
export const AudioProvider = ({ children, audioSrcs = [] }) => {
  // Referencias a elementos de audio
  const audioRefs = useRef([]);
  const audioRef = useRef(null); // Referencia al audio actual
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const dataArrayRef = useRef(null);
  const timeDataArrayRef = useRef(null);
  
  // Estados
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [audioDurations, setAudioDurations] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Detección de dispositivo móvil
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768)
  );
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isChromeIOS = isIOS && /CriOS/.test(navigator.userAgent);
  const isSafariIOS = isIOS && !isChromeIOS;
  
  // Referencias para manejo de eventos
  const loadingPromisesRef = useRef([]);
  const hasUserInteractedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const connectedAudioElementsRef = useRef(new WeakMap()); // Rastrear elementos ya conectados
  const isUnmountingRef = useRef(false);
  
  /**
   * Inicializar AudioContext y Analyser
   */
  const initializeAudioContext = useCallback(async () => {
    if (isInitializingRef.current || audioContextRef.current) return;
    
    try {
      isInitializingRef.current = true;
      
      // Crear AudioContext (compatible con iOS)
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[AudioContext] Web Audio API no disponible');
        return;
      }
      
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      // Exponer globalmente para acceso desde eventos de usuario (iOS)
      if (typeof window !== 'undefined') {
        window.__globalAudioContext = audioContext;
      }
      
      // Crear AnalyserNode
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // Crear arrays para datos de frecuencia y tiempo
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      timeDataArrayRef.current = new Uint8Array(bufferLength);
      
      console.log('[AudioContext] AudioContext inicializado:', {
        state: audioContext.state,
        sampleRate: audioContext.sampleRate,
        fftSize: analyser.fftSize
      });
      
      // En iOS, el AudioContext puede empezar suspendido
      if (audioContext.state === 'suspended') {
        console.log('[AudioContext] AudioContext suspendido, esperando interacción del usuario');
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('[AudioContext] Error inicializando AudioContext:', error);
      isInitializingRef.current = false;
    }
  }, []);
  
  /**
   * Conectar audio element al AudioContext para análisis
   */
  const connectAudioToContext = useCallback((audioElement) => {
    if (!audioElement || !audioContextRef.current || !analyserRef.current) return;
    
    // Verificar que el AudioContext no esté cerrado
    if (audioContextRef.current.state === 'closed') {
      console.warn('[AudioContext] AudioContext está cerrado, no se puede conectar');
      return;
    }
    
    // Verificar si este elemento ya está conectado
    if (connectedAudioElementsRef.current.has(audioElement)) {
      console.log('[AudioContext] Audio element ya está conectado, reutilizando conexión');
      sourceNodeRef.current = connectedAudioElementsRef.current.get(audioElement);
      return;
    }
    
    try {
      // Si ya hay una conexión de otro elemento, desconectarla primero
      // WeakMap no es iterable, así que simplemente desconectamos el sourceNode actual
      // si existe y es diferente del que queremos conectar
      if (sourceNodeRef.current) {
        // Verificar si el sourceNode actual corresponde a un elemento diferente
        // Si el audioElement ya está en el mapa, no deberíamos llegar aquí
        // Si llegamos aquí, significa que hay un sourceNode de otro elemento
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // Ignorar errores de desconexión
        }
        sourceNodeRef.current = null;
      }
      
      // Verificar estado del AudioContext antes de crear el source
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(err => {
          console.warn('[AudioContext] Error resumiendo AudioContext antes de conectar:', err);
        });
      }
      
      // Crear MediaElementSource
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      sourceNodeRef.current = source;
      
      // Guardar en el mapa de elementos conectados (usando el elemento como clave)
      connectedAudioElementsRef.current.set(audioElement, source);
      
      // Conectar: source -> analyser -> destination
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      console.log('[AudioContext] Audio conectado al AudioContext');
    } catch (error) {
      // Si el error es porque ya está conectado, intentar reutilizar
      if (error.message && error.message.includes('already connected')) {
        console.log('[AudioContext] Audio ya estaba conectado, continuando...');
        // El audio seguirá funcionando sin análisis
      } else {
        console.warn('[AudioContext] Error conectando audio al AudioContext:', error);
      }
    }
  }, []);
  
  /**
   * Cargar todos los archivos de audio
   */
  const loadAudios = useCallback(async () => {
    if (!audioSrcs || audioSrcs.length === 0) {
      setIsLoaded(true);
      setLoadingProgress(100);
      return;
    }
    
    // Limpiar audios anteriores antes de cargar nuevos
    audioRefs.current.forEach(audio => {
      if (audio) {
        try {
          audio.pause();
          audio.src = '';
          audio.load();
          // Remover del mapa de elementos conectados
          connectedAudioElementsRef.current.delete(audio);
        } catch (e) {
          // Ignorar errores
        }
      }
    });
    
    // Limpiar conexión anterior
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignorar errores
      }
      sourceNodeRef.current = null;
    }
    
    try {
      setIsLoaded(false);
      setLoadingProgress(0);
      
      // Crear elementos de audio para cada fuente
      const audios = audioSrcs.map((src, index) => {
        // Asegurar que src sea un string válido
        const audioSrc = typeof src === 'string' ? src : (src?.default || String(src));
        
        if (!audioSrc || audioSrc.length === 0) {
          console.warn(`[AudioContext] Fuente de audio ${index} inválida:`, src);
          return null;
        }
        
        // Crear elemento de audio sin src inicialmente para mejor compatibilidad
        const audio = new Audio();
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous'; // Necesario para CORS en análisis de audio
        
        // Configuración específica para móviles
        if (isMobile) {
          audio.setAttribute('playsinline', 'true'); // Importante para iOS
        }
        
        // Agregar clase para estilos
        audio.className = 'audio-context';
        
        // Configurar src después de crear el elemento
        // Esto ayuda en algunos navegadores, especialmente móviles
        try {
          // Normalizar la URL - asegurar que sea absoluta si es relativa
          let normalizedSrc = audioSrc;
          if (audioSrc && !audioSrc.startsWith('http') && !audioSrc.startsWith('//') && audioSrc.startsWith('/')) {
            // Es una ruta relativa, mantenerla como está (el navegador la resolverá)
            normalizedSrc = audioSrc;
          }
          audio.src = normalizedSrc;
        } catch (e) {
          console.error(`[AudioContext] Error configurando src para audio ${index}:`, e);
          return null;
        }
        
        // Log para debug
        console.log(`[AudioContext] Creando audio ${index}:`, audioSrc, {
          finalSrc: audio.src,
          currentSrc: audio.currentSrc,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
        
        return audio;
      }).filter(audio => audio !== null); // Filtrar audios nulos
      
      audioRefs.current = audios;
      audioRef.current = audios[0] || null;
      
      // Cargar duraciones y esperar a que estén listos
      const loadPromises = audios.map((audio, index) => {
        return new Promise((resolve, reject) => {
          let resolved = false;
          
          const onCanPlay = () => {
            if (!resolved) {
              resolved = true;
              const duration = audio.duration || 0;
              setAudioDurations(prev => {
                const newDurations = [...prev];
                newDurations[index] = duration;
                return newDurations;
              });
              
              // Actualizar progreso
              setLoadingProgress(prev => {
                const loaded = audios.filter(a => a.readyState >= 2).length;
                return Math.min(100, (loaded / audios.length) * 100);
              });
              
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('loadedmetadata', onMetadata);
              resolve();
            }
          };
          
          const onMetadata = () => {
            const duration = audio.duration || 0;
            if (duration > 0 && !resolved) {
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
                readyState: audio.readyState
              };
              
              console.error(`[AudioContext] Error cargando audio ${index}:`, e, errorInfo);
              
              // Si es un error de red (networkState 3 = NETWORK_NO_SOURCE) o error de demuxer
              // Solo intentar recargar una vez para evitar loops infinitos
              if ((audio.networkState === 3 || (audio.error && audio.error.code === 4)) && audio.src && !audio.dataset.reloadAttempted) {
                audio.dataset.reloadAttempted = 'true';
                console.warn(`[AudioContext] Error de carga en audio ${index}, intentando recargar...`, {
                  src: audio.src,
                  currentSrc: audio.currentSrc,
                  errorCode: audio.error?.code,
                  errorMessage: audio.error?.message
                });
                // Intentar recargar después de un pequeño delay
                setTimeout(() => {
                  try {
                    // Limpiar src y volver a establecerla
                    const currentSrc = audio.src;
                    audio.src = '';
                    audio.load();
                    setTimeout(() => {
                      audio.src = currentSrc;
                      audio.load();
                    }, 100);
                  } catch (loadErr) {
                    console.error(`[AudioContext] Error en reload de audio ${index}:`, loadErr);
                  }
                }, 1000);
              } else if (audio.error && audio.error.code === 4) {
                // Si ya intentamos recargar y sigue fallando, el archivo probablemente no existe o está corrupto
                console.error(`[AudioContext] Audio ${index} no se puede cargar después de reintento. Verificar que el archivo existe:`, {
                  src: audio.src,
                  currentSrc: audio.currentSrc,
                  errorCode: audio.error.code,
                  errorMessage: audio.error.message
                });
              }
              
              // Establecer duración como 0 si hay error
              setAudioDurations(prev => {
                const newDurations = [...prev];
                newDurations[index] = 0;
                return newDurations;
              });
              
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('loadedmetadata', onMetadata);
              audio.removeEventListener('error', onError);
              // Resolver de todas formas para no bloquear
              resolve();
            }
          };
          
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('canplaythrough', onCanPlay);
          audio.addEventListener('loadedmetadata', onMetadata);
          audio.addEventListener('error', onError);
          
          // Forzar carga
          audio.load();
          
          // Timeout de seguridad (especialmente importante en móviles)
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.warn(`[AudioContext] Timeout cargando audio ${index}`);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('loadedmetadata', onMetadata);
              audio.removeEventListener('error', onError);
              resolve();
            }
          }, isMobile ? 15000 : 10000);
        });
      });
      
      loadingPromisesRef.current = loadPromises;
      
      // Esperar a que al menos el primer audio tenga metadata
      await Promise.all(loadPromises);
      
      // Conectar el audio actual al AudioContext (solo si no se está desmontando)
      if (!isUnmountingRef.current && audioRef.current && audioContextRef.current) {
        // Verificar que el AudioContext no esté cerrado
        if (audioContextRef.current.state !== 'closed') {
          // Esperar un poco antes de conectar para asegurar que el audio esté listo
          setTimeout(() => {
            if (!isUnmountingRef.current && audioRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
              connectAudioToContext(audioRef.current);
            }
          }, 100);
        }
      }
      
      // En móviles, ser más permisivo con el estado de carga
      const minReadyState = (isIOS || isSafariIOS) ? 1 : 2;
      const allHaveMetadata = audios.every(a => a.readyState >= minReadyState || a.duration > 0);
      const someHaveMetadata = audios.some(a => a.readyState >= minReadyState || a.duration > 0);
      
      // Marcar como cargado si al menos algunos audios tienen metadata
      // Esto es importante porque algunos audios pueden fallar pero otros funcionar
      if (allHaveMetadata || someHaveMetadata) {
        setIsLoaded(true);
        setLoadingProgress(100);
        console.log('[AudioContext] Audios cargados:', {
          count: audios.length,
          durations: audioDurations,
          loadedCount: audios.filter(a => a.readyState >= minReadyState || a.duration > 0).length
        });
      } else {
        // En móviles, marcar como cargado si tenemos al menos metadata
        if (isMobile && audios.some(a => a.readyState >= 1)) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      }
    } catch (error) {
      console.error('[AudioContext] Error cargando audios:', error);
      setIsLoaded(true);
      setLoadingProgress(100);
    }
  }, [audioSrcs, isMobile, isIOS, isSafariIOS, connectAudioToContext]);
  
  /**
   * Reproducir audio
   */
  const play = useCallback(async () => {
    if (!audioRef.current) {
      console.warn('[AudioContext] No hay audio para reproducir');
      return;
    }
    
    try {
      // En iOS, asegurar que el AudioContext esté resumido
      if (isIOS || isChromeIOS || isSafariIOS) {
        const audioContext = audioContextRef.current || window.__globalAudioContext;
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
            console.log('[AudioContext] AudioContext resumido antes de play()');
          } catch (resumeErr) {
            console.warn('[AudioContext] Error resumiendo AudioContext:', resumeErr);
          }
        }
      }
      
      // En móviles, ser más permisivo con readyState
      const minReadyState = (isIOS || isSafariIOS) ? 1 : 2;
      if (audioRef.current.readyState < minReadyState) {
        console.log('[AudioContext] Audio no listo, esperando...', {
          readyState: audioRef.current.readyState,
          minReadyState
        });
        // Esperar un poco y reintentar
        setTimeout(() => play(), 100);
        return;
      }
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        try {
          await playPromise;
          // Verificar que realmente se está reproduciendo
          if (audioRef.current.paused) {
            console.warn('[AudioContext] Audio se pausó inmediatamente después de play()');
          } else {
            setIsPlaying(true);
            hasUserInteractedRef.current = true;
            console.log('[AudioContext] Audio reproducido correctamente', {
              paused: audioRef.current.paused,
              readyState: audioRef.current.readyState,
              currentTime: audioRef.current.currentTime,
              duration: audioRef.current.duration
            });
          }
        } catch (playError) {
          console.error('[AudioContext] Error en playPromise:', playError);
          throw playError;
        }
      } else {
        // Si no hay promesa, verificar el estado
        if (!audioRef.current.paused) {
          setIsPlaying(true);
          hasUserInteractedRef.current = true;
          console.log('[AudioContext] Audio ya estaba reproduciéndose');
        }
      }
    } catch (error) {
      console.error('[AudioContext] Error reproduciendo audio:', error);
      
      // En iOS, si es NotAllowedError, puede necesitar más tiempo
      if (isIOS && error.name === 'NotAllowedError') {
        console.warn('[AudioContext] NotAllowedError en iOS, reintentando...');
        setTimeout(async () => {
          try {
            const audioContext = audioContextRef.current || window.__globalAudioContext;
            if (audioContext && audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            await play();
          } catch (retryErr) {
            console.error('[AudioContext] Error en reintento:', retryErr);
          }
        }, 300);
      }
    }
  }, [isIOS, isChromeIOS, isSafariIOS]);
  
  /**
   * Pausar audio con fade out
   */
  const pause = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }
    
    try {
      // Fade out suave antes de pausar
      const audio = audioRef.current;
      const initialVolume = audio.volume;
      const fadeDuration = 500; // 500ms
      const steps = 20;
      const stepTime = fadeDuration / steps;
      const volumeStep = initialVolume / steps;
      
      for (let i = 0; i < steps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepTime));
        audio.volume = Math.max(0, initialVolume - (volumeStep * (i + 1)));
      }
      
      audio.pause();
      audio.volume = initialVolume; // Restaurar volumen
      setIsPlaying(false);
      console.log('[AudioContext] Audio pausado');
    } catch (error) {
      console.error('[AudioContext] Error pausando audio:', error);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);
  
  /**
   * Cambiar al audio en el índice especificado
   */
  const switchToAudio = useCallback(async (index, time = 0) => {
    if (index < 0 || index >= audioRefs.current.length) {
      console.warn(`[AudioContext] Índice inválido: ${index}`);
      return;
    }
    
    const wasPlaying = isPlaying;
    const previousAudio = audioRef.current;
    
    // Pausar audio anterior
    if (previousAudio && !previousAudio.paused) {
      previousAudio.pause();
    }
    
    // Cambiar al nuevo audio
    const newAudio = audioRefs.current[index];
    audioRef.current = newAudio;
    setCurrentIndex(index);
    
    // Establecer tiempo
    if (time >= 0 && newAudio.duration) {
      newAudio.currentTime = Math.min(time, newAudio.duration);
    }
    
    // Reconectar al AudioContext (solo si no se está desmontando)
    if (!isUnmountingRef.current && newAudio && audioContextRef.current) {
      // Verificar que el AudioContext no esté cerrado
      if (audioContextRef.current.state !== 'closed') {
        console.log(`[AudioContext] Reconectando audio ${index} al AudioContext`);
        connectAudioToContext(newAudio);
        // Dar un pequeño delay para asegurar que la conexión se complete
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`[AudioContext] Audio ${index} reconectado, readyState: ${newAudio.readyState}`);
      }
    }
    
    // Reanudar reproducción si estaba reproduciéndose
    if (wasPlaying) {
      await play();
    }
  }, [isPlaying, connectAudioToContext, play]);
  
  /**
   * Seek a una posición específica en un audio específico
   */
  const seekToAudio = useCallback(async (audioIndex, timeInAudio = 0) => {
    if (audioIndex < 0 || audioIndex >= audioRefs.current.length) {
      console.warn(`[AudioContext] Índice de audio inválido: ${audioIndex}`);
      return;
    }
    
    const wasPlaying = isPlaying;
    
    // Si estamos cambiando de audio, hacer switch
    if (audioIndex !== currentIndex) {
      console.log(`[AudioContext] Cambiando de audio ${currentIndex} a ${audioIndex}`);
      await switchToAudio(audioIndex, timeInAudio);
      return;
    }
    
    // Si es el mismo audio, solo hacer seek
    if (audioRef.current) {
      const targetTime = Math.max(0, Math.min(timeInAudio, audioRef.current.duration || 0));
      audioRef.current.currentTime = targetTime;
      
      // Asegurar que el audio esté conectado al AudioContext
      if (!isUnmountingRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
        connectAudioToContext(audioRef.current);
      }
      
      // Si estaba reproduciéndose, asegurar que siga reproduciéndose
      if (wasPlaying && audioRef.current.paused) {
        await play();
      }
    }
  }, [currentIndex, isPlaying, switchToAudio, play, connectAudioToContext]);
  
  /**
   * Obtener duración total de todos los audios
   */
  const getTotalDuration = useCallback(() => {
    return audioDurations.reduce((total, duration) => total + (duration || 0), 0);
  }, [audioDurations]);
  
  /**
   * Obtener tiempo transcurrido total
   */
  const getTotalElapsed = useCallback(() => {
    if (!audioRef.current || audioDurations.length === 0) return 0;
    
    let elapsed = 0;
    
    // Sumar duraciones de audios anteriores
    for (let i = 0; i < currentIndex; i++) {
      elapsed += audioDurations[i] || 0;
    }
    
    // Agregar tiempo del audio actual
    elapsed += audioRef.current.currentTime || 0;
    
    return elapsed;
  }, [currentIndex, audioDurations]);
  
  /**
   * Manejar cuando un audio termina
   */
  const handleAudioEnd = useCallback(() => {
    // Si hay más audios, pasar al siguiente
    if (currentIndex < audioRefs.current.length - 1) {
      switchToAudio(currentIndex + 1, 0);
    } else {
      // Último audio terminado
      setIsPlaying(false);
    }
  }, [currentIndex, switchToAudio]);
  
  // Inicializar AudioContext al montar
  useEffect(() => {
    isUnmountingRef.current = false;
    initializeAudioContext();
    
    return () => {
      // Marcar que se está desmontando
      isUnmountingRef.current = true;
      
      // Limpiar al desmontar
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // Ignorar errores
        }
        sourceNodeRef.current = null;
      }
      
      // Limpiar mapa de elementos conectados
      connectedAudioElementsRef.current = new WeakMap();
      
      // Pausar todos los audios
      audioRefs.current.forEach(audio => {
        if (audio) {
          try {
            audio.pause();
            audio.src = '';
            audio.load(); // Resetear
          } catch (e) {
            // Ignorar errores
          }
        }
      });
      
      // Cerrar AudioContext solo al desmontar completamente
      // IMPORTANTE: Solo cerrar si realmente se está desmontando el componente
      // No cerrar si solo están cambiando las fuentes de audio
      // Usar un pequeño delay para asegurar que no se cierre prematuramente
      const contextToClose = audioContextRef.current;
      if (contextToClose && contextToClose.state !== 'closed') {
        setTimeout(() => {
          // Verificar nuevamente que realmente se está desmontando
          if (isUnmountingRef.current && contextToClose && contextToClose.state !== 'closed') {
            contextToClose.close().catch(console.warn);
          }
        }, 200);
      }
    };
  }, []); // Sin dependencias para que solo se ejecute al montar/desmontar
  
  // Cargar audios cuando cambian las fuentes
  useEffect(() => {
    // Solo cargar si no se está desmontando y hay fuentes
    if (!isUnmountingRef.current && audioSrcs && audioSrcs.length > 0) {
      loadAudios();
    }
  }, [audioSrcs, loadAudios]);
  
  // Configurar eventos de los audios
  useEffect(() => {
    const audios = audioRefs.current;
    const cleanupFunctions = [];
    
    audios.forEach((audio, index) => {
      if (!audio) return;
      
      const handlePlay = () => {
        // Solo actualizar si es el audio actual
        if (index === currentIndex) {
          setIsPlaying(true);
        }
      };
      
      const handlePause = () => {
        // Solo actualizar si es el audio actual
        if (index === currentIndex) {
          setIsPlaying(false);
        }
      };
      
      const handleEnded = () => {
        // Solo manejar si es el audio actual
        if (index === currentIndex) {
          handleAudioEnd();
        }
      };
      
      const handleTimeUpdate = () => {
        // Actualizar progreso de carga si es necesario
        if (!isLoaded && audio.readyState >= 2) {
          setLoadingProgress(prev => Math.max(prev, 95));
        }
      };
      
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      cleanupFunctions.push(() => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      });
    });
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [currentIndex, isLoaded, handleAudioEnd]);
  
  // Manejar cambios de visibilidad (pausar cuando la pestaña está oculta)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        // No pausar completamente, solo reducir volumen (similar a Timeline)
        audioRef.current.volume = 0;
      } else if (!document.hidden && audioRef.current && isPlaying) {
        audioRef.current.volume = 1;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);
  
  const value = {
    // Referencias
    audioRef,
    audioRefs,
    audioContextRef,
    analyserRef,
    dataArrayRef,
    timeDataArrayRef,
    
    // Estados
    currentIndex,
    isPlaying,
    isLoaded,
    loadingProgress,
    audioDurations,
    audioSrcs,
    isInitialized,
    
    // Métodos
    play,
    pause,
    seekToAudio,
    switchToAudio,
    getTotalDuration,
    getTotalElapsed,
    
    // Utilidades
    isMobile,
    isIOS,
    isChromeIOS,
    isSafariIOS
  };
  
  return (
    <AudioContext.Provider value={value}>
      {children}
      {/* Los elementos de audio se crean dinámicamente, no necesitan renderizarse aquí */}
    </AudioContext.Provider>
  );
};

/**
 * Hook para usar el AudioContext
 */
export const useAudio = () => {
  const context = useContext(AudioContext);
  
  if (!context) {
    throw new Error('useAudio debe usarse dentro de AudioProvider');
  }
  
  return context;
};

