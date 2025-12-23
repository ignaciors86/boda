import React from 'react';
import { useAudio } from '../../context/AudioContext';
import './LoadingIndicator.scss';

const LoadingIndicator = () => {
  const { loadingProgress, isLoaded } = useAudio();

  if (isLoaded) return null;

  return (
    <div className="loadingIndicator">
      <div className="loadingIndicator__bar">
        <div 
          className="loadingIndicator__fill" 
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      <div className="loadingIndicator__text">
        {Math.round(loadingProgress)}%
      </div>
    </div>
  );
};

export default LoadingIndicator;

