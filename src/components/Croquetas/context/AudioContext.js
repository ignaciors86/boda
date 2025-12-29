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

  // Crear elementos de audio para cada src
  useEffect(() => {
    // Limpiar audios anteriores
    audioElementsRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }
    });
    audioElementsRef.current = [];

    // Crear nuevos elementos de audio
    const validSrcs = audioSrcs.filter(src => typeof src === 'string' && src.length > 0);
    
    validSrcs.forEach((src, index) => {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      audio.volume = 0;
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDurations(prev => {
          const newDurations = [...prev];
          newDurations[index] = audio.duration;
          return newDurations;
        });
      });

      audio.addEventListener('ended', () => {
        // Cuando termina un audio, pasar al siguiente
        // Solo si este es el audio actual
        setCurrentIndex(prevIndex => {
          if (prevIndex === index && index < validSrcs.length - 1 && playAudioRef.current) {
            playAudioRef.current(index + 1, 0);
            return index + 1;
          }
          return prevIndex;
        });
      });

      audioElementsRef.current.push(audio);
    });

    return () => {
      audioElementsRef.current.forEach(audio => {
        if (audio) {
          audio.pause();
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
    if (index < 0 || index >= audioElementsRef.current.length) return;

    const newAudio = audioElementsRef.current[index];
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

  // Reanudar con fade in
  const play = useCallback(async () => {
    const currentAudio = audioElementsRef.current[currentIndex];
    if (!currentAudio) return;

    try {
      await currentAudio.play();
      setIsPlaying(true);
      fadeVolume(1, 0.5, null, currentIndex);
    } catch (error) {
      console.error('[AudioContext] Error resuming audio:', error);
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
