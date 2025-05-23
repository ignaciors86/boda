import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
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

const Rasca = ({ url, url2, setCurrentImageUrl, personaje, dedicatoria, invitadoNombre, invitadoId }) => {
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
    draw(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    calculateRevealPercentage();
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    gsap.to(".explicacion", { opacity: 0, duration: 0.5, delay: 0 });
    draw(e);
    calculateRevealPercentage();
  };

  const draw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize(), 0, 2 * Math.PI);
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
          });

        // Solo reducir la imagen del personaje y mostrar contenido si hay una imagen de invitado válida
        if (url2 && isImage2Loaded) {
          timeline
            .to(".rasca__original-image", {
              scale: 0.3,
              x: "36%",
              y: "-5%",
              duration: 0.5,
              ease: "power2.out",
              transformOrigin: "center center"
            })
            .to(contenidoRef.current, {
              opacity: 1,
              duration: 1.5,
              ease: "power2.out"
            }, "-=0.3")
            .to(".rasca__upload-container", {
              opacity: 1,
              duration: 0.3,
              ease: "power2.out"
            });
        } else {
          // Si no hay imagen de invitado, solo mostrar el botón de subir
          timeline.to(".rasca__upload-container", {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
          });
        }
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

  const handleTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(true);
    drawTouch(e);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(false);
    calculateRevealPercentage();
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDrawing) return;
    drawTouch(e);
    calculateRevealPercentage();
  };

  const drawTouch = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize(), 0, 2 * Math.PI);
    ctx.fill();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      gsap.to(".rasca__upload-container", {
        opacity: 0,
        duration: 0.3,
        onComplete: () => setShowUpload(false)
      });

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

        setCurrentImageUrl(data.secure_url);
        setHasNewImage(true);
        setIsUploading(false);

        document.querySelector('.rasca__original-image').classList.remove('loading');
        document.querySelector('.rasca__loading-text').classList.remove('visible');

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

  const handleImageError = () => {
    setImageError(true);
    console.error('Error al cargar la imagen:', {
      url,
      url2,
      isImageLoaded,
      isImage2Loaded,
      hasNewImage
    });
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setImageError(false);
  };

  const handleImage2Load = () => {
    setIsImage2Loaded(true);
    setImageError(false);
    
    // Si la imagen del invitado se carga después de que se haya revelado,
    // animar la reducción de la imagen del personaje y mostrar el contenido
    if (isRevealed) {
      const timeline = gsap.timeline();
      timeline
        .to(".rasca__original-image", {
          scale: 0.3,
          x: "36%",
          y: "-5%",
          duration: 0.5,
          ease: "power2.out",
          transformOrigin: "center center"
        })
        .to(contenidoRef.current, {
          opacity: 1,
          duration: 1.5,
          ease: "power2.out"
        }, "-=0.3");
    }
  };

  return (
    <>
      <div className="rasca">
        <div className={`rasca__upload-container ${showUpload ? 'rasca__upload-container--visible' : ''}`} style={{ 
          position: 'absolute', 
          top: '2rem', 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 100 
        }}>
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

        <img
          className="rasca__original-image"
          src={url}
          alt="Premio oculto"
          onClick={handleImageClick}
          onError={handleImageError}
          onLoad={handleImageLoad}
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
        />
        
        {imageError && (
          <div className="rasca__error">
            <div className="rasca__error-icon">⚡</div>
            <div className="rasca__error-message">
              Hubo un error al cargar la imagen. Por favor, contacta con Gonzalo.
            </div>
          </div>
        )}
        
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
          style={{ 
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 3
          }}
        ></canvas>
        
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

      <div
        ref={contenidoRef}
        className="cartaInvitado__contenido"
        style={{ 
          opacity: 0,
          width: '100%',
          fontFamily: 'Evelins',
          fontSize: '1.2rem',
          textAlign: 'center',
          padding: '1rem',
          display: 'block'
        }}
      >
        <div style={{ marginBottom: '1rem', color: 'white', fontWeight: 'bold' }}>
          {(url2 && isImage2Loaded)
            ? (invitadoNombre || "Sin nombre")
            : (personaje?.nombre || "Sin nombre")}
        </div>
        {url2 && isImage2Loaded
          ? (dedicatoria || "Mil gracias por venir. Disfruta tanto como nosotros preparando todo esto.")
          : (personaje?.descripcion || "No hubo tiempo para cargar este texto, LO SIENTO")}
      </div>
    </>
  );
};

export default Rasca;
