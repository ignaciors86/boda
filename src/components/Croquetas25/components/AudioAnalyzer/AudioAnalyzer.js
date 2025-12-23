import React, { useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import './AudioAnalyzer.scss';

const AudioAnalyzer = ({ onBeat, onAudioData }) => {
  const { audioRef, audioContextRef, analyserRef, dataArrayRef, timeDataArrayRef, isInitialized } = useAudio();
  const lastBeatTimeRef = useRef(0);
  const energyHistoryRef = useRef([]);

  // Rangos de frecuencias (en índices del array de frecuencias)
  // Con fftSize 2048, tenemos 1024 bins de frecuencia
  // Cada bin representa aproximadamente 21.5Hz (44100Hz / 2048)
  const frequencyRanges = {
    subBass: { start: 0, end: 24 },      // 0-516Hz - Subgraves profundos
    bass: { start: 24, end: 80 },        // 516-1720Hz - Graves
    lowMid: { start: 80, end: 200 },    // 1720-4300Hz - Medios bajos
    mid: { start: 200, end: 400 },       // 4300-8600Hz - Medios
    highMid: { start: 400, end: 600 },  // 8600-12900Hz - Medios altos
    treble: { start: 600, end: 800 },   // 12900-17200Hz - Agudos
    presence: { start: 800, end: 1024 } // 17200-22050Hz - Presencia
  };

  useEffect(() => {
    console.log(`[AudioAnalyzer] useEffect triggered | analyserRef.current exists: ${!!analyserRef.current} | dataArrayRef.current exists: ${!!dataArrayRef.current} | isInitialized: ${isInitialized} | onBeat exists: ${!!onBeat} | timestamp: ${Date.now()}`);
    
    // Esperar a que los refs estén disponibles y el audio esté realmente funcionando
    if (!isInitialized) {
      console.log(`[AudioAnalyzer] Not initialized yet, waiting...`);
      return;
    }

    // Verificar que tenemos todos los refs necesarios
    if (!analyserRef.current) {
      console.warn(`[AudioAnalyzer] Analyser not available. Audio may be connected to another AudioContext. Audio analysis will not work.`);
      return;
    }

    if (!dataArrayRef.current) {
      console.warn(`[AudioAnalyzer] dataArrayRef not available`);
      return;
    }

    // Verificar que el AudioContext esté en estado 'running' y el audio esté reproduciéndose
    const audioContext = audioContextRef?.current;
    const audio = audioRef?.current;
    
    if (audioContext && audioContext.state !== 'running') {
      console.log(`[AudioAnalyzer] AudioContext is ${audioContext.state}, waiting for it to be running...`);
      // Intentar resumir el AudioContext
      audioContext.resume().then(() => {
        console.log(`[AudioAnalyzer] AudioContext resumed, state: ${audioContext.state}`);
      }).catch(err => {
        console.error(`[AudioAnalyzer] Error resuming AudioContext:`, err);
      });
      return;
    }

    // Verificar que el audio esté realmente reproduciéndose antes de analizar
    if (audio && (audio.paused || audio.readyState < 3)) {
      console.log(`[AudioAnalyzer] Audio not ready yet | paused: ${audio.paused} | readyState: ${audio.readyState}`);
      return;
    }

    console.log(`[AudioAnalyzer] Starting analysis loop | analyser.fftSize: ${analyserRef.current.fftSize} | frequencyBinCount: ${analyserRef.current.frequencyBinCount} | dataArray.length: ${dataArrayRef.current.length}`);
    let animationFrameId;

    // Función auxiliar para calcular el centroide espectral
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

    let frameCount = 0;
    const analyze = () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        console.warn(`[AudioAnalyzer] analyze: Missing refs | analyserRef: ${!!analyserRef.current} | dataArrayRef: ${!!dataArrayRef.current}`);
        return;
      }
      
      frameCount++;
      if (frameCount % 60 === 0) {
        console.log(`[AudioAnalyzer] Analysis running | frame: ${frameCount} | analyser exists: ${!!analyserRef.current} | dataArray exists: ${!!dataArrayRef.current} | timestamp: ${Date.now()}`);
      }
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      analyserRef.current.getByteTimeDomainData(timeDataArrayRef.current);
      
      // Calcular energía por rango de frecuencia
      const rangeEnergy = {};
      for (const [name, range] of Object.entries(frequencyRanges)) {
        let energy = 0;
        for (let i = range.start; i < range.end && i < dataArrayRef.current.length; i++) {
          energy += dataArrayRef.current[i];
        }
        rangeEnergy[name] = energy / (range.end - range.start);
      }

      // Energía total
      const totalEnergy = Object.values(rangeEnergy).reduce((a, b) => a + b, 0) / Object.keys(rangeEnergy).length;

      // Energía de graves (bass + subBass) para detección de beats
      const bassEnergy = (rangeEnergy.subBass + rangeEnergy.bass) / 2;

      // Calcular variación de energía (para detectar cambios dinámicos)
      energyHistoryRef.current.push(totalEnergy);
      if (energyHistoryRef.current.length > 30) {
        energyHistoryRef.current.shift();
      }

      // Calcular métricas avanzadas
      const averageEnergy = energyHistoryRef.current.length > 0
        ? energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length
        : 0;

      // Detección de beats adaptativa
      const energyVariance = energyHistoryRef.current.length > 1
        ? energyHistoryRef.current.reduce((acc, val) => acc + Math.pow(val - averageEnergy, 2), 0) / energyHistoryRef.current.length
        : 0;

      // Threshold adaptativo basado en la varianza
      const adaptiveThreshold = averageEnergy + (Math.sqrt(energyVariance) * 1.5);

      // Detección de beats mejorada
      const now = Date.now();
      const timeSinceLastBeat = now - lastBeatTimeRef.current;
      const beatDetected = bassEnergy > adaptiveThreshold && timeSinceLastBeat > 100;
      
      if (beatDetected) {
        const beatInfo = {
          bassEnergy: bassEnergy,
          adaptiveThreshold: adaptiveThreshold,
          timeSinceLastBeat: timeSinceLastBeat,
          timestamp: now,
          totalEnergy: totalEnergy,
          averageEnergy: averageEnergy,
          energyVariance: energyVariance
        };
        console.log(`[AudioAnalyzer] BEAT DETECTED: ${JSON.stringify(beatInfo)}`);
        lastBeatTimeRef.current = now;
        if (onBeat) {
          try {
            onBeat();
            console.log(`[AudioAnalyzer] onBeat callback executed successfully`);
          } catch (error) {
            console.error(`[AudioAnalyzer] ERROR in onBeat callback: ${error.message} | stack: ${error.stack} | error object: ${JSON.stringify({ name: error.name, message: error.message })}`);
          }
        } else {
          console.warn(`[AudioAnalyzer] Beat detected but onBeat callback is null`);
        }
      }

      // Calcular ritmo estimado (BPM aproximado basado en intervalos entre beats)
      const beatInterval = now - lastBeatTimeRef.current;
      const estimatedBPM = beatInterval > 0 ? 60000 / beatInterval : 0;

      // Preparar datos de audio para efectos futuros
      if (onAudioData) {
        const audioData = {
          // Energías por rango
          frequencies: rangeEnergy,
          
          // Métricas globales
          totalEnergy: totalEnergy,
          averageEnergy: averageEnergy,
          energyVariance: energyVariance,
          
          // Métricas de ritmo
          bassEnergy: bassEnergy,
          estimatedBPM: estimatedBPM,
          beatDetected: bassEnergy > adaptiveThreshold,
          
          // Datos raw para análisis avanzado
          frequencyData: Array.from(dataArrayRef.current),
          timeData: Array.from(timeDataArrayRef.current),
          
          // Características calculadas
          dynamics: {
            // Intensidad relativa de cada rango
            subBassIntensity: rangeEnergy.subBass / (totalEnergy || 1),
            bassIntensity: rangeEnergy.bass / (totalEnergy || 1),
            midIntensity: (rangeEnergy.lowMid + rangeEnergy.mid) / (totalEnergy || 1),
            trebleIntensity: (rangeEnergy.treble + rangeEnergy.presence) / (totalEnergy || 1),
            
            // Ratio graves/agudos
            bassToTrebleRatio: (rangeEnergy.bass + rangeEnergy.subBass) / (rangeEnergy.treble + rangeEnergy.presence || 1),
            
            // Centroide espectral (frecuencia promedio ponderada)
            spectralCentroid: 0, // Se calculará si se necesita
          }
        };

        onAudioData(audioData);
      }
      
      animationFrameId = requestAnimationFrame(analyze);
    };

    animationFrameId = requestAnimationFrame(analyze);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInitialized, onBeat, onAudioData, analyserRef, dataArrayRef, timeDataArrayRef, audioContextRef, audioRef]);

  return null;
};

export default AudioAnalyzer;
