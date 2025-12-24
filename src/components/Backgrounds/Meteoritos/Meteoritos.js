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
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect) return;
      
      const { width, height } = rect;
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
        estela: [],
        ultimoDestello: ahora,
        faseDestello: 0,
        destelloIntenso: Math.random() > 0.7 // 30% de probabilidad de destello intenso
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
      const tamañoBase = 15 + Math.random() * 25;
      const intensidad = 0.8 + Math.random() * 0.2;
      
      for (let i = 0; i < 50; i++) {
        const angulo = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.5;
        const velocidad = 3 + Math.random() * 7;
        const tamaño = tamañoBase * (0.2 + Math.random() * 0.8);
        particulas.push({
          x,
          y,
          velocidadX: Math.cos(angulo) * velocidad,
          velocidadY: Math.sin(angulo) * velocidad,
          tamaño,
          color,
          vida: 1500 + Math.random() * 2000,
          creado: Date.now(),
          tipo: Math.random() > 0.6 ? 'brillante' : 'normal',
          rotacion: Math.random() * Math.PI * 2,
          crecimiento: 0.05 + Math.random() * 0.25,
          intensidad: intensidad * (0.7 + Math.random() * 0.6)
        });
      }
      particulasRef.current.push(...particulas);
      
      for (let i = 0; i < 3; i++) {
        const radioBase = tamañoBase * (0.3 + i * 0.6);
        const particulasOnda = [];
        const variacionAngulo = (Math.random() - 0.5) * 0.3;
        
        for (let j = 0; j < 40; j++) {
          const angulo = (Math.PI * 2 * j) / 40 + variacionAngulo;
          const radio = radioBase * (0.8 + Math.random() * 0.4);
          const velocidad = 1.5 + Math.random() * 2.5;
          const tamaño = tamañoBase * (0.1 + Math.random() * 0.4);
          
          particulasOnda.push({
            x: x + Math.cos(angulo) * radio,
            y: y + Math.sin(angulo) * radio,
            velocidadX: Math.cos(angulo + (Math.random() - 0.5) * 0.2) * velocidad,
            velocidadY: Math.sin(angulo + (Math.random() - 0.5) * 0.2) * velocidad,
            tamaño,
            color,
            vida: 1500 + i * 400 + Math.random() * 1000,
            creado: Date.now(),
            tipo: 'onda',
            rotacion: Math.random() * Math.PI * 2,
            crecimiento: 0.1 + Math.random() * 0.3,
            intensidad: intensidad * (0.6 + Math.random() * 0.8)
          });
        }
        particulasRef.current.push(...particulasOnda);
      }
      
      for (let i = 0; i < 50; i++) {
        const angulo = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.4;
        const distancia = Math.random() * tamañoBase * (1.5 + Math.random() * 1);
        const xHumo = x + Math.cos(angulo) * distancia;
        const yHumo = y + Math.sin(angulo) * distancia;
        const tamañoHumo = tamañoBase * (0.2 + Math.random() * 0.3);
        const opacidadHumo = 0.2 + Math.random() * 0.2;
        
        crearHumo(xHumo, yHumo, `rgba(255, 255, 255, ${opacidadHumo})`, 1, tamañoHumo);
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
        
        // Actualizar fase del destello
        const tiempoDesdeUltimoDestello = ahora - meteorito.ultimoDestello;
        if (tiempoDesdeUltimoDestello > 50) {
          meteorito.faseDestello = (meteorito.faseDestello + 0.2) % 1;
          meteorito.ultimoDestello = ahora;
        }
        
        meteorito.estela.push({ x: meteorito.x, y: meteorito.y });
        if (meteorito.estela.length > 40) {
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
      
      // Dibujar humo primero
      humoRef.current.forEach(particula => {
        const { x, y, tamaño, color, opacidad } = particula;
        const vidaRestante = Math.max(0, 1 - (Date.now() - particula.creado) / particula.vida);
        
        ctx.beginPath();
        ctx.arc(x, y, tamaño, 0, Math.PI * 2);
        
        const gradienteHumo = ctx.createRadialGradient(x, y, 0, x, y, tamaño);
        gradienteHumo.addColorStop(0, `rgba(255, 255, 255, ${opacidad * 0.3 * vidaRestante})`);
        gradienteHumo.addColorStop(0.3, `rgba(255, 255, 255, ${opacidad * 0.2 * vidaRestante})`);
        gradienteHumo.addColorStop(0.7, `rgba(255, 255, 255, ${opacidad * 0.1 * vidaRestante})`);
        gradienteHumo.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradienteHumo;
        ctx.fill();
      });

      // Dibujar partículas de explosión
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
          gradiente.addColorStop(0.2, `rgba(255, 255, 255, ${0.8 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.4, `rgba(255, 255, 255, ${0.6 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.6, `rgba(255, 255, 255, ${0.4 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.8, `rgba(255, 255, 255, ${0.2 * vidaRestante * intensidad})`);
          gradiente.addColorStop(1, color);
          ctx.fillStyle = gradiente;
        } else if (tipo === 'onda') {
          const gradiente = ctx.createRadialGradient(0, 0, 0, 0, 0, radio);
          gradiente.addColorStop(0, `rgba(255, 255, 255, ${0.7 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.3, `rgba(255, 255, 255, ${0.5 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.6, `rgba(255, 255, 255, ${0.3 * vidaRestante * intensidad})`);
          gradiente.addColorStop(0.9, `rgba(255, 255, 255, ${0.1 * vidaRestante * intensidad})`);
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
      
      // Dibujar meteoritos
      meteoritosRef.current.forEach(meteorito => {
        const { x, y, tamaño, color, brillo, velocidadX, velocidadY, rotacion, estela, faseDestello, destelloIntenso } = meteorito;
        const [r, g, b] = color.match(/\d+/g).map(Number);
        const vidaRestante = Math.max(0, 1 - (Date.now() - meteorito.creado) / meteorito.vida);
        
        // Calcular intensidad del destello con más variación
        const intensidadDestello = destelloIntenso 
          ? Math.sin(faseDestello * Math.PI * 2) * 0.8 + 0.2
          : Math.sin(faseDestello * Math.PI * 2) * 0.6 + 0.4;
        
        // Dibujar estela con gradiente más suave
        if (estela.length > 1) {
          ctx.beginPath();
          ctx.moveTo(estela[0].x, estela[0].y);
          for (let i = 1; i < estela.length; i++) {
            ctx.lineTo(estela[i].x, estela[i].y);
          }
          
          const gradienteEstela = ctx.createLinearGradient(estela[0].x, estela[0].y, x, y);
          gradienteEstela.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
          gradienteEstela.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${brillo * 0.5 * vidaRestante})`);
          gradienteEstela.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${brillo * 0.8 * vidaRestante})`);
          gradienteEstela.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${brillo * vidaRestante})`);
          
          ctx.strokeStyle = gradienteEstela;
          ctx.lineWidth = tamaño * 0.7;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        
        const angulo = Math.atan2(velocidadY, velocidadX);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angulo + rotacion);
        
        // Dibujar cuerpo del meteorito con gradiente más suave
        ctx.beginPath();
        ctx.arc(0, 0, tamaño, 0, Math.PI * 2);
        
        const gradienteCuerpo = ctx.createRadialGradient(0, 0, 0, 0, 0, tamaño);
        gradienteCuerpo.addColorStop(0, `rgba(255, 255, 255, ${brillo * vidaRestante * intensidadDestello})`);
        gradienteCuerpo.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${brillo * 0.8 * vidaRestante * intensidadDestello})`);
        gradienteCuerpo.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${brillo * 0.4 * vidaRestante * intensidadDestello})`);
        gradienteCuerpo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradienteCuerpo;
        ctx.fill();
        
        // Capa exterior de brillo (con color del meteorito)
        const radioBrillo = tamaño * 13.5;
        const gradienteExterior = ctx.createRadialGradient(0, 0, 0, 0, 0, radioBrillo);
        gradienteExterior.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${brillo * 0.3 * vidaRestante * intensidadDestello})`);
        gradienteExterior.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${brillo * 0.25 * vidaRestante * intensidadDestello})`);
        gradienteExterior.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${brillo * 0.2 * vidaRestante * intensidadDestello})`);
        gradienteExterior.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${brillo * 0.15 * vidaRestante * intensidadDestello})`);
        gradienteExterior.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${brillo * 0.1 * vidaRestante * intensidadDestello})`);
        gradienteExterior.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, radioBrillo, 0, Math.PI * 2);
        ctx.fillStyle = gradienteExterior;
        ctx.fill();
        
        // Núcleo brillante (con color del meteorito)
        const radioNucleo = tamaño * 2.7;
        const gradienteNucleo = ctx.createRadialGradient(0, 0, 0, 0, 0, radioNucleo);
        gradienteNucleo.addColorStop(0, `rgba(255, 255, 255, ${vidaRestante * intensidadDestello})`);
        gradienteNucleo.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${brillo * 0.9 * vidaRestante * intensidadDestello})`);
        gradienteNucleo.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${brillo * 0.8 * vidaRestante * intensidadDestello})`);
        gradienteNucleo.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${brillo * 0.6 * vidaRestante * intensidadDestello})`);
        gradienteNucleo.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${brillo * 0.3 * vidaRestante * intensidadDestello})`);
        gradienteNucleo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, radioNucleo, 0, Math.PI * 2);
        ctx.fillStyle = gradienteNucleo;
        ctx.fill();
        
        // Destello central pulsante (con color del meteorito)
        const radioDestello = radioNucleo * (0.5 + intensidadDestello * 0.4);
        const gradienteDestello = ctx.createRadialGradient(0, 0, 0, 0, 0, radioDestello);
        gradienteDestello.addColorStop(0, `rgba(255, 255, 255, ${vidaRestante * intensidadDestello})`);
        gradienteDestello.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${brillo * 0.9 * vidaRestante * intensidadDestello})`);
        gradienteDestello.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${brillo * 0.7 * vidaRestante * intensidadDestello})`);
        gradienteDestello.addColorStop(0.9, `rgba(${r}, ${g}, ${b}, ${brillo * 0.3 * vidaRestante * intensidadDestello})`);
        gradienteDestello.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
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

    // Inicializar el canvas
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