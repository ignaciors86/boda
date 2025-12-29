import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
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

export const AudioProvider = ({ children, audioSrcs = [] }) => {
  const audioElementsRef = useRef([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDurations, setAudioDurations] = useState([]);
  const fadeTimelineRef = useRef(null);
  const volumeRef = useRef(1);
  const playAudioRef = useRef(null);

  // Logging para debug
  useEffect(() => {
    if (audioSrcs.length > 0) {
      console.log('[AudioContext] AudioSrcs recibidos:', audioSrcs);
      audioSrcs.forEach((src, idx) => {
        console.log(`[AudioContext] Audio ${idx}: ${src} (tipo: ${typeof src})`);
      });
    }
  }, [audioSrcs]);

  // Crear elementos de audio para cada src
  useEffect(() => {
    // Limpiar audios anteriores
    audioElementsRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('error', () => {});
        audio.removeEventListener('ended', () => {});
        audio.src = '';
        audio.load();
      }
    });
    audioElementsRef.current = [];
    setAudioDurations([]);

    // Crear nuevos elementos de audio
    const validSrcs = audioSrcs.filter(src => {
      if (typeof src !== 'string' || src.length === 0) {
        console.warn('[AudioContext] Fuente de audio inválida (no es string o está vacía):', src);
        return false;
      }
      // Verificar que la URL sea válida
      try {
        // Si es una URL absoluta, validarla
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
          new URL(src);
        }
        // Si es relativa, también es válida
        return true;
      } catch (e) {
        console.warn('[AudioContext] URL de audio inválida:', src, e);
        return false;
      }
    });
    
    if (validSrcs.length === 0) {
      console.warn('[AudioContext] No hay fuentes de audio válidas. AudioSrcs recibidos:', audioSrcs);
      return;
    }
    
    console.log('[AudioContext] Creando', validSrcs.length, 'elementos de audio');
    
    validSrcs.forEach((src, index) => {
      const audio = new Audio();
      
      // Manejar errores de carga
      const handleError = (e) => {
        console.error(`[AudioContext] Error cargando audio ${index} (${src}):`, e);
        console.error(`[AudioContext] Error details:`, {
          code: audio.error?.code,
          message: audio.error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src,
          crossOrigin: audio.crossOrigin
        });
        
        // Si es un error de CORS y estamos usando crossOrigin, intentar sin él
        if (audio.error && audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && audio.crossOrigin) {
          console.warn(`[AudioContext] Posible error CORS, intentando sin crossOrigin para audio ${index}`);
          audio.crossOrigin = null;
          audio.src = '';
          audio.src = src.startsWith('/') || src.startsWith('http') ? src : `/${src}`;
          audio.load();
          return;
        }
        
        // Verificar si el archivo existe y si hay problemas de CORS
        const audioSrc = src.startsWith('/') || src.startsWith('http') ? src : `/${src}`;
        fetch(audioSrc, { method: 'HEAD', mode: 'cors' })
          .then(response => {
            if (!response.ok) {
              console.error(`[AudioContext] Archivo no encontrado o no accesible: ${audioSrc} (Status: ${response.status})`);
            } else {
              const corsHeader = response.headers.get('Access-Control-Allow-Origin');
              console.warn(`[AudioContext] Archivo existe pero no se puede cargar. CORS header: ${corsHeader || 'no presente'}`);
              if (!corsHeader && audio.crossOrigin) {
                console.warn(`[AudioContext] El servidor no envía headers CORS. Intentando sin crossOrigin...`);
                audio.crossOrigin = null;
                audio.src = '';
                audio.src = audioSrc;
                audio.load();
              }
            }
          })
          .catch(fetchError => {
            console.error(`[AudioContext] Error verificando archivo: ${audioSrc}`, fetchError);
            // Si fetch falla por CORS, intentar sin crossOrigin
            if (fetchError.name === 'TypeError' && audio.crossOrigin) {
              console.warn(`[AudioContext] Error CORS detectado, intentando sin crossOrigin para audio ${index}`);
              audio.crossOrigin = null;
              audio.src = '';
              audio.src = audioSrc;
              audio.load();
            }
          });
      };
      
      audio.addEventListener('error', handleError);
      
      // Manejar metadata cargada
      const handleLoadedMetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          console.log(`[AudioContext] Audio ${index} metadata cargada:`, {
            duration: audio.duration,
            src: audio.src
          });
          setAudioDurations(prev => {
            const newDurations = [...prev];
            newDurations[index] = audio.duration;
            return newDurations;
          });
        }
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Manejar cuando el audio puede reproducirse
      const handleCanPlay = () => {
        console.log(`[AudioContext] Audio ${index} listo para reproducir:`, {
          readyState: audio.readyState,
          networkState: audio.networkState,
          src: audio.src
        });
      };
      
      audio.addEventListener('canplay', handleCanPlay);
      
      // Manejar cuando el audio termina
      const handleEnded = () => {
        setCurrentIndex(prevIndex => {
          if (prevIndex === index && index < validSrcs.length - 1 && playAudioRef.current) {
            playAudioRef.current(index + 1, 0);
            return index + 1;
          }
          return prevIndex;
        });
      };
      
      audio.addEventListener('ended', handleEnded);
      
      // Configurar audio
      audio.preload = 'auto';
      audio.volume = 0;
      
      // Determinar si necesitamos CORS basado en la URL
      const isSameOrigin = !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//');
      
      // Para archivos estáticos en el mismo origen (como /tracks/...), NO usar crossOrigin
      // Esto evita problemas de CORS innecesarios ya que Vercel ya envía los headers CORS
      // Solo usar crossOrigin para URLs externas
      if (!isSameOrigin) {
        // URL externa: necesitamos crossOrigin
        audio.crossOrigin = 'anonymous';
        console.log(`[AudioContext] URL externa detectada, usando crossOrigin='anonymous' para audio ${index}`);
      } else {
        // Mismo origen: NO usar crossOrigin (los headers CORS de Vercel son suficientes)
        audio.crossOrigin = null;
        console.log(`[AudioContext] Mismo origen detectado, sin crossOrigin para audio ${index}`);
      }
      
      // Intentar cargar el audio
      try {
        // Asegurar que la URL sea absoluta si es relativa
        const audioSrc = src.startsWith('/') || src.startsWith('http') ? src : `/${src}`;
        console.log(`[AudioContext] Configurando audio ${index} con src:`, audioSrc, 'crossOrigin:', audio.crossOrigin || 'null (same-origin)');
        
        // Configurar src y cargar
        audio.src = audioSrc;
        audio.load();
      } catch (error) {
        console.error(`[AudioContext] Error configurando audio ${index}:`, error);
      }

      audioElementsRef.current.push(audio);
    });

    return () => {
      audioElementsRef.current.forEach(audio => {
        if (audio) {
          audio.pause();
          audio.removeEventListener('loadedmetadata', () => {});
          audio.removeEventListener('error', () => {});
          audio.removeEventListener('ended', () => {});
          audio.src = '';
          audio.load();
        }
      });
    };
  }, [audioSrcs]);

  // Función para hacer fade in/out
  const fadeVolume = useCallback((targetVolume, duration = 0.5, onComplete = null, audioIndex = null) => {
    if (fadeTimelineRef.current) {
      fadeTimelineRef.current.kill();
    }

    const audioIndexToUse = audioIndex !== null ? audioIndex : currentIndex;
    const currentAudio = audioElementsRef.current[audioIndexToUse];
    if (!currentAudio) return;

    fadeTimelineRef.current = gsap.to(volumeRef, {
      current: targetVolume,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (currentAudio) {
          currentAudio.volume = volumeRef.current;
        }
      },
      onComplete: () => {
        if (onComplete) onComplete();
        fadeTimelineRef.current = null;
      }
    });
  }, [currentIndex]);

  // Reproducir audio en un índice específico
  const playAudio = useCallback(async (index, startTime = 0) => {
    if (index < 0 || index >= audioElementsRef.current.length) {
      console.warn('[AudioContext] Índice de audio inválido:', index);
      return;
    }

    const newAudio = audioElementsRef.current[index];
    if (!newAudio) {
      console.warn('[AudioContext] No hay audio en el índice:', index);
      return;
    }

    const oldIndex = currentIndex;
    const oldAudio = audioElementsRef.current[oldIndex];

    // Pausar audio anterior con fade out
    if (oldAudio && oldAudio !== newAudio && !oldAudio.paused) {
      await new Promise(resolve => {
        fadeVolume(0, 0.3, () => {
          oldAudio.pause();
          resolve();
        }, oldIndex);
      });
    }

    // Verificar que el nuevo audio esté listo
    if (newAudio.readyState === 0) {
      console.warn('[AudioContext] Audio no está listo (readyState: 0), esperando...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout esperando a que el audio se cargue'));
        }, 5000);
        
        const handleCanPlay = () => {
          clearTimeout(timeout);
          newAudio.removeEventListener('canplay', handleCanPlay);
          newAudio.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = (e) => {
          clearTimeout(timeout);
          newAudio.removeEventListener('canplay', handleCanPlay);
          newAudio.removeEventListener('error', handleError);
          reject(new Error(`Error cargando audio: ${newAudio.error?.message || 'Unknown error'}`));
        };
        
        if (newAudio.readyState >= 2) {
          clearTimeout(timeout);
          resolve();
        } else {
          newAudio.addEventListener('canplay', handleCanPlay);
          newAudio.addEventListener('error', handleError);
        }
      });
    }

    // Verificar que no haya errores
    if (newAudio.error) {
      console.error('[AudioContext] Error en el audio:', {
        code: newAudio.error.code,
        message: newAudio.error.message,
        src: newAudio.src
      });
      setIsPlaying(false);
      return;
    }

    // Cambiar índice
    setCurrentIndex(index);

    // Configurar nuevo audio
    newAudio.currentTime = startTime;
    volumeRef.current = 0;
    newAudio.volume = 0;

    try {
      await newAudio.play();
      setIsPlaying(true);
      
      // Fade in
      fadeVolume(1, 0.5, null, index);
    } catch (error) {
      console.error('[AudioContext] Error playing audio:', error);
      console.error('[AudioContext] Audio state:', {
        readyState: newAudio.readyState,
        networkState: newAudio.networkState,
        error: newAudio.error,
        src: newAudio.src
      });
      setIsPlaying(false);
    }
  }, [fadeVolume, currentIndex]);

  // Actualizar ref para el evento 'ended'
  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);

  // Pausar con fade out
  const pause = useCallback(async () => {
    const currentAudio = audioElementsRef.current[currentIndex];
    if (!currentAudio || currentAudio.paused) return;

    await new Promise(resolve => {
      fadeVolume(0, 0.3, () => {
        currentAudio.pause();
        setIsPlaying(false);
        resolve();
      }, currentIndex);
    });
  }, [fadeVolume, currentIndex]);

  // Reanudar con fade in
  const play = useCallback(async () => {
    const currentAudio = audioElementsRef.current[currentIndex];
    if (!currentAudio) {
      console.warn('[AudioContext] No hay audio disponible en el índice', currentIndex);
      return;
    }

    // Verificar que el audio esté listo
    if (currentAudio.readyState === 0) {
      console.warn('[AudioContext] Audio no está listo (readyState: 0), esperando...');
      // Esperar a que el audio se cargue
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout esperando a que el audio se cargue'));
        }, 5000);
        
        const handleCanPlay = () => {
          clearTimeout(timeout);
          currentAudio.removeEventListener('canplay', handleCanPlay);
          currentAudio.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = (e) => {
          clearTimeout(timeout);
          currentAudio.removeEventListener('canplay', handleCanPlay);
          currentAudio.removeEventListener('error', handleError);
          reject(new Error(`Error cargando audio: ${currentAudio.error?.message || 'Unknown error'}`));
        };
        
        if (currentAudio.readyState >= 2) {
          clearTimeout(timeout);
          resolve();
        } else {
          currentAudio.addEventListener('canplay', handleCanPlay);
          currentAudio.addEventListener('error', handleError);
        }
      });
    }

    // Verificar que no haya errores
    if (currentAudio.error) {
      console.error('[AudioContext] Error en el audio:', {
        code: currentAudio.error.code,
        message: currentAudio.error.message
      });
      return;
    }

    try {
      await currentAudio.play();
      setIsPlaying(true);
      fadeVolume(1, 0.5, null, currentIndex);
    } catch (error) {
      console.error('[AudioContext] Error resuming audio:', error);
      console.error('[AudioContext] Audio state:', {
        readyState: currentAudio.readyState,
        networkState: currentAudio.networkState,
        error: currentAudio.error,
        src: currentAudio.src
      });
    }
  }, [fadeVolume, currentIndex]);

  // Seek a tiempo específico en audio específico
  const seekToAudio = useCallback(async (audioIndex, time) => {
    if (audioIndex < 0 || audioIndex >= audioElementsRef.current.length) return;

    const wasPlaying = isPlaying;
    const currentAudio = audioElementsRef.current[currentIndex];
    
    // Si cambiamos de audio, hacer fade out del actual
    if (audioIndex !== currentIndex && currentAudio && !currentAudio.paused) {
      await pause();
    }

    // Cambiar al nuevo audio
    await playAudio(audioIndex, time);

    // Si estaba pausado, pausar el nuevo también
    if (!wasPlaying) {
      await pause();
    }
  }, [isPlaying, playAudio, pause, currentIndex]);

  // Obtener duración total
  const getTotalDuration = useCallback(() => {
    return audioDurations.reduce((sum, duration) => sum + (duration || 0), 0);
  }, [audioDurations]);

  // Obtener tiempo transcurrido total
  const getTotalElapsed = useCallback(() => {
    let total = 0;
    
    for (let i = 0; i < currentIndex; i++) {
      total += audioDurations[i] || 0;
    }
    
    const currentAudio = audioElementsRef.current[currentIndex];
    if (currentAudio) {
      total += currentAudio.currentTime || 0;
    }
    
    return total;
  }, [audioDurations, currentIndex]);

  const value = {
    audioRef: { current: audioElementsRef.current[currentIndex] },
    audioElementsRef,
    currentIndex,
    audioSrcs,
    audioDurations,
    isPlaying,
    play,
    pause,
    seekToAudio,
    getTotalDuration,
    getTotalElapsed,
    playAudio
  };

  return (
    <AudioContextReact.Provider value={value}>
      {children}
    </AudioContextReact.Provider>
  );
};
