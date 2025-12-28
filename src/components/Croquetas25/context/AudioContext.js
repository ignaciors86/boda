import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { Howl, Howler } from 'howler';
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

// Exponer el AudioContext global en window para acceso desde handlers de eventos del usuario
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__globalAudioContext', {
    get: () => globalAudioContext,
    configurable: true
  });
}

export const AudioProvider = ({ children, audioSrcs = [] }) => {
  // Detectar si estamos en iOS/Android Safari (donde cambiar src causa problemas)
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
  const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMobileSafari = isIOS || (isAndroid && isSafari);
  // Solo usar múltiples elementos en iOS/Android Safari con múltiples audios
  // Se recalcula cuando cambia audioSrcs
  const useMultipleElements = isMobileSafari && audioSrcs.length > 1;
  
  // Dos elementos audio: uno actual y uno siguiente para transiciones suaves
  // O array de elementos Audio si estamos en iOS/Android Safari con múltiples audios
  // O array de instancias Howl si usamos Howler.js
  const currentAudioRef = useRef(null);
  const nextAudioRef = useRef(null);
  const audioElementsRef = useRef([]); // Array de elementos Audio (solo para iOS/Android Safari con múltiples audios)
  const howlInstancesRef = useRef([]); // Array de instancias Howl (para iOS/Android con múltiples audios)
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    for (let i = 0; i < srcs.length; i++) {
      const audioSrc = srcs[i];
      let audioSrcString = typeof audioSrc === 'string' ? audioSrc : (audioSrc?.default || audioSrc);
      
      // En iOS, asegurar que las rutas de subcarpetas se conviertan correctamente
      if (isIOS && audioSrcString && typeof audioSrcString === 'string' && !audioSrcString.startsWith('http') && !audioSrcString.startsWith('data:')) {
        // Si es una ruta relativa, asegurar que sea una URL válida
        // require.context ya debería devolver URLs válidas, pero en iOS puede haber problemas con subcarpetas
        if (!audioSrcString.startsWith('/') && !audioSrcString.startsWith('./') && !audioSrcString.startsWith('../')) {
          // Si no tiene prefijo, podría ser una ruta de subcarpeta que necesita normalización
          // require.context debería devolver una URL válida, así que dejarlo como está
        }
      }
      
      console.log(`[AudioContext] Pre-cargando audio ${i + 1}/${srcs.length}: ${audioSrcString}`);
      
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
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      for (let i = 0; i < audioSrcs.length; i++) {
        const audioSrc = audioSrcs[i];
        // En iOS, asegurar que las rutas se conviertan correctamente
        let audioSrcString = typeof audioSrc === 'string' ? audioSrc : (audioSrc?.default || audioSrc);
        const audio = new Audio(audioSrcString);
        
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
      
      // Pre-cargar todos los audios cuando hay múltiples
      if (audioSrcs.length > 1) {
        console.log('[AudioContext] Múltiples audios detectados: iniciando pre-carga...');
        
        // En iOS/Android Safari, crear elementos <audio> reales para cada archivo (Opción 4)
        if (useMultipleElements) {
          console.log('[AudioContext] iOS/Android Safari: Creando elementos <audio> reales para cada archivo...');
          const createAudioElements = async () => {
            const elements = [];
            const durations = [];
            
            for (let i = 0; i < audioSrcs.length; i++) {
              const audioSrc = audioSrcs[i];
              let audioSrcString = typeof audioSrc === 'string' ? audioSrc : (audioSrc?.default || audioSrc);
              
              // Normalizar ruta a URL absoluta si no lo es (Opción 5)
              if (audioSrcString && typeof audioSrcString === 'string') {
                if (!audioSrcString.startsWith('http') && !audioSrcString.startsWith('data:')) {
                  if (audioSrcString.startsWith('/')) {
                    audioSrcString = window.location.origin + audioSrcString;
                  } else if (audioSrcString.startsWith('./') || audioSrcString.startsWith('../')) {
                    const baseUrl = window.location.origin;
                    const absolutePath = audioSrcString.startsWith('.') 
                      ? audioSrcString.replace(/^\./, '')
                      : '/' + audioSrcString;
                    audioSrcString = baseUrl + absolutePath;
                  } else {
                    audioSrcString = window.location.origin + '/' + audioSrcString;
                  }
                }
              }
              
              // Crear elemento <audio> real
              const audio = document.createElement('audio');
              audio.preload = 'auto';
              audio.src = audioSrcString;
              audio.volume = 0;
              audio.muted = false;
              audio.setAttribute('playsinline', 'true');
              audio.crossOrigin = 'anonymous';
              audio.style.display = 'none';
              
              // Agregar al DOM para que funcione correctamente en móviles
              document.body.appendChild(audio);
              
              elements.push(audio);
              
              // Pre-cargar con eventos
              try {
                await new Promise((resolve) => {
                  let resolved = false;
                  const timeout = setTimeout(() => {
                    if (!resolved) {
                      resolved = true;
                      resolve();
                    }
                  }, 10000); // Timeout de 10 segundos
                  
                  const handleReady = () => {
                    if (!resolved) {
                      resolved = true;
                      clearTimeout(timeout);
                      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                        durations[i] = audio.duration;
                        console.log(`[AudioContext] Audio ${i} pre-cargado: ${audio.duration.toFixed(2)}s`);
                      } else {
                        durations[i] = 0;
                      }
                      const progress = Math.round(((i + 1) / audioSrcs.length) * 100);
                      setPreloadProgress(progress);
                      resolve();
                    }
                  };
                  
                  audio.addEventListener('loadedmetadata', handleReady, { once: true });
                  audio.addEventListener('canplay', handleReady, { once: true });
                  audio.addEventListener('error', (e) => {
                    console.warn(`[AudioContext] Error pre-cargando audio ${i}:`, audio.error);
                    if (!resolved) {
                      resolved = true;
                      clearTimeout(timeout);
                      durations[i] = 0;
                      const progress = Math.round(((i + 1) / audioSrcs.length) * 100);
                      setPreloadProgress(progress);
                      resolve();
                    }
                  }, { once: true });
                  
                  audio.load();
                });
              } catch (e) {
                console.warn(`[AudioContext] Error pre-cargando elemento ${i}:`, e);
                durations[i] = 0;
                const progress = Math.round(((i + 1) / audioSrcs.length) * 100);
                setPreloadProgress(progress);
              }
            }
            
            audioElementsRef.current = elements;
            if (elements.length > 0) {
              currentAudioRef.current = elements[0];
            }
            setAudioDurations(durations);
            setPreloadedAudios(true);
            setPreloadProgress(100);
            console.log(`[AudioContext] ${elements.length} elementos <audio> creados y pre-cargados`);
          };
          
          createAudioElements();
          
          // También crear instancias Howler.js como fallback (Opción 1)
          console.log('[AudioContext] Creando instancias Howl como fallback...');
          const createHowlInstances = () => {
            const instances = [];
            
            for (let i = 0; i < audioSrcs.length; i++) {
              const audioSrc = audioSrcs[i];
              let audioSrcString = typeof audioSrc === 'string' ? audioSrc : (audioSrc?.default || audioSrc);
              
              // Normalizar ruta
              if (audioSrcString && typeof audioSrcString === 'string') {
                if (!audioSrcString.startsWith('http') && !audioSrcString.startsWith('data:')) {
                  if (audioSrcString.startsWith('/')) {
                    audioSrcString = window.location.origin + audioSrcString;
                  } else if (audioSrcString.startsWith('./') || audioSrcString.startsWith('../')) {
                    const baseUrl = window.location.origin;
                    const absolutePath = audioSrcString.startsWith('.') 
                      ? audioSrcString.replace(/^\./, '')
                      : '/' + audioSrcString;
                    audioSrcString = baseUrl + absolutePath;
                  } else {
                    audioSrcString = window.location.origin + '/' + audioSrcString;
                  }
                }
              }
              
              const howl = new Howl({
                src: [audioSrcString],
                html5: true, // Opción 1: Usar HTML5 en móviles para mejor compatibilidad
                preload: true,
                volume: 0,
                onplayerror: function() {
                  // Manejar desbloqueo de audio (Opción 1)
                  console.log('[AudioContext] Howl playerror, esperando unlock...');
                  howl.once('unlock', function() {
                    console.log('[AudioContext] Howl desbloqueado, intentando reproducir...');
                    howl.play();
                  });
                }
              });
              
              instances.push(howl);
            }
            
            howlInstancesRef.current = instances;
            console.log(`[AudioContext] ${instances.length} instancias Howl creadas como fallback`);
          };
          
          createHowlInstances();
          return; // Salir temprano para evitar el código de elementos Audio de desktop
        }
        
        // Código original para desktop (mantener como fallback)
        if (false) { // Nunca ejecutar, solo para referencia
          const createElements = async () => {
            const elements = [];
            for (let i = 0; i < audioSrcs.length; i++) {
              const audioSrc = audioSrcs[i];
              let audioSrcString = typeof audioSrc === 'string' ? audioSrc : (audioSrc?.default || audioSrc);
              
              const audio = new Audio();
              audio.preload = 'auto';
              audio.src = audioSrcString;
              audio.volume = 0;
              audio.muted = false;
              audio.playsInline = true;
              audio.crossOrigin = 'anonymous';
              
              elements.push(audio);
              
              // Pre-cargar con timeout de seguridad
              try {
                await new Promise((resolve) => {
                  let resolved = false;
                  const timeout = setTimeout(() => {
                    if (!resolved) {
                      resolved = true;
                      resolve();
                    }
                  }, 5000);
                  
                  const handleReady = () => {
                    if (!resolved) {
                      resolved = true;
                      clearTimeout(timeout);
                      resolve();
                    }
                  };
                  
                  audio.addEventListener('loadedmetadata', handleReady, { once: true });
                  audio.addEventListener('canplay', handleReady, { once: true });
                  audio.addEventListener('error', handleReady, { once: true });
                  audio.load();
                });
              } catch (e) {
                console.warn(`[AudioContext] Error pre-cargando elemento ${i}:`, e);
              }
              
              const progress = Math.round(((i + 1) / audioSrcs.length) * 100);
              setPreloadProgress(progress);
            }
            
            audioElementsRef.current = elements;
            if (elements.length > 0) {
              currentAudioRef.current = elements[0];
            }
            setPreloadedAudios(true);
            setPreloadProgress(100);
            console.log(`[AudioContext] ${elements.length} elementos Audio creados y pre-cargados`);
          };
          
          createElements();
        } else {
          // En otros navegadores, pre-cargar normalmente
          preloadAllAudios(audioSrcs);
        }
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
          
          // En iOS/Android Safari con múltiples audios, usar el siguiente elemento del array
          if (useMultipleElements && audioElementsRef.current.length > 0) {
            const nextAudio = audioElementsRef.current[nextIndex];
            if (nextAudio) {
              // Cambiar al siguiente elemento
              currentAudioRef.current = nextAudio;
              currentIndexRef.current = nextIndex;
              
              console.log(`[AudioContext] Cambiado a elemento Audio ${nextIndex} (iOS/Android Safari)`);
            } else {
              // Fallback: cambiar src normalmente
              currentAudio.src = nextSrcString;
              currentAudio.load();
            }
          } else {
            // En otros casos, cambiar src normalmente
            currentAudio.src = nextSrcString;
            currentAudio.load();
          }
          
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
          // En iOS/Android Safari con múltiples elementos, el audio ya está pre-cargado
          const tryPlay = async () => {
            const audioToPlay = currentAudioRef.current;
            if (!audioToPlay) {
              setTimeout(tryPlay, 50);
              return;
            }
            
            // En iOS/Android Safari con múltiples elementos, el audio ya está pre-cargado
            const minReadyState = (useMultipleElements && audioElementsRef.current.length > 0) ? 1 : 2;
            
            if (audioToPlay.readyState >= minReadyState) {
              console.log('[AudioContext] Reproduciendo siguiente audio');
              try {
                await audioToPlay.play();
                audioToPlay.volume = 0;
                fadeInTweenRef.current = gsap.to(audioToPlay, {
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
                      await audioToPlay.play();
                      audioToPlay.volume = 0;
                      fadeInTweenRef.current = gsap.to(audioToPlay, {
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
    
    // Si estamos cambiando desde handleEnded, no hacer nada aquí para evitar interferencia
    if (isChangingFromEndedRef.current) {
      console.log('[AudioContext] Ignorando useEffect principal porque el cambio viene de handleEnded');
      return;
    }
    
    // Declarar variables que se usarán en el cleanup
    let progressIntervalId = null;
    let audioCleanup = null;
    
    // En iOS/Android Safari con múltiples audios, usar elementos diferentes
    if (useMultipleElements && audioElementsRef.current.length > 0) {
      const audio = audioElementsRef.current[currentIndex];
      if (!audio) {
        console.warn(`[AudioContext] No hay elemento Audio para índice ${currentIndex}`);
        return;
      }
      
      // Si ya es el elemento actual, no hacer nada
      if (currentAudioRef.current === audio) {
        return;
      }
      
      // Pausar el elemento anterior
      if (currentAudioRef.current && currentAudioRef.current !== audio) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      
      // Establecer el nuevo elemento como actual
      currentAudioRef.current = audio;
      console.log(`[AudioContext] Cambiado a elemento Audio ${currentIndex}/${audioElementsRef.current.length} (iOS/Android Safari)`);
      // Continuar con la configuración normal del audio (setupAudioContext, etc.)
    } else {
      // Lógica normal: cambiar src del mismo elemento
      const audio = currentAudioRef.current;
      if (!audio) return;
      
      // Verificar si el src ya está configurado correctamente (para evitar resetear cuando handleEnded cambia el src)
      // En iOS, asegurar que las rutas se conviertan correctamente a URLs absolutas
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      let currentSrcString = typeof currentSrc === 'string' ? currentSrc : (currentSrc?.default || currentSrc);
      
      // En iOS, convertir rutas relativas a URLs absolutas si es necesario
      if (isIOS && currentSrcString && typeof currentSrcString === 'string' && !currentSrcString.startsWith('http') && !currentSrcString.startsWith('data:')) {
        // Si es una ruta relativa, convertirla a URL absoluta
        try {
          // Si ya es una URL válida (empieza con /), dejarla así
          // Si es una ruta de require.context, debería ser una URL válida ya
          if (currentSrcString.startsWith('/')) {
            // Ya es una ruta absoluta relativa al dominio
          } else if (currentSrcString.includes('./') || currentSrcString.includes('../')) {
            // Es una ruta relativa, convertir a absoluta
            const baseUrl = window.location.origin;
            const absolutePath = currentSrcString.startsWith('.') 
              ? currentSrcString.replace(/^\./, '')
              : '/' + currentSrcString;
            currentSrcString = baseUrl + absolutePath;
          }
        } catch (e) {
          console.warn('[AudioContext] Error normalizando ruta de audio en iOS:', e);
        }
      }
      
      const currentAudioSrc = audio.src || '';
      // Comparar normalizando las URLs (pueden ser absolutas o relativas)
      // En iOS, usar comparación más estricta con rutas completas
      const normalizedCurrentSrc = isIOS 
        ? currentAudioSrc 
        : (currentAudioSrc.split('/').pop() || currentAudioSrc);
      const normalizedNewSrc = isIOS 
        ? currentSrcString 
        : (currentSrcString.split('/').pop() || currentSrcString);
      
      // En iOS con múltiples audios, ser más estricto con la verificación
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

      // Detección mejorada de navegadores y dispositivos (isIOS ya está definido arriba)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isChromeIOS = isIOS && /CriOS/.test(navigator.userAgent);
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
            
            // Para iOS/Safari, ser más permisivo - no esperar tanto buffer
            // iOS puede cargar bajo demanda mientras reproduce
            const isLargeFile = audio.duration > 300; // 5 minutos
            const loadThreshold = (isIOS || isSafari) 
              ? (isLargeFile ? 0.5 : 0.3)  // En iOS/Safari, aceptar con menos buffer
              : 0.95;
            
            // En iOS, no requerir buffer mínimo absoluto - puede cargar bajo demanda
            const minBufferSeconds = 0; // No requerir buffer mínimo en iOS
            const hasMinBuffer = true; // Siempre true en iOS
            
            if ((progress >= (loadThreshold * 100) || bufferedEnd >= audio.duration * loadThreshold) && hasMinBuffer) {
              if (!isLoaded) {
                setIsLoaded(true);
                setLoadingProgress(100);
                console.log(`[AudioContext] Audio marked as loaded. Progress: ${progress.toFixed(1)}%, Buffer: ${bufferedEnd.toFixed(1)}s/${audio.duration.toFixed(1)}s`);
              }
            }
          } else if (audio.readyState >= 2) {
            // En iOS/Safari, si tenemos readyState 2, considerar cargado incluso sin buffer
            if ((isIOS || isSafari) && !isLoaded) {
              setIsLoaded(true);
              setLoadingProgress(100);
              console.log(`[AudioContext] Audio marked as loaded (iOS/Safari, readyState: ${audio.readyState})`);
            } else if (audio.readyState >= 3 && !isLoaded) {
              // Otros navegadores necesitan readyState 3
              setIsLoaded(true);
              setLoadingProgress(100);
            }
          }
        } else if (audio.readyState >= 2 && (isIOS || isSafari) && !isLoaded) {
          // En iOS/Safari, si tenemos readyState 2, considerar cargado incluso sin duration
          setIsLoaded(true);
          setLoadingProgress(100);
          console.log(`[AudioContext] Audio marked as loaded (iOS/Safari, readyState: ${audio.readyState}, sin duration aún)`);
        } else if (audio.readyState >= 3 && !isLoaded) {
          // Si tenemos suficiente readyState pero no duration, aún considerar cargado
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      } else {
        // Calcular progreso basado en readyState
        const progress = Math.min((audio.readyState / 4) * 100, (isIOS || isSafari) ? 50 : 95);
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
            // Actualizar la referencia en window
            if (typeof window !== 'undefined') {
              Object.defineProperty(window, '__globalAudioContext', {
                get: () => globalAudioContext,
                configurable: true
              });
            }
          } catch (error) {
            console.error('[AudioContext] Error creating AudioContext:', error);
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Actualizar la referencia en window incluso si hay error
            if (typeof window !== 'undefined') {
              Object.defineProperty(window, '__globalAudioContext', {
                get: () => globalAudioContext,
                configurable: true
              });
            }
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
              console.log('[AudioContext] AudioContext resumido en setupAudioContext, estado:', globalAudioContext.state);
              // En Safari iOS con múltiples audios, puede necesitar múltiples intentos
              if ((isSafari || isIOS) && hasMultipleAudios && globalAudioContext.state === 'suspended') {
                // Intentar múltiples veces con delays crecientes
                for (let i = 0; i < 3; i++) {
                  await new Promise(resolve => setTimeout(resolve, 150 * (i + 1)));
                  try {
                    await globalAudioContext.resume();
                    if (globalAudioContext.state !== 'suspended') {
                      console.log(`[AudioContext] AudioContext resumido en Safari iOS (intento ${i + 1})`);
                      break;
                    }
                  } catch (e) {
                    console.warn(`[AudioContext] Error resuming AudioContext (intento ${i + 1}):`, e);
                  }
                }
              } else if (globalAudioContext.state === 'suspended') {
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
      // En iOS/Safari, ser más permisivo
      if (audio.readyState >= 1) {
        // En iOS/Safari, readyState 1 es suficiente
        if (isIOS || isSafari) {
          if (!isLoaded) {
            setIsLoaded(true);
            setLoadingProgress(100);
            console.log(`[AudioContext] Audio ${currentIndex} marcado como cargado en handleCanPlay (iOS/Safari, readyState: ${audio.readyState})`);
          }
        } else if (audio.readyState >= 2) {
          // Otros navegadores necesitan readyState 2
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
          console.log(`[AudioContext] Audio marcado como cargado en handleLoadedData (readyState: ${audio.readyState})`);
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
      // En iOS/Safari, loadedmetadata es suficiente para considerar cargado
      if ((isIOS || isSafari) && audio.readyState >= 1) {
        if (!isLoaded) {
          setIsLoaded(true);
          setLoadingProgress(100);
          console.log(`[AudioContext] Audio marcado como cargado en handleLoadedMetadata (iOS/Safari)`);
        }
      }
    };
    
    const handleError = (e) => {
      console.error('[AudioContext] Audio error:', e);
      const error = audio.error;
      if (error) {
        console.error('[AudioContext] Error code:', error.code, '| Message:', error.message);
        console.error('[AudioContext] Audio src que causó el error:', audio.src);
        console.error('[AudioContext] Current index:', currentIndex, 'Total audios:', audioSrcs.length);
        console.error('[AudioContext] Audio en subcarpeta:', hasMultipleAudios && currentIndex > 0);
        
        // En iOS, especialmente con audios en subcarpetas, puede haber problemas con las rutas
        if (isIOS) {
          // Si el error es de src no soportado o red, puede ser un problema de ruta de subcarpeta
          if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || error.code === MediaError.MEDIA_ERR_NETWORK) {
            console.warn('[AudioContext] iOS: Error de ruta o formato (posible problema con subcarpeta), intentando recargar...');
            // Intentar recargar después de un delay, forzando una recarga completa
            setTimeout(() => {
              if (audio.src) {
                const currentSrc = audio.src;
                // Limpiar y recargar
                audio.src = '';
                audio.load();
                setTimeout(() => {
                  audio.src = currentSrc;
                  audio.load();
                  console.log('[AudioContext] iOS: Audio recargado después de error');
                }, 200);
              }
            }, 1000);
          }
        }
        
        // En Safari iOS, algunos errores pueden resolverse recargando
        if ((isIOS || isSafari) && error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          console.warn('[AudioContext] Format not supported, trying to reload');
          setTimeout(() => {
            if (audio.src) {
              audio.load();
            }
          }, 1000);
        }
        // En Safari con múltiples audios, puede haber problemas de carga
        if (isSafari && hasMultipleAudios && (error.code === MediaError.MEDIA_ERR_NETWORK || error.code === MediaError.MEDIA_ERR_ABORTED)) {
          console.warn('[AudioContext] Network/abort error en Safari con múltiples audios, reintentando carga...');
          setTimeout(() => {
            if (audio.src) {
              audio.load();
            }
          }, 2000);
        }
      }
    };

    // El handleEnded ahora está en un useEffect separado para evitar problemas de closure

    // Configurar el src del audio actual solo si ha cambiado (currentSrcString ya está declarado arriba)
    if (normalizedCurrentSrc !== normalizedNewSrc && currentAudioSrc !== currentSrcString) {
      console.log(`[AudioContext] Cambiando src de ${normalizedCurrentSrc} a ${normalizedNewSrc}`);
      console.log(`[AudioContext] Ruta completa: ${currentSrcString}`);
      console.log(`[AudioContext] Índice actual: ${currentIndex}, Total audios: ${audioSrcs.length}`);
      
      // En iOS, especialmente con audios en subcarpetas, asegurar que la ruta sea válida
      if (isIOS) {
        // Verificar que la ruta sea accesible antes de establecerla
        const testAudio = new Audio();
        testAudio.src = currentSrcString;
        testAudio.addEventListener('error', (e) => {
          console.error(`[AudioContext] Error con ruta de audio en iOS: ${currentSrcString}`, e);
          console.error(`[AudioContext] Error code: ${testAudio.error?.code}, Message: ${testAudio.error?.message}`);
        }, { once: true });
        testAudio.load();
        // Limpiar el audio de prueba después de un momento
        setTimeout(() => {
          testAudio.src = '';
          testAudio.load();
        }, 1000);
      }
      
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
      
      // Para iOS/Safari, ser más permisivo - readyState 1 es suficiente
      // Para otros navegadores, ser más estricto
      const readyThreshold = (isIOS || isSafari) 
        ? 1  // iOS/Safari puede funcionar con readyState 1
        : (isChrome && !isMobile) ? 3 : minReadyState;
      
      if (audio.readyState >= readyThreshold && !isLoaded) {
        // En iOS/Safari, no requerir duration - puede cargar bajo demanda
        if (isIOS || isSafari) {
          setIsLoaded(true);
          setLoadingProgress(100);
          console.log(`[AudioContext] Audio ${currentIndex} marcado como cargado (iOS/Safari, readyState: ${audio.readyState})`);
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
            progressIntervalId = null;
          }
        } else {
          // Otros navegadores pueden necesitar más validación
          setIsLoaded(true);
          setLoadingProgress(100);
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
            progressIntervalId = null;
          }
        }
      }
      }, progressInterval);
    }

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
      // Si estamos usando Howler.js en iOS/Android
      if (useMultipleElements && howlInstancesRef.current.length > 0) {
        const howl = howlInstancesRef.current[currentIndex];
        if (!howl) {
          console.warn('[AudioContext] No hay instancia Howl para reproducir');
          resolve();
          return;
        }
        
        try {
          // Detener otras instancias
          howlInstancesRef.current.forEach((h, i) => {
            if (i !== currentIndex && h.playing()) {
              h.stop();
            }
          });
          
          // Reproducir con Howler.js
          const soundId = howl.play();
          howl.volume(0, soundId);
          
          // Fade in con Howler.js
          howl.fade(0, 1, 2500, soundId);
          
          setIsPlaying(true);
          console.log('[AudioContext] Reproduciendo con Howler.js');
          
          // Manejar cuando termine
          howl.once('end', () => {
            setIsPlaying(false);
            // Cambiar al siguiente audio
            const nextIndex = (currentIndex + 1) % howlInstancesRef.current.length;
            if (nextIndex !== currentIndex) {
              currentIndexRef.current = nextIndex;
              setCurrentIndex(nextIndex);
            }
          });
          
          resolve();
        } catch (error) {
          console.error('[AudioContext] Error reproduciendo con Howler.js:', error);
          resolve();
        }
        return;
      }
      
      if (currentAudioRef.current && currentAudioRef.current.paused) {
        try {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          const isAndroid = /Android/.test(navigator.userAgent);
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const isChromeIOS = isIOS && /CriOS/.test(navigator.userAgent);
          const isMobileSafari = (isIOS || (isAndroid && isSafari));
          const hasMultipleAudios = audioSrcsRef.current.length > 1;
          
          // En iOS/Android Safari, NO bloquear por pre-carga - pueden cargar audios bajo demanda
          // Solo esperar pre-carga en otros navegadores y solo un tiempo limitado
          if (hasMultipleAudios && !preloadedAudios && !isMobileSafari) {
            console.log('[AudioContext] Múltiples audios: esperando a que todos estén pre-cargados...');
            const maxWaitTime = 3000; // Solo 3 segundos máximo
            const startTime = Date.now();
            
            // Esperar usando un efecto que observe el estado preloadedAudios
            await new Promise((resolveWait) => {
              const checkInterval = setInterval(() => {
                if (preloadedAudios) {
                  clearInterval(checkInterval);
                  console.log('[AudioContext] Todos los audios pre-cargados, continuando con play()');
                  resolveWait();
                } else if (Date.now() - startTime > maxWaitTime) {
                  clearInterval(checkInterval);
                  console.warn('[AudioContext] Timeout esperando pre-carga, continuando de todas formas...');
                  resolveWait();
                }
              }, 100);
            });
          } else if (hasMultipleAudios && !preloadedAudios && isMobileSafari) {
            // En iOS/Android Safari, no esperar - continuar inmediatamente
            console.log('[AudioContext] iOS/Android Safari: No esperando pre-carga completa, continuando inmediatamente...');
          }
          
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
            volumeTweenRef.current = null;
          }
          
          if (globalAudioContext) {
            if (globalAudioContext.state === 'suspended') {
              try {
                await globalAudioContext.resume();
                console.log('[AudioContext] AudioContext resumido, estado:', globalAudioContext.state);
                // En Chrome iOS, puede necesitar múltiples intentos
                if ((isIOS || isChromeIOS) && globalAudioContext.state === 'suspended') {
                  // Intentar múltiples veces con delays crecientes
                  for (let i = 0; i < 3; i++) {
                    await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
                    try {
                      await globalAudioContext.resume();
                      if (globalAudioContext.state !== 'suspended') {
                        console.log(`[AudioContext] AudioContext resumido en intento ${i + 1}`);
                        break;
                      }
                    } catch (e) {
                      console.warn(`[AudioContext] Error resuming AudioContext (intento ${i + 1}):`, e);
                    }
                  }
                }
              } catch (resumeError) {
                console.warn('[AudioContext] Error resuming AudioContext in play:', resumeError);
              }
            }
          }
          
          // Esperar a que el audio esté listo usando eventos, no timeouts
          // En iOS/Android Safari con múltiples audios, ser más permisivo con readyState
          const minReadyState = (isMobileSafari && hasMultipleAudios) ? 1 : 2;
          if (currentAudioRef.current.readyState < minReadyState) {
            await new Promise((resolveWait) => {
              const audio = currentAudioRef.current;
              let resolved = false;
              
              const cleanup = () => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('loadeddata', handleLoadedData);
                audio.removeEventListener('error', handleError);
              };
              
              const handleCanPlay = () => {
                if (!resolved && audio.readyState >= minReadyState) {
                  resolved = true;
                  cleanup();
                  console.log(`[AudioContext] Audio listo (canplay, readyState: ${audio.readyState})`);
                  resolveWait();
                }
              };
              
              const handleLoadedData = () => {
                if (!resolved && audio.readyState >= minReadyState) {
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
              if (audio.readyState >= minReadyState) {
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
          
          // En iOS, especialmente Chrome, intentar reproducir múltiples veces si es necesario
          let playAttempts = 0;
          const maxPlayAttempts = (isIOS || isChromeIOS) ? (hasMultipleAudios ? 5 : 3) : 1;
          
          while (playAttempts < maxPlayAttempts) {
            try {
              // En Chrome iOS, asegurar que el AudioContext esté resumido antes de cada intento
              if (isChromeIOS && globalAudioContext && globalAudioContext.state === 'suspended') {
                try {
                  await globalAudioContext.resume();
                  console.log('[AudioContext] AudioContext resumido antes de play() en Chrome iOS');
                } catch (resumeErr) {
                  console.warn('[AudioContext] Error resumiendo antes de play():', resumeErr);
                }
              }
              
              await currentAudioRef.current.play();
              console.log(`[AudioContext] Audio reproducido exitosamente (intento ${playAttempts + 1})`);
              break; // Éxito, salir del bucle
            } catch (playError) {
              playAttempts++;
              console.warn(`[AudioContext] Error en play() (intento ${playAttempts}/${maxPlayAttempts}):`, playError);
              
              if ((isIOS || isChromeIOS) && playError.name === 'NotAllowedError') {
                console.warn('[AudioContext] Play blocked - user interaction required');
                // En Chrome iOS, puede ser que necesitemos esperar un poco más
                if (isChromeIOS && playAttempts < maxPlayAttempts) {
                  console.log('[AudioContext] Esperando antes de reintentar en Chrome iOS...');
                  await new Promise(resolve => setTimeout(resolve, 200));
                  continue;
                }
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
      // Opción 4: Usar elementos <audio> reales en iOS/Android (prioridad)
      if (useMultipleElements && audioElementsRef.current.length > 0) {
        const audio = audioElementsRef.current[currentIndex];
        if (audio && !audio.paused) {
          if (volumeTweenRef.current) {
            volumeTweenRef.current.kill();
            volumeTweenRef.current = null;
          }
          
          volumeTweenRef.current = gsap.to(audio, {
            volume: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
              audio.pause();
              audio.volume = 0;
              volumeTweenRef.current = null;
              setIsPlaying(false);
              resolve();
            }
          });
          return;
        } else {
          resolve();
          return;
        }
      }
      
      // Fallback: Si estamos usando Howler.js en iOS/Android
      if (useMultipleElements && howlInstancesRef.current.length > 0) {
        const howl = howlInstancesRef.current[currentIndex];
        if (howl && howl.playing()) {
          // Fade out y pausar
          const soundId = howl.playing() ? howl._sounds[0]._id : null;
          if (soundId !== null) {
            howl.fade(howl.volume(soundId), 0, 600, soundId);
            setTimeout(() => {
              howl.pause(soundId);
              setIsPlaying(false);
              resolve();
            }, 600);
          } else {
            howl.stop();
            setIsPlaying(false);
            resolve();
          }
        } else {
          resolve();
        }
        return;
      }
      
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
    
    // Si estamos usando Howler.js
    if (useMultipleElements && howlInstancesRef.current.length > 0) {
      const wasPlaying = isPlaying;
      const currentHowl = howlInstancesRef.current[currentIndex];
      
      // Detener el actual
      if (currentHowl && currentHowl.playing()) {
        currentHowl.stop();
      }
      
      // Cambiar al nuevo
      currentIndexRef.current = index;
      setCurrentIndex(index);
      
      const newHowl = howlInstancesRef.current[index];
      if (newHowl && wasPlaying) {
        const soundId = newHowl.play();
        if (targetTime > 0) {
          newHowl.seek(targetTime, soundId);
        }
        newHowl.volume(0, soundId);
        newHowl.fade(0, 1, 400, soundId);
        setIsPlaying(true);
      }
      return;
    }
    
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
    if (useMultipleElements && howlInstancesRef.current.length > 0) {
      const howl = howlInstancesRef.current[currentIndex];
      if (!howl || audioDurations.length === 0) return 0;
      
      const previousTime = audioDurations
        .slice(0, currentIndex)
        .reduce((sum, dur) => sum + dur, 0);
      
      return previousTime + (howl.seek() || 0);
    }
    
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
      {/* Opción 4: Renderizar elementos <audio> reales para móviles */}
      {useMultipleElements && audioElementsRef.current.length > 0 ? (
        audioElementsRef.current.map((audio, index) => {
          // Asignar ref solo al elemento actual
          const audioRef = index === currentIndex ? currentAudioRef : null;
          return (
            <audio
              key={`audio-mobile-${index}`}
              ref={audioRef}
              crossOrigin="anonymous"
              playsInline
              className="audio-context"
              style={{ display: 'none' }}
            />
          );
        })
      ) : (
        <>
          {/* Desktop: elementos audio normales */}
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
        </>
      )}
    </AudioContextReact.Provider>
  );
};

