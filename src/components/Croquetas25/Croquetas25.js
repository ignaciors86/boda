import React, { useState, useRef, useEffect } from 'react';
import './Croquetas25.scss';
import Background from './components/Background/Background';
import AudioAnalyzer from './components/AudioAnalyzer/AudioAnalyzer';
import Seek from './components/Seek/Seek';
import LoadingIndicator from './components/LoadingIndicator/LoadingIndicator';
import { AudioProvider, useAudio } from './context/AudioContext';
import audioSrc from './assets/audio/audio.mp3';

const LoadingProgressHandler = ({ onTriggerCallbackRef }) => {
  const { loadingProgress, isLoaded } = useAudio();
  const lastProgressRef = useRef(0);

  useEffect(() => {
    const hasCallback = !!onTriggerCallbackRef;
    const hasCallbackCurrent = !!(onTriggerCallbackRef && onTriggerCallbackRef.current);
    console.log(`[LoadingProgressHandler] useEffect triggered | loadingProgress: ${loadingProgress} | isLoaded: ${isLoaded} | lastProgress: ${lastProgressRef.current} | hasCallback: ${hasCallback} | hasCallbackCurrent: ${hasCallbackCurrent}`);
    
    if (!onTriggerCallbackRef || !onTriggerCallbackRef.current) {
      console.warn(`[LoadingProgressHandler] Missing callback ref | onTriggerCallbackRef: ${!!onTriggerCallbackRef} | current: ${!!(onTriggerCallbackRef && onTriggerCallbackRef.current)}`);
      return;
    }
    if (isLoaded) {
      console.log(`[LoadingProgressHandler] Audio already loaded, skipping progress trigger`);
      return;
    }

    const progressDiff = loadingProgress - lastProgressRef.current;
    const shouldTrigger = progressDiff >= 5 || (progressDiff > 0 && loadingProgress > 0 && lastProgressRef.current === 0);
    
    console.log(`[LoadingProgressHandler] Progress check | progressDiff: ${progressDiff} | shouldTrigger: ${shouldTrigger} | condition1 (>=5): ${progressDiff >= 5} | condition2 (initial): ${progressDiff > 0 && loadingProgress > 0 && lastProgressRef.current === 0}`);
    
    // Generar cuadro cada 5% de progreso o cuando hay un salto significativo
    if (shouldTrigger) {
      try {
        console.log(`[LoadingProgressHandler] Triggering progress square | progress: ${loadingProgress} | progressDiff: ${progressDiff}`);
        onTriggerCallbackRef.current('progress', { 
          progress: loadingProgress,
          progressDiff 
        });
        lastProgressRef.current = loadingProgress;
        console.log(`[LoadingProgressHandler] Progress trigger executed successfully | new lastProgress: ${lastProgressRef.current}`);
      } catch (error) {
        console.error(`[LoadingProgressHandler] ERROR triggering progress: ${error.message} | stack: ${error.stack} | error object: ${JSON.stringify({ name: error.name, message: error.message })}`);
      }
    }
  }, [loadingProgress, isLoaded, onTriggerCallbackRef]);

  return null;
};

const Croquetas25 = () => {
  const [audioStarted, setAudioStarted] = useState(false);
  const triggerCallbackRef = useRef(null);

  const handleClick = () => {
    console.log(`[Croquetas25] handleClick called | audioStarted: ${audioStarted} | triggerCallbackRef.current exists: ${!!triggerCallbackRef.current} | timestamp: ${Date.now()}`);
    if (!audioStarted) {
      console.log(`[Croquetas25] Setting audioStarted to true | audioSrc: ${audioSrc} | triggerCallbackRef: ${JSON.stringify({ hasCurrent: !!triggerCallbackRef.current })}`);
      setAudioStarted(true);
    } else {
      console.log(`[Croquetas25] Audio already started, ignoring click`);
    }
  };

  const handleBeat = () => {
    const hasCallback = !!triggerCallbackRef.current;
    const timestamp = Date.now();
    console.log(`[Croquetas25] handleBeat called | hasCallback: ${hasCallback} | timestamp: ${timestamp}`);
    if (triggerCallbackRef.current) {
      try {
        triggerCallbackRef.current('beat', { timestamp });
        console.log(`[Croquetas25] handleBeat: Trigger callback executed successfully`);
      } catch (error) {
        console.error(`[Croquetas25] handleBeat ERROR: ${error.message} | stack: ${error.stack} | error object: ${JSON.stringify({ name: error.name, message: error.message })}`);
      }
    } else {
      console.warn(`[Croquetas25] handleBeat: triggerCallbackRef.current is null, cannot trigger beat`);
    }
  };

  return (
    <div className="croquetas25" onClick={handleClick}>
      <Background onTriggerCallbackRef={triggerCallbackRef} />
      {audioStarted && (
        <AudioProvider audioSrc={audioSrc}>
          <LoadingProgressHandler onTriggerCallbackRef={triggerCallbackRef} />
          <LoadingIndicator />
          <AudioAnalyzer onBeat={handleBeat} />
          <Seek />
        </AudioProvider>
      )}
    </div>
  );
};

export default Croquetas25;

