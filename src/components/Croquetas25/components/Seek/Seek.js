import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import './Seek.scss';

const Seek = ({ squares }) => {
  const { audioRef, isPlaying, togglePlayPause } = useAudio();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (!audioRef?.current) return;

    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const updateDuration = () => {
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => updateProgress();
    const handleLoadedMetadata = () => updateDuration();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    updateDuration();
    updateProgress();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioRef]);

  const handleProgressClick = (e) => {
    if (!audioRef?.current || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  // Obtener colores del último cuadro para la barra
  const lastSquare = squares && squares.length > 0 ? squares[squares.length - 1] : null;
  const currentColor = lastSquare?.gradient?.color1 || '#00ffff';
  const currentColor2 = lastSquare?.gradient?.color2 || currentColor;

  return (
    <div className="seek">
      <button className="seek__playPause" onClick={togglePlayPause}>
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
        )}
      </button>
      
      <div className="seek__progressContainer">
        <div 
          className="seek__progressBar"
          ref={progressBarRef}
          onClick={handleProgressClick}
          style={{
            '--seek-color-1': currentColor,
            '--seek-color-2': currentColor2
          }}
        >
          <div 
            className="seek__progressFill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Seek;
