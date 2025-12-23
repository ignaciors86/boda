import React, { useState, useRef } from 'react';
import './Croquetas25.scss';
import Background from './components/Background/Background';
import AudioAnalyzer from './components/AudioAnalyzer/AudioAnalyzer';
import audioSrc from './assets/audio/audio.mp3';

const Croquetas25 = () => {
  const [audioStarted, setAudioStarted] = useState(false);
  const beatCallbackRef = useRef(null);

  const handleClick = () => {
    if (!audioStarted) {
      setAudioStarted(true);
    }
  };

  const handleBeat = () => {
    if (beatCallbackRef.current) {
      beatCallbackRef.current();
    }
  };

  return (
    <div className="croquetas25" onClick={handleClick}>
      <Background onBeatCallbackRef={beatCallbackRef} />
      {audioStarted && (
        <AudioAnalyzer onBeat={handleBeat} audioSrc={audioSrc} />
      )}
    </div>
  );
};

export default Croquetas25;

