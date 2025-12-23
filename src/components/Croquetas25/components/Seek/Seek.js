import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import './Seek.scss';

const Seek = () => {
  const { audioRef, isPlaying, togglePlayPause } = useAudio();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!audioRef?.current) return;

    const audio = audioRef.current;

    const updateProgress = () => {
      if (!isDraggingRef.current && audio.duration) {
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
    
    // Si el click fue en el thumb, no hacer nada (el drag lo maneja)
    if (e.target.classList.contains('seek__progressHandle')) {
      return;
    }
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !audioRef?.current || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingRef.current]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          onMouseDown={handleMouseDown}
        >
          <div 
            className="seek__progressFill" 
            style={{ width: `${progress}%` }}
          />
          <div 
            className="seek__progressHandle" 
            style={{ left: `${progress}%` }}
            onMouseDown={(e) => {
              e.stopPropagation(); // Evitar que el click en el thumb active el drag
              handleMouseDown();
            }}
          />
        </div>
        <div className="seek__time">
          <span>{formatTime((progress / 100) * duration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default Seek;
