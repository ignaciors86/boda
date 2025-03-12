import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import "./Creditos.scss";
import gsap from "gsap";
import Prompt from "components/Prompt/Prompt";

// Tiempos de la canción (ajustados a los momentos clave de Opus)
const TIEMPO_INICIO_ESPIRAL = 4;
const TIEMPO_INICIO_BARRITAS = 224.5;
const TIEMPO_INICIO_INVITADOS = 20;
const DURACION_SECCION_INVITADOS = 77;
const TIEMPO_FIN = 400;
const TIEMPO_PARON = 341.5;
const DURACION_PARON = 0.75;

// Ajustes específicos para Opus y sus diferentes secciones
const TIEMPO_INICIO_ACELERACION = 75;
const TIEMPO_MAXIMA_VELOCIDAD = 112;
const TIEMPO_INICIO_DESACELERACION = 175;

// Configuración de la animación base (ajustada al BPM de Opus)
const BPM_OPUS = 128;
const PULSO_BASE = 60 / BPM_OPUS;
const DURACION_ANIMACION_BASE = PULSO_BASE * 1.25;
const DURACION_ANIMACION_RAPIDA = PULSO_BASE / 2;
const MIN_DURACION_ANIMACION = PULSO_BASE / 8;

// Tiempos entre invitados (basados en el BPM)
const TIEMPO_ENTRE_INVITADOS_INICIAL = PULSO_BASE * 2.5;
const TIEMPO_ENTRE_INVITADOS_RAPIDO = PULSO_BASE * 0.75;
const MIN_TIEMPO_ENTRE_INVITADOS = PULSO_BASE / 4;

// Umbrales de detección de ritmo
const UMBRAL_INTENSIDAD = 0.5;
const MIN_TIEMPO_ENTRE_PICOS = PULSO_BASE / 16;
const UMBRAL_INTENSIDAD_CAMBIO = 0.35;
const UMBRAL_INTENSIDAD_TIEMPO = 0.6;

// Configuración de invitados y transiciones
const MAX_INVITADOS_POR_GRUPO = 1;
const GOLPES_POR_CAMBIO = 1;
const TIEMPO_POR_INVITADO = PULSO_BASE * 1.25;
const DURACION_TRANSICION = PULSO_BASE / 2;
const DURACION_PAUSA = PULSO_BASE * 1.25;
const PAUSA_ENTRE_GRUPOS = PULSO_BASE / 2;
const TIEMPO_TRANSICION = PULSO_BASE / 2;

