import React, { useState, useEffect } from 'react';
import { useAudio } from '../../../context/AudioContext';
import './DebugPanel.scss';

const DebugPanel = ({ imagesLoading, imagesProgress, audioStarted, loadingFadedOut, selectedTrack }) => {
  const { isLoaded, audioRef, audioContextRef, loadingProgress, isPlaying, currentIndex } = useAudio();
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Interceptar console.log para capturar logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev.slice(-49), { type: 'log', message: args.join(' '), time: new Date().toLocaleTimeString() }]);
    };

    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev.slice(-49), { type: 'error', message: args.join(' '), time: new Date().toLocaleTimeString() }]);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      setLogs(prev => [...prev.slice(-49), { type: 'warn', message: args.join(' '), time: new Date().toLocaleTimeString() }]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const audio = audioRef?.current;
  const audioContext = audioContextRef?.current || window.__globalAudioContext;

  const debugInfo = {
    // Estado general
    track: selectedTrack?.name || 'none',
    audioStarted,
    loadingFadedOut,
    isPlaying,
    
    // Imágenes
    imagesLoading,
    imagesProgress: Math.round(imagesProgress),
    
    // Audio
    audioLoaded: isLoaded,
    audioLoadingProgress: Math.round(loadingProgress),
    audioReadyState: audio?.readyState ?? 'N/A',
    audioPaused: audio?.paused ?? 'N/A',
    audioCurrentTime: audio?.currentTime?.toFixed(2) ?? 'N/A',
    audioDuration: audio?.duration?.toFixed(2) ?? 'N/A',
    audioSrc: audio?.src ? audio.src.split('/').pop() : 'N/A',
    currentAudioIndex: currentIndex,
    
    // AudioContext
    audioContextState: audioContext?.state ?? 'N/A',
    
    // Navegador
    userAgent: navigator.userAgent,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    isChromeIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && /CriOS/.test(navigator.userAgent),
    isSafariIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent),
  };

  // Mostrar automáticamente en móviles
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 99999,
          padding: '10px',
          background: '#000',
          color: '#0f0',
          border: '1px solid #0f0',
          cursor: 'pointer'
        }}
      >
        Debug
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <h3>Debug Panel</h3>
        <button onClick={() => setIsVisible(false)}>✕</button>
        <button onClick={() => setLogs([])}>Clear Logs</button>
      </div>
      
      <div className="debug-panel__content">
        <div className="debug-panel__section">
          <h4>Estado General</h4>
          <div className="debug-panel__info">
            <div>Track: <strong>{debugInfo.track}</strong></div>
            <div>Audio Started: <strong>{debugInfo.audioStarted ? 'YES' : 'NO'}</strong></div>
            <div>Loading Faded: <strong>{debugInfo.loadingFadedOut ? 'YES' : 'NO'}</strong></div>
            <div>Is Playing: <strong>{debugInfo.isPlaying ? 'YES' : 'NO'}</strong></div>
          </div>
        </div>

        <div className="debug-panel__section">
          <h4>Imágenes</h4>
          <div className="debug-panel__info">
            <div>Loading: <strong>{debugInfo.imagesLoading ? 'YES' : 'NO'}</strong></div>
            <div>Progress: <strong>{debugInfo.imagesProgress}%</strong></div>
          </div>
        </div>

        <div className="debug-panel__section">
          <h4>Audio</h4>
          <div className="debug-panel__info">
            <div>Loaded: <strong>{debugInfo.audioLoaded ? 'YES' : 'NO'}</strong></div>
            <div>Progress: <strong>{debugInfo.audioLoadingProgress}%</strong></div>
            <div>ReadyState: <strong>{debugInfo.audioReadyState}</strong></div>
            <div>Paused: <strong>{debugInfo.audioPaused}</strong></div>
            <div>Current Time: <strong>{debugInfo.audioCurrentTime}s</strong></div>
            <div>Duration: <strong>{debugInfo.audioDuration}s</strong></div>
            <div>Src: <strong>{debugInfo.audioSrc}</strong></div>
            <div>Index: <strong>{debugInfo.currentAudioIndex}</strong></div>
          </div>
        </div>

        <div className="debug-panel__section">
          <h4>AudioContext</h4>
          <div className="debug-panel__info">
            <div>State: <strong>{debugInfo.audioContextState}</strong></div>
          </div>
        </div>

        <div className="debug-panel__section">
          <h4>Navegador</h4>
          <div className="debug-panel__info">
            <div>iOS: <strong>{debugInfo.isIOS ? 'YES' : 'NO'}</strong></div>
            <div>Chrome iOS: <strong>{debugInfo.isChromeIOS ? 'YES' : 'NO'}</strong></div>
            <div>Safari iOS: <strong>{debugInfo.isSafariIOS ? 'YES' : 'NO'}</strong></div>
            <div>User Agent: <strong style={{fontSize: '8px', wordBreak: 'break-all'}}>{debugInfo.userAgent}</strong></div>
          </div>
        </div>

        <div className="debug-panel__section">
          <h4>Logs ({logs.length})</h4>
          <div className="debug-panel__logs">
            {logs.map((log, i) => (
              <div key={i} className={`debug-panel__log debug-panel__log--${log.type}`}>
                <span className="debug-panel__log-time">{log.time}</span>
                <span className="debug-panel__log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;

