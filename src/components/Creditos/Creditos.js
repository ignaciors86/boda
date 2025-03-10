import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import "./Creditos.scss";
import gsap from "gsap";
import Prompt from "components/Prompt/Prompt";

const MAX_INVITADOS_POR_GRUPO = 6;
const TIEMPO_INICIO_ESPIRAL = 4;
const TIEMPO_INICIO_BARRITAS = 224.5;
const TIEMPO_INICIO_INVITADOS = 20; // segundos
const TIEMPO_FIN = 400; // segundos
const PAUSA_ENTRE_GRUPOS = 1; // segundos
const TIEMPO_TRANSICION = 1; // segundos para mostrar/ocultar invitados

const Creditos = () => {
  const audioRef = useRef(null);
  const canvasBarsRef = useRef(null);
  const canvasDotsRef = useRef(null);
  const containerRef = useRef(null);
  const [datosInvitados, setDatosInvitados] = useState([]);
  const [grupoActual, setGrupoActual] = useState([]);
  const [mesaActual, setMesaActual] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [imagenesCargadas, setImagenesCargadas] = useState([]); // Estado para rastrear imágenes cargadas
  const imagenesRef = useRef([]); // Referencia para almacenar las imágenes cargadas
  const indexInvitado = useRef(0);
  const timeoutRef = useRef(null);
  const animationRef = useRef(null);
  const posicionesImagenes = useRef([]); // Añadir esta línea para rastrear las posiciones de las imágenes

  // Función para cargar una imagen con reintentos
  const cargarImagen = (url, index) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      // Actualizar el estado de imágenes cargadas
      setImagenesCargadas((prev) => {
        const nuevasImagenesCargadas = [...prev];
        nuevasImagenesCargadas[index] = true;
        return nuevasImagenesCargadas;
      });
      imagenesRef.current[index] = img; // Guardar la imagen cargada
    };
    img.onerror = () => {
      // Reintentar la carga después de un tiempo
      setTimeout(() => cargarImagen(url, index), 2000); // Reintentar cada 2 segundos
    };
  };

  useEffect(() => {
    fetch(
      "https://boda-strapi-production.up.railway.app/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*"
    )
      .then((response) => response.json())
      .then((data) => {
        const invitadosData = data.data
          .map((invitado) => ({
            id: invitado.id,
            nombre: invitado?.nombre,
            imagen: invitado?.personaje
              ? `https://boda-strapi-production.up.railway.app${invitado?.personaje?.imagen?.url}`
              : "",
            mesaId: invitado?.mesa?.id || 0,
          }))
          .sort((a, b) => a.mesaId - b.mesaId);
        setDatosInvitados(invitadosData);
        setDatosCargados(true);

        // Inicializar el estado de imágenes cargadas
        setImagenesCargadas(new Array(invitadosData.length).fill(false));

        // Cargar las imágenes de los invitados
        invitadosData.forEach((invitado, index) => {
          if (invitado.imagen) {
            cargarImagen(invitado.imagen, index);
          }
        });
      })
      .catch((error) =>
        console.error("Error al obtener los datos de los invitados:", error)
      );
  }, []);

  useEffect(() => {
    if (canvasBarsRef.current && canvasDotsRef.current) {
      const resizeCanvas = (canvas) => {
        const ctx = canvas.getContext("2d");
        const { width, height } = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      };
      resizeCanvas(canvasBarsRef.current);
      resizeCanvas(canvasDotsRef.current);
    }


  }, []);

  useEffect(() => {
    if (analyser && canvasBarsRef.current && canvasDotsRef.current) {
      const ctxBars = canvasBarsRef.current.getContext("2d");
      const ctxDots = canvasDotsRef.current.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Inicializar las posiciones de las imágenes si no están definidas
      if (posicionesImagenes.current.length === 0) {
        posicionesImagenes.current = datosInvitados.map((_, index) => ({
          posicionActual: index,
          velocidad: 0,
          transicion: 0
        }));
      }

      // Inicializar el array de rotaciones
      const rotaciones = datosInvitados.map(() => ({
        velocidad: Math.random() * 0.005 + 0.002, // Velocidad aleatoria entre 0.002 y 0.007
        direccion: Math.random() > 0.5 ? 1 : -1, // Dirección aleatoria (1: a favor, -1: en contra)
        rotacionActual: 0, // Rotación acumulativa para cada imagen
      }));

      let tiempoAnterior = 0; // Para calcular el tiempo transcurrido entre frames
      let rotacionAcumulativa = 0; // Rotación acumulativa de la espiral
      let velocidadGiroActual = .01; // Comenzar con una rotación casi nula
      let escalaActual = 1.0; // Escala actual de la espiral (inicialmente normal)
      let direccionGiro = 1; // 1 para sentido horario, -1 para sentido antihorario

      const draw = (tiempoActual) => {
        animationRef.current = requestAnimationFrame(draw);

        // Obtener datos de frecuencia del audio
        analyser.getByteFrequencyData(dataArray);

        // Limpiar el canvas
        const { width: barsWidth, height: barsHeight } =
          canvasBarsRef.current.getBoundingClientRect();
        const { width: dotsWidth, height: dotsHeight } =
          canvasDotsRef.current.getBoundingClientRect();
        ctxBars.clearRect(0, 0, barsWidth, barsHeight);
        ctxDots.clearRect(0, 0, dotsWidth, dotsHeight);

        // Configurar el canvas de las bolitas
        const centerX = dotsWidth / 2;
        const centerY = dotsHeight / 2;
        const maxRadius = Math.min(dotsWidth, dotsHeight) * 0.4;
        const totalInvitados = datosInvitados.length;

        // Obtener el tiempo actual y la duración total de la canción
        const tiempoAudio = audioRef.current ? audioRef.current.currentTime : 0;
        const duracionTotal = audioRef.current ? audioRef.current.duration : 1;

        // Calcular el progreso de la canción (0 a 1)
        const progreso = tiempoAudio / duracionTotal;

        // Invertir la dirección cuando llegue a TIEMPO_INICIO_BARRITAS
        if (tiempoAudio >= TIEMPO_INICIO_BARRITAS) {
          direccionGiro = -1;
        } else {
          direccionGiro = 1;
        }

        // Calcular la opacidad de las bolitas
        const opacidadBolitas = 1 - progreso;

        // Ajustar la velocidad de giro en función de la intensidad de la música
        const intensidadMusica = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const intensidadAmplificada = Math.pow(intensidadMusica / 255, 2);

        // Función para obtener el color del arcoíris basado en la posición
        const getRainbowColor = (progress, tiempo) => {
          const colorOffset = (tiempo * velocidadGiroActual * direccionGiro) % 1;
          const colorProgress = (progress + colorOffset) % 1;
          const hue = (colorProgress * 360) % 360;
          const saturation = 70 + (intensidadAmplificada * 30);
          const lightness = 50 + (intensidadAmplificada * 20);
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        };

        // Dibujar las barras del ecualizador
        const barWidth = (barsWidth / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * barsHeight;
          const scaledHeight = barHeight * 1.5;
          const progress = i / bufferLength;
          const intensity = dataArray[i] / 255;
          
          ctxBars.fillStyle = getRainbowColor(progress, tiempoAudio);
          ctxBars.fillRect(x, barsHeight - scaledHeight, barWidth, scaledHeight);
          x += barWidth + 2;
        }

        const velocidadMinima = 0.0000001;
        const velocidadMaxima = 1.0;
        const velocidadGiroDeseada = velocidadMinima + (velocidadMaxima - velocidadMinima) * Math.pow(intensidadAmplificada, 1.5);

        // Suavizar la velocidad de giro
        const suavizadoVelocidad = 0.005;
        velocidadGiroActual += (velocidadGiroDeseada - velocidadGiroActual) * suavizadoVelocidad;

        // Ajustar el tamaño de la espiral en función de la intensidad de la música
        const escalaMinima = 0.4;
        const escalaMaxima = 10;
        const escalaDeseada = escalaMinima + (escalaMaxima - escalaMinima) * intensidadAmplificada;

        // Suavizar el cambio de escala
        const suavizadoEscala = 0.25;
        escalaActual += (escalaDeseada - escalaActual) * suavizadoEscala;

        // Calcular el tiempo transcurrido desde el último frame
        const deltaTime = tiempoActual - tiempoAnterior;
        tiempoAnterior = tiempoActual;

        // Actualizar la rotación acumulativa de la espiral
        rotacionAcumulativa += velocidadGiroActual * (deltaTime / 16) * direccionGiro;

        // Aplicar transformaciones al canvas de las bolitas
        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.scale(escalaActual, escalaActual);
        ctxDots.rotate(rotacionAcumulativa);
        ctxDots.translate(-centerX, -centerY);

        // Primero dibujamos la espiral de colores
        for (let i = 0; i < totalInvitados; i++) {
          const progress = i / totalInvitados;
          const angle = progress * Math.PI * 10;
          const radius = progress * maxRadius;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const frequencyIndex = Math.floor(progress * bufferLength);
          const intensity = dataArray[frequencyIndex] / 255;

          // Calcular el tamaño de la bola con crecimiento dinámico
          const tamañoBase = radius / 20;
          const crecimientoDinamico = intensity * 5;
          const crecimientoMusica = tamañoBase * intensidadAmplificada;
          const tamañoFinal = tamañoBase + crecimientoDinamico + crecimientoMusica;

          // Dibujar la bolita con opacidad decreciente
          ctxDots.fillStyle = getRainbowColor(progress, tiempoAudio);
          ctxDots.globalAlpha = opacidadBolitas;
          ctxDots.beginPath();
          ctxDots.arc(x, y, tamañoFinal, 0, Math.PI * 2);
          ctxDots.fill();
          ctxDots.globalAlpha = 1;
        }

        // Luego dibujamos la espiral de imágenes
        for (let i = 0; i < totalInvitados; i++) {
          const progress = i / totalInvitados;
          const angle = progress * Math.PI * 10;
          const radius = progress * maxRadius;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const frequencyIndex = Math.floor(progress * bufferLength);
          const intensity = dataArray[frequencyIndex] / 255;

          // Calcular el tamaño de la bola con crecimiento dinámico
          const tamañoBase = radius / 20;
          const crecimientoDinamico = intensity * 5;
          const crecimientoMusica = tamañoBase * intensidadAmplificada;
          const tamañoFinal = tamañoBase + crecimientoDinamico + crecimientoMusica;

          // Actualizar la posición de la imagen
          const posicionImagen = posicionesImagenes.current[i];
          const velocidadBase = 0.0001;
          const velocidadMusica = intensidadAmplificada * 0.001;
          const velocidadTotal = velocidadBase + velocidadMusica;

          // Actualizar la transición
          posicionImagen.transicion += velocidadTotal;

          // Si la transición supera 1, mover la imagen a la siguiente posición
          if (posicionImagen.transicion >= 1) {
            posicionImagen.transicion = 0;
            posicionImagen.posicionActual = (posicionImagen.posicionActual + 1) % totalInvitados;
          }

          // Calcular la posición interpolada
          const posicionActual = posicionImagen.posicionActual;
          const siguientePosicion = (posicionActual + 1) % totalInvitados;
          const progressActual = posicionActual / totalInvitados;
          const progressSiguiente = siguientePosicion / totalInvitados;
          
          const angleActual = progressActual * Math.PI * 10;
          const angleSiguiente = progressSiguiente * Math.PI * 10;
          const radiusActual = progressActual * maxRadius;
          const radiusSiguiente = progressSiguiente * maxRadius;

          const xActual = centerX + Math.cos(angleActual) * radiusActual;
          const yActual = centerY + Math.sin(angleActual) * radiusActual;
          const xSiguiente = centerX + Math.cos(angleSiguiente) * radiusSiguiente;
          const ySiguiente = centerY + Math.sin(angleSiguiente) * radiusSiguiente;

          const xInterpolado = xActual + (xSiguiente - xActual) * posicionImagen.transicion;
          const yInterpolado = yActual + (ySiguiente - yActual) * posicionImagen.transicion;

          // Dibujar la imagen del invitado
          const img = imagenesRef.current[i];
          if (img && img.complete && img.naturalWidth !== 0) {
            const imgSize = tamañoFinal * 2;
            ctxDots.save();

            // Aplicar rotación individual a la imagen
            ctxDots.translate(xInterpolado, yInterpolado);
            ctxDots.rotate(rotaciones[i].rotacionActual + rotacionAcumulativa + (intensidadAmplificada * Math.PI * direccionGiro));
            ctxDots.translate(-xInterpolado, -yInterpolado);

            ctxDots.beginPath();
            ctxDots.arc(xInterpolado, yInterpolado, tamañoFinal, 0, Math.PI * 2);
            ctxDots.clip();
            ctxDots.drawImage(
              img,
              xInterpolado - imgSize / 2,
              yInterpolado - imgSize / 2,
              imgSize,
              imgSize
            );
            ctxDots.restore();
          }
        }

        // Restaurar el estado del canvas de la espiral
        ctxDots.restore();

        // Dibujar el kamehameha en el centro (ahora por encima de todo, sin transformaciones de la espiral)
        const kamehamehaSize = maxRadius * 0.3 * (1 + intensidadAmplificada * 2);
        const kamehamehaRotation = rotacionAcumulativa * direccionGiro;
        
        // Crear gradiente para el kamehameha
        const gradient = ctxDots.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, kamehamehaSize
        );
        
        // Colores del kamehameha
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.2, 'rgba(0, 255, 255, 0.6)');
        gradient.addColorStop(0.4, 'rgba(0, 128, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');

        // Dibujar el kamehameha
        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.rotate(kamehamehaRotation);
        ctxDots.translate(-centerX, -centerY);

        ctxDots.beginPath();
        ctxDots.arc(centerX, centerY, kamehamehaSize, 0, Math.PI * 2);
        ctxDots.fillStyle = gradient;
        ctxDots.fill();

        // Añadir efecto de brillo
        ctxDots.globalCompositeOperation = 'lighter';
        ctxDots.beginPath();
        ctxDots.arc(centerX, centerY, kamehamehaSize * 0.5, 0, Math.PI * 2);
        ctxDots.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctxDots.fill();
        ctxDots.globalCompositeOperation = 'source-over';
        ctxDots.restore();
      };

      // Iniciar el bucle de animación
      draw(0);
    }

    // Limpiar el bucle de animación al desmontar el componente
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyser, datosInvitados, imagenesCargadas]);

  // Escuchar el evento "seeked" para reajustar la escala y rotación
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleSeeked = () => {
      // No es necesario hacer nada aquí, ya que el tiempo actual se recalcula en cada frame
    };
    audioElement.addEventListener("seeked", handleSeeked);
    return () => {
      audioElement.removeEventListener("seeked", handleSeeked);
    };
  }, []);

  const mostrarSiguienteGrupo = () => {
    if (indexInvitado.current >= datosInvitados.length) return;

    const duracionTotal = (TIEMPO_FIN - TIEMPO_INICIO_INVITADOS) * 1000;
    const totalGrupos = Math.ceil(datosInvitados.length / MAX_INVITADOS_POR_GRUPO);
    const tiempoPausaTotal = (totalGrupos - 1) * PAUSA_ENTRE_GRUPOS * 1000;
    const tiempoDisponible = duracionTotal - tiempoPausaTotal;

    const tiempoPorInvitado = tiempoDisponible / datosInvitados.length;

    const siguienteGrupo = datosInvitados.slice(
      indexInvitado.current,
      indexInvitado.current + MAX_INVITADOS_POR_GRUPO
    );
    indexInvitado.current += MAX_INVITADOS_POR_GRUPO;
    setMesaActual(siguienteGrupo[0]?.mesaId || null);

    setGrupoActual(
      siguienteGrupo.map((invitado) => ({ ...invitado, visible: false }))
    );

    siguienteGrupo.forEach((_, i) => {
      setTimeout(() => {
        setGrupoActual((prev) =>
          prev.map((invitado, idx) =>
            idx === i ? { ...invitado, visible: true } : invitado
          )
        );
      }, i * tiempoPorInvitado);
    });

    timeoutRef.current = setTimeout(() => {
      setGrupoActual((prev) =>
        prev.map((invitado) => ({ ...invitado, visible: false }))
      );
      setTimeout(mostrarSiguienteGrupo, PAUSA_ENTRE_GRUPOS * 1000);
    }, tiempoPorInvitado * MAX_INVITADOS_POR_GRUPO + TIEMPO_TRANSICION * 1000);
  };

  // Añadir un manejador para el evento timeupdate
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleTimeUpdate = () => {
      const currentTime = audioElement.currentTime;
      
      // Ajustar opacidad de la espiral
      if (currentTime >= TIEMPO_INICIO_ESPIRAL) {
        gsap.to(".ecualizador-bolitas", {
          opacity: .2,
          duration: 2,
        });
      } else {
        gsap.to(".ecualizador-bolitas", {
          opacity: 0,
          duration: 0.5,
        });
      }

      // Ajustar opacidad de las barras
      if (currentTime >= TIEMPO_INICIO_BARRITAS) {
        gsap.to(".ecualizador-barras", {
          opacity: .7,
          duration: 60,
        });
      } else {
        gsap.to(".ecualizador-barras", {
          opacity: 0,
          duration: 0.5,
        });
      }
    };
    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  const iniciarAudio = () => {
    if (!datosCargados) return;
    if (!audioContext) {
      const newAudioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const newAnalyser = newAudioContext.createAnalyser();
      newAnalyser.fftSize = 256;

      const source = newAudioContext.createMediaElementSource(audioRef.current);
      source.connect(newAnalyser);
      newAnalyser.connect(newAudioContext.destination);

      setAudioContext(newAudioContext);
      setAnalyser(newAnalyser);
    }
    if (audioRef.current.paused) {
      // Establecer el tiempo actual a TIEMPO_INICIO_BARRITAS para probar las animaciones
      audioRef.current.currentTime = TIEMPO_INICIO_BARRITAS;
      audioRef.current.play();
      setTimeout(mostrarSiguienteGrupo, TIEMPO_INICIO_INVITADOS * 1000);
    } else {
      audioRef.current.pause();
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <div ref={containerRef} className="creditos" onClick={iniciarAudio}>

      <canvas ref={canvasDotsRef} className="ecualizador-bolitas" />
      <canvas ref={canvasBarsRef} className="ecualizador-barras" />

      <div className="invitados">
        {grupoActual.map((invitado) => (
          <div key={invitado.id} className={`invitado ${invitado.visible ? "visible" : "desvanecer"}`}>
            <img src={invitado.imagen} alt={invitado.nombre} />
          </div>
        ))}
      </div>
      <audio ref={audioRef} src={opus} className="audio-player" controls />
      {/* <Prompt/> */}
    </div>
  );
};

export default Creditos;