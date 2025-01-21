import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap'; // Importamos GSAP
import './Rasca.scss';

const Rasca = ({ url, resultado }) => {
  const canvasRef = useRef(null);
  const contenidoRef = useRef(null); // Referencia al elemento .cartaInvitado__contenido
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [revealPercentage, setRevealPercentage] = useState(0);

  // Controla el grosor del pincel (en dvh)
  const brushSizeInDvh = 8;
  const brushSize = () => canvasDimensions.height * (brushSizeInDvh / 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ajustar las dimensiones del canvas al tamaño del contenedor
    const updateCanvasDimensions = () => {
      const container = canvas.parentElement;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setCanvasDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;

      // Dibujar la capa gris inicial
      ctx.fillStyle = '#b0b0b0'; // Color gris
      ctx.fillRect(0, 0, width, height);
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);

    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, []);

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    draw(e); // Empezar a rascar al hacer clic
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    calculateRevealPercentage(); // Recalcular el porcentaje al finalizar el trazo
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    draw(e);
    calculateRevealPercentage(); // Actualizar el porcentaje mientras se rasca
  };

  const draw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Estilo del "pincel"
    ctx.globalCompositeOperation = 'destination-out'; // Eliminar la capa gris al rascar
    ctx.beginPath();
    ctx.arc(x, y, brushSize(), 0, 2 * Math.PI); // Grosor definido por brushSize()
    ctx.fill();
  };

  const calculateRevealPercentage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const totalPixels = imageData.data.length / 4; // Cada píxel tiene 4 valores (RGBA)
    let clearedPixels = 0;

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) clearedPixels++; // Pixel completamente transparente
    }

    const percentage = (clearedPixels / totalPixels) * 100;
    setRevealPercentage(percentage);

    if (percentage >= 50) {
      autoReveal(); // Simula el borrado completo si llega al 70%
      animateContenido(); // Inicia la animación del contenido
    }
  };

  const autoReveal = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let remaining = 100 - revealPercentage;
    const squareSize = Math.min(canvas.width, canvas.height) / 10; // Tamaño de los cuadritos
    const interval = setInterval(() => {
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, squareSize, squareSize); // Revelar un cuadrito
      }

      remaining -= 5;
      if (remaining <= 0) {
        clearInterval(interval);
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpia todo al final
      }
    }, 100); // Intervalo de 50ms para simular rapidez
  };

  const animateContenido = () => {
    if (contenidoRef.current) {
      // Establecemos z-index antes de la animación
      gsap.set(contenidoRef.current, { zIndex: 1 });

      // Animamos la opacidad
      gsap.to(contenidoRef.current, {
        opacity: 1,
        duration: 1, // Duración de la animación
        delay: 2,
      });
    }
  };

  return (
    <>

      <div className="rasca">
        {/* Imagen de fondo */}
        <img
          src={url}
          alt="Premio oculto"
        />
        {/* Capa gris interactiva */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Para detener el dibujo si el puntero sale del canvas
        ></canvas>

      </div>

      {/* Elemento resultado (oculto al inicio) */}
      <div
        ref={contenidoRef}
        className="cartaInvitado__contenido"
      >
        {resultado}
      </div>
    </>
  );
};

export default Rasca;