// Ajustes de animación para diferentes secciones de Opus
const getAnimationParams = (currentTime) => {
  // Sección inicial (0:20 - 2:00)
  if (currentTime < TIEMPO_INICIO_ACELERACION) {
    return {
      duracionAnimacion: DURACION_ANIMACION_BASE,
      tiempoEntreInvitados: TIEMPO_ENTRE_INVITADOS_INICIAL,
      umbralIntensidad: UMBRAL_INTENSIDAD
    };
  }
  // Sección de aceleración (2:00 - 3:00)
  else if (currentTime < TIEMPO_MAXIMA_VELOCIDAD) {
    const progress = (currentTime - TIEMPO_INICIO_ACELERACION) / (TIEMPO_MAXIMA_VELOCIDAD - TIEMPO_INICIO_ACELERACION);
    return {
      duracionAnimacion: DURACION_ANIMACION_BASE - (progress * (DURACION_ANIMACION_BASE - DURACION_ANIMACION_RAPIDA)),
      tiempoEntreInvitados: TIEMPO_ENTRE_INVITADOS_INICIAL - (progress * (TIEMPO_ENTRE_INVITADOS_INICIAL - TIEMPO_ENTRE_INVITADOS_RAPIDO)),
      umbralIntensidad: UMBRAL_INTENSIDAD - (progress * 0.1)
    };
  }
  // Sección rápida (3:00 - 4:40)
  else if (currentTime < TIEMPO_INICIO_DESACELERACION) {
    return {
      duracionAnimacion: DURACION_ANIMACION_RAPIDA,
      tiempoEntreInvitados: TIEMPO_ENTRE_INVITADOS_RAPIDO,
      umbralIntensidad: UMBRAL_INTENSIDAD - 0.1
    };
  }
  // Sección final (4:40+)
  else {
    const progress = Math.min((currentTime - TIEMPO_INICIO_DESACELERACION) / (TIEMPO_PARON - TIEMPO_INICIO_DESACELERACION), 1);
    return {
      duracionAnimacion: DURACION_ANIMACION_RAPIDA + (progress * (DURACION_ANIMACION_BASE - DURACION_ANIMACION_RAPIDA)),
      tiempoEntreInvitados: TIEMPO_ENTRE_INVITADOS_RAPIDO + (progress * (TIEMPO_ENTRE_INVITADOS_INICIAL - TIEMPO_ENTRE_INVITADOS_RAPIDO)),
      umbralIntensidad: (UMBRAL_INTENSIDAD - 0.1) + (progress * 0.1)
    };
  }
};

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
  const [imagenesCargadas, setImagenesCargadas] = useState([]);
  const imagenesRef = useRef([]);
  const indexInvitado = useRef(0);
  const timeoutRef = useRef(null);
  const animationRef = useRef(null);
  const posicionesImagenes = useRef([]);
  const [invitadosFlotando, setInvitadosFlotando] = useState(new Set());
  const [animacionesMesa, setAnimacionesMesa] = useState({});
  const ultimoCambio = useRef(0);
  const contadorGolpes = useRef(0);
  const ultimoGolpe = useRef(0);
  const [coloresInvitados, setColoresInvitados] = useState({});
  const [primerCicloCompletado, setPrimerCicloCompletado] = useState(false);
  const [invitadoActual, setInvitadoActual] = useState(null);
  const [invitadosEnEsquinas, setInvitadosEnEsquinas] = useState([]);
  const ultimoIndiceEsquina = useRef(0);
  const [mostrarNombreMesa, setMostrarNombreMesa] = useState(false);
  const ultimaMesaMostrada = useRef(null);
  const ultimoInvitadoMostrado = useRef(-1);
  const invitadosMostrados = useRef([]);

  const animationState = useRef({
    tiempoAnterior: 0,
    rotacionAcumulativa: 0,
    velocidadGiroActual: 0.01,
    escalaActual: 1.0,
    direccionGiro: 1
  });

  const cargarImagen = (url, index) => {
    console.log(`Intentando cargar imagen ${index}: ${url}`);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      console.log(`Imagen ${index} cargada correctamente`);
      setImagenesCargadas((prev) => {
        const nuevasImagenesCargadas = [...prev];
        nuevasImagenesCargadas[index] = true;
        return nuevasImagenesCargadas;
      });
      imagenesRef.current[index] = img;
      console.log(`Imagen ${index} guardada en imagenesRef`);
    };
    img.onerror = () => {
      console.error(`Error al cargar imagen ${index}: ${url}`);
      setTimeout(() => cargarImagen(url, index), 2000);
    };
  };

  const calcularPosicionEsquina = (indice) => {
    const posiciones = [
      { x: '25%', y: '25%' },
      { x: '75%', y: '25%' },
      { x: '75%', y: '75%' },
      { x: '25%', y: '75%' }
    ];
    return posiciones[indice % 4];
  };

  useEffect(() => {
    if (datosInvitados.length > 0) {
      invitadosMostrados.current = new Array(datosInvitados.length).fill(false);
    }
  }, [datosInvitados]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      const currentTime = audioElement.currentTime;
      if (!currentTime || !analyser) return;
      
      if (currentTime >= TIEMPO_INICIO_INVITADOS) {
        const params = getAnimationParams(currentTime);
        
        const tiempoDesdeUltimaAnimacion = currentTime - ultimoCambio.current;
        if (tiempoDesdeUltimaAnimacion >= params.tiempoEntreInvitados && !invitadoActual) {
          const siguienteIndice = invitadosEnEsquinas.length > 0 ? 
            datosInvitados.findIndex(inv => inv.id === invitadosEnEsquinas[invitadosEnEsquinas.length - 1].id) + 1 : 0;

          if (siguienteIndice >= datosInvitados.length || invitadosMostrados.current[siguienteIndice]) {
            const elementosVisibles = invitadosEnEsquinas.map(inv => ({
              elemento: document.querySelector(`[data-invitado-id="${inv.id}"]`),
              nombre: document.querySelector(`[data-invitado-nombre-id="${inv.id}"]`)
            })).filter(({elemento, nombre}) => elemento && nombre);

            const timeline = gsap.timeline();
            elementosVisibles.forEach(({elemento, nombre}) => {
              timeline.to([elemento, nombre], {
                opacity: 0,
                scale: 0.8,
                duration: 1.5,
                ease: "power2.inOut",
                onStart: () => {
                  gsap.set([elemento, nombre], {
                    zIndex: 800,
                    pointerEvents: 'none'
                  });
                }
              }, 0);
            });

            timeline.call(() => {
              setInvitadosEnEsquinas([]);
              ultimoIndiceEsquina.current = 0;
            });

            return;
          }
          
          const invitado = datosInvitados[siguienteIndice];
          if (invitado && !invitadosMostrados.current[siguienteIndice]) {
            manejarCambioInvitado(invitado);
            invitadosMostrados.current[siguienteIndice] = true;
            ultimoCambio.current = currentTime;
          }
        }
      }
    };

    const handleSeeking = () => {
      const currentTime = audioElement.currentTime;
      
      setInvitadoActual(null);
      setInvitadosEnEsquinas([]);
      ultimoIndiceEsquina.current = 0;
      ultimoCambio.current = currentTime;
      
      if (currentTime < TIEMPO_INICIO_INVITADOS) {
        invitadosMostrados.current = new Array(datosInvitados.length).fill(false);
        return;
      }

      const tiempoDesdeInicio = currentTime - TIEMPO_INICIO_INVITADOS;
      const invitadosPorMostrar = Math.min(
        Math.floor(tiempoDesdeInicio / TIEMPO_ENTRE_INVITADOS_INICIAL),
        datosInvitados.length - 1
      );

      invitadosMostrados.current = invitadosMostrados.current.map((_, index) => 
        index <= invitadosPorMostrar
      );

      const invitadosAMostrar = [];
      const startIndex = Math.max(0, invitadosPorMostrar - 3);

      for (let i = startIndex; i <= invitadosPorMostrar; i++) {
        if (i < datosInvitados.length) {
          const posicion = calcularPosicionEsquina(i - startIndex);
          invitadosAMostrar.push({
            ...datosInvitados[i],
            posicion
          });
        }
      }

      setInvitadosEnEsquinas(invitadosAMostrar);
      ultimoIndiceEsquina.current = invitadosAMostrar.length % 4;
      ultimoInvitadoMostrado.current = invitadosPorMostrar;
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("seeking", handleSeeking);
    audioElement.addEventListener("seeked", handleSeeking);
    
    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("seeking", handleSeeking);
      audioElement.removeEventListener("seeked", handleSeeking);
    };
  }, [datosInvitados, analyser, invitadoActual, invitadosEnEsquinas]);

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
        console.log('Datos de invitados cargados:', invitadosData);
        
        const colores = {};
        invitadosData.forEach(invitado => {
          if (!invitado.imagen) {
            const hue = Math.random() * 360;
            const saturation = 30 + Math.random() * 20;
            const lightness = 85 + Math.random() * 10;
            colores[invitado.id] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          }
        });
        setColoresInvitados(colores);
        
        setDatosInvitados(invitadosData);
        setDatosCargados(true);

        setImagenesCargadas(new Array(invitadosData.length).fill(false));

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
  const handleResize = () => {
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
  };

  handleResize();

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, [datosInvitados]);

  useEffect(() => {
    if (analyser && canvasBarsRef.current && canvasDotsRef.current) {
      const ctxBars = canvasBarsRef.current.getContext("2d");
      const ctxDots = canvasDotsRef.current.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = (tiempoActual) => {
        animationRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        const { width: barsWidth, height: barsHeight } = canvasBarsRef.current.getBoundingClientRect();
        const { width: dotsWidth, height: dotsHeight } = canvasDotsRef.current.getBoundingClientRect();
        ctxBars.clearRect(0, 0, barsWidth, barsHeight);
        ctxDots.clearRect(0, 0, dotsWidth, dotsHeight);

        const centerX = dotsWidth / 2;
        const centerY = dotsHeight / 2;
        const maxRadius = Math.min(dotsWidth, dotsHeight) * 0.4;
        const totalInvitados = datosInvitados.length;
        const totalBolitas = 200;

        const tiempoAudio = audioRef.current ? audioRef.current.currentTime : 0;
        const duracionTotal = audioRef.current ? audioRef.current.duration : 1;

        const progreso = tiempoAudio / duracionTotal;

        const tiempoInicioEspiral = TIEMPO_INICIO_ESPIRAL;
        const duracionAnimacionEspiral = 10;
        const progresoAnimacionEspiral = Math.max(0, Math.min(1, (tiempoAudio - tiempoInicioEspiral) / duracionAnimacionEspiral));

        const tiempoRestante = duracionTotal - tiempoAudio;
        const duracionContraccion = 20;
        const factorContraccion = tiempoRestante <= duracionContraccion ? 
          tiempoRestante / duracionContraccion : 1;

        if (tiempoAudio >= TIEMPO_INICIO_BARRITAS) {
          animationState.current.direccionGiro = -1;
        } else {
          animationState.current.direccionGiro = 1;
        }

        const opacidadBolitas = (1 - progreso) * factorContraccion;

        const intensidadMusica = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const intensidadAmplificada = Math.pow(intensidadMusica / 255, 2);

        const getRainbowColor = (progress, tiempo) => {
          const colorOffset = (tiempo * animationState.current.velocidadGiroActual * animationState.current.direccionGiro) % 1;
          const colorProgress = (progress + colorOffset) % 1;
          const hue = (colorProgress * 360) % 360;
          const saturation = 70 + (intensidadAmplificada * 30);
          const lightness = 50 + (intensidadAmplificada * 20);
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        };

        const numBars = Math.min(bufferLength, 64);
        const availableWidth = barsWidth;
        const barSpacing = 2;
        const barWidth = Math.floor((availableWidth - (barSpacing * (numBars - 1))) / numBars);
        let x = 0;

        let opacidadBase = 0;
        if (tiempoAudio < TIEMPO_INICIO_INVITADOS) {
          opacidadBase = 0;
        } else if (tiempoAudio < TIEMPO_INICIO_INVITADOS + 2) {
          opacidadBase = (tiempoAudio - TIEMPO_INICIO_INVITADOS) / 2;
        } else {
          opacidadBase = 1;
        }

        const bearColors = [
          '#4E2700',
          '#D86C00',
          '#FFD52F',
          '#FFFFFF',
          '#666666',
          '#000000'
        ];

        const modoKITT = tiempoAudio >= TIEMPO_PARON;

        if (modoKITT) {
          const centerBar = Math.floor(numBars / 2);
          const baseAmplitude = 0.4;
          const maxAmplitude = 4.0;
          const barsPerColorAdjusted = Math.ceil(numBars / bearColors.length);

          for (let i = 0; i < numBars; i++) {
            const rawHeight = Math.pow(dataArray[i] / 255, 0.7);
            let scaledHeight;
            if (rawHeight < 0.3) {
              scaledHeight = rawHeight * baseAmplitude;
            } else {
              const excess = rawHeight - 0.3;
              scaledHeight = (baseAmplitude * 0.3) + (excess * maxAmplitude);
            }

            const distanceFromCenter = Math.abs(i - centerBar);
            const amplitudeFactor = Math.pow(1 - (distanceFromCenter / centerBar), 0.8);
            const barHeight = scaledHeight * amplitudeFactor * barsHeight;

            const opacityThreshold = barsHeight * 0.05;
            let opacity = barHeight < opacityThreshold ? Math.max(0, barHeight / opacityThreshold) : 1;
            opacity *= opacidadBase;
            
            const intensityOpacity = Math.max(0.3, Math.min(0.8, intensidadAmplificada));
            opacity *= intensityOpacity;

            const colorIndex = Math.floor(i / barsPerColorAdjusted);
            const color = bearColors[Math.min(colorIndex, bearColors.length - 1)];
            
            ctxBars.fillStyle = color;
            ctxBars.globalAlpha = opacity;
            
            const y = (barsHeight / 2) - (barHeight / 2);
            ctxBars.fillRect(x, y, barWidth, barHeight);
            
            x += barWidth + barSpacing;
          }
        } else {
          for (let i = 0; i < numBars; i++) {
          const barHeight = (dataArray[i] / 255) * barsHeight;
            const progress = i / numBars;
            
            const baseAmplitude = 0.4;
            const maxAmplitude = 1.5;
            const normalizedHeight = barHeight / barsHeight;
            const amplifiedHeight = Math.pow(normalizedHeight, 0.7);
            const finalHeight = barsHeight * (baseAmplitude + (maxAmplitude - baseAmplitude) * amplifiedHeight);
            
            const hue = (progress * 360 + tiempoAudio * 30) % 360;
            const saturation = 70 + (intensidadAmplificada * 30);
            const lightness = 50 + (intensidadAmplificada * 20);
            
            const opacityBase = Math.max(0.3, Math.min(0.8, intensidadAmplificada));
            const opacity = opacityBase * opacidadBase;
            
            ctxBars.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctxBars.globalAlpha = opacity;
            
            const y = (barsHeight / 2) - (finalHeight / 2);
            ctxBars.fillRect(x, y, barWidth, finalHeight);
            
            x += barWidth + barSpacing;
          }
        }
        ctxBars.globalAlpha = 1;

        const velocidadMinima = 0.0000001;
        const velocidadMaxima = 1.0;
        const velocidadGiroDeseada = velocidadMinima + (velocidadMaxima - velocidadMinima) * Math.pow(intensidadAmplificada, 1.5);

        const suavizadoVelocidad = 0.005;
        animationState.current.velocidadGiroActual += (velocidadGiroDeseada - animationState.current.velocidadGiroActual) * suavizadoVelocidad;

        const escalaMinima = 0.4;
        const escalaMaxima = 10;
        const escalaDeseada = escalaMinima + (escalaMaxima - escalaMinima) * intensidadAmplificada;

        const suavizadoEscala = 0.25;
        animationState.current.escalaActual += (escalaDeseada - animationState.current.escalaActual) * suavizadoEscala;

        const deltaTime = tiempoActual - animationState.current.tiempoAnterior;
        animationState.current.tiempoAnterior = tiempoActual;

        animationState.current.rotacionAcumulativa += animationState.current.velocidadGiroActual * (deltaTime / 16) * animationState.current.direccionGiro;

        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.scale(animationState.current.escalaActual * factorContraccion, animationState.current.escalaActual * factorContraccion);
        ctxDots.rotate(animationState.current.rotacionAcumulativa);
        ctxDots.translate(-centerX, -centerY);

        for (let i = 0; i < totalBolitas; i++) {
          const progress = i / totalBolitas;
          const angle = progress * Math.PI * 10;
          const radius = progress * maxRadius;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const frequencyIndex = Math.floor(progress * bufferLength);
          const intensity = dataArray[frequencyIndex] / 255;

          const tamañoBase = Math.min((radius / 20) * 1.5, maxRadius * 0.05);
          const crecimientoDinamico = intensity * 3;
          const tamañoFinal = Math.min(tamañoBase + crecimientoDinamico, maxRadius * 0.08);

          const bolitaProgreso = i / totalBolitas;
          const mostrarBolita = bolitaProgreso <= progresoAnimacionEspiral;

          if (mostrarBolita) {
            ctxDots.save();

            ctxDots.beginPath();
            ctxDots.arc(x, y, tamañoFinal, 0, Math.PI * 2);
            ctxDots.fillStyle = getRainbowColor(progress, tiempoAudio);
            ctxDots.globalAlpha = opacidadBolitas;
            ctxDots.fill();

            const indiceInvitado = Math.floor((i / totalBolitas) * datosInvitados.length);
            
            const tiempoDesdeInicio = tiempoAudio - TIEMPO_INICIO_INVITADOS;
            const invitadosVisibles = Math.max(0, Math.floor(tiempoDesdeInicio / TIEMPO_ENTRE_INVITADOS_INICIAL));
            
            if (indiceInvitado < datosInvitados.length && 
                (indiceInvitado <= invitadosVisibles || primerCicloCompletado)) {
              const img = imagenesRef.current[indiceInvitado];
              if (img && img.complete && img.naturalWidth !== 0) {
                ctxDots.save();
                ctxDots.translate(x, y);
                ctxDots.beginPath();
                ctxDots.arc(0, 0, tamañoFinal, 0, Math.PI * 2);
                ctxDots.clip();
                ctxDots.drawImage(
                  img,
                  -tamañoFinal,
                  -tamañoFinal,
                  tamañoFinal * 2,
                  tamañoFinal * 2
                );
                ctxDots.restore();
              }
            }

            ctxDots.restore();
          }
        }

        ctxDots.restore();

        const kamehamehaSizeBase = maxRadius * 0.75;
        const factorTamañoPost = tiempoAudio > TIEMPO_PARON ? 
          1 + intensidadAmplificada : 1;
        const kamehamehaSize = kamehamehaSizeBase * (1 + intensidadAmplificada * 2) * factorContraccion * factorTamañoPost;
        const kamehamehaRotation = animationState.current.rotacionAcumulativa * animationState.current.direccionGiro;
        
        const gradient = ctxDots.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, kamehamehaSize
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 255, ${(0.9 + intensidadAmplificada * 0.1) * factorContraccion})`);
        gradient.addColorStop(0.2, `rgba(0, 255, 255, ${(0.7 + intensidadAmplificada * 0.3) * factorContraccion})`);
        gradient.addColorStop(0.4, `rgba(0, 128, 255, ${(0.5 + intensidadAmplificada * 0.5) * factorContraccion})`);
        gradient.addColorStop(0.6, `rgba(0, 64, 255, ${(0.3 + intensidadAmplificada * 0.7) * factorContraccion})`);
        gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');

        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.rotate(kamehamehaRotation);
        ctxDots.translate(-centerX, -centerY);

        ctxDots.beginPath();
        ctxDots.arc(centerX, centerY, kamehamehaSize, 0, Math.PI * 2);
        ctxDots.fillStyle = gradient;
        ctxDots.fill();

        ctxDots.globalCompositeOperation = 'lighter';
        ctxDots.beginPath();
        ctxDots.arc(centerX, centerY, kamehamehaSize * 0.5, 0, Math.PI * 2);
        ctxDots.fillStyle = `rgba(255, 255, 255, ${(0.4 + intensidadAmplificada * 0.6) * factorContraccion})`;
        ctxDots.fill();
        ctxDots.globalCompositeOperation = 'source-over';
        ctxDots.restore();
      };

      draw(0);

      const resetAnimation = () => {
        if (!canvasBarsRef.current || !canvasDotsRef.current) return;

        animationState.current.rotacionAcumulativa = 0;
        animationState.current.velocidadGiroActual = 0.01;
        animationState.current.escalaActual = 1.0;
        animationState.current.direccionGiro = 1;
        
        const ctxBars = canvasBarsRef.current.getContext("2d");
        const ctxDots = canvasDotsRef.current.getContext("2d");
        
        if (ctxBars && ctxDots && canvasBarsRef.current.width && canvasDotsRef.current.width) {
          ctxBars.clearRect(0, 0, canvasBarsRef.current.width, canvasBarsRef.current.height);
          ctxDots.clearRect(0, 0, canvasDotsRef.current.width, canvasDotsRef.current.height);
        }
      };

      const audioElement = audioRef.current;
      if (audioElement) {
        audioElement.addEventListener("seeking", resetAnimation);
        audioElement.addEventListener("seeked", resetAnimation);
      }

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioElement) {
          audioElement.removeEventListener("seeking", resetAnimation);
          audioElement.removeEventListener("seeked", resetAnimation);
        }
        if (canvasBarsRef.current && canvasDotsRef.current) {
          resetAnimation();
        }
      };
    }
  }, [analyser, datosInvitados, imagenesCargadas]);

  const manejarCambioInvitado = (invitado) => {
    const params = getAnimationParams(audioRef.current.currentTime);
    const currentTime = audioRef.current.currentTime;
    
    setInvitadoActual(invitado);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    const intensidadMusica = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensidadNormalizada = intensidadMusica / 255;

    setTimeout(() => {
      const elementoNuevo = document.querySelector(`[data-invitado-id="${invitado.id}"]`);
      const elementoNombre = document.querySelector(`[data-invitado-nombre-id="${invitado.id}"]`);
      
      if (elementoNuevo && elementoNombre) {
        const escalaInicial = 0.5 + (intensidadNormalizada * 0.3);
        
        gsap.set([elementoNombre, elementoNuevo], {
          left: '50%',
          top: '50%',
          opacity: 0,
          scale: escalaInicial,
          transform: 'translate(-50%, -50%)',
          width: '40dvh',
          height: '40dvh',
          boxSizing: 'border-box'
        });

        const timeline = gsap.timeline();

        if (invitadosEnEsquinas.length >= 4) {
          const invitadoSaliente = invitadosEnEsquinas[0];
          const elementoSaliente = document.querySelector(`[data-invitado-id="${invitadoSaliente.id}"]`);
          const nombreSaliente = document.querySelector(`[data-invitado-nombre-id="${invitadoSaliente.id}"]`);

          if (elementoSaliente && nombreSaliente) {
            const duracionDesvanecimiento = params.duracionAnimacion * (1 + intensidadNormalizada);
            const escalaFinal = 0.8 - (intensidadNormalizada * 0.3);

            timeline.to([elementoSaliente, nombreSaliente], {
              opacity: 0,
              scale: escalaFinal,
              duration: duracionDesvanecimiento,
              ease: "power2.inOut",
              onStart: () => {
                gsap.set([elementoSaliente, nombreSaliente], {
                  zIndex: 800,
                  pointerEvents: 'none'
                });
              },
              onComplete: () => {
                setInvitadosEnEsquinas(prev => {
                  const nuevosInvitados = prev.slice(1);
                  return nuevosInvitados;
                });
              }
            });
          } else {
            setInvitadosEnEsquinas(prev => prev.slice(1));
          }
        }

        const nuevaPosicion = calcularPosicionEsquina(ultimoIndiceEsquina.current);

        const duracionEntrada = params.duracionAnimacion * (1 + intensidadNormalizada * 0.5);
        const escalaMaxima = 1 + (intensidadNormalizada * 0.2);

        timeline.to([elementoNombre, elementoNuevo], {
          left: nuevaPosicion.x,
          top: nuevaPosicion.y,
          opacity: 1,
          scale: escalaMaxima,
          duration: duracionEntrada * 0.6,
          ease: "power2.out"
        }, invitadosEnEsquinas.length >= 4 ? params.duracionAnimacion : 0)
        .to([elementoNombre, elementoNuevo], {
          scale: 1,
          duration: duracionEntrada * 0.4,
          ease: "elastic.out(1, 0.3)"
        })
        .to([elementoNuevo, elementoNombre], {
          transform: (index) => {
            const offsetBase = 15;
            const offsetAdicional = intensidadNormalizada * 5;
            const offsetX = index === 0 ? -(offsetBase + offsetAdicional) : (offsetBase + offsetAdicional);
            return `translate(calc(-50% + ${offsetX}dvh), -50%)`;
          },
          duration: params.duracionAnimacion * 0.5,
          ease: "power2.inOut",
          onComplete: () => {
            setInvitadosEnEsquinas(prev => [...prev, {
              ...invitado,
              posicion: nuevaPosicion
            }]);
            
            ultimoIndiceEsquina.current = (ultimoIndiceEsquina.current + 1) % 4;
            setInvitadoActual(null);
          }
        });

        if (intensidadNormalizada > 0.6) {
          timeline.to([elementoNuevo, elementoNombre], {
            scale: 1 + (intensidadNormalizada * 0.1),
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut"
          }, "+=0.1");
        }
      }
    }, Math.max(50, intensidadNormalizada * 100));
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
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <div ref={containerRef} className="creditos" onClick={iniciarAudio}>
      <canvas ref={canvasBarsRef} className="ecualizador-barras" />
      <canvas ref={canvasDotsRef} className="ecualizador-bolitas" />
      
      {mostrarNombreMesa && mesaActual && (
        <div
          className="nombre-mesa"
          style={{
            position: 'absolute',
            left: '50%',
            top: '30%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '10dvh',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '2dvh',
            zIndex: 2000,
            textShadow: '0 0 10px rgba(0,0,255,0.8), 0 0 20px rgba(0,0,255,0.6), 0 0 30px rgba(0,0,255,0.4)',
            animation: 'fadeInOut 3s ease-in-out',
            whiteSpace: 'nowrap',
            letterSpacing: '0.1em'
          }}
        >
          {mesaActual}
        </div>
      )}
      
      {invitadoActual && (
        <>
          <div
            data-invitado-nombre-id={invitadoActual.id}
            className="invitado-nombre"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '40dvh',
              height: '40dvh',
              borderRadius: '50%',
              backgroundColor: 'white',
              color: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5dvh',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '4dvh',
              boxSizing: 'border-box',
              zIndex: 900,
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              pointerEvents: 'none'
            }}
          >
            {invitadoActual.nombre}
          </div>
        <div 
          data-invitado-id={invitadoActual.id}
          className="invitado"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
              width: '40dvh',
              height: '40dvh',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: !invitadoActual.imagen ? coloresInvitados[invitadoActual.id] : 'transparent',
              boxSizing: 'border-box',
              zIndex: 1000,
              transform: 'translate(-50%, -50%)',
            opacity: 0,
              pointerEvents: 'none'
          }}
        >
          {invitadoActual.imagen ? (
            <img 
              src={invitadoActual.imagen} 
              alt={invitadoActual.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: coloresInvitados[invitadoActual.id]
            }} />
          )}
        </div>
        </>
      )}

      {invitadosEnEsquinas.map((invitado, index) => (
        <React.Fragment key={`container-${invitado.id}-${index}`}>
          <div
            key={`nombre-${invitado.id}-${index}`}
            data-invitado-nombre-id={invitado.id}
            className="invitado-nombre"
            style={{
              position: 'absolute',
              left: invitado.posicion.x,
              top: invitado.posicion.y,
              transform: 'translate(calc(-50% + 15dvh), -50%)',
              width: '40dvh',
              height: '40dvh',
              borderRadius: '50%',
              backgroundColor: 'white',
              color: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5dvh',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '4dvh',
              boxSizing: 'border-box',
              opacity: 1,
              zIndex: 900,
              pointerEvents: 'none'
            }}
          >
            {invitado.nombre}
          </div>
        <div
          key={`${invitado.id}-${index}`}
          data-invitado-id={invitado.id}
          className="invitado"
          style={{
            position: 'absolute',
            left: invitado.posicion.x,
            top: invitado.posicion.y,
              transform: 'translate(calc(-50% - 15dvh), -50%)',
              width: '40dvh',
              height: '40dvh',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: !invitado.imagen ? coloresInvitados[invitado.id] : 'transparent',
              boxSizing: 'border-box',
            opacity: 1,
              zIndex: 1000,
              pointerEvents: 'none'
          }}
        >
          {invitado.imagen ? (
            <img 
              src={invitado.imagen} 
              alt={invitado.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: coloresInvitados[invitado.id]
            }} />
          )}
        </div>
        </React.Fragment>
      ))}

      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            10% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
            20% { transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          }
        `}
      </style>

      <audio ref={audioRef} src={opus} className="audio-player" controls />
    </div>
  );
};

export default Creditos;