import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import './Seek.scss';

const MAINCLASS = 'seek';

const Seek = ({ squares, seekToImagePosition, selectedTrack }) => {
  const { 
    audioRef, 
    currentIndex, 
    audioSrcs, 
    audioDurations, 
    getTotalDuration, 
    getTotalElapsed,
    seekToAudio 
  } = useAudio();
  const [progress, setProgress] = useState(0);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (!audioRef?.current || audioDurations.length === 0) return;

    const updateProgress = () => {
      const totalDuration = getTotalDuration();
      const totalElapsed = getTotalElapsed();
      
      if (totalDuration > 0) {
        const progressPercent = (totalElapsed / totalDuration) * 100;
        setProgress(Math.max(0, Math.min(100, progressPercent)));
      }
    };

    const handleTimeUpdate = () => updateProgress();

    const audio = audioRef.current;
    audio.addEventListener('timeupdate', handleTimeUpdate);

    updateProgress();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, currentIndex, audioDurations, getTotalDuration, getTotalElapsed]);

  const handleProgressClick = async (e) => {
    if (!audioRef?.current || !progressBarRef.current || audioDurations.length === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    
    const totalDuration = getTotalDuration();
    const targetTime = (percentage / 100) * totalDuration;
    
    // Encontrar en qué canción está ese tiempo
    let accumulatedTime = 0;
    let targetAudioIndex = 0;
    let targetTimeInAudio = 0;

    for (let i = 0; i < audioDurations.length; i++) {
      const duration = audioDurations[i];
      if (accumulatedTime + duration >= targetTime) {
        targetAudioIndex = i;
        targetTimeInAudio = targetTime - accumulatedTime;
        break;
      }
      accumulatedTime += duration;
    }

    // Usar tiempos auxiliares para reposicionar imágenes ANTES de hacer seek del audio
    if (seekToImagePosition && selectedTrack) {
      seekToImagePosition(targetTime, selectedTrack);
    }
    
    // Llamar a seekToAudio con el tiempo objetivo
    await seekToAudio(targetAudioIndex, targetTimeInAudio);
  };

  const lastSquare = squares && squares.length > 0 ? squares[squares.length - 1] : null;
  const currentColor = lastSquare?.gradient?.color1 || '#00ffff';
  const currentColor2 = lastSquare?.gradient?.color2 || currentColor;

  return (
    <div className={MAINCLASS}>
      <div className={`${MAINCLASS}__progressContainer`}>
        <div 
          className={`${MAINCLASS}__progressBar`}
          ref={progressBarRef}
          onClick={handleProgressClick}
          style={{
            '--seek-color-1': currentColor,
            '--seek-color-2': currentColor2
          }}
        >
          <div 
            className={`${MAINCLASS}__progressFill`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Seek;
