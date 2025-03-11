import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import "./Creditos.scss";
import gsap from "gsap";
import Prompt from "components/Prompt/Prompt";

// Tiempos de la canción
const TIEMPO_INICIO_ESPIRAL = 4;
const TIEMPO_INICIO_BARRITAS = 224.5;
const TIEMPO_INICIO_INVITADOS = 20; // segundos
const DURACION_SECCION_INVITADOS = 200; // 2 minutos en segundos
const TIEMPO_FIN_INVITADOS = TIEMPO_INICIO_INVITADOS + DURACION_SECCION_INVITADOS;
const TIEMPO_FIN = 400; // segundos
const TIEMPO_PARON = 341.5; // tiempo en segundos donde ocurre el parón
const DURACION_PARON = .75; // duración del parón en segundos
const TIEMPO_INICIO_ACELERACION = TIEMPO_INICIO_INVITADOS + DURACION_SECCION_INVITADOS * 0.75; // Comienza la aceleración al 75% de la sección
const TIEMPO_MINIMO_POR_INVITADO = 0.1; // Reducido de 1 a 0.1 segundos

// Configuración de invitados
const MAX_INVITADOS_POR_GRUPO = 1;
const MIN_TIEMPO_ENTRE_CAMBIOS = 0.3; // Tiempo mínimo entre cambios de invitado
const UMBRAL_INTENSIDAD = 0.7; // Umbral de intensidad para detectar golpes de bajo
const GOLPES_POR_CAMBIO = 4; // Número de golpes antes de cambiar de invitado
const TIEMPO_POR_INVITADO = 2; // 3 segundos de pausa + 1 segundo de transición
const DURACION_TRANSICION = 1; // 0.5s entrada + 0.5s salida
const DURACION_PAUSA = 3; // tiempo que se muestra cada invitado
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
  const [invitadosFlotando, setInvitadosFlotando] = useState(new Set());
  const [animacionesMesa, setAnimacionesMesa] = useState({});
  const ultimoCambio = useRef(0);
  const contadorGolpes = useRef(0);
  const ultimoGolpe = useRef(0);
  const [coloresInvitados, setColoresInvitados] = useState({}); // Nuevo estado para los colores
  const [primerCicloCompletado, setPrimerCicloCompletado] = useState(false);

  // Función para cargar una imagen con reintentos
  const cargarImagen = (url, index) => {
    console.log(`Intentando cargar imagen ${index}: ${url}`);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      console.log(`Imagen ${index} cargada correctamente`);
      // Actualizar el estado de imágenes cargadas
      setImagenesCargadas((prev) => {
        const nuevasImagenesCargadas = [...prev];
        nuevasImagenesCargadas[index] = true;
        return nuevasImagenesCargadas;
      });
      imagenesRef.current[index] = img; // Guardar la imagen cargada
      console.log(`Imagen ${index} guardada en imagenesRef`);
    };
    img.onerror = () => {
      console.error(`Error al cargar imagen ${index}: ${url}`);
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
        console.log('Datos de invitados cargados:', invitadosData);
        
        // Generar colores aleatorios para invitados sin imagen
        const colores = {};
        invitadosData.forEach(invitado => {
          if (!invitado.imagen) {
            const hue = Math.random() * 360; // Tono aleatorio
            const saturation = 30 + Math.random() * 20; // Saturación baja (30-50%)
            const lightness = 85 + Math.random() * 10; // Luminosidad alta (85-95%)
            colores[invitado.id] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          }
        });
        setColoresInvitados(colores);
        
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

  // Llamar al resize inicial
  handleResize();

  // Añadir event listener para el resize
  window.addEventListener('resize', handleResize);

  // Limpiar el event listener
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
        const totalBolitas = 200; // Aumentamos el número de bolitas para cubrir toda la pantalla

        // Obtener el tiempo actual y la duración total de la canción
        const tiempoAudio = audioRef.current ? audioRef.current.currentTime : 0;
        const duracionTotal = audioRef.current ? audioRef.current.duration : 1;

        // Calcular el progreso de la canción (0 a 1)
        const progreso = tiempoAudio / duracionTotal;

        // Calcular el progreso de la animación de la espiral
        const tiempoInicioEspiral = TIEMPO_INICIO_ESPIRAL;
        const duracionAnimacionEspiral = 10; // 10 segundos para mostrar todas las bolitas
        const progresoAnimacionEspiral = Math.max(0, Math.min(1, (tiempoAudio - tiempoInicioEspiral) / duracionAnimacionEspiral));

        // Calcular el factor de contracción al final de la canción
        const tiempoRestante = duracionTotal - tiempoAudio;
        const duracionContraccion = 20; // 20 segundos para contraer
        const factorContraccion = tiempoRestante <= duracionContraccion ? 
          tiempoRestante / duracionContraccion : 1;

        // Invertir la dirección cuando llegue a TIEMPO_INICIO_BARRITAS
        if (tiempoAudio >= TIEMPO_INICIO_BARRITAS) {
          direccionGiro = -1;
        } else {
          direccionGiro = 1;
        }

        // Calcular la opacidad de las bolitas
        const opacidadBolitas = (1 - progreso) * factorContraccion;

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

        // Calcular la opacidad de las barras basada en la intensidad de la música
        const opacidadBarras = Math.max(0.1, Math.min(0.7, intensidadAmplificada * 0.7));

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * barsHeight;
          const scaledHeight = barHeight * 1.5;
          const progress = i / bufferLength;
          const intensity = dataArray[i] / 255;
          
          ctxBars.fillStyle = getRainbowColor(progress, tiempoAudio);
          ctxBars.globalAlpha = opacidadBarras;
          // Dibujamos desde el centro hacia arriba y abajo
          const y = (barsHeight / 2) - (scaledHeight / 2);
          ctxBars.fillRect(x, y, barWidth, scaledHeight);
          x += barWidth + 2;
        }
        ctxBars.globalAlpha = 1;

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

        // Aplicar transformaciones globales al canvas
        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.scale(escalaActual * factorContraccion, escalaActual * factorContraccion);
        ctxDots.rotate(rotacionAcumulativa);
        ctxDots.translate(-centerX, -centerY);

        // Dibujamos la espiral unificada
        for (let i = 0; i < totalBolitas; i++) {
          const progress = i / totalBolitas;
          const angle = progress * Math.PI * 10;
          const radius = progress * maxRadius;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const frequencyIndex = Math.floor(progress * bufferLength);
          const intensity = dataArray[frequencyIndex] / 255;

          // Calcular el tamaño de la bola con crecimiento dinámico
          const tamañoBase = (radius / 20) * 1.5;
          const crecimientoDinamico = intensity * 5;
          const tamañoFinal = tamañoBase + crecimientoDinamico;

          // Calcular si esta bolita debe mostrarse basado en el progreso de la animación
          const bolitaProgreso = i / totalBolitas;
          const mostrarBolita = bolitaProgreso <= progresoAnimacionEspiral;

          if (mostrarBolita) {
            ctxDots.save();

            // Dibujar la bolita de color
            ctxDots.beginPath();
            ctxDots.arc(x, y, tamañoFinal, 0, Math.PI * 2);
            ctxDots.fillStyle = getRainbowColor(progress, tiempoAudio);
            ctxDots.globalAlpha = opacidadBolitas;
            ctxDots.fill();

            // Calcular el índice del invitado para esta bolita
            const indiceInvitado = Math.floor((i / totalBolitas) * datosInvitados.length);
            
            // Calcular cuántos invitados deberían ser visibles basado en el tiempo
            const tiempoDesdeInicio = tiempoAudio - TIEMPO_INICIO_INVITADOS;
            const invitadosVisibles = Math.max(0, Math.floor(tiempoDesdeInicio / TIEMPO_MINIMO_POR_INVITADO));
            
            // Mostrar la imagen del invitado si existe y si ya debería ser visible
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

        // Restaurar el estado del canvas
        ctxDots.restore();

        // Dibujar el kamehameha en el centro (ahora por encima de todo, sin transformaciones de la espiral)
        const kamehamehaSizeBase = maxRadius * 0.75; // Aumentamos un 50% el tamaño base (de 0.5 a 0.75)
        const factorTamañoPost = tiempoAudio > TIEMPO_FIN_INVITADOS ? 
          1 + intensidadAmplificada : 1; // Factor de tamaño que crece con la intensidad después del fin de invitados
        const kamehamehaSize = kamehamehaSizeBase * (1 + intensidadAmplificada * 2) * factorContraccion * factorTamañoPost; // Ajustamos para que crezca hasta 3 veces
        const kamehamehaRotation = rotacionAcumulativa * direccionGiro;
        
        // Crear gradiente para el kamehameha
        const gradient = ctxDots.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, kamehamehaSize
        );
        
        // Colores del kamehameha con opacidad ajustada según la intensidad
        gradient.addColorStop(0, `rgba(255, 255, 255, ${(0.9 + intensidadAmplificada * 0.1) * factorContraccion})`);
        gradient.addColorStop(0.2, `rgba(0, 255, 255, ${(0.7 + intensidadAmplificada * 0.3) * factorContraccion})`);
        gradient.addColorStop(0.4, `rgba(0, 128, 255, ${(0.5 + intensidadAmplificada * 0.5) * factorContraccion})`);
        gradient.addColorStop(0.6, `rgba(0, 64, 255, ${(0.3 + intensidadAmplificada * 0.7) * factorContraccion})`);
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

        // Añadir efecto de brillo con intensidad variable
        ctxDots.globalCompositeOperation = 'lighter';
        ctxDots.beginPath();
        ctxDots.arc(centerX, centerY, kamehamehaSize * 0.5, 0, Math.PI * 2);
        ctxDots.fillStyle = `rgba(255, 255, 255, ${(0.4 + intensidadAmplificada * 0.6) * factorContraccion})`;
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

  // Función para calcular el índice del invitado basado en el tiempo
  const calcularIndiceInvitado = (currentTime, bassIntensity, intensidadAmplificada) => {
    if (currentTime < TIEMPO_INICIO_INVITADOS || currentTime > TIEMPO_FIN_INVITADOS) {
      return -1;
    }

    const tiempoDesdeInicio = currentTime - TIEMPO_INICIO_INVITADOS;
    const indiceActual = grupoActual.length > 0 ? 
      datosInvitados.findIndex(inv => inv.id === grupoActual[0].id) : -1;

    // Si estamos rebobinando o avanzando rápido
    if (Math.abs(currentTime - ultimoCambio.current) > 1) {
      const golpesEstimados = Math.floor(tiempoDesdeInicio / MIN_TIEMPO_ENTRE_CAMBIOS);
      return golpesEstimados % datosInvitados.length;
    }

    // Detectar golpe usando la intensidadAmplificada
    if (intensidadAmplificada > UMBRAL_INTENSIDAD) {
      if (currentTime - ultimoGolpe.current > MIN_TIEMPO_ENTRE_CAMBIOS) {
        ultimoGolpe.current = currentTime;
        contadorGolpes.current++;

        // Cambiar de invitado cada GOLPES_POR_CAMBIO golpes
        if (contadorGolpes.current >= GOLPES_POR_CAMBIO) {
          contadorGolpes.current = 0;
          ultimoCambio.current = currentTime;
          return (indiceActual + 1) % datosInvitados.length;
        }
      }
    }

    return indiceActual;
  };

  // Función para determinar la animación de una mesa
  const determinarAnimacion = (mesaId) => {
    if (!animacionesMesa[mesaId]) {
      const modalidad = {
        entrada: 'aparecer-derecha',
        salida: 'desvanecer-izquierda',
        posicionX: 30,
        posicionY: 0
      };

      setAnimacionesMesa(prev => ({
        ...prev,
        [mesaId]: modalidad
      }));
      return modalidad;
    }
    return animacionesMesa[mesaId];
  };

  // Añadir función para calcular posición en la espiral
  const calcularPosicionEspiral = (indice, totalInvitados) => {
    const progress = 0.5 + (indice / totalInvitados) * 0.5;
    const angle = progress * Math.PI * 10;
    const maxRadius = Math.min(window.innerWidth, window.innerHeight) * 0.4;
    const radius = progress * maxRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const tamañoBase = radius / 20;
    
    return {
      x,
      y,
      tamaño: tamañoBase,
      angulo: angle,
      radio: radius
    };
  };

  // Modificar el useEffect que maneja el timeupdate
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleTimeUpdate = () => {
      const currentTime = audioElement.currentTime;
      
      // Manejar el parón en el minuto 5:50
      if (currentTime >= TIEMPO_PARON && currentTime < TIEMPO_PARON + DURACION_PARON) {
        // Apagar todos los efectos
        gsap.to(".ecualizador-bolitas", {
          opacity: 0,
          duration: 0.5,
        });
        gsap.to(".ecualizador-barras", {
          opacity: 0,
          duration: 0.5,
        });
      } else if (currentTime >= TIEMPO_PARON + DURACION_PARON) {
        // Volver a encender los efectos
        gsap.to(".ecualizador-bolitas", {
          opacity: 1,
          duration: 0.5,
        });
        gsap.to(".ecualizador-barras", {
          opacity: 1,
          duration: 0.5,
        });
      } else {
        // Comportamiento normal antes del parón
        if (currentTime >= TIEMPO_INICIO_ESPIRAL) {
          if (currentTime < TIEMPO_INICIO_ESPIRAL + 2) {
            gsap.to(".ecualizador-bolitas", {
              opacity: 0,
              duration: 0.5,
            });
          } else {
            gsap.to(".ecualizador-bolitas", {
              opacity: 1,
              duration: 10,
            });
          }
        } else {
          gsap.to(".ecualizador-bolitas", {
            opacity: 0,
            duration: 0.5,
          });
        }

        // Ajustar opacidad de las barras
        if (currentTime >= TIEMPO_INICIO_BARRITAS) {
          gsap.to(".ecualizador-barras", {
            opacity: 1,
            duration: 0.5,
          });
        } else {
          gsap.to(".ecualizador-barras", {
            opacity: 0,
            duration: 0.5,
          });
        }
      }
      
      if (currentTime >= TIEMPO_INICIO_INVITADOS && currentTime <= TIEMPO_FIN_INVITADOS && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        // Calcular intensidad general de la música
        const intensidadMusica = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const intensidadAmplificada = Math.pow(intensidadMusica / 255, 2);
        
        // Calcular intensidad de bajos (ya no la usamos para el cambio pero la mantenemos por si acaso)
        const lowFreqs = dataArray.slice(0, Math.floor(bufferLength * 0.1));
        const bassIntensity = lowFreqs.reduce((sum, value) => sum + value, 0) / lowFreqs.length / 255;
        
        // Calcular el índice del invitado actual usando la intensidadAmplificada
        const indiceInvitado = calcularIndiceInvitado(currentTime, bassIntensity, intensidadAmplificada);
        
        if (indiceInvitado >= 0 && indiceInvitado < datosInvitados.length) {
          const invitado = datosInvitados[indiceInvitado];
          const animacion = determinarAnimacion(invitado.mesaId);
          
          setGrupoActual([{
            ...invitado,
            visible: true,
            entrando: true,
            animacionEntrada: animacion.entrada,
            animacionSalida: animacion.salida
          }]);
          
          setInvitadosFlotando(new Set([invitado.id]));
        } else {
          setGrupoActual([]);
          setInvitadosFlotando(new Set());
        }
      } else {
        setGrupoActual([]);
        setInvitadosFlotando(new Set());
      }
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [datosInvitados, analyser, grupoActual]);

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
      

      <div className="invitados">
        {grupoActual.map((invitado) => (
          <div 
            key={invitado.id} 
            className={`invitado ${invitado.visible ? "visible" : ""} ${
              invitadosFlotando.has(invitado.id) ? "flotando" : ""
            }`}
            style={{ 
              '--pos-x': animacionesMesa[invitado.mesaId]?.posicionX || 0,
              '--pos-y': animacionesMesa[invitado.mesaId]?.posicionY || 0,
              backgroundColor: !invitado.imagen ? coloresInvitados[invitado.id] : 'transparent'
            }}
          >
            {invitado.imagen && <img src={invitado.imagen} alt={invitado.nombre} />}
          </div>
        ))}
      </div>
      <audio ref={audioRef} src={opus} className="audio-player" controls />
      {/* <Prompt/> */}
    </div>
  );
};

export default Creditos;