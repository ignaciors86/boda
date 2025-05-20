import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap'; // Importamos GSAP
import './Rasca.scss';
import Typewriter from "typewriter-effect";

const urlstrapi = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:1337'
  : 'https://boda-strapi-production.up.railway.app';
const STRAPI_TOKEN = "40f652de7eb40915bf1bf58a58144c1c9c55de06e2941007ff28a54d236179c4bd24147d27a985afba0e5027535da5b3577db7b850c72507e112e75d6bf4a41711b67e904d1c4e192252070f10d8a7efd72bec1e071c8ca50e5035347935f7ea6e760d727c0695285392a75bcb5e93d44bd395e0cd83fe748350f69e49aa24ca";

// Añadir credenciales de Cloudinary para invitados
const CLOUDINARY_CLOUD_NAME = 'boda-baile';
const CLOUDINARY_API_KEY = '851314221741213';
const CLOUDINARY_UPLOAD_PRESET = 'invitados';

const Rasca = ({ url, url2, setCurrentImageUrl, resultado, invitadoId }) => {
  const canvasRef = useRef(null);
  const contenidoRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [revealPercentage, setRevealPercentage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [hasNewImage, setHasNewImage] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImage2Loaded, setIsImage2Loaded] = useState(false);

  // Controla el grosor del pincel (en dvh)
  const brushSizeInDvh = 8;
  const brushSize = () => canvasDimensions.height * (brushSizeInDvh / 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Ajustar las dimensiones del canvas al tamaño del contenedor
    const updateCanvasDimensions = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setCanvasDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;

      // Dibujar la capa gris inicial
      ctx.fillStyle = '#b0b0b0';
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
    const totalPixels = imageData.data.length / 4;
    let clearedPixels = 0;

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) clearedPixels++;
    }

    const percentage = (clearedPixels / totalPixels) * 100;
    setRevealPercentage(percentage);

    if (percentage >= 30 && !isRevealed) {
      setIsRevealed(true);
      setCurrentImageUrl(url2);
      autoReveal();
      animateContenido();
      setShowUpload(true);
    }
  };

  const autoReveal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let remaining = 100 - revealPercentage;
    const squareSize = Math.min(canvas.width, canvas.height) / 15;
    
    const interval = setInterval(() => {
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, squareSize, squareSize);
      }

      remaining -= 2;
      if (remaining <= 0) {
        clearInterval(interval);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const timeline = gsap.timeline();
        
        timeline
          .to(canvas, { opacity: 0, duration: 0.5 })
          .set(".rasca__uploaded-image", { 
            visibility: "visible",
            opacity: 1,
            zIndex: 0
          })
          .to(".rasca__original-image", {
            scale: 0.3,
            x: "36%",
            y: "-5%",
            duration: 0.5,
            ease: "power2.out",
            transformOrigin: "center center"
          })
          .to(".rasca__upload-container", {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
          });
      }
    }, 50);
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Ocultar el contenedor de subida
      gsap.to(".rasca__upload-container", {
        opacity: 0,
        duration: 0.3,
        onComplete: () => setShowUpload(false)
      });

      // Mostrar la imagen del personaje a tamaño completo y aplicar efectos de loading
      const timeline = gsap.timeline();
      timeline
        .to(".rasca__original-image", {
          scale: 1,
          x: 0,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          transformOrigin: "center center",
          onComplete: () => {
            document.querySelector('.rasca__original-image').classList.add('loading');
            document.querySelector('.rasca__loading-text').classList.add('visible');
          }
        });

      setIsUploading(true);

      try {
        // Subir imagen a Cloudinary
        const formDataCloud = new FormData();
        formDataCloud.append('file', file);
        formDataCloud.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formDataCloud.append('api_key', CLOUDINARY_API_KEY);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formDataCloud
        });
        const data = await res.json();
        if (!data.secure_url) throw new Error('Error al subir la imagen a Cloudinary');

        // Actualizar invitado en Strapi con la URL de Cloudinary
        const updateData = {
          data: {
            imagen_url: data.secure_url
          }
        };
        const updateResponse = await fetch(`${urlstrapi}/api/invitados/${invitadoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify(updateData)
        });
        if (!updateResponse.ok) throw new Error('Error al actualizar el invitado');

        // Actualizar el contexto con la nueva URL
        setCurrentImageUrl(data.secure_url);
        setHasNewImage(true);
        setIsUploading(false);

        // Esperar a que la nueva imagen se cargue
        const newImage = new window.Image();
        newImage.src = data.secure_url;
        await new Promise((resolve) => {
          newImage.onload = resolve;
        });

        // Quitar efectos de loading antes de mostrar la nueva imagen
        document.querySelector('.rasca__original-image').classList.remove('loading');
        document.querySelector('.rasca__loading-text').classList.remove('visible');

        // Animación cuando la imagen está lista
        const finalTimeline = gsap.timeline();
        finalTimeline
          .to(".rasca__uploaded-image", {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
          })
          .to(".rasca__original-image", {
            scale: 0.3,
            x: "36%",
            y: "-5%",
            duration: 0.5,
            ease: "power2.out",
            transformOrigin: "center center"
          }, "-=0.25")
          .to(".rasca__upload-container", {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => setShowUpload(true)
          });
      } catch (error) {
        setIsUploading(false);
        document.querySelector('.rasca__original-image').classList.remove('loading');
        document.querySelector('.rasca__loading-text').classList.remove('visible');
        const errorTimeline = gsap.timeline();
        errorTimeline
          .to(".rasca__original-image", {
            scale: 0.3,
            x: "36%",
            y: "-5%",
            duration: 0.3,
            ease: "power2.out",
            transformOrigin: "center center"
          })
          .to(".rasca__upload-container", {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => setShowUpload(true)
          });
      }
    }
  };

  const handleImageClick = (e) => {
    const timeline = gsap.timeline();
    const clickedImage = e.currentTarget;
    const isOriginal = clickedImage.classList.contains('rasca__original-image');
    
    if (isOriginal) {
      timeline
        .to(".rasca__original-image", {
          scale: 1,
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          transformOrigin: "center center"
        })
        .to(".rasca__uploaded-image", {
          scale: 0.3,
          x: "36%",
          y: "-5%",
          duration: 0.5,
          ease: "power2.out",
          transformOrigin: "center center"
        }, "-=0.5")
        .set(".rasca__original-image", { zIndex: 1 })
        .set(".rasca__uploaded-image", { zIndex: 0 });
    } else {
      timeline
        .to(".rasca__uploaded-image", {
          scale: 1,
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          transformOrigin: "center center"
        })
        .to(".rasca__original-image", {
          scale: 0.3,
          x: "36%",
          y: "-5%",
          duration: 0.5,
          ease: "power2.out",
          transformOrigin: "center center"
        }, "-=0.5")
        .set(".rasca__uploaded-image", { zIndex: 1 })
        .set(".rasca__original-image", { zIndex: 0 });
    }
  };

  const getImageWithHeaders = (imageUrl) => {
    if (!imageUrl) return '';
    
    // Si es una URL de Strapi, añadir el token de autorización
    if (imageUrl.includes('strapi') || imageUrl.includes('railway')) {
      return `${imageUrl}?token=${STRAPI_TOKEN}`;
    }
    
    return imageUrl;
  };

  const handleImageError = (e) => {
    setImageError(true);
    console.error('Error al cargar la imagen:', e.target.src);
    
    // Intentar recargar la imagen después de un breve retraso
    setTimeout(() => {
      const img = e.target;
      const originalSrc = img.src;
      img.src = '';
      setTimeout(() => {
        img.src = originalSrc;
      }, 100);
    }, 1000);
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setImageError(false);
    // Iniciar animaciones solo cuando la imagen esté cargada
    if (contenidoRef.current) {
      gsap.set(contenidoRef.current, { zIndex: 1 });
      gsap.to(contenidoRef.current, {
        opacity: 1,
        duration: 1.5,
        delay: 0.5,
        ease: "power2.out"
      });
    }
  };

  const handleImage2Load = () => {
    setIsImage2Loaded(true);
    setImageError(false);
  };

  return (
    <>
      <div className="rasca">
        {/* Imagen de fondo */}
        <img
          className="rasca__original-image"
          src={url}
          alt="Premio oculto"
          onClick={handleImageClick}
          onError={handleImageError}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
          style={{ opacity: isImageLoaded ? 1 : 0 }}
        />
        
        <h3 className="rasca__loading-text">Subiendo imagen</h3>
        
        <img
          className="rasca__uploaded-image"
          src={url2}
          alt="Imagen subida"
          onClick={handleImageClick}
          onError={handleImageError}
          onLoad={handleImage2Load}
          style={{ 
            visibility: hasNewImage && isImage2Loaded ? 'visible' : 'hidden',
            opacity: hasNewImage && isImage2Loaded ? 1 : 0,
            zIndex: 0
          }}
          crossOrigin="anonymous"
        />
        
        {imageError && (
          <div className="rasca__error">
            <div className="rasca__error-icon">⚡</div>
            <div className="rasca__error-message">
              Hubo un error al cargar la imagen. Por favor, contacta con Gonzalo.
            </div>
          </div>
        )}
        
        {/* Capa gris interactiva */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
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
            {isUploading ? 'Subiendo...' : 'Sube tu foto real'}
          </label>
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
              loop: false,
              delay: 25,
            }}
          />
        </div>
      </div>

      {/* Elemento resultado (oculto al inicio) */}
      <div
        ref={contenidoRef}
        className="cartaInvitado__contenido"
        style={{ opacity: 0 }}
      >
        {resultado}
      </div>
    </>
  );
};

export default Rasca;
