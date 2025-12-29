import React, { useRef, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import './AudioAnalyzer.scss';

const AudioAnalyzer = ({ onBeat, onVoice, onAudioData }) => {
  const { audioRef, audioContextRef, analyserRef, dataArrayRef, timeDataArrayRef, isInitialized, isPlaying, currentIndex } = useAudio();
  const lastBeatTimeRef = useRef(0);
  const lastVoiceTimeRef = useRef(0);
  const energyHistoryRef = useRef([]);
  const voiceHistoryRef = useRef([]);
  const trebleHistoryRef = useRef([]); // Historial para detección de picos agudos (cuadros sólidos)

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
    
    // Si el AudioContext está cerrado, no intentar usarlo
    if (audioContext && audioContext.state === 'closed') {
      console.warn(`[AudioAnalyzer] AudioContext está cerrado, no se puede analizar`);
      return;
    }
    
    if (audioContext && audioContext.state !== 'running') {
      console.log(`[AudioAnalyzer] AudioContext is ${audioContext.state}, waiting for it to be running...`);
      // Intentar resumir el AudioContext (solo si no está cerrado)
      if (audioContext.state !== 'closed') {
        audioContext.resume().then(() => {
          console.log(`[AudioAnalyzer] AudioContext resumed, state: ${audioContext.state}`);
        }).catch(err => {
          // Solo loggear si no es porque está cerrado
          if (err.name !== 'InvalidStateError' || !err.message.includes('closed')) {
            console.error(`[AudioAnalyzer] Error resuming AudioContext:`, err);
          }
        });
      }
      return;
    }

    // Verificar que el audio esté realmente reproduciéndose antes de analizar
    // Usar isPlaying del contexto y también verificar el estado del audio
    // Ser más permisivo: si el audio existe y tiene datos, intentar analizar
    const minReadyState = 2; // readyState 2 = HAVE_CURRENT_DATA (suficiente para análisis)
    
    // Verificar que el audio existe y tiene datos cargados
    if (!audio) {
      console.log(`[AudioAnalyzer] No audio element available`);
      return;
    }
    
    // Verificar que el audio no tenga errores de carga
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
    
    // Verificar que el audio tenga datos cargados
    if (audio.readyState < minReadyState) {
      console.log(`[AudioAnalyzer] Audio not ready yet | isPlaying: ${isPlaying} | paused: ${audio?.paused} | readyState: ${audio?.readyState} | currentTime: ${audio?.currentTime} | networkState: ${audio?.networkState}`);
      return;
    }
    
    // Verificar que el audio esté reproduciéndose
    const isAudioPlaying = !audio.paused && (isPlaying || audio.currentTime > 0);
    if (!isAudioPlaying) {
      console.log(`[AudioAnalyzer] Audio not playing | isPlaying: ${isPlaying} | paused: ${audio?.paused} | currentTime: ${audio?.currentTime}`);
      return;
    }

    console.log(`[AudioAnalyzer] Starting analysis loop | analyser.fftSize: ${analyserRef.current.fftSize} | frequencyBinCount: ${analyserRef.current.frequencyBinCount} | dataArray.length: ${dataArrayRef.current.length} | isPlaying: ${isPlaying} | audio.paused: ${audio?.paused} | onBeat exists: ${!!onBeat} | onVoice exists: ${!!onVoice}`);
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
      
      // Verificar que tenemos datos válidos
      const hasData = dataArrayRef.current.some(val => val > 0);
      if (!hasData && frameCount % 60 === 0) {
        console.warn(`[AudioAnalyzer] No hay datos de audio en el array | maxValue: ${Math.max(...dataArrayRef.current)}`);
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

      // Energía total (volumen general de la música)
      const totalEnergy = Object.values(rangeEnergy).reduce((a, b) => a + b, 0) / Object.keys(rangeEnergy).length;

      // Energía de graves (bass + subBass) para detección de beats/ritmos (para cuadros)
      const bassEnergy = (rangeEnergy.subBass + rangeEnergy.bass) / 2;
      const lowMidEnergy = rangeEnergy.lowMid;
      const rhythmEnergy = (bassEnergy * 0.7) + (lowMidEnergy * 0.3);
      
      // Energía de voces (frecuencias medias-altas) para diagonales
      const midEnergy = (rangeEnergy.mid + rangeEnergy.highMid) / 2;
      const trebleEnergy = (rangeEnergy.treble + rangeEnergy.presence) / 2;
      const voiceEnergy = (midEnergy * 0.6) + (trebleEnergy * 0.4);
      
      // Energía aguda para detección de cuadros sólidos (picos en frecuencias altas)
      const sharpEnergy = (rangeEnergy.treble * 0.7) + (rangeEnergy.presence * 0.3);

      // Historiales separados para ritmos y voces
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

      // Ajustar sensibilidad según el volumen detectado
      // Volumen normalizado (0-1) basado en la energía total
      const normalizedVolume = Math.min(totalEnergy / 255, 1); // 255 es el máximo valor de getByteFrequencyData

      // Historial para detección de picos agudos (cuadros sólidos)
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

      // Detección de picos agudos para cuadros sólidos - MUY REDUCIDA SENSIBILIDAD
      // Mucho menos sensible para que aparezcan muchos menos cuadros con imagen
      const trebleSensitivity = 0.25 + (0.45 * (1 - normalizedVolume)); // Aumentado a 0.25-0.7
      const trebleThreshold = averageTrebleEnergy + (Math.sqrt(trebleVariance) * trebleSensitivity * 0.8); // Aumentado multiplicador a 0.8
      const trebleSpikeThreshold = 0.5 + (0.25 * (1 - normalizedVolume)); // Aumentado a 0.5-0.75
      const trebleSpikeMultiplier = 1.0 + (0.2 * (1 - normalizedVolume)); // Aumentado a 1.0-1.2
      const recentTreble = trebleHistoryRef.current.slice(-4);
      const maxRecentTreble = recentTreble.length > 0 ? Math.max(...recentTreble) : 0;
      const trebleSpike = sharpEnergy > maxRecentTreble * trebleSpikeThreshold && sharpEnergy > averageTrebleEnergy * trebleSpikeMultiplier;
      const solidSquareDetected = sharpEnergy > trebleThreshold || trebleSpike;
      
      // Detección de ritmos para cuadros - SENSIBILIDAD MUY AUMENTADA
      const rhythmSensitivity = 0.01 + (0.1 * (1 - normalizedVolume)); // Muy sensible: 0.01-0.11
      const rhythmThreshold = averageRhythmEnergy + (Math.sqrt(rhythmVariance) * rhythmSensitivity * 0.1); // Muy reducido multiplicador a 0.1
      const rhythmSpikeThreshold = 0.05 + (0.05 * (1 - normalizedVolume)); // Muy sensible: 0.05-0.1
      const rhythmSpikeMultiplier = 0.3 + (0.1 * (1 - normalizedVolume)); // Muy sensible: 0.3-0.4
      const recentRhythm = energyHistoryRef.current.slice(-5);
      const maxRecentRhythm = Math.max(...recentRhythm);
      const rhythmSpike = rhythmEnergy > maxRecentRhythm * rhythmSpikeThreshold && rhythmEnergy > averageRhythmEnergy * rhythmSpikeMultiplier;
      
      // Detección de voces para diagonales
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
      
      // Detección de voces extremadamente sensible
      const voiceSensitivity = 0.01 + (0.15 * (1 - normalizedVolume)); // Más sensible
      const voiceThreshold = averageVoiceEnergy + (Math.sqrt(voiceVariance) * voiceSensitivity * 0.15); // Más sensible
      const voiceSpikeThreshold = 0.1 + (0.05 * (1 - normalizedVolume)); // Más sensible: 0.1-0.15
      const voiceSpikeMultiplier = 0.4 + (0.1 * (1 - normalizedVolume)); // Más sensible: 0.4-0.5
      const recentVoice = voiceHistory.slice(-5);
      const maxRecentVoice = Math.max(...recentVoice);
      const voiceSpike = voiceEnergy > maxRecentVoice * voiceSpikeThreshold && voiceEnergy > averageVoiceEnergy * voiceSpikeMultiplier;

      // Detección de ritmos para cuadros - MUY FRECUENTE
      const now = Date.now();
      const timeSinceLastBeat = now - lastBeatTimeRef.current;
      const minTimeBetweenBeats = 15 + (35 * (1 - normalizedVolume)); // Muy reducido: 15-50ms para máxima frecuencia
      const rhythmDetected = (rhythmEnergy > rhythmThreshold || rhythmSpike) && timeSinceLastBeat > minTimeBetweenBeats;
      
      // Log cada 60 frames para debug
      if (frameCount % 60 === 0) {
        console.log(`[AudioAnalyzer] Analysis values | rhythmEnergy: ${rhythmEnergy.toFixed(2)} | rhythmThreshold: ${rhythmThreshold.toFixed(2)} | rhythmSpike: ${rhythmSpike} | normalizedVolume: ${normalizedVolume.toFixed(2)} | timeSinceLastBeat: ${timeSinceLastBeat}ms`);
      }
      
      if (rhythmDetected) {
        lastBeatTimeRef.current = now;
        console.log(`[AudioAnalyzer] Beat detected | intensity: ${normalizedVolume} | shouldBeSolid: ${solidSquareDetected} | onBeat exists: ${!!onBeat}`);
        if (onBeat) {
          try {
            // Pasar información sobre si debe ser cuadro sólido basado en análisis de frecuencias agudas
            onBeat(normalizedVolume, solidSquareDetected);
            console.log(`[AudioAnalyzer] onBeat called successfully`);
          } catch (error) {
            console.error(`[AudioAnalyzer] ERROR in onBeat callback: ${error.message} | stack: ${error.stack}`);
          }
        } else {
          console.warn(`[AudioAnalyzer] onBeat callback is null`);
        }
      }
      
      // Detección de voces para diagonales - muy frecuente
      const timeSinceLastVoice = now - lastVoiceTimeRef.current;
      const minTimeBetweenVoices = 200 + (600 * (1 - normalizedVolume)); // Muy frecuente
      // Detección más robusta: aceptar si hay energía de voz significativa o spike
      const hasSignificantVoice = voiceEnergy > averageVoiceEnergy * 0.8 || voiceEnergy > 20;
      const voiceDetected = (hasSignificantVoice || voiceEnergy > voiceThreshold || voiceSpike) && timeSinceLastVoice > minTimeBetweenVoices;
      
      if (voiceDetected) {
        lastVoiceTimeRef.current = now;
        console.log(`[AudioAnalyzer] Voice detected | intensity: ${normalizedVolume} | voiceEnergy: ${voiceEnergy} | onVoice exists: ${!!onVoice}`);
        if (onVoice) {
          try {
            onVoice(normalizedVolume, voiceEnergy);
            console.log(`[AudioAnalyzer] onVoice called successfully`);
          } catch (error) {
            console.error(`[AudioAnalyzer] onVoice error: ${error.message} | stack: ${error.stack}`);
          }
        } else {
          console.warn(`[AudioAnalyzer] onVoice callback is null`);
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
          averageEnergy: averageRhythmEnergy,
          energyVariance: rhythmVariance,
          
          // Métricas de ritmo
          bassEnergy: bassEnergy,
          estimatedBPM: estimatedBPM,
          beatDetected: rhythmDetected,
          
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
  }, [isInitialized, isPlaying, currentIndex, onBeat, onVoice, onAudioData, analyserRef, dataArrayRef, timeDataArrayRef, audioContextRef, audioRef]);

  return null;
};

export default AudioAnalyzer;
