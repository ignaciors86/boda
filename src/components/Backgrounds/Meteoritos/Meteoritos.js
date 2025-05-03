import React, { useRef, useEffect } from 'react';
import './Meteoritos.scss';

const Meteoritos = ({ analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const meteoritosRef = useRef([]);
  const ultimoMeteoritoRef = useRef(0);
  const particulasRef = useRef([]);
  const humoRef = useRef([]);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const crearMeteorito = (intensidad) => {
      const ahora = Date.now();
      if (ahora - ultimoMeteoritoRef.current < 500) return;

      const x = Math.random() * canvas.width;
      const velocidadX = (Math.random() - 0.5) * 4;
      const velocidadY = 3 + Math.random() * 3;
      const tamaño = 5 + Math.random() * 20;
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      const color = `rgb(${r}, ${g}, ${b})`;
      const brillo = 0.9 + Math.random() * 0.1;
      const rotacion = (Math.random() - 0.5) * Math.PI / 6;

      meteoritosRef.current.push({
        x,
        y: -tamaño,
        velocidadX,
        velocidadY,
        tamaño,
        color,
        brillo,
        intensidad,
        creado: ahora,
        vida: 10000,
        rotacion,
        forma: Math.random() > 0.5 ? 'redonda' : 'alargada',
        estela: []
      });

      ultimoMeteoritoRef.current = ahora;
    };

    const crearHumo = (x, y, color, cantidad = 3, tamañoBase = 2) => {
      const particulas = [];
      for (let i = 0; i < cantidad; i++) {
        particulas.push({
          x,
          y,
          velocidadX: (Math.random() - 0.5) * 0.3,
          velocidadY: -Math.random() * 0.2,
          tamaño: tamañoBase + Math.random() * 3,
          color,
          vida: 3000 + Math.random() * 2000,
          creado: Date.now(),
          opacidad: 0.2 + Math.random() * 0.2,
          crecimiento: 0.05 + Math.random() * 0.05
        });
      }
      humoRef.current.push(...particulas);
    };

    const crearExplosion = (x, y, color) => {
      const particulas = [];
      const tamañoBase = 40 + Math.random() * 60;
      const intensidad = 0.8 + Math.random() * 0.2;
      
      for (let i = 0; i < 80; i++) {
        const angulo = (Math.PI * 2 * i) / 80;
        const velocidad = 6 + Math.random() * 10;
        const tamaño = tamañoBase * (0.3 + Math.random() * 0.7);
        particulas.push({
          x,
          y,
          velocidadX: Math.cos(angulo) * velocidad,
          velocidadY: Math.sin(angulo) * velocidad,
          tamaño,
          color,
          vida: 3000 + Math.random() * 2000,
          creado: Date.now(),
          tipo: Math.random() > 0.6 ? 'brillante' : 'normal',
          rotacion: Math.random() * Math.PI * 2,
          crecimiento: 0.15 + Math.random() * 0.25,
          intensidad
        });
      }
      particulasRef.current.push(...particulas);
      
      for (let i = 0; i < 4; i++) {
        const radio = tamañoBase * (0.5 + i * 0.6);
        const particulasOnda = [];
        for (let j = 0; j < 50; j++) {
          const angulo = (Math.PI * 2 * j) / 50;
          particulasOnda.push({
            x: x + Math.cos(angulo) * radio,
            y: y + Math.sin(angulo) * radio,
            velocidadX: Math.cos(angulo) * 3,
            velocidadY: Math.sin(angulo) * 3,
            tamaño: tamañoBase * (0.2 + Math.random() * 0.4),
            color,
            vida: 2500 + i * 600,
            creado: Date.now(),
            tipo: 'onda',
            rotacion: Math.random() * Math.PI * 2,
            crecimiento: 0.25 + Math.random() * 0.35,
            intensidad
          });
        }
        particulasRef.current.push(...particulasOnda);
      }
      
      for (let i = 0; i < 70; i++) {
        const angulo = (Math.PI * 2 * i) / 70;
        const distancia = Math.random() * tamañoBase * 2.5;
        const xHumo = x + Math.cos(angulo) * distancia;
        const yHumo = y + Math.sin(angulo) * distancia;
        crearHumo(xHumo, yHumo, color, 1, tamañoBase * 0.4);
      }
    };

    const actualizarMeteoritos = () => {
      const ahora = Date.now();
      meteoritosRef.current = meteoritosRef.current.filter(meteorito => {
        const vidaRestante = 1 - (ahora - meteorito.creado) / meteorito.vida;
        if (vidaRestante <= 0) return false;
        if (meteorito.y >= canvas.height - meteorito.tamaño) {
          crearExplosion(meteorito.x, meteorito.y, meteorito.color);
          return false;
        }
        return true;
      });

      meteoritosRef.current.forEach(meteorito => {
        const vidaRestante = 1 - (Date.now() - meteorito.creado) / meteorito.vida;
        meteorito.x += meteorito.velocidadX;
        meteorito.y += meteorito.velocidadY;
        meteorito.brillo = Math.max(0.3, meteorito.brillo - 0.0005) * vidaRestante;
        
        meteorito.estela.push({ x: meteorito.x, y: meteorito.y });
        if (meteorito.estela.length > 20) {
          meteorito.estela.shift();
        }
        
        if (Math.random() > 0.5) {
          crearHumo(meteorito.x, meteorito.y, meteorito.color, 1);
        }
      });
    };

    const actualizarParticulas = () => {
      const ahora = Date.now();
      particulasRef.current = particulasRef.current.filter(particula => {
        return ahora - particula.creado < particula.vida;
      });

      particulasRef.current.forEach(particula => {
        particula.x += particula.velocidadX;
        particula.y += particula.velocidadY;
        particula.velocidadY += 0.1;
        particula.velocidadX *= 0.98;
        particula.rotacion += 0.1;
        if (particula.crecimiento) {
          particula.tamaño += particula.crecimiento;
        }
      });
    };

    const actualizarHumo = () => {
      const ahora = Date.now();
      humoRef.current = humoRef.current.filter(particula => {
        return ahora - particula.creado < particula.vida;
      });

      humoRef.current.forEach(particula => {
        particula.x += particula.velocidadX;
        particula.y += particula.velocidadY;
        particula.tamaño += particula.crecimiento;
        particula.opacidad = Math.max(0, particula.opacidad - 0.0001);
      });
    };

    const dibujarMeteoritos = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      humoRef.current.forEach(particula => {
        const { x, y, tamaño, color, opacidad } = particula;
        const vidaRestante = Math.max(0, 1 - (Date.now() - particula.creado) / particula.vida);
        ctx.beginPath();
        ctx.arc(x, y, tamaño, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = opacidad * vidaRestante;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      particulasRef.current.forEach(particula => {
        const { x, y, tamaño, color, tipo, rotacion, intensidad } = particula;
        const vidaRestante = Math.max(0, 1 - (Date.now() - particula.creado) / particula.vida);
        const radio = Math.max(0.1, tamaño * vidaRestante);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotacion);
        
        ctx.beginPath();
        ctx.arc(0, 0, radio, 0, Math.PI * 2);
        
        if (tipo === 'brillante') {
          const gradiente = ctx.createRadialGradient(0, 0, 0, 0, 0, radio);
          gradiente.addColorStop(0, `rgba(255, 255, 255, ${0.95 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.3, `rgba(255, 255, 255, ${0.8 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.7, `rgba(255, 255, 255, ${0.4 * vidaRestante * intensidad})`);
          gradiente.addColorStop(1, color);
          ctx.fillStyle = gradiente;
        } else if (tipo === 'onda') {
          const gradiente = ctx.createRadialGradient(0, 0, 0, 0, 0, radio);
          gradiente.addColorStop(0, `rgba(255, 255, 255, ${0.7 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.5, `rgba(255, 255, 255, ${0.3 * vidaRestante * intensidad})`);
          gradiente.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradiente;
        } else {
          ctx.fillStyle = color;
        }
        
        ctx.globalAlpha = vidaRestante * intensidad;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      });

      meteoritosRef.current.forEach(meteorito => {
        const { x, y, tamaño, color, brillo, velocidadX, velocidadY, rotacion, forma, estela } = meteorito;
        const [r, g, b] = color.match(/\d+/g).map(Number);
        const vidaRestante = Math.max(0, 1 - (Date.now() - meteorito.creado) / meteorito.vida);
        
        if (estela.length > 1) {
          ctx.beginPath();
          ctx.moveTo(estela[0].x, estela[0].y);
          for (let i = 1; i < estela.length; i++) {
            ctx.lineTo(estela[i].x, estela[i].y);
          }
          
          const gradienteEstela = ctx.createLinearGradient(estela[0].x, estela[0].y, x, y);
          gradienteEstela.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
          gradienteEstela.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${brillo * 0.5 * vidaRestante})`);
          gradienteEstela.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${brillo * vidaRestante})`);
          
          ctx.strokeStyle = gradienteEstela;
          ctx.lineWidth = tamaño * 0.8;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        
        const angulo = Math.atan2(velocidadY, velocidadX);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angulo + rotacion);
        
        if (forma === 'redonda') {
          ctx.beginPath();
          ctx.arc(0, 0, tamaño, 0, Math.PI * 2);
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, tamaño * 1.5, tamaño * 0.7, 0, 0, Math.PI * 2);
        }
        
        const gradienteCuerpo = ctx.createLinearGradient(-tamaño, 0, tamaño, 0);
        gradienteCuerpo.addColorStop(0, color);
        gradienteCuerpo.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0.3 * vidaRestante})`);
        ctx.fillStyle = gradienteCuerpo;
        ctx.fill();

        const radioCabeza = tamaño * 0.8;
        const radioBrillo = radioCabeza * 2.5;
        
        const gradienteExterior = ctx.createRadialGradient(0, 0, 0, 0, 0, radioBrillo);
        gradienteExterior.addColorStop(0, `rgba(255, 255, 255, ${brillo * 0.4 * vidaRestante})`);
        gradienteExterior.addColorStop(0.2, `rgba(255, 255, 255, ${brillo * 0.3 * vidaRestante})`);
        gradienteExterior.addColorStop(0.4, `rgba(255, 255, 255, ${brillo * 0.2 * vidaRestante})`);
        gradienteExterior.addColorStop(0.6, `rgba(255, 255, 255, ${brillo * 0.1 * vidaRestante})`);
        gradienteExterior.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, radioBrillo, 0, Math.PI * 2);
        ctx.fillStyle = gradienteExterior;
        ctx.fill();
        
        const radioIntermedio = radioCabeza * 1.8;
        const gradienteIntermedio = ctx.createRadialGradient(0, 0, 0, 0, 0, radioIntermedio);
        gradienteIntermedio.addColorStop(0, `rgba(255, 255, 255, ${brillo * 0.7 * vidaRestante})`);
        gradienteIntermedio.addColorStop(0.3, `rgba(255, 255, 255, ${brillo * 0.5 * vidaRestante})`);
        gradienteIntermedio.addColorStop(0.6, `rgba(255, 255, 255, ${brillo * 0.3 * vidaRestante})`);
        gradienteIntermedio.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, radioIntermedio, 0, Math.PI * 2);
        ctx.fillStyle = gradienteIntermedio;
        ctx.fill();
        
        const gradienteInterior = ctx.createRadialGradient(0, 0, 0, 0, 0, radioCabeza);
        gradienteInterior.addColorStop(0, `rgba(255, 255, 255, ${brillo * vidaRestante})`);
        gradienteInterior.addColorStop(0.2, `rgba(255, ${g}, ${b}, ${brillo * 0.9 * vidaRestante})`);
        gradienteInterior.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${brillo * 0.7 * vidaRestante})`);
        gradienteInterior.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${brillo * 0.3 * vidaRestante})`);
        gradienteInterior.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, radioCabeza, 0, Math.PI * 2);
        ctx.fillStyle = gradienteInterior;
        ctx.fill();
        
        const radioNucleo = radioCabeza * 0.6;
        const gradienteNucleo = ctx.createRadialGradient(0, 0, 0, 0, 0, radioNucleo);
        gradienteNucleo.addColorStop(0, `rgba(255, 255, 255, ${vidaRestante})`);
        gradienteNucleo.addColorStop(0.3, `rgba(255, 255, 255, ${brillo * 0.9 * vidaRestante})`);
        gradienteNucleo.addColorStop(0.7, `rgba(255, 255, 255, ${brillo * 0.5 * vidaRestante})`);
        gradienteNucleo.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, radioNucleo, 0, Math.PI * 2);
        ctx.fillStyle = gradienteNucleo;
        ctx.fill();
        
        const radioDestello = radioNucleo * 0.4;
        const gradienteDestello = ctx.createRadialGradient(0, 0, 0, 0, 0, radioDestello);
        gradienteDestello.addColorStop(0, `rgba(255, 255, 255, ${vidaRestante})`);
        gradienteDestello.addColorStop(0.5, `rgba(255, 255, 255, ${brillo * vidaRestante})`);
        gradienteDestello.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, radioDestello, 0, Math.PI * 2);
        ctx.fillStyle = gradienteDestello;
        ctx.fill();
        
        ctx.restore();
      });
    };

    const animar = () => {
      analyser.getByteFrequencyData(dataArray);
      const intensidad = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (intensidad > 50) {
        crearMeteorito(intensidad);
      }

      actualizarMeteoritos();
      actualizarParticulas();
      actualizarHumo();
      dibujarMeteoritos();
      animationRef.current = requestAnimationFrame(animar);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animar();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className="meteoritos-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}
    />
  );
};

export default Meteoritos;