import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import "./Creditos.scss";
import gsap from "gsap";

const MAX_INVITADOS_POR_GRUPO = 6;
const TIEMPO_INICIO_ESPIRAL = 4;
const TIEMPO_INICIO_BARRITAS = 60;
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

        // Dibujar las barras del ecualizador
        const barWidth = (barsWidth / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * barsHeight;
          const scaledHeight = barHeight * 1.5; // Ajusta este valor para controlar la altura máxima
          ctxBars.fillStyle = `rgb(${dataArray[i] * 2}, ${(dataArray[i] * 3) % 255
            }, ${(dataArray[i] * 5) % 255})`;
          ctxBars.fillRect(x, barsHeight - scaledHeight, barWidth, scaledHeight);
          x += barWidth + 2;
        }

        // Configurar el canvas de las bolitas
        const centerX = dotsWidth / 2;
        const centerY = dotsHeight / 2;
        const maxRadius = Math.min(dotsWidth, dotsHeight) * 0.4;

        // Obtener el tiempo actual y la duración total de la canción
        const tiempoAudio = audioRef.current ? audioRef.current.currentTime : 0;
        const duracionTotal = audioRef.current ? audioRef.current.duration : 1; // Evitar división por cero

        // Calcular el progreso de la canción (0 a 1)
        const progreso = tiempoAudio / duracionTotal;

        // Calcular la opacidad de las bolitas (de 1 a 0 a lo largo de la canción)
        const opacidadBolitas = 1 - progreso; // Opacidad disminuye progresivamente

        // Ajustar la velocidad de giro en función de la intensidad de la música
        const intensidadMusica =
          dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const intensidadAmplificada = Math.pow(intensidadMusica / 255, 2); // Función cuadrática para mayor contraste

        const velocidadMinima = 0.0000001; // Velocidad mínima de giro (muy lenta)
        const velocidadMaxima = 1.0; // Velocidad máxima de giro (muy rápida)
        const velocidadGiroDeseada =
          velocidadMinima +
          (velocidadMaxima - velocidadMinima) * Math.pow(intensidadAmplificada, 1.5);

        // Suavizar la velocidad de giro
        const suavizadoVelocidad = 0.005; // Factor de suavizado para la velocidad
        velocidadGiroActual +=
          (velocidadGiroDeseada - velocidadGiroActual) * suavizadoVelocidad;

        // Ajustar el tamaño de la espiral en función de la intensidad de la música
        const escalaMinima = 0.4; // Escala mínima de la espiral (más pequeña)
        const escalaMaxima = 10; // Escala máxima de la espiral (más grande)
        const escalaDeseada =
          escalaMinima + (escalaMaxima - escalaMinima) * intensidadAmplificada;

        // Suavizar el cambio de escala
        const suavizadoEscala = 0.25; // Factor de suavizado para la escala
        escalaActual += (escalaDeseada - escalaActual) * suavizadoEscala;

        // Calcular el tiempo transcurrido desde el último frame
        const deltaTime = tiempoActual - tiempoAnterior;
        tiempoAnterior = tiempoActual;

        // Actualizar la rotación acumulativa de la espiral
        rotacionAcumulativa += velocidadGiroActual * (deltaTime / 16); // Normalizar deltaTime

        // Aplicar transformaciones al canvas de las bolitas
        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.scale(escalaActual, escalaActual); // Aplicar la escala actual
        ctxDots.rotate(rotacionAcumulativa); // Aplicar la rotación acumulativa
        ctxDots.translate(-centerX, -centerY);

        // Dibujar las bolitas y las imágenes de los invitados
        const totalInvitados = datosInvitados.length;
        let contadorSeparacion = 0; // Contador para asegurar la separación entre imágenes

        for (let i = 0; i < totalInvitados; i++) {
          const progress = i / totalInvitados;
          const angle = progress * Math.PI * 10; // Ángulo fijo para la espiral
          const radius = progress * maxRadius;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const frequencyIndex = Math.floor(progress * bufferLength);
          const intensity = dataArray[frequencyIndex] / 255;

          // Dibujar la bolita con opacidad decreciente
          ctxDots.fillStyle = `rgba(${dataArray[frequencyIndex] * 2}, ${(dataArray[frequencyIndex] * 3) % 255
            }, ${(dataArray[frequencyIndex] * 5) % 255}, ${opacidadBolitas})`;
          ctxDots.beginPath();
          ctxDots.arc(x, y, radius / 20 + intensity * 5, 0, Math.PI * 2);
          ctxDots.fill();

          // Dibujar la imagen del invitado dentro de la bolita (si está cargada y cumple la separación)
          const img = imagenesRef.current[i];
          if (img && img.complete && img.naturalWidth !== 0 && contadorSeparacion >= 3) {
            const imgSize = (radius / 20 + intensity * 5) * 2; // Tamaño de la imagen
            ctxDots.save();

            // Aplicar rotación individual a la imagen
            ctxDots.translate(x, y); // Mover el origen al centro de la bolita
            ctxDots.rotate(rotaciones[i].rotacionActual); // Rotar la imagen
            ctxDots.translate(-x, -y); // Mover el origen de vuelta

            ctxDots.beginPath();
            ctxDots.arc(x, y, radius / 20 + intensity * 5, 0, Math.PI * 2); // Recortar la imagen con la forma de la bolita
            ctxDots.clip();
            ctxDots.drawImage(
              img,
              x - imgSize / 2, // Centrar la imagen en x
              y - imgSize / 2, // Centrar la imagen en y
              imgSize, // Ancho de la imagen
              imgSize // Alto de la imagen
            );
            ctxDots.restore();

            contadorSeparacion = 0; // Reiniciar el contador de separación
          } else {
            contadorSeparacion++; // Incrementar el contador de separación
          }
        }

        // Restaurar el estado del canvas
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
      audioRef.current.play();
      setTimeout(mostrarSiguienteGrupo, TIEMPO_INICIO_INVITADOS * 1000);
      gsap.to(".ecualizador-bolitas", {
        opacity: .2,
        duration: 60,
        delay: TIEMPO_INICIO_ESPIRAL,
      })
      gsap.to(".ecualizador-barras", {
        opacity: .2,
        duration: 60,
        delay: TIEMPO_INICIO_BARRITAS,
      })
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
    </div>
  );
};

export default Creditos;