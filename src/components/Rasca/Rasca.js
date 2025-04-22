import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap'; // Importamos GSAP
import './Rasca.scss';
import Typewriter from "typewriter-effect";

const Rasca = ({ url, resultado }) => {
  const canvasRef = useRef(null);
  const contenidoRef = useRef(null); // Referencia al elemento .cartaInvitado__contenido
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [revealPercentage, setRevealPercentage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [hasNewImage, setHasNewImage] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

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
    e.preventDefault();
    setIsDrawing(true);
    draw(e); // Empezar a rascar al hacer clic
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    calculateRevealPercentage(); // Recalcular el porcentaje al finalizar el trazo
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    gsap.to(".explicacion", { opacity: 0, duration: 0.5, delay: 0, });
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

    if (percentage >= 30 && !isRevealed) {
      setIsRevealed(true);
      autoReveal(); // Simula el borrado completo si llega al 70%
      animateContenido(); // Inicia la animación del contenido
      setShowUpload(true);
    }
  };

  const autoReveal = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let remaining = 100 - revealPercentage;
    const squareSize = Math.min(canvas.width, canvas.height) / 15; // Tamaño de los cuadritos
    const interval = setInterval(() => {
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, squareSize, squareSize); // Revelar un cuadrito
      }

      remaining -= 2;
      if (remaining <= 0) {
        clearInterval(interval);
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpia todo al final
        gsap.to(canvas, { opacity: 0, duration: 0.5 });
      }
    }, 50); // Intervalo de 50ms para simular rapidez
  };

  const animateContenido = () => {
    if (contenidoRef.current) {
      gsap.set(contenidoRef.current, { zIndex: 1 });
      gsap.to(contenidoRef.current, {
        opacity: 1,
        duration: 1.5,
        delay: 0.5,
        ease: "power2.out"
      });
      gsap.to(".rasca", { 
        borderRadius: 0, 
        width: "90%", 
        height: "90%", 
        duration: 1.5, 
        delay: 0.5, 
        ease: "power2.out",
        onComplete: () => {
          setShowUpload(true);
          gsap.to(".rasca__upload-container", {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      });
    }
  };

  // Manejar los eventos táctiles
  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    drawTouch(e); // Empezar a rascar al tocar
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    calculateRevealPercentage(); // Recalcular el porcentaje al finalizar el trazo
  };

  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    drawTouch(e);
    calculateRevealPercentage(); // Actualizar el porcentaje mientras se rasca
  };

  const drawTouch = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    // Estilo del "pincel"
    ctx.globalCompositeOperation = 'destination-out'; // Eliminar la capa gris al rascar
    ctx.beginPath();
    ctx.arc(x, y, brushSize(), 0, 2 * Math.PI); // Grosor definido por brushSize()
    ctx.fill();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      gsap.to(".rasca__upload-container", {
        opacity: 0,
        duration: 0.3,
        onComplete: () => setShowUpload(false)
      });

      setIsUploading(true);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const timeline = gsap.timeline();
        
        timeline
          .to(".rasca__original-image", {
            scale: 1,
            x: 0,
            y: 0,
            duration: 0.3,
            ease: "power2.inOut",
            transformOrigin: "center center"
          })
          .call(() => {
            setUploadedImage(event.target.result);
            setIsUploading(false);
            setHasNewImage(true);
          })
          .set(".rasca__uploaded-image", { visibility: "visible" })
          .to(".rasca__uploaded-image", {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
          })
          .to(".rasca__original-image", {
            scale: 0.2,
            x: "36%",
            y: "-5%",
            duration: 0.5,
            ease: "power2.out",
            transformOrigin: "center center"
          }, "-=0.25")
          .call(() => setShowUpload(true))
          .to(".rasca__upload-container", {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
          });
      };
      
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="rasca">
        {/* Imagen de fondo */}
        <img
          className="rasca__original-image"
          src={url}
          alt="Premio oculto"
        />
        
        <img
          className={`rasca__uploaded-image ${hasNewImage ? '' : 'rasca__uploaded-image--hidden'}`}
          src={uploadedImage || url}
          alt="Imagen subida"
        />
        
        {/* Capa gris interactiva */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Para detener el dibujo si el puntero sale del canvas
          onTouchStart={handleTouchStart} // Manejar toque en dispositivos móviles
          onTouchMove={handleTouchMove} // Mover el dedo
          onTouchEnd={handleTouchEnd} // Terminar el toque
          onTouchCancel={handleTouchEnd} // Cancelar el toque
        ></canvas>
        
        <div className={`rasca__upload-container ${showUpload ? 'rasca__upload-container--visible' : ''}`}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="rasca__upload-input"
            id="upload-input"
          />
          <label htmlFor="upload-input" className="rasca__upload-button">
            <h2>Sube tu foto real</h2>
          </label>
          {isUploading && (
            <div className="rasca__upload-message">
              Subiendo foto...
            </div>
          )}
        </div>
        
        <div className='explicacion'>
          <Typewriter
            onInit={(typewriter) => {
              typewriter
                .typeString("Rasca para descubrir tu personaje")
                .start();
            }}
            options={{
              autoStart: true,
              loop: false, // No repetir la animación
              delay: 25, // Velocidad de escritura
              // cursor: "", // Elimina el cursor al finalizar
            }}
          />
        </div>
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
