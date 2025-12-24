import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
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

    // Configurar el elemento audio
    audio.volume = 1;
    audio.muted = false;
    audio.preload = 'auto';

    // Función para actualizar el progreso de carga
    const updateProgress = () => {
      if (!audio) return;
      
      if (audio.buffered.length > 0 && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const progress = Math.min((bufferedEnd / audio.duration) * 100, 100);
        setLoadingProgress(progress);
        
        if (progress >= 95 || bufferedEnd >= audio.duration * 0.95) {
          setIsLoaded(true);
          setLoadingProgress(100);
        }
      } else if (audio.readyState >= 2) {
        let progress = 0;
        if (audio.readyState === 2) progress = 25;
        else if (audio.readyState === 3) progress = 75;
        else if (audio.readyState === 4) progress = 100;
        
        setLoadingProgress(progress);
        if (audio.readyState >= 4) {
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
          globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('[AudioContext] Created AudioContext | state:', globalAudioContext.state);
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
          if (globalAudioContext.state === 'suspended') {
            await globalAudioContext.resume();
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

    // Función para reproducir el audio
    const playAudio = async () => {
      try {
        if (globalAudioContext && globalAudioContext.state === 'suspended') {
          await globalAudioContext.resume();
        }

        if (audio.paused) {
          await audio.play();
          setIsPlaying(true);
          if (!isLoaded) {
            setIsLoaded(true);
            setLoadingProgress(100);
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
      if (audio.readyState >= 3) {
        await playAudio();
      }
    };

    const handleProgress = () => updateProgress();
    const handleLoadedData = () => updateProgress();

    const handleCanPlayThrough = () => {
      updateProgress();
      setIsLoaded(true);
      setLoadingProgress(100);
    };

    // Configurar event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('loadeddata', handleLoadedData);

    audioCleanup = () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('loadeddata', handleLoadedData);
    };

    // Cargar el audio
    if (audio.readyState === 0) {
      audio.load();
    }

    // Actualizar progreso periódicamente
    progressIntervalId = setInterval(() => {
      updateProgress();
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        if (audio.readyState >= 3 || (!audio.paused && audio.currentTime > 0)) {
          if (!isLoaded) {
            setIsLoaded(true);
            setLoadingProgress(100);
          }
        }
      }
      if (isLoaded) {
        clearInterval(progressIntervalId);
      }
    }, 100);

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
    if (audioRef.current && audioRef.current.paused) {
      try {
        if (globalAudioContext && globalAudioContext.state === 'suspended') {
          await globalAudioContext.resume();
        }
        await audioRef.current.play();
      } catch (error) {
        console.error('[AudioContext] Error playing:', error);
      }
    }
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
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
        preload="auto"
        className="audio-context"
      />
    </AudioContextReact.Provider>
  );
};
