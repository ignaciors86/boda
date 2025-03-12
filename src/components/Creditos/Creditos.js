import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import "./Creditos.scss";
import gsap from "gsap";
import Prompt from "components/Prompt/Prompt";

// Tiempos de la canción
const TIEMPO_INICIO_ESPIRAL = 4;
const TIEMPO_INICIO_BARRITAS = 224.5;
const TIEMPO_INICIO_INVITADOS = 20; // volvemos al tiempo original
const DURACION_SECCION_INVITADOS = 250; // mantenemos la duración total de la sección
const TIEMPO_FIN = 400; // segundos
const TIEMPO_PARON = 341.5; // tiempo en segundos donde ocurre el parón
const DURACION_PARON = .75; // duración del parón en segundos

// Ajustes específicos para Opus
const TIEMPO_INICIO_ACELERACION = 120; // 2 minutos - cuando empieza a acelerar
const TIEMPO_MAXIMA_VELOCIDAD = 180; // 3 minutos - punto de máxima velocidad
const TIEMPO_INICIO_DESACELERACION = 280; // extendido para incluir toda la sección intensa
const DURACION_ANIMACION_INICIAL = 0.8;
const DURACION_ANIMACION_RAPIDA = 0.25; // ligeramente más rápido para momentos intensos
const TIEMPO_ENTRE_INVITADOS_INICIAL = 1.2;
const TIEMPO_ENTRE_INVITADOS_RAPIDO = 0.4; // reducido para momentos más intensos
const UMBRAL_INTENSIDAD_CAMBIO = 0.5; // más sensible a los beats
const MIN_TIEMPO_ENTRE_PICOS = 0.12; // permite cambios aún más rápidos en momentos intensos

// Configuración de invitados
const MAX_INVITADOS_POR_GRUPO = 1;
const UMBRAL_INTENSIDAD = 0.7;
const GOLPES_POR_CAMBIO = 4;
const TIEMPO_POR_INVITADO = 2;
const DURACION_TRANSICION = 1;
const DURACION_PAUSA = 3;
const PAUSA_ENTRE_GRUPOS = 1;
const TIEMPO_TRANSICION = 1;

