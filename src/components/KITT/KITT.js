import React, { useRef, useEffect } from 'react';
import './KITT.scss';

const KITT = ({ analyser }) => {
  const canvasBarsRef = useRef(null);
  const animationRef = useRef(null);
  const previousAveragesRef = useRef([0, 0, 0]);
  const targetAveragesRef = useRef([0, 0, 0]);

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
        const segmentWidth = Math.min(barsWidth * 0.08, 32);
        const columnSpacing = segmentWidth * 0.8;
        const maxHeight = barsHeight * 0.58;
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
          return Math.pow(rawAverage, 0.5) * 255;
        };
        
        const rawLateral = calcularPromedio(medios) * 0.7;
        const rawCentral = calcularPromedio(medios);

        const factorIntensidad = (valor) => {
          if (valor < 10) return 0;
          if (valor < 35) {
            const factor = (valor - 10) / 25;
            return Math.pow(factor, 0.8);
          }
          const logValue = Math.log10(((valor - 35) / 220) * 9 + 1);
          return Math.max(logValue * 1.2, 0.3);
        };

        const promedioCentral = rawCentral * 2.5 * factorIntensidad(rawCentral);
        const promedioLateral = rawLateral * 2.5 * factorIntensidad(rawLateral);
        
        const minHeight = (valor) => {
          if (valor < 2) return 0;
          if (valor > 80) {
            return Math.max(valor * 0.35, 30);
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
            normalizedValue = Math.min(averages[i] / 255, 1);
            if (averages[1] > 3 && normalizedValue * 255 >= 1) {
              normalizedValue = Math.max(normalizedValue * 0.85, 1/numSegments);
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

  return (
    <div className="kitt-container kitt-audio-only">
      <canvas ref={canvasBarsRef} className="kitt-bars" />
    </div>
  );
};

export default KITT; 