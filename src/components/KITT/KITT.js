import React, { useRef, useState, useEffect } from 'react';
import './KITT.scss';

const KITT = ({ onClose }) => {
  const containerRef = useRef(null);
  const canvasBarsRef = useRef(null);
  const audioRef = useRef(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [textoParaLeer, setTextoParaLeer] = useState('');
  const [estaGenerandoVoz, setEstaGenerandoVoz] = useState(false);
  const [usarAudioSistema, setUsarAudioSistema] = useState(false);
  const mediaStreamSourceRef = useRef(null);
  const mediaElementSourceRef = useRef(null);
  const animationRef = useRef(null);
  const previousAveragesRef = useRef([0, 0, 0]);
  const targetAveragesRef = useRef([0, 0, 0]);

  const API_KEY = 'sk_8bb55581a98f6d2e7a6999f5d24bc5b8f4c4d916409d3399';
  const VOZ_ID = '21m00Tcm4TlvDq8ikWAM';

  const desconectarAudio = async () => {
    console.log('Desconectando audio...');
    
    if (audioRef.current) {
      console.log('Pausando y limpiando elemento de audio...');
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }

    if (mediaStreamSourceRef.current) {
      console.log('Desconectando mediaStreamSource...');
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    if (mediaElementSourceRef.current) {
      console.log('Desconectando mediaElementSource...');
      mediaElementSourceRef.current.disconnect();
      mediaElementSourceRef.current = null;
    }

    if (audioContext) {
      if (audioContext.state !== 'closed') {
        console.log('Cerrando contexto de audio...');
        await audioContext.close();
      }
      setAudioContext(null);
      setAnalyser(null);
    }
  };

  const iniciarAudioSistema = async () => {
    try {
      await desconectarAudio();

      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const newAnalyser = newAudioContext.createAnalyser();
      newAnalyser.fftSize = 256;

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            logicalSurface: true,
            cursor: "never"
          },
          audio: {
            suppressLocalAudioPlayback: false,
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            latency: 0
          },
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          systemAudio: "include"
        });

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('No se detectaron pistas de audio');
        }

        stream.getVideoTracks().forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });

        mediaStreamSourceRef.current = newAudioContext.createMediaStreamSource(stream);
        mediaStreamSourceRef.current.connect(newAnalyser);

        stream.getAudioTracks()[0].onended = () => {
          console.log('Compartir audio detenido por el usuario');
          setUsarAudioSistema(false);
        };

        setAudioContext(newAudioContext);
        setAnalyser(newAnalyser);

      } catch (error) {
        console.error('Error al acceder al audio del sistema:', error);
        setUsarAudioSistema(false);
      }
    } catch (error) {
      console.error('Error al iniciar audio del sistema:', error);
    }
  };

  const generarVoz = async () => {
    if (!textoParaLeer.trim() || estaGenerandoVoz) return;
    
    setEstaGenerandoVoz(true);
    console.log('Iniciando generación de voz...');
    
    try {
      await desconectarAudio();

      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOZ_ID, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY
        },
        body: JSON.stringify({
          text: textoParaLeer,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      console.log('Audio generado correctamente');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('URL del audio creada:', audioUrl);

      const audioElement = new Audio();
      audioElement.src = audioUrl;
      audioElement.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        audioElement.onloadedmetadata = resolve;
        audioElement.onerror = reject;
        audioElement.load();
      });
      console.log('Audio cargado y listo para reproducir');

      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const newAnalyser = newAudioContext.createAnalyser();
      newAnalyser.fftSize = 256;
      
      setAudioContext(newAudioContext);
      setAnalyser(newAnalyser);

      if (newAudioContext.state === 'suspended') {
        await newAudioContext.resume();
      }

      const mediaElementSource = newAudioContext.createMediaElementSource(audioElement);
      mediaElementSource.connect(newAnalyser);
      newAnalyser.connect(newAudioContext.destination);
      mediaElementSourceRef.current = mediaElementSource;
      console.log('Audio conectado al analizador');

      try {
        await audioElement.play();
        console.log('Audio reproduciendo');
      } catch (playError) {
        console.error('Error al reproducir:', playError);
        alert('Error al reproducir el audio. Por favor, inténtalo de nuevo.');
      }

    } catch (error) {
      console.error('Error en generarVoz:', error);
      alert('Error al generar la voz: ' + error.message);
    } finally {
      setEstaGenerandoVoz(false);
    }
  };

  useEffect(() => {
    if (analyser && canvasBarsRef.current) {
      const ctxBars = canvasBarsRef.current.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const { width: barsWidth, height: barsHeight } = canvasBarsRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasBarsRef.current.width = barsWidth * dpr;
        canvasBarsRef.current.height = barsHeight * dpr;
        ctxBars.scale(dpr, dpr);

        ctxBars.fillStyle = 'rgb(0, 0, 0)';
        ctxBars.fillRect(0, 0, barsWidth, barsHeight);

        // Configuración del ecualizador KITT
        const numBars = 3;
        const numSegments = 13;
        const segmentSpacing = 2;
        const segmentWidth = Math.min(barsWidth * 0.06, 24);
        const columnSpacing = segmentWidth * 0.8;
        const maxHeight = barsHeight * 0.48;
        const segmentHeight = (maxHeight / numSegments) / 2;
        const centerGap = 1;

        // Calcular el ancho total y posición central
        const totalWidth = (segmentWidth * numBars) + (columnSpacing * (numBars - 1));
        const centerX = barsWidth / 2;
        const startX = centerX - (totalWidth / 2);
        const centerY = barsHeight / 2;

        // Dividir el array de frecuencias en tres secciones
        const bajos = dataArray.slice(0, Math.floor(dataArray.length * 0.33));
        const medios = dataArray.slice(Math.floor(dataArray.length * 0.33), Math.floor(dataArray.length * 0.66));
        const altos = dataArray.slice(Math.floor(dataArray.length * 0.66));

        const calcularPromedio = (arr) => {
          const sum = arr.reduce((sum, val) => sum + val, 0);
          const rawAverage = sum / arr.length / 255;
          return Math.pow(rawAverage, 0.3) * 255;
        };
        
        const rawCentral = calcularPromedio(medios);
        const rawLateral = Math.min(
          calcularPromedio(bajos),
          calcularPromedio(altos)
        );

        const factorIntensidad = (valor) => {
          if (valor < 20) return 0;
          if (valor < 60) {
            const factor = (valor - 20) / 40;
            return Math.pow(factor, 0.7);
          }
          const logValue = Math.log10(((valor - 60) / 195) * 9 + 1);
          return Math.max(logValue * 1.2, 0.3);
        };

        const promedioCentral = rawCentral * 2.6 * factorIntensidad(rawCentral);
        const promedioLateral = Math.min(
          rawLateral * 2.6 * factorIntensidad(rawLateral),
          promedioCentral
        );
        
        const minHeight = (valor) => {
          if (valor < 3) return 0;
          if (valor > 100) {
            return Math.max(valor * 0.35, 35);
          }
          return valor;
        };

        targetAveragesRef.current = [
          minHeight(promedioLateral),
          minHeight(promedioCentral),
          minHeight(promedioLateral)
        ];

        const smoothingFactor = 0.4;
        const averages = previousAveragesRef.current.map((prev, i) => {
          const target = targetAveragesRef.current[i];
          const smoothed = prev + (target - prev) * smoothingFactor;
          return smoothed < 3 ? 0 : smoothed;
        });

        previousAveragesRef.current = averages;

        const barOrder = [1, 0, 2];
        for (const i of barOrder) {
          const isCenter = i === 1;
          const distanceFromCenter = i === 0 ? -1 : (i === 2 ? 1 : 0);
          const x = centerX + (distanceFromCenter * (segmentWidth + columnSpacing));
          
          let normalizedValue;
          if (!isCenter) {
            normalizedValue = Math.min(averages[2] / 255, 1);
            if (averages[1] > 3 && normalizedValue * 255 >= 1) {
              normalizedValue = Math.max(normalizedValue, 1/numSegments);
            }
          } else {
            normalizedValue = Math.min(averages[i] / 255, 1);
          }
          
          if (normalizedValue * 255 < 3) continue;
          
          const activeSegments = Math.ceil(normalizedValue * numSegments);
          
          for (let direction = -1; direction <= 1; direction += 2) {
            for (let j = 0; j < numSegments; j++) {
              const isActive = j < activeSegments;
              if (!isActive) continue;
              
              const y = centerY + (direction * ((j * (segmentHeight + segmentSpacing)) + centerGap));
              const segmentIntensity = Math.pow(1 - (j / numSegments), 0.7);
              const musicIntensity = normalizedValue * 0.3;
              const finalIntensity = segmentIntensity + musicIntensity;
              
              const baseIntensity = isCenter ? 0.7 : 0.8;
              ctxBars.fillStyle = `rgba(255, 0, 0, ${baseIntensity + finalIntensity * 0.3})`;
              
              const barX = x - (segmentWidth / 2);
              ctxBars.fillRect(barX, y, segmentWidth, direction * segmentHeight);
            }
          }
        }

        const totalBarHeight = (numSegments * (segmentHeight + segmentSpacing) + centerGap) * 2;
        const startY = centerY - (totalBarHeight / 2);
        
        const fadeGradient = ctxBars.createLinearGradient(0, startY, 0, startY + totalBarHeight);
        
        fadeGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        fadeGradient.addColorStop(0.15, 'rgba(0, 0, 0, 0.98)');
        fadeGradient.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
        fadeGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        fadeGradient.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
        fadeGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.98)');
        fadeGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        
        ctxBars.save();
        ctxBars.globalCompositeOperation = 'multiply';
        ctxBars.fillStyle = fadeGradient;
        ctxBars.fillRect(0, 0, barsWidth, barsHeight);
        ctxBars.restore();
      };

      draw();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [analyser]);

  useEffect(() => {
    if (usarAudioSistema) {
      iniciarAudioSistema();
    }
  }, [usarAudioSistema]);

  useEffect(() => {
    return () => {
      desconectarAudio();
    };
  }, []);

  return (
    <div ref={containerRef} className="kitt-container">
      <canvas ref={canvasBarsRef} className="kitt-bars" />
      
      <div className="kitt-controls">
        <input
          type="text"
          value={textoParaLeer}
          onChange={(e) => setTextoParaLeer(e.target.value)}
          placeholder="Escribe algo para leer..."
          className="kitt-input"
        />
        <button
          onClick={generarVoz}
          disabled={estaGenerandoVoz || !textoParaLeer.trim()}
          className="kitt-button"
        >
          {estaGenerandoVoz ? '🎙️ Generando...' : '🎙️ Leer'}
        </button>
      </div>

      <button
        onClick={() => setUsarAudioSistema(!usarAudioSistema)}
        className="kitt-mode-button"
      >
        {usarAudioSistema ? '🎤 Audio Sistema' : '🎙️ Sintetizador'}
      </button>

      <button onClick={onClose} className="kitt-close-button">
        ✕
      </button>
    </div>
  );
};

export default KITT; 