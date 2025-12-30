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
      // Normalizar la URL - exactamente como Timeline lo hace
      const audioSrc = src.startsWith('/') || src.startsWith('http') ? src : `/${src}`;
      
      // Crear Audio exactamente como Timeline: new Audio(url) directamente
      // Timeline NO usa crossOrigin, así que nosotros tampoco
      const audio = new Audio(audioSrc);
      audio.preload = 'auto';
      audio.volume = 0;
      // NO establecer crossOrigin - Timeline no lo usa y funciona
      
      // Manejar errores de carga - intentar cargar como blob si falla
      const handleError = async (e) => {
        console.error(`[AudioContext] Error cargando audio ${index} (${audioSrc}):`, e);
        console.error(`[AudioContext] Error details:`, {
          code: audio.error?.code,
          message: audio.error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src
        });
        
        // Si falla la carga directa, intentar cargar como blob (como fallback)
        try {
          console.log(`[AudioContext] Intentando cargar audio ${index} como blob desde:`, audioSrc);
          const response = await fetch(audioSrc);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Obtener el tipo MIME del response o inferirlo de la extensión
          let mimeType = response.headers.get('content-type');
          if (!mimeType || !mimeType.startsWith('audio/')) {
            // Inferir tipo MIME de la extensión
            if (audioSrc.endsWith('.mp3')) {
              mimeType = 'audio/mpeg';
            } else if (audioSrc.endsWith('.wav')) {
              mimeType = 'audio/wav';
            } else if (audioSrc.endsWith('.ogg')) {
              mimeType = 'audio/ogg';
            } else {
              mimeType = 'audio/mpeg'; // Default
            }
          }
          
          const arrayBuffer = await response.arrayBuffer();
          // Crear un nuevo blob con el tipo MIME correcto desde el arrayBuffer
          const typedBlob = new Blob([arrayBuffer], { type: mimeType });
          const blobUrl = URL.createObjectURL(typedBlob);
          console.log(`[AudioContext] Blob creado para audio ${index} con tipo:`, mimeType, 'size:', typedBlob.size);
          
          // Limpiar listeners del audio anterior
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('ended', handleEnded);
          
          // Crear nuevo audio con blob URL - exactamente como Timeline
          const newAudio = new Audio(blobUrl);
          newAudio.preload = 'auto';
          newAudio.volume = 0;
          
          // Nuevos handlers para el audio con blob
          const newHandleLoadedMetadata = () => {
            if (newAudio.duration && isFinite(newAudio.duration)) {
              console.log(`[AudioContext] Audio ${index} (blob) metadata cargada:`, newAudio.duration);
              setAudioDurations(prev => {
                const newDurations = [...prev];
                newDurations[index] = newAudio.duration;
                return newDurations;
              });
            }
          };
          
          const newHandleError = (e) => {
            console.error(`[AudioContext] Error en audio ${index} (blob):`, e);
            console.error(`[AudioContext] Blob error details:`, {
              code: newAudio.error?.code,
              message: newAudio.error?.message,
              networkState: newAudio.networkState,
              readyState: newAudio.readyState,
              src: newAudio.src,
              blobType: mimeType
            });
          };
          
          const newHandleEnded = () => {
            setCurrentIndex(prevIndex => {
              if (prevIndex === index && index < validSrcs.length - 1 && playAudioRef.current) {
                playAudioRef.current(index + 1, 0);
                return index + 1;
              }
              return prevIndex;
            });
          };
          
          newAudio.addEventListener('loadedmetadata', newHandleLoadedMetadata);
          newAudio.addEventListener('error', newHandleError);
          newAudio.addEventListener('ended', newHandleEnded);
          newAudio.oncanplaythrough = () => {
            console.log(`[AudioContext] Audio ${index} (blob) completamente cargado (canplaythrough)`);
          };
          
          // Cargar el audio - igual que Timeline
          newAudio.load();
          audioElementsRef.current[index] = newAudio;
          console.log(`[AudioContext] Audio ${index} cargado desde blob exitosamente`);
        } catch (blobError) {
          console.error(`[AudioContext] Error cargando audio ${index} como blob:`, blobError);
        }
      };
      
      audio.addEventListener('error', handleError);
      
      // Manejar metadata cargada - igual que Timeline
      const handleLoadedMetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setAudioDurations(prev => {
            const newDurations = [...prev];
            newDurations[index] = audio.duration;
            return newDurations;
          });
        }
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Manejar cuando el audio puede reproducirse - usar oncanplaythrough como Timeline
      const handleCanPlayThrough = () => {
        console.log(`[AudioContext] Audio ${index} completamente cargado (canplaythrough)`);
      };
      
      audio.oncanplaythrough = handleCanPlayThrough;
      
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
      
      // Cargar el audio - exactamente como Timeline: llamar load() después de crear
      // Timeline hace: audio.load() inmediatamente después de crear el Audio
      try {
        audio.load(); // Forzar la carga del audio, igual que Timeline
      } catch (error) {
        console.error(`[AudioContext] Error en load() para audio ${index}:`, error);
      }

      audioElementsRef.current.push(audio);
    });

    return () => {
      audioElementsRef.current.forEach((audio, index) => {
        if (audio) {
          audio.pause();
          audio.removeEventListener('loadedmetadata', () => {});
          audio.removeEventListener('error', () => {});
          audio.removeEventListener('ended', () => {});
          audio.removeEventListener('canplay', () => {});
          
          // Limpiar blob URLs si existen
          if (audio.src && audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src);
          }
          
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

  // Reproducir audio en un índice específico - simplificado
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

    // Cambiar índice
    setCurrentIndex(index);

    // Configurar nuevo audio
    newAudio.currentTime = startTime;
    volumeRef.current = 0;
    newAudio.volume = 0;

    // Timeline simplemente llama a play() sin verificar readyState
    try {
      await newAudio.play();
      setIsPlaying(true);
      
      // Fade in
      fadeVolume(1, 0.5, null, index);
    } catch (error) {
      console.error('[AudioContext] Error playing audio:', error);
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

  // Reanudar con fade in - simplificado como Timeline
  const play = useCallback(async () => {
    const currentAudio = audioElementsRef.current[currentIndex];
    if (!currentAudio) {
      console.warn('[AudioContext] No hay audio disponible en el índice', currentIndex);
      return;
    }

    // Timeline simplemente llama a play() y maneja el error con catch
    // No espera a que esté listo, el navegador lo maneja
    try {
      await currentAudio.play();
      setIsPlaying(true);
      fadeVolume(1, 0.5, null, currentIndex);
    } catch (error) {
      console.error('[AudioContext] Error resuming audio:', error);
      // Timeline también solo hace catch y log, no hace nada más
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
