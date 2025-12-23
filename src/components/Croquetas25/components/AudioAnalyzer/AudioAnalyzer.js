import React, { useRef, useEffect } from 'react';
import './AudioAnalyzer.scss';

const AudioAnalyzer = ({ onBeat, audioSrc }) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const lastBeatTimeRef = useRef(0);
  const energyHistoryRef = useRef([]);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    if (isInitializedRef.current) return;

    const audio = audioRef.current;

    const setupAudio = async () => {
      if (isInitializedRef.current) return;
      
      try {
        isInitializedRef.current = true;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audio);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        audio.volume = 1;
        audio.muted = false;

        const playAudio = async () => {
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          await audio.play();
        };

        audio.addEventListener('canplaythrough', playAudio, { once: true });
        audio.load();

      } catch (error) {
        console.error('AudioAnalyzer setup error:', error);
        isInitializedRef.current = false;
      }
    };

    setupAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      isInitializedRef.current = false;
    };
  }, [audioSrc]);

  useEffect(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    let animationFrameId;

    const analyze = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      const bassStart = 0;
      const bassEnd = 20;
      let bassEnergy = 0;
      
      for (let i = bassStart; i < bassEnd; i++) {
        bassEnergy += dataArrayRef.current[i];
      }
      
      bassEnergy = bassEnergy / (bassEnd - bassStart);
      
      energyHistoryRef.current.push(bassEnergy);
      if (energyHistoryRef.current.length > 10) {
        energyHistoryRef.current.shift();
      }
      
      if (energyHistoryRef.current.length >= 5) {
        const averageEnergy = energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length;
        const threshold = averageEnergy * 1.3;
        
        const now = Date.now();
        if (bassEnergy > threshold && now - lastBeatTimeRef.current > 100) {
          lastBeatTimeRef.current = now;
          if (onBeat) onBeat();
        }
      }
      
      animationFrameId = requestAnimationFrame(analyze);
    };

    animationFrameId = requestAnimationFrame(analyze);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [onBeat]);

  return (
    <div className="audioAnalyzer">
      <audio
        key={audioSrc}
        ref={audioRef}
        src={audioSrc}
        crossOrigin="anonymous"
        loop
      />
    </div>
  );
};

export default AudioAnalyzer;