// Ajustamos los tiempos de animación
const DURACION_ANIMACION_BASE = 1; // Duración base de la animación
const MIN_DURACION_ANIMACION = 0.5; // Duración mínima de la animación en momentos rápidos
const UMBRAL_INTENSIDAD_TIEMPO = 0.8; // Umbral de intensidad para ajustar la duración
const MIN_TIEMPO_ENTRE_INVITADOS = 1.2; // Tiempo mínimo entre invitados (ligeramente mayor que la duración de la animación)

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
  const [invitadoActual, setInvitadoActual] = useState(null);
  const [invitadosEnEsquinas, setInvitadosEnEsquinas] = useState([]);
  const ultimoIndiceEsquina = useRef(0);
  const [mostrarNombreMesa, setMostrarNombreMesa] = useState(false);
  const ultimaMesaMostrada = useRef(null);

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

  const calcularPosicionEsquina = (indice) => {
    const posiciones = [
      { x: '25%', y: '25%' },  // 0: Cuadrante superior izquierdo
      { x: '75%', y: '25%' },  // 1: Cuadrante superior derecho
      { x: '75%', y: '75%' },  // 2: Cuadrante inferior derecho
      { x: '25%', y: '75%' }   // 3: Cuadrante inferior izquierdo
    ];
    return posiciones[indice % 4];
  };

  const handleTimeUpdate = () => {
    const currentTime = audioRef.current.currentTime;
    
    if (currentTime >= TIEMPO_INICIO_INVITADOS && analyser) {
      // Si no hay invitados mostrados y estamos después del tiempo de inicio, mostrar el primero
      if (invitadosEnEsquinas.length === 0 && !invitadoActual && currentTime >= TIEMPO_INICIO_INVITADOS) {
        const primerInvitado = datosInvitados[0];
        if (primerInvitado) {
          manejarCambioInvitado(primerInvitado);
          ultimoCambio.current = currentTime;
          return;
        }
      }

      // Lógica normal para cambio de invitados
      const tiempoDesdeUltimaAnimacion = currentTime - ultimoCambio.current;
      if (tiempoDesdeUltimaAnimacion >= TIEMPO_ENTRE_INVITADOS_INICIAL && !invitadoActual) {
        let siguienteIndice = invitadosEnEsquinas.length > 0 ? 
          datosInvitados.findIndex(inv => inv.id === invitadosEnEsquinas[invitadosEnEsquinas.length - 1].id) + 1 : 0;
        
        if (siguienteIndice >= datosInvitados.length) {
          siguienteIndice = 0;
        }
        
        const invitado = datosInvitados[siguienteIndice];
        if (!invitadosEnEsquinas.some(inv => inv.id === invitado.id)) {
          manejarCambioInvitado(invitado);
          ultimoCambio.current = currentTime;
        }
      }
    } else if (currentTime < TIEMPO_INICIO_INVITADOS) {
      // Limpiar todos los invitados si estamos antes del tiempo de inicio
      setInvitadosEnEsquinas([]);
      setInvitadoActual(null);
      ultimoIndiceEsquina.current = 0;
    }
  };

  const manejarCambioInvitado = (invitado) => {
    setInvitadoActual(invitado);

    setTimeout(() => {
      const elementoNuevo = document.querySelector(`[data-invitado-id="${invitado.id}"]`);
      const elementoNombre = document.querySelector(`[data-invitado-nombre-id="${invitado.id}"]`);
      
      if (elementoNuevo && elementoNombre) {
        // Configuración inicial del nuevo invitado
        gsap.set([elementoNombre, elementoNuevo], {
          left: '50%',
          top: '50%',
          opacity: 0,
          scale: 0.5,
          transform: 'translate(-50%, -50%)',
          width: '40dvh',
          height: '40dvh',
          boxSizing: 'border-box'
        });

        // Timeline para el nuevo invitado
        const timeline = gsap.timeline();

        // Si hay que desvanecer un invitado existente
        if (invitadosEnEsquinas.length >= 4) {
          const invitadoSaliente = invitadosEnEsquinas[0];
          const elementoSaliente = document.querySelector(`[data-invitado-id="${invitadoSaliente.id}"]`);
          const nombreSaliente = document.querySelector(`[data-invitado-nombre-id="${invitadoSaliente.id}"]`);

          if (elementoSaliente && nombreSaliente) {
            // Animar el desvanecimiento
            timeline.to([elementoSaliente, nombreSaliente], {
              opacity: 0,
              scale: 0.8,
              duration: 1.5,
              ease: "power2.inOut",
              onStart: () => {
                gsap.set([elementoSaliente, nombreSaliente], {
                  zIndex: 800,
                  pointerEvents: 'none'
                });
              }
            })
            .call(() => {
              // Actualizar el estado después de que la animación de desvanecimiento termine
              setInvitadosEnEsquinas(prev => {
                const nuevosInvitados = prev.slice(1);
                // Eliminar los elementos del DOM después de actualizar el estado
                requestAnimationFrame(() => {
                  try {
                    if (elementoSaliente.parentNode) {
                      elementoSaliente.parentNode.removeChild(elementoSaliente);
                    }
                    if (nombreSaliente.parentNode) {
                      nombreSaliente.parentNode.removeChild(nombreSaliente);
                    }
                  } catch (error) {
                    console.log("Elementos ya eliminados");
                  }
                });
                return nuevosInvitados;
              });
            });
          } else {
            // Si no encontramos los elementos, solo actualizamos el estado
            setInvitadosEnEsquinas(prev => prev.slice(1));
          }
        }

        // Calcular la nueva posición
        const nuevaPosicion = calcularPosicionEsquina(ultimoIndiceEsquina.current);

        // Animar la entrada del nuevo invitado
        timeline.to([elementoNombre, elementoNuevo], {
          left: nuevaPosicion.x,
          top: nuevaPosicion.y,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "power2.out"
        }, invitadosEnEsquinas.length >= 4 ? 1.5 : 0)
        .to([elementoNuevo, elementoNombre], {
          transform: (index) => {
            const offsetX = index === 0 ? -15 : 15;
            return `translate(calc(-50% + ${offsetX}dvh), -50%)`;
          },
          duration: 0.4,
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
      }
    }, 100);
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
        const numBars = Math.min(bufferLength, 64); // Máximo 64 barras
        const availableWidth = barsWidth;
        const barSpacing = 2;
        const barWidth = Math.floor((availableWidth - (barSpacing * (numBars - 1))) / numBars);
        let x = 0;

        // Calcular la opacidad base de las barras
        let opacidadBase = 0;
        if (tiempoAudio < TIEMPO_INICIO_INVITADOS) {
          opacidadBase = 0;
        } else if (tiempoAudio < TIEMPO_INICIO_INVITADOS + 2) {
          // FadeIn durante 2 segundos
          opacidadBase = (tiempoAudio - TIEMPO_INICIO_INVITADOS) / 2;
        } else {
          opacidadBase = 1;
        }

        // Colores del orgullo oso
        const bearColors = [
          '#4E2700',  // marrón oscuro
          '#D86C00',  // naranja más vibrante
          '#FFD52F',  // amarillo dorado
          '#FFFFFF',  // blanco puro
          '#666666',  // gris medio
          '#000000'   // negro puro
        ];

        // Determinar si estamos en modo KITT (después del apagón)
        const modoKITT = tiempoAudio >= TIEMPO_PARON;

        if (modoKITT) {
          const centerBar = Math.floor(numBars / 2);
          const baseAmplitude = 0.4;  // Amplitud base
          const maxAmplitude = 4.0;   // Amplitud máxima
          const barsPerColorAdjusted = Math.ceil(numBars / bearColors.length);

          for (let i = 0; i < numBars; i++) {
            // Cálculo de altura no lineal
            const rawHeight = Math.pow(dataArray[i] / 255, 0.7);
            let scaledHeight;
            if (rawHeight < 0.3) {
              scaledHeight = rawHeight * baseAmplitude;
            } else {
              const excess = rawHeight - 0.3;
              scaledHeight = (baseAmplitude * 0.3) + (excess * maxAmplitude);
            }

            // Factor de amplitud basado en la distancia al centro (efecto KITT)
            const distanceFromCenter = Math.abs(i - centerBar);
            const amplitudeFactor = Math.pow(1 - (distanceFromCenter / centerBar), 0.8);
            const barHeight = scaledHeight * amplitudeFactor * barsHeight;

            // Opacidad basada en la altura y la intensidad del audio
            const opacityThreshold = barsHeight * 0.05;
            let opacity = barHeight < opacityThreshold ? Math.max(0, barHeight / opacityThreshold) : 1;
            opacity *= opacidadBase;
            
            // Añadir variación de opacidad basada en la intensidad del audio
            const intensityOpacity = Math.max(0.3, Math.min(0.8, intensidadAmplificada));
            opacity *= intensityOpacity;

            // Asignar colores
            const colorIndex = Math.floor(i / barsPerColorAdjusted);
            const color = bearColors[Math.min(colorIndex, bearColors.length - 1)];
            
            ctxBars.fillStyle = color;
            ctxBars.globalAlpha = opacity;
            
            const y = (barsHeight / 2) - (barHeight / 2);
            ctxBars.fillRect(x, y, barWidth, barHeight);
            
            x += barWidth + barSpacing;
          }
        } else {
          // Modo normal (arcoíris)
          for (let i = 0; i < numBars; i++) {
            const barHeight = (dataArray[i] / 255) * barsHeight;
            const progress = i / numBars;
            
            // Aplicar amplificación no lineal más suave
            const baseAmplitude = 0.4;
            const maxAmplitude = 1.5;
            const normalizedHeight = barHeight / barsHeight;
            const amplifiedHeight = Math.pow(normalizedHeight, 0.7);
            const finalHeight = barsHeight * (baseAmplitude + (maxAmplitude - baseAmplitude) * amplifiedHeight);
            
            // Obtener color del arcoíris
            const hue = (progress * 360 + tiempoAudio * 30) % 360;
            const saturation = 70 + (intensidadAmplificada * 30);
            const lightness = 50 + (intensidadAmplificada * 20);
            
            // Calcular opacidad basada en la intensidad del audio
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
          const tamañoBase = Math.min((radius / 20) * 1.5, maxRadius * 0.05); // Limitamos el tamaño máximo de las bolitas
          const crecimientoDinamico = intensity * 3; // Reducimos el crecimiento dinámico
          const tamañoFinal = Math.min(tamañoBase + crecimientoDinamico, maxRadius * 0.08); // Limitamos el tamaño final

          // Calcular si esta bolita debe mostrarse basado en el progreso de la animación
          const bolitaProgreso = i / totalBolitas;
          const mostrarBolita = bolitaProgreso <= progresoAnimacionEspiral;

          if (mostrarBolita) {
            ctxDots.save();

            // Dibujar la bolita de color con tamaño limitado
            ctxDots.beginPath();
            ctxDots.arc(x, y, tamañoFinal, 0, Math.PI * 2);
            ctxDots.fillStyle = getRainbowColor(progress, tiempoAudio);
            ctxDots.globalAlpha = opacidadBolitas;
            ctxDots.fill();

            // Calcular el índice del invitado para esta bolita
            const indiceInvitado = Math.floor((i / totalBolitas) * datosInvitados.length);
            
            // Calcular cuántos invitados deberían ser visibles basado en el tiempo
            const tiempoDesdeInicio = tiempoAudio - TIEMPO_INICIO_INVITADOS;
            const invitadosVisibles = Math.max(0, Math.floor(tiempoDesdeInicio / TIEMPO_ENTRE_INVITADOS_INICIAL));
            
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
        const factorTamañoPost = tiempoAudio > TIEMPO_PARON ? 
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
    const handleSeeking = () => {
      const currentTime = audioElement.currentTime;
      
      // Limpiar el estado actual
      setInvitadoActual(null);
      setInvitadosEnEsquinas([]);
      ultimoIndiceEsquina.current = 0;

      // Si el tiempo actual es menor que TIEMPO_INICIO_INVITADOS, no mostrar invitados
      if (currentTime < TIEMPO_INICIO_INVITADOS) {
        return;
      }

      // Calcular cuántos invitados deberían haberse mostrado hasta este punto
      const tiempoDesdeInicio = currentTime - TIEMPO_INICIO_INVITADOS;
      const invitadosPorMostrar = Math.floor(tiempoDesdeInicio / TIEMPO_ENTRE_INVITADOS_INICIAL);
      
      // Calcular el índice del último invitado que debería estar visible
      const indiceUltimoInvitado = invitadosPorMostrar % datosInvitados.length;
      
      // Calcular los últimos 4 invitados que deberían estar visibles
      const invitadosAMostrar = [];
      for (let i = 0; i < 4; i++) {
        const indice = (indiceUltimoInvitado - i + datosInvitados.length) % datosInvitados.length;
        if (indice >= 0 && indice < datosInvitados.length) {
          invitadosAMostrar.unshift(datosInvitados[indice]);
        }
      }

      // Mostrar los invitados en sus posiciones
      invitadosAMostrar.forEach((invitado, index) => {
        const posicion = calcularPosicionEsquina(index);
        setInvitadosEnEsquinas(prev => [...prev, {
          ...invitado,
          posicion
        }]);
      });

      // Actualizar los índices de control
      ultimoIndiceEsquina.current = invitadosAMostrar.length % 4;
      ultimoCambio.current = currentTime;
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("seeking", handleSeeking);
    audioElement.addEventListener("seeked", handleSeeking); // Añadimos también el evento seeked
    
    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("seeking", handleSeeking);
      audioElement.removeEventListener("seeked", handleSeeking);
    };
  }, [datosInvitados, analyser, invitadoActual, invitadosEnEsquinas]);

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
      
      {/* Nombre de la mesa */}
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

      {/* Invitado actual en el centro */}
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

      {/* Invitados en las esquinas */}
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
      {/* <Prompt/> */}
    </div>
  );
};

export default Creditos;