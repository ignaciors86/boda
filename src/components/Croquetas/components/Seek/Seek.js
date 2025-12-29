import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import './Seek.scss';

const MAINCLASS = 'seek';

const Seek = ({ selectedTrack, seekToImagePosition }) => {
  const { 
    audioRef, 
    currentIndex, 
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
      const duration = audioDurations[i] || 0;
      if (accumulatedTime + duration >= targetTime) {
        targetAudioIndex = i;
        targetTimeInAudio = targetTime - accumulatedTime;
        break;
      }
      accumulatedTime += duration;
    }

    // Reposicionar imágenes si hay callback
    if (seekToImagePosition && selectedTrack) {
      seekToImagePosition(targetTime, selectedTrack);
    }
    
    // Hacer seek al audio
    await seekToAudio(targetAudioIndex, targetTimeInAudio);
  };

  const getSegmentColors = (index) => {
    const colors = [
      { color1: '#FF0080', color2: '#FF8000' },
      { color1: '#FFFF00', color2: '#00FF00' },
      { color1: '#0080FF', color2: '#8000FF' },
      { color1: '#00FFFF', color2: '#FF00FF' },
      { color1: '#FFB347', color2: '#FFD700' },
      { color1: '#C0C0C0', color2: '#FFFFFF' },
      { color1: '#FF6B6B', color2: '#4ECDC4' },
      { color1: '#95E1D3', color2: '#F38181' },
    ];
    return colors[index % colors.length];
  };

  const segments = React.useMemo(() => {
    if (!audioDurations || audioDurations.length === 0) return [];
    
    const totalDuration = getTotalDuration();
    if (totalDuration === 0) return [];
    
    const segmentsData = [];
    let accumulatedTime = 0;
    
    audioDurations.forEach((duration, index) => {
      const startPercent = (accumulatedTime / totalDuration) * 100;
      const widthPercent = ((duration || 0) / totalDuration) * 100;
      const colors = getSegmentColors(index);
      
      segmentsData.push({
        index,
        startPercent,
        widthPercent,
        ...colors
      });
      
      accumulatedTime += duration || 0;
    });
    
    return segmentsData;
  }, [audioDurations, getTotalDuration]);

  return (
    <div className={MAINCLASS}>
      <div className={`${MAINCLASS}__progressContainer`}>
        <div 
          className={`${MAINCLASS}__progressBar`}
          ref={progressBarRef}
          onClick={handleProgressClick}
        >
          {segments.map((segment) => (
            <div
              key={segment.index}
              className={`${MAINCLASS}__segment`}
              style={{
                left: `${segment.startPercent}%`,
                width: `${segment.widthPercent}%`,
                '--segment-color-1': segment.color1,
                '--segment-color-2': segment.color2
              }}
            />
          ))}
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
