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


  // Calcular posiciones y colores de cada tramo
  const getSegmentColors = (index) => {
    // Paleta de colores para diferentes tramos
    const colors = [
      { color1: '#FF0080', color2: '#FF8000' }, // Rosa/Naranja
      { color1: '#FFFF00', color2: '#00FF00' }, // Amarillo/Verde
      { color1: '#0080FF', color2: '#8000FF' }, // Azul/Morado
      { color1: '#00FFFF', color2: '#FF00FF' }, // Cyan/Magenta
      { color1: '#FFB347', color2: '#FFD700' }, // Naranja/Dorado
      { color1: '#C0C0C0', color2: '#FFFFFF' }, // Plata/Blanco
      { color1: '#FF6B6B', color2: '#4ECDC4' }, // Rojo/Verde agua
      { color1: '#95E1D3', color2: '#F38181' }, // Verde agua/Rosa
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
      const widthPercent = (duration / totalDuration) * 100;
      const colors = getSegmentColors(index);
      
      segmentsData.push({
        index,
        startPercent,
        widthPercent,
        ...colors
      });
      
      accumulatedTime += duration;
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
          style={{}}
        >
          {/* Segmentos de fondo con diferentes colores */}
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
