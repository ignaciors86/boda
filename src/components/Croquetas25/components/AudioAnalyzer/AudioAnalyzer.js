import React, { useRef, useEffect } from 'react';
import './AudioAnalyzer.scss';

const AudioAnalyzer = ({ onBeat, onVoice, onAudioData, audioRef, audioAnalysis, isPlaying, currentIndex }) => {
  const { analyserRef, dataArrayRef, timeDataArrayRef, isInitialized } = audioAnalysis || {};
  const lastBeatTimeRef = useRef(0);
  const lastVoiceTimeRef = useRef(0);
  const energyHistoryRef = useRef([]);
  const voiceHistoryRef = useRef([]);
  const trebleHistoryRef = useRef([]);

  const frequencyRanges = {
    subBass: { start: 0, end: 24 },
    bass: { start: 24, end: 80 },
    lowMid: { start: 80, end: 200 },
    mid: { start: 200, end: 400 },
    highMid: { start: 400, end: 600 },
    treble: { start: 600, end: 800 },
    presence: { start: 800, end: 1024 }
  };

  useEffect(() => {
    if (!isInitialized || !analyserRef?.current || !dataArrayRef?.current) {
      return;
    }

    const audio = audioRef?.current;
    if (!audio) return;

    if (audio.error) {
      console.warn(`[AudioAnalyzer] Audio has error:`, {
        error: audio.error,
        code: audio.error?.code,
        message: audio.error?.message,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      return;
    }

    const minReadyState = 2;
    if (audio.readyState < minReadyState) {
      return;
    }

    if (!isPlaying && audio.paused) {
      return;
    }

    let animationFrameId;
    let frameCount = 0;

    const calculateSpectralCentroid = (frequencyData, audioContext, analyser) => {
      if (!audioContext || !analyser) return 0;

      let weightedSum = 0;
      let magnitudeSum = 0;
      const sampleRate = audioContext.sampleRate;
      const fftSize = analyser.fftSize;

      for (let i = 0; i < frequencyData.length; i++) {
        const magnitude = frequencyData[i];
        const frequency = (i * sampleRate) / fftSize;
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
      }

      return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    };

    const analyze = () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        return;
      }

      frameCount++;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      analyserRef.current.getByteTimeDomainData(timeDataArrayRef.current);

      const rangeEnergy = {};
      for (const [name, range] of Object.entries(frequencyRanges)) {
        let energy = 0;
        for (let i = range.start; i < range.end && i < dataArrayRef.current.length; i++) {
          energy += dataArrayRef.current[i];
        }
        rangeEnergy[name] = energy / (range.end - range.start);
      }

      const totalEnergy = Object.values(rangeEnergy).reduce((a, b) => a + b, 0) / Object.keys(rangeEnergy).length;
      const bassEnergy = (rangeEnergy.subBass + rangeEnergy.bass) / 2;
      const lowMidEnergy = rangeEnergy.lowMid;
      const rhythmEnergy = (bassEnergy * 0.7) + (lowMidEnergy * 0.3);
      const midEnergy = (rangeEnergy.mid + rangeEnergy.highMid) / 2;
      const trebleEnergy = (rangeEnergy.treble + rangeEnergy.presence) / 2;
      const voiceEnergy = (midEnergy * 0.6) + (trebleEnergy * 0.4);
      const sharpEnergy = (rangeEnergy.treble * 0.7) + (rangeEnergy.presence * 0.3);

      energyHistoryRef.current.push(rhythmEnergy);
      if (energyHistoryRef.current.length > 20) {
        energyHistoryRef.current.shift();
      }

      const averageRhythmEnergy = energyHistoryRef.current.length > 0
        ? energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length
        : 0;

      const rhythmVariance = energyHistoryRef.current.length > 1
        ? energyHistoryRef.current.reduce((acc, val) => acc + Math.pow(val - averageRhythmEnergy, 2), 0) / energyHistoryRef.current.length
        : 0;

      const normalizedVolume = Math.min(totalEnergy / 255, 1);

      trebleHistoryRef.current.push(sharpEnergy);
      if (trebleHistoryRef.current.length > 15) {
        trebleHistoryRef.current.shift();
      }

      const averageTrebleEnergy = trebleHistoryRef.current.length > 0
        ? trebleHistoryRef.current.reduce((a, b) => a + b, 0) / trebleHistoryRef.current.length
        : 0;

      const trebleVariance = trebleHistoryRef.current.length > 1
        ? trebleHistoryRef.current.reduce((acc, val) => acc + Math.pow(val - averageTrebleEnergy, 2), 0) / trebleHistoryRef.current.length
        : 0;

      const trebleSensitivity = 0.25 + (0.45 * (1 - normalizedVolume));
      const trebleThreshold = averageTrebleEnergy + (Math.sqrt(trebleVariance) * trebleSensitivity * 0.8);
      const trebleSpikeThreshold = 0.5 + (0.25 * (1 - normalizedVolume));
      const trebleSpikeMultiplier = 1.0 + (0.2 * (1 - normalizedVolume));
      const recentTreble = trebleHistoryRef.current.slice(-4);
      const maxRecentTreble = recentTreble.length > 0 ? Math.max(...recentTreble) : 0;
      const trebleSpike = sharpEnergy > maxRecentTreble * trebleSpikeThreshold && sharpEnergy > averageTrebleEnergy * trebleSpikeMultiplier;
      const solidSquareDetected = sharpEnergy > trebleThreshold || trebleSpike;

      const rhythmSensitivity = 0.02 + (0.2 * (1 - normalizedVolume));
      const rhythmThreshold = averageRhythmEnergy + (Math.sqrt(rhythmVariance) * rhythmSensitivity * 0.2);
      const rhythmSpikeThreshold = 0.1 + (0.08 * (1 - normalizedVolume));
      const rhythmSpikeMultiplier = 0.5 + (0.12 * (1 - normalizedVolume));
      const recentRhythm = energyHistoryRef.current.slice(-5);
      const maxRecentRhythm = Math.max(...recentRhythm);
      const rhythmSpike = rhythmEnergy > maxRecentRhythm * rhythmSpikeThreshold && rhythmEnergy > averageRhythmEnergy * rhythmSpikeMultiplier;

      const voiceHistory = voiceHistoryRef.current || [];
      voiceHistory.push(voiceEnergy);
      if (voiceHistory.length > 20) voiceHistory.shift();
      voiceHistoryRef.current = voiceHistory;

      const averageVoiceEnergy = voiceHistory.length > 0
        ? voiceHistory.reduce((a, b) => a + b, 0) / voiceHistory.length
        : 0;

      const voiceVariance = voiceHistory.length > 1
        ? voiceHistory.reduce((acc, val) => acc + Math.pow(val - averageVoiceEnergy, 2), 0) / voiceHistory.length
        : 0;

      const voiceSensitivity = 0.05 + (0.3 * (1 - normalizedVolume));
      const voiceThreshold = averageVoiceEnergy + (Math.sqrt(voiceVariance) * voiceSensitivity * 0.3);
      const voiceSpikeThreshold = 0.25 + (0.1 * (1 - normalizedVolume));
      const voiceSpikeMultiplier = 0.65 + (0.15 * (1 - normalizedVolume));
      const recentVoice = voiceHistory.slice(-5);
      const maxRecentVoice = Math.max(...recentVoice);
      const voiceSpike = voiceEnergy > maxRecentVoice * voiceSpikeThreshold && voiceEnergy > averageVoiceEnergy * voiceSpikeMultiplier;

      const now = Date.now();
      const timeSinceLastBeat = now - lastBeatTimeRef.current;
      const minTimeBetweenBeats = 15 + (35 * (1 - normalizedVolume));
      const rhythmDetected = (rhythmEnergy > rhythmThreshold || rhythmSpike) && timeSinceLastBeat > minTimeBetweenBeats;

      if (rhythmDetected) {
        lastBeatTimeRef.current = now;
        if (onBeat) {
          try {
            onBeat(normalizedVolume, solidSquareDetected);
          } catch (error) {
            console.error(`[AudioAnalyzer] ERROR in onBeat callback: ${error.message}`);
          }
        }
      }

      const timeSinceLastVoice = now - lastVoiceTimeRef.current;
      const minTimeBetweenVoices = 200 + (600 * (1 - normalizedVolume));
      const hasSignificantVoice = voiceEnergy > averageVoiceEnergy * 0.8 || voiceEnergy > 20;
      const voiceDetected = (hasSignificantVoice || voiceEnergy > voiceThreshold || voiceSpike) && timeSinceLastVoice > minTimeBetweenVoices;

      if (voiceDetected) {
        lastVoiceTimeRef.current = now;
        if (onVoice) {
          try {
            onVoice(normalizedVolume, voiceEnergy);
          } catch (error) {
            console.error(`[AudioAnalyzer] onVoice error: ${error.message}`);
          }
        }
      }

      if (onAudioData) {
        onAudioData({
          frequencyData: dataArrayRef.current,
          timeDomainData: timeDataArrayRef.current,
          normalizedVolume: normalizedVolume,
          spectralCentroid: calculateSpectralCentroid(dataArrayRef.current, audioAnalysis?.audioContextRef?.current, analyserRef.current),
          totalEnergy: totalEnergy,
          averageEnergy: averageRhythmEnergy,
          energyVariance: rhythmVariance,
          bassEnergy: bassEnergy,
          midEnergy: midEnergy,
          sharpEnergy: sharpEnergy,
          voiceEnergy: voiceEnergy,
          estimatedBPM: 0,
          beatDetected: rhythmDetected,
          voiceDetected: voiceDetected,
          solidSquareDetected: solidSquareDetected,
        });
      }

      animationFrameId = requestAnimationFrame(analyze);
    };

    animationFrameId = requestAnimationFrame(analyze);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInitialized, isPlaying, currentIndex, onBeat, onVoice, onAudioData, analyserRef, dataArrayRef, timeDataArrayRef, audioRef, audioAnalysis]);

  return null;
};

export default AudioAnalyzer;
