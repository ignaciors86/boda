import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import peter from "./peter.wav";
import KITT from "components/KITT/KITT";
import Textos from "components/Textos/Textos";
import "./Creditos.scss";
import gsap from "gsap";
import GaleriaPersecucion from './GaleriaPersecucion';

const Creditos = () => {
  const audioRef = useRef(null);
  const canvasBarsRef = useRef(null);
  const canvasDotsRef = useRef(null);
  const containerRef = useRef(null);
  const [datosInvitados, setDatosInvitados] = useState([]);
  const [mesaActual, setMesaActual] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [imagenesCargadas, setImagenesCargadas] = useState([]);
  const [intensidadNormalizada, setIntensidadNormalizada] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const imagenesRef = useRef([]);
  const animationRef = useRef(null);
  const ultimoCambio = useRef(0);
  const [coloresInvitados, setColoresInvitados] = useState({});
  const [invitadoActual, setInvitadoActual] = useState(null);
  const [invitadosEnEsquinas, setInvitadosEnEsquinas] = useState([]);
  const ultimoIndiceEsquina = useRef(0);
  const ultimaMesaMostrada = useRef(null);
  const invitadosMostrados = useRef([]);
  const ultimoInvitadoMostrado = useRef(0);
  const [animacionesActivas, setAnimacionesActivas] = useState(new Map());
  const [secuenciaInicial, setSecuenciaInicial] = useState(false);
  const [kittFadeOut, setKittFadeOut] = useState(false);
  const [mostrarCreditos, setMostrarCreditos] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showReadyText, setShowReadyText] = useState(false);
  const [shouldDekayKITT, setShouldDekayKITT] = useState(true);
  const [fadeOutTodo, setFadeOutTodo] = useState(false);
  const [barrasOcultas, setBarrasOcultas] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [isPlaying, setIsPlaying] = useState(true);

  // Tiempos de la canción (ajustados a los momentos clave de Opus)
  const TIEMPO_INICIO_ESPIRAL = 4;
  const TIEMPO_CAMBIO_VELOCIDAD = 224.5;
  const TIEMPO_INICIO_INVITADOS = 47;
  const TIEMPO_FIN_INVITADOS = TIEMPO_CAMBIO_VELOCIDAD; // 4:30 minutos
  const TIEMPO_PARON = 341.5;
  const TIEMPO_INICIO_GALERIA = 230; // 3:44.5 minutos
  const TIEMPO_FIN_GALERIA = 481.5; // 5:41.5 minutos

  // Configuración de la animación base (ajustada al BPM de Opus)
  const BPM_OPUS = 128;
  const PULSO_BASE = 1;
  const DURACION_ANIMACION_BASE = (TIEMPO_FIN_INVITADOS - TIEMPO_INICIO_INVITADOS) / datosInvitados.length;

  // Tiempos entre invitados (basados en el BPM)
  const TIEMPO_ENTRE_INVITADOS_INICIAL = PULSO_BASE;

  // Umbrales de detección de ritmo
  const UMBRAL_INTENSIDAD = 0.5;
  // Función para calcular el tiempo entre invitados basado en la duración total
  const calcularTiempoEntreInvitados = (totalInvitados) => {
    const duracionTotal = TIEMPO_FIN_INVITADOS - TIEMPO_INICIO_INVITADOS;
    const tiempoBase = (duracionTotal / totalInvitados) * 1; // Reducido a 3/4 del tiempo original

    // Ajustamos el tiempo base para que coincida con los pulsos de la música
    const pulsosPorInvitado = Math.round(tiempoBase / PULSO_BASE);
    return pulsosPorInvitado * PULSO_BASE;
  };

  // Ajustes de animación para diferentes secciones de Opus
  const getAnimationParams = () => {
    return {
      duracionAnimacion: DURACION_ANIMACION_BASE,
      umbralIntensidad: UMBRAL_INTENSIDAD
    };

  };

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
      // En lugar de reintentar, marcamos como cargada pero sin imagen
      setImagenesCargadas((prev) => {
        const nuevasImagenesCargadas = [...prev];
        nuevasImagenesCargadas[index] = true;
        return nuevasImagenesCargadas;
      });
      imagenesRef.current[index] = null;
    };
  };

  const calcularPosicionEsquina = (indice) => {
    const posiciones = [
      { x: '20%', y: '24%' },
      { x: '80%', y: '22%' },
      { x: '78%', y: '78%' },
      { x: '23%', y: '78%' }
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
      if (!currentTime || !analyser || isPaused) return;

      // Control del fade out en TIEMPO_PARON
      if (currentTime >= TIEMPO_PARON && !barrasOcultas) {
        setBarrasOcultas(true);
        gsap.to([".invitado", ".invitado-nombre", ".nombre-mesa", ".gracias"], {
          opacity: 0,
          duration: .25,
          ease: "power2.inOut",
        });
      }

      // Control del fade in de las barras después de TIEMPO_PARON
      if (currentTime >= TIEMPO_PARON + .5) {
        setBarrasOcultas(false);
      }

      // Limpiar mesas e invitados si estamos fuera del rango de tiempo
      if (currentTime < TIEMPO_INICIO_INVITADOS || currentTime >= (TIEMPO_FIN_INVITADOS + DURACION_ANIMACION_BASE)) {
        setMesaActual(null);
        setInvitadosEnEsquinas([]);
        setInvitadoActual(null);
        ultimaMesaMostrada.current = null;
        ultimoIndiceEsquina.current = 0;
        ultimoInvitadoMostrado.current = -1;
        ultimoCambio.current = 0;

        // Ocultar todos los elementos visuales
        gsap.to([".invitado", ".invitado-nombre", ".nombre-mesa", ".gracias"], {
          opacity: 0,
          duration: DURACION_ANIMACION_BASE,
          delay: DURACION_ANIMACION_BASE,
          scale: 0,
          clearProps: "all"
        });
      }

      if (currentTime >= TIEMPO_INICIO_INVITADOS && currentTime < TIEMPO_FIN_INVITADOS) {
        const tiempoDesdeInicio = currentTime - TIEMPO_INICIO_INVITADOS;
        const invitadosPorMostrar = Math.floor(tiempoDesdeInicio / DURACION_ANIMACION_BASE);

        // Si hay un nuevo invitado para mostrar y ha pasado suficiente tiempo desde el último cambio
        if (invitadosPorMostrar > ultimoInvitadoMostrado.current &&
          (currentTime - ultimoCambio.current >= DURACION_ANIMACION_BASE || ultimoCambio.current === 0)) {
          let siguienteIndice = invitadosPorMostrar;

          // Verificar que no excedamos el número de invitados
          if (siguienteIndice < datosInvitados.length && !invitadosMostrados.current[siguienteIndice]) {
            const invitado = datosInvitados[siguienteIndice];
            manejarCambioInvitado(invitado);
            invitadosMostrados.current[siguienteIndice] = true;
            ultimoCambio.current = currentTime;
            ultimoInvitadoMostrado.current = siguienteIndice;

            // Si es el último invitado, comenzar el desvanecimiento secuencial
            if (siguienteIndice === datosInvitados.length) {
              const params = getAnimationParams();
              const tiempoEntreDesvanecimientos = params.duracionAnimacion; // +1 para incluir al último invitado Esperar 2 segundos antes de comenzar el desvanecimiento

              // Primero desvanecer los invitados existentes
              invitadosEnEsquinas.forEach((invitado, index) => {
                setTimeout(() => {
                  const elemento = document.querySelector(`[data-invitado-id="${invitado.id}"]`);
                  const nombre = document.querySelector(`[data-invitado-nombre-id="${invitado.id}"]`);

                  if (elemento && nombre) {
                    gsap.to([elemento, nombre], {
                      opacity: 0,
                      scale: 0.8,
                      duration: 0.5,
                      delay: DURACION_ANIMACION_BASE,
                      ease: "power2.inOut",
                      onComplete: () => {
                        setInvitadosEnEsquinas(prev => {
                          const nuevos = prev.filter(i => i.id !== invitado.id);
                          // Si no quedan invitados, limpiamos también el estado de invitado actual y la mesa
                          if (nuevos.length === 0) {
                            setInvitadoActual(null);
                            setMesaActual(null);
                            ultimaMesaMostrada.current = null;
                          }
                          return nuevos;
                        });
                      }
                    });
                  }
                }, index * tiempoEntreDesvanecimientos);
              });

              // Después desvanecer el último invitado y la mesa
              setTimeout(() => {
                const elemento = document.querySelector(`[data-invitado-id="${invitado.id}"]`);
                const nombre = document.querySelector(`[data-invitado-nombre-id="${invitado.id}"]`);
                const elementoMesa = document.querySelector('.nombre-mesa');
                const params = getAnimationParams();
                if (elemento && nombre) {
                  gsap.to([elemento, nombre, elementoMesa], {
                    opacity: 0,
                    scale: 0.8,
                    duration: params.duracionAnimacion/4,
                    ease: "power2.inOut",
                    onComplete: () => {
                      setInvitadosEnEsquinas(prev => {
                        const nuevos = prev.filter(i => i.id !== invitado.id);
                        // Si no quedan invitados, limpiamos también el estado de invitado actual y la mesa
                        if (nuevos.length === 0) {
                          setInvitadoActual(null);
                          setMesaActual(null);
                          ultimaMesaMostrada.current = null;
                        }
                        return nuevos;
                      });
                    }
                  });
                }
              }, invitadosEnEsquinas.length * tiempoEntreDesvanecimientos);

            }
          }
        }
      }
    };

    const handleSeeking = () => {
      const currentTime = audioRef.current.currentTime;

      // Limpiamos todas las animaciones activas
      gsap.killTweensOf(".invitado, .invitado-nombre, .nombre-mesa, .gracias");

      // Si estamos fuera del rango de invitados, limpiamos todo
      if (currentTime < TIEMPO_INICIO_INVITADOS || currentTime >= (TIEMPO_FIN_INVITADOS + DURACION_ANIMACION_BASE)) {
        // Limpiamos todos los estados
        invitadosMostrados.current = new Array(datosInvitados.length).fill(false);
        setInvitadosEnEsquinas([]);
        setInvitadoActual(null);
        setMesaActual(null);
        ultimaMesaMostrada.current = null;
        ultimoIndiceEsquina.current = 0;
        ultimoInvitadoMostrado.current = -1;
        ultimoCambio.current = 0;

        // Ocultamos todos los elementos visuales
        gsap.to([".invitado", ".invitado-nombre", ".nombre-mesa", ".gracias"], {
          opacity: 0,
          duration: DURACION_ANIMACION_BASE,
          scale: 0,
          clearProps: "all"
        });
        return;
      }

      // Calculamos cuántos invitados deberían estar visibles basado en el tiempo transcurrido
      const tiempoDesdeInicio = currentTime - TIEMPO_INICIO_INVITADOS;
      const invitadosPorMostrar = Math.min(
        Math.floor(tiempoDesdeInicio / DURACION_ANIMACION_BASE),
        datosInvitados.length - 1
      );

      // Reiniciamos el estado de invitados mostrados
      invitadosMostrados.current = new Array(datosInvitados.length).fill(false);

      // Calculamos qué invitados deberían estar visibles (máximo 4)
      const invitadosAMostrar = [];
      const startIndex = Math.max(0, invitadosPorMostrar - 3);

      // Mostramos los invitados que deberían estar visibles
      for (let i = startIndex; i <= invitadosPorMostrar; i++) {
        if (i < datosInvitados.length) {
          invitadosMostrados.current[i] = true;
          const posicion = calcularPosicionEsquina(i - startIndex);
          invitadosAMostrar.push({
            ...datosInvitados[i],
            posicion,
            offsetFinal: 12
          });
        }
      }

      // Actualizamos el estado
      setInvitadosEnEsquinas(invitadosAMostrar);
      ultimoIndiceEsquina.current = invitadosAMostrar.length % 4;
      ultimoInvitadoMostrado.current = invitadosPorMostrar;

      // Reiniciamos el tiempo del último cambio para que el siguiente invitado aparezca en el momento correcto
      ultimoCambio.current = currentTime - (tiempoDesdeInicio % DURACION_ANIMACION_BASE);

      // Actualizamos la mesa actual si hay invitados
      if (invitadosAMostrar.length > 0) {
        const ultimoInvitado = invitadosAMostrar[invitadosAMostrar.length - 1];
        if (ultimoInvitado.mesaId !== ultimaMesaMostrada.current) {
          setMesaActual(ultimoInvitado.mesa);
          ultimaMesaMostrada.current = ultimoInvitado.mesaId;
        }
      } else {
        setMesaActual(null);
        ultimaMesaMostrada.current = null;
      }

      // Ocultamos todos los invitados primero
      gsap.set(".invitado, .invitado-nombre", {
        opacity: 0,
        scale: 0,
        clearProps: "all"
      });

      // Aplicamos las posiciones y estilos a los invitados visibles
      invitadosAMostrar.forEach((invitado, index) => {
        const elemento = document.querySelector(`[data-invitado-id="${invitado.id}"]`);
        const nombre = document.querySelector(`[data-invitado-nombre-id="${invitado.id}"]`);
        if (elemento && nombre) {
          gsap.set([elemento, nombre], {
            opacity: 1,
            scale: 1,
            left: invitado.posicion.x,
            top: invitado.posicion.y,
            width: 'var(--ancho-invitado)',
            height: 'var(--ancho-invitado)',
            transform: `translate(calc(-50% - ${invitado.offsetFinal || 12}dvh), -50%) scale(${1 + (intensidadNormalizada * 0.1)})`,
            zIndex: 1000,
            borderRadius: '50%',
            overflow: 'hidden'
          });
        }
      });

      // Restauramos el estilo de los nombres de las mesas
      const elementoMesa = document.querySelector('.nombre-mesa');
      if (elementoMesa) {
        gsap.set(elementoMesa, {
          opacity: invitadosAMostrar.length > 0 ? 0.8 : 0
        });
      }
    };

    const handlePlay = () => {
      gsap.to(".ready, .kitt-loading", { opacity: 0, duration: 3, })
      setTimeout(() => {
        setIsPaused(false);

      }, 5000)
    };

    const handlePause = () => {
      setIsPaused(true);
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("seeking", handleSeeking);
    audioElement.addEventListener("seeked", handleSeeking);
    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("seeking", handleSeeking);
      audioElement.removeEventListener("seeked", handleSeeking);
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
    };
  }, [datosInvitados, analyser, invitadoActual, invitadosEnEsquinas, isPaused, fadeOutTodo, barrasOcultas]);

  useEffect(() => {
    fetch(
      "https://boda-strapi-production.up.railway.app/api/invitados?populate[personaje][populate]=*&populate[mesa][populate]=*"
    )
      .then((response) => response.json())
      .then((data) => {
        const invitadosData = data?.data
          .map((invitado) => ({
            id: invitado.id,
            nombre: invitado?.nombre,
            imagen: invitado?.personaje?.imagen_url || "",
            mesaId: invitado?.mesa?.id || 0,
            mesa: invitado?.mesa?.nombre || ""
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
    const todasLasImagenesCargadas = imagenesCargadas.length > 0 &&
      imagenesCargadas.every((loaded, index) => {
        if (!datosInvitados[index]?.imagen) return true;
        return loaded;
      });

    if (datosCargados && todasLasImagenesCargadas) {
      console.log('Todo cargado, listo para comenzar');
      // Añadimos la clase fast para la animación rápida
      const segments = document.querySelectorAll('.kitt-segment');
      segments.forEach(segment => segment.classList.add('fast'));

      // Después de 2 segundos, iniciamos el fade out
      setTimeout(() => {
        const kittLoading = document.querySelector('.kitt-loading');
        if (kittLoading) {
          kittLoading.classList.add('fade-out');
        }

        // Después de la transición de fade out, mostramos el texto de "ready"
        setTimeout(() => {
          setIsReady(true);
          // Pequeño delay antes de mostrar el texto
          setTimeout(() => {
            setShowReadyText(true);
          }, 100);
        }, 500);
      }, 2000);
    }
  }, [datosCargados, imagenesCargadas, datosInvitados]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasBarsRef.current && canvasDotsRef.current && mostrarCreditos) {
        const resizeCanvas = (canvas) => {
          const ctx = canvas.getContext("2d");
          const { width, height } = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);
          console.log('Canvas resized:', canvas.width, canvas.height);
        };

        requestAnimationFrame(() => {
          resizeCanvas(canvasBarsRef.current);
          resizeCanvas(canvasDotsRef.current);
        });
      }
    };

    // Ejecutar resize cuando mostrarCreditos cambia a true
    if (mostrarCreditos) {
      handleResize();
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mostrarCreditos]);

  useEffect(() => {
    if (analyser && canvasBarsRef.current && canvasDotsRef.current) {
      const ctxBars = canvasBarsRef.current.getContext("2d");
      const ctxDots = canvasDotsRef.current.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = (tiempoActual) => {
        if (!canvasBarsRef.current || !canvasDotsRef.current) return;

        animationRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        const { width: barsWidth, height: barsHeight } = canvasBarsRef.current.getBoundingClientRect();
        const { width: dotsWidth, height: dotsHeight } = canvasDotsRef.current.getBoundingClientRect();
        ctxBars.clearRect(0, 0, barsWidth, barsHeight);
        ctxDots.clearRect(0, 0, dotsWidth, dotsHeight);

        const centerX = dotsWidth / 2;
        const centerY = dotsHeight / 2;
        const maxRadius = Math.min(dotsWidth, dotsHeight) * 0.22;
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

        if (tiempoAudio >= TIEMPO_CAMBIO_VELOCIDAD) {
          animationState.current.direccionGiro = 1;
        } else {
          animationState.current.direccionGiro = -1;
        }

        const opacidadBolitas = (1 - progreso) * factorContraccion;

        const intensidadMusica = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const intensidadNormalizadaActual = intensidadMusica / 255;
        setIntensidadNormalizada(intensidadNormalizadaActual);

        const getRainbowColor = (progress, tiempo) => {
          const colorOffset = (tiempo * animationState.current.velocidadGiroActual * animationState.current.direccionGiro) % 1;
          const colorProgress = (progress + colorOffset) % 1;
          const hue = (colorProgress * 360) % 360;
          const saturation = 70 + (intensidadNormalizadaActual * 30);
          const lightness = 50 + (intensidadNormalizadaActual * 20);
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        };

        const numBars = Math.min(bufferLength, 64);
        const availableWidth = barsWidth;
        const barSpacing = 2;
        const barWidth = Math.floor((availableWidth - (barSpacing * (numBars - 1))) / numBars);

        // Calcular el ancho total de las barras
        const totalWidth = (barWidth + barSpacing) * numBars - barSpacing;
        // Calcular el punto de inicio para centrar
        const startX = (barsWidth - totalWidth) / 2;
        let x = startX;

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

        const modoKITT = tiempoAudio >= TIEMPO_PARON && !barrasOcultas;

        if (modoKITT) {
          const centerBar = Math.floor(numBars / 2);
          const baseAmplitude = 0.2;
          const maxAmplitude = 1.5;
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
            const barHeight = Math.min(scaledHeight * amplitudeFactor * barsHeight * 1, barsHeight * 1);

            const opacityThreshold = barsHeight * 0.05;
            let opacity = barHeight < opacityThreshold ? Math.max(0, barHeight / opacityThreshold) : 1;
            opacity *= opacidadBase;

            const intensityOpacity = Math.max(0.3, Math.min(0.8, intensidadNormalizadaActual));
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
            const rawHeight = dataArray[i] / 255;
            if (rawHeight > 0.05) {
              const baseAmplitude = 0.4;
              const maxAmplitude = 1;
              const normalizedHeight = rawHeight;
              const amplifiedHeight = Math.pow(normalizedHeight, 0.7);
              const finalHeight = Math.min(barsHeight * (baseAmplitude + (maxAmplitude - baseAmplitude) * amplifiedHeight), barsHeight * 1);

              const hue = (i / numBars * 360 + tiempoAudio * 30) % 360;
              const saturation = 70 + (intensidadNormalizadaActual * 30);
              const lightness = 50 + (intensidadNormalizadaActual * 20);

              const opacityBase = Math.max(0.3, Math.min(0.8, intensidadNormalizadaActual));
              const opacity = opacityBase * opacidadBase;

              ctxBars.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
              ctxBars.globalAlpha = opacity;

              const y = (barsHeight / 2) - (finalHeight / 2);
              ctxBars.fillRect(x, y, barWidth, finalHeight);
            }

            x += barWidth + barSpacing;
          }
        }
        ctxBars.globalAlpha = 1;

        const velocidadMinima = 0.0000001;
        const velocidadMaxima = 0.75;
        const velocidadGiroDeseada = velocidadMinima + (velocidadMaxima - velocidadMinima) * Math.pow(intensidadNormalizadaActual, 1.5);
        const velocidadGiroReducida = velocidadGiroDeseada * 0.35; // Reducido de 0.7 a 0.35 (la mitad)

        const suavizadoVelocidad = 0.005;
        animationState.current.velocidadGiroActual += (velocidadGiroReducida - animationState.current.velocidadGiroActual) * suavizadoVelocidad;

        const escalaMinima = 0;
        const escalaMaxima = 50.0;
        const escalaDeseada = escalaMinima + (escalaMaxima - escalaMinima) * Math.pow(intensidadNormalizadaActual, 3);

        const suavizadoEscala = 0.05;
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
          const baseRadius = progress * maxRadius;

          // Calcular el movimiento hacia el centro basado en la intensidad
          const { umbralIntensidad } = getAnimationParams(); // Umbral para considerar la música "lenta"
          const factorMovimiento = Math.max(0, umbralIntensidad - intensidadNormalizadaActual) / umbralIntensidad;
          const radius = baseRadius * (1 - factorMovimiento * 0.8); // Reducir hasta un 80% el radio

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          // Calcular el ángulo del siguiente punto
          const nextProgress = (i + 1) / totalBolitas;
          const nextAngle = nextProgress * Math.PI * 10;
          const nextBaseRadius = nextProgress * maxRadius;
          const nextRadius = nextBaseRadius * (1 - factorMovimiento * 0.8);
          const nextX = centerX + Math.cos(nextAngle) * nextRadius;
          const nextY = centerY + Math.sin(nextAngle) * nextRadius;

          // Calcular la distancia entre puntos consecutivos
          const dx = nextX - x;
          const dy = nextY - y;
          const distanciaEntrePuntos = Math.sqrt(dx * dx + dy * dy);

          // Ajustar el tamaño cuando se acercan al centro - ahora sincronizado con el movimiento
          const factorTamaño = 1 + (factorMovimiento * 0.5); // Aumentar hasta un 50% el tamaño
          const tamañoBase = distanciaEntrePuntos * 0.4 * factorTamaño;
          const crecimientoDinamico = dataArray[i] / 255 * 1.5;
          const tamañoFinal = tamañoBase + (crecimientoDinamico * tamañoBase * 0.1);

          const bolitaProgreso = i / totalBolitas;
          const mostrarBolita = bolitaProgreso <= progresoAnimacionEspiral;

          if (mostrarBolita) {
            ctxDots.save();

            const indiceInvitado = Math.floor((i / totalBolitas) * datosInvitados.length);
            const img = imagenesRef.current[indiceInvitado];
            const invitadoMostrado = indiceInvitado < datosInvitados.length && invitadosMostrados.current[indiceInvitado];

            // Calcular la opacidad del color basada en el progreso
            const opacidadColor = opacidadBolitas * (1 - progreso);
            const opacidadImagen = opacidadBolitas * progreso;

            if (invitadoMostrado && img && img.complete && img.naturalWidth !== 0) {
              ctxDots.save();
              ctxDots.translate(x, y);
              ctxDots.beginPath();
              ctxDots.arc(0, 0, tamañoFinal, 0, Math.PI * 2);
              ctxDots.clip();

              // Aplicar brillo a la imagen basada en la intensidad
              const brillo = Math.max(0, 1 - opacidadColor);
              ctxDots.filter = `brightness(${1 + brillo * 0.5})`;

              ctxDots.drawImage(
                img,
                -tamañoFinal,
                -tamañoFinal,
                tamañoFinal * 2,
                tamañoFinal * 2
              );
              ctxDots.restore();
            }

            // Dibujar el color solo si hay opacidad
            if (opacidadColor > 0) {
              ctxDots.beginPath();
              ctxDots.arc(x, y, tamañoFinal, 0, Math.PI * 2);
              ctxDots.fillStyle = getRainbowColor(progress, tiempoAudio);
              ctxDots.globalAlpha = opacidadColor;
              ctxDots.fill();
            }

            ctxDots.restore();
          }
        }

        ctxDots.restore();

        const kamehamehaSizeBase = maxRadius * 0.75;
        const factorTamañoPost = tiempoAudio > TIEMPO_PARON ?
          1 + (intensidadNormalizadaActual * 0.3) : 1;
        const kamehamehaSize = kamehamehaSizeBase * (1 + intensidadNormalizadaActual * 2) * factorContraccion * factorTamañoPost;
        const kamehamehaRotation = animationState.current.rotacionAcumulativa * animationState.current.direccionGiro;

        // Calcular la opacidad base del kamehameha basada en la intensidad de la música
        const opacidadKamehameha = Math.max(0, Math.min(1, intensidadNormalizadaActual * 2));

        const gradient = ctxDots.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, kamehamehaSize
        );

        gradient.addColorStop(0, `rgba(255, 255, 255, ${(0.9 + intensidadNormalizadaActual * 0.8) * factorContraccion * opacidadKamehameha})`);
        gradient.addColorStop(0.2, `rgba(0, 255, 255, ${(0.9 + intensidadNormalizadaActual * 0.3) * factorContraccion * opacidadKamehameha})`);
        gradient.addColorStop(0.4, `rgba(0, 128, 255, ${(.5 + intensidadNormalizadaActual * 0.9) * factorContraccion * opacidadKamehameha})`);
        gradient.addColorStop(0.6, `rgba(0, 64, 255, ${(0.1 + intensidadNormalizadaActual * 0.9) * factorContraccion * opacidadKamehameha})`);
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
        const nucleoSize = kamehamehaSize * (0.1 + (intensidadNormalizadaActual * 1.3));
        ctxDots.arc(centerX, centerY, nucleoSize, 0, Math.PI * 2);
        ctxDots.fillStyle = `rgba(255, 255, 255, ${(0.4 + intensidadNormalizadaActual * 1) * factorContraccion * opacidadKamehameha})`;
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

  useEffect(() => {
    return () => {
      // Limpiar todas las animaciones al desmontar el componente
      animacionesActivas.forEach(animacion => {
        animacion.kill();
      });
      setAnimacionesActivas(new Map());
    };
  }, []);

  const manejarCambioInvitado = (invitado) => {
    const params = getAnimationParams();

    setInvitadoActual(invitado);

    // Actualizar la mesa actual con animación
    if (invitado.mesaId !== ultimaMesaMostrada.current) {
      const mesa = invitado.mesa;
      const elementoMesa = document.querySelector('.nombre-mesa');

      if (elementoMesa) {
        const timeline = gsap.timeline();

        timeline.to(elementoMesa, {
          opacity: 0,
          scale: 0.8,
          duration: 0.3, // Reducido de 0.5 a 0.3
          ease: "power2.inOut"
        })
          .call(() => {
            setMesaActual(mesa);
            ultimaMesaMostrada.current = invitado.mesaId;
          })
          .to(elementoMesa, {
            opacity: 0.8,
            scale: 1 + (intensidadNormalizada * 0.9),
            duration: 0.3, // Reducido de 0.5 a 0.3
            ease: "power2.out"
          });
      } else {
        setMesaActual(mesa);
        ultimaMesaMostrada.current = invitado.mesaId;
      }
    }

    // Capturar la intensidad en el momento de la animación
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const intensidadMusica = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensidadNormalizadaActual = intensidadMusica / 255;

    // Calcular la separación final basada en la intensidad capturada
    const offsetBase = 15; // Aumentado de 12 a 15 para más separación
    const offsetAdicional = intensidadNormalizadaActual * 4; // Aumentado de 3 a 4 para más variación
    const offsetFinal = (offsetBase + offsetAdicional) * 0.8; // Reducido un 20% para que acaben más juntas

    setTimeout(() => {
      const elementoNuevo = document.querySelector(`[data-invitado-id="${invitado.id}"]`);
      const elementoNombre = document.querySelector(`[data-invitado-nombre-id="${invitado.id}"]`);

      if (elementoNuevo && elementoNombre) {
        const escalaInicial = 0.1;

        // Configuración inicial de los elementos - ambos exactamente en el mismo punto central
        gsap.set([elementoNombre, elementoNuevo], {
          left: '50%',
          top: '50%',
          opacity: 0,
          scale: escalaInicial,
          transform: 'translate(-50%, -50%)',
          width: 'var(--ancho-invitado)',
          height: 'var(--ancho-invitado)',
          boxSizing: 'border-box',
          zIndex: 1000 // Mismo z-index inicial para que aparezcan superpuestos
        });

        const timeline = gsap.timeline();

        // Manejar la salida del invitado más antiguo si es necesario
        if (invitadosEnEsquinas.length >= 4) {
          const invitadoSaliente = invitadosEnEsquinas[0];
          const elementoSaliente = document.querySelector(`[data-invitado-id="${invitadoSaliente.id}"]`);
          const nombreSaliente = document.querySelector(`[data-invitado-nombre-id="${invitadoSaliente.id}"]`);

          if (elementoSaliente && nombreSaliente) {
            timeline.to([elementoSaliente, nombreSaliente], {
              opacity: 0,
              scale: 0.8,
              duration: params.duracionAnimacion * .5, // Reducido de 2 a 1.5 para que sea más rápido
              ease: "power2.inOut",
              onStart: () => {
                gsap.set([elementoSaliente, nombreSaliente], {
                  zIndex: 800,
                  pointerEvents: 'none'
                });
              },
              onComplete: () => {
                setInvitadosEnEsquinas(prev => prev.slice(1));
              }
            });
          }
        }

        const nuevaPosicion = calcularPosicionEsquina(ultimoIndiceEsquina.current);
        const duracionBase = params.duracionAnimacion; // Reducido de 2 a 1.5 para que coincida con la salida

        // Fase inicial: aparecer en el centro - ahora comienza antes
        timeline.to([elementoNombre, elementoNuevo], {
          opacity: 0.3,
          scale: escalaInicial * 1.5,
          duration: duracionBase * 0.15, // Reducido de 0.2 a 0.15
          ease: "power2.in"
        }, "<"); // Comienza 0.5 segundos antes de que termine la salida

        // Fase principal: movimiento y crecimiento sincronizado
        timeline.to([elementoNombre, elementoNuevo], {
          left: nuevaPosicion.x,
          top: nuevaPosicion.y,
          duration: duracionBase * 0.6, // Reducido de 0.8 a 0.6
          ease: "power2.inOut",
          onUpdate: () => {
            const progress = timeline.progress();

            // Calcular offset - comienza en 0 y aumenta gradualmente
            const offsetActual = Math.pow(progress, 2) * offsetFinal;

            // Calcular escala usando el mismo timing que el movimiento
            const escalaProgreso = escalaInicial * 1.5 + (1 - escalaInicial * 1.5) * Math.pow(progress, 2);

            // Calcular opacidad - crece más rápido al principio
            const opacidadProgreso = Math.min(1, 0.3 + progress * 0.7);

            gsap.set(elementoNuevo, {
              zIndex: 1000,
              opacity: opacidadProgreso,
              transform: `translate(calc(-50% - ${offsetActual}dvh), -50%) scale(${escalaProgreso})`
            });
            gsap.set(elementoNombre, {
              zIndex: 1001,
              opacity: opacidadProgreso,
              transform: `translate(calc(-50% + ${offsetActual}dvh), -50%) scale(${escalaProgreso})`
            });
          },
          onComplete: () => {
            setInvitadosEnEsquinas(prev => [...prev, {
              ...invitado,
              posicion: nuevaPosicion,
              offsetFinal
            }]);
            ultimoIndiceEsquina.current = (ultimoIndiceEsquina.current + 1) % 4;
            setInvitadoActual(null);
          }
        }, "<"); // Comienza 0.3 segundos antes de que termine la fase inicial
      }
    }, 0); // Eliminamos el tiempo de espera para que la animación comience inmediatamente
  };

  const iniciarAudio = () => {
    if (!datosCargados) return;

    // Evitar múltiples llamadas en rápida sucesión
    if (audioRef.current.playPromise) {
      return;
    }

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

    try {
      if (audioRef.current.paused) {
        audioRef.current.playPromise = audioRef.current.play();
        audioRef.current.playPromise
          .then(() => {
            audioRef.current.playPromise = null;
          })
          .catch(error => {
            console.error('Error al reproducir audio:', error);
            audioRef.current.playPromise = null;
          });
      } else {
        audioRef.current.pause();
      }
    } catch (error) {
      console.error('Error al controlar el audio:', error);
      audioRef.current.playPromise = null;
    }
  };

  const handleKITTClose = () => {
    setKittFadeOut(true);
    setTimeout(() => {
      setSecuenciaInicial(false);
      setMostrarCreditos(true);
      setTimeout(() => {
        requestAnimationFrame(() => {
          iniciarAudio();
        });
      }, 100);
    }, 1000);
  };

  const handleSkipAudio = () => {
    handleKITTClose();
  };

  const handleDirectToCredits = () => {
    setSecuenciaInicial(false);
    setMostrarCreditos(true);
    setKittFadeOut(true); // Asegurar que KITT no se renderice
    setTimeout(() => {
      requestAnimationFrame(() => {
        iniciarAudio();
      });
    }, 100);
  };

  const iniciarSecuencia = () => {
    if (!isReady || secuenciaInicial || mostrarCreditos) return;
    setSecuenciaInicial(true);
  };

  useEffect(() => {
    if (secuenciaInicial) {
      gsap.to(".kitt-loading, .creditos .ready", { opacity: 0, duration: 1, ease: "linear", });
      // Esperar 5 segundos antes de reproducir el audio
      const timer = setTimeout(() => {
        setShouldDekayKITT(false);
      }, 5000);


      return () => clearTimeout(timer);
    }
  }, [secuenciaInicial]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // const cursor = document.querySelector('.cursor');
      // if (cursor) {
      //   cursor.style.left = e.clientX + 'px';
      //   cursor.style.top = e.clientY + 'px';
      // }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      const currentTime = audioElement.currentTime;
      const duration = audioElement.duration;
      if (duration) {
        const progressValue = (currentTime / duration) * 100;
        setProgress(progressValue);
        if (progressRef.current) {
          progressRef.current.style.setProperty('--progress', `${progressValue}%`);
        }
      }
      // ... rest of existing handleTimeUpdate code ...
    };

    const handlePlayPause = () => {
      if (audioElement.paused) {
        audioElement.play();
      } else {
        audioElement.pause();
      }
      setIsPlaying(!audioElement.paused);
    };

    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const updateTimeDisplay = () => {
      setCurrentTime(formatTime(audioElement.currentTime));
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("timeupdate", updateTimeDisplay);
    audioElement.addEventListener("play", () => setIsPlaying(true));
    audioElement.addEventListener("pause", () => setIsPlaying(false));

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("timeupdate", updateTimeDisplay);
      audioElement.removeEventListener("play", () => setIsPlaying(true));
      audioElement.removeEventListener("pause", () => setIsPlaying(false));
    };
  }, [audioRef.current]);

  return (
    <div
      ref={containerRef}
      className={`creditos ${!isReady ? 'loading' : (!secuenciaInicial && !mostrarCreditos ? 'ready' : '')}`}
      onClick={iniciarSecuencia}
    >
      <Textos audioRef={audioRef} analyser={analyser} />
      {!mostrarCreditos && (
        <div className={`kitt-loading ${isReady ? 'fast' : ''}`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`kitt-segment`} />
          ))}
        </div>
      )}
      {isReady && !mostrarCreditos && (
        <div className="ready">
          <div className={`ready-text ${showReadyText ? 'show' : ''}`}>
            Click para comenzar
          </div>
        </div>
      )}
      {isReady && !mostrarCreditos && !secuenciaInicial && (
        <button onClick={handleDirectToCredits} className="direct-credits-button">
          Ir directo a los créditos
        </button>
      )}
      {secuenciaInicial && !kittFadeOut && (
        <button onClick={handleSkipAudio} className="skip-button" style={{ zIndex: 1001 }}>
          Saltar Audio
        </button>
      )}
      {secuenciaInicial && !kittFadeOut && (
        <KITT
          audioFile={peter}
          onClose={handleKITTClose}
          className={`kitt-audio-only ${kittFadeOut ? 'fade-out' : ''}`}
          delayPlay={shouldDekayKITT}
        />
      )}
      {mostrarCreditos && (
        <>
          <canvas
            ref={canvasBarsRef}
            className={`ecualizador-barras ${barrasOcultas ? 'hidden' : ''}`}
          />
          <canvas ref={canvasDotsRef} className="ecualizador-bolitas" />
          <audio ref={audioRef} src={opus} className="audio-player" controls />

          {mesaActual && (
            <div
              className="nombre-mesa"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: '7dvh',
                fontFamily: 'VCR',
                fontWeight: 'bold',
                textAlign: 'center',
                padding: '2dvh',
                zIndex: 1000,
                textShadow: '0 0 10px rgba(0,0,255,0.8), 0 0 20px rgba(0,0,255,0.6), 0 0 30px rgba(0,0,255,0.4)',
                opacity: 0.8,
                pointerEvents: 'none',
                lineHeight: 1.2
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
                  width: 'var(--ancho-invitado)',
                  height: 'var(--ancho-invitado)',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  color: 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4.5dvh',
                  fontFamily: 'VCR',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  padding: '4dvh',
                  boxSizing: 'border-box',
                  zIndex: 1001,
                  transform: 'translate(-50%, -50%)',
                  opacity: 0,
                  pointerEvents: 'none',
                  lineHeight: 1.2,
                  boxShadow: `0 0 ${40 + intensidadNormalizada * 40}px rgba(0, 255, 255, 0.8), 0 0 ${80 + intensidadNormalizada * 80}px rgba(0, 128, 255, 0.6)`,
                  willChange: 'transform, box-shadow'
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
                  width: 'var(--ancho-invitado)',
                  height: 'var(--ancho-invitado)',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: !invitadoActual.imagen ? coloresInvitados[invitadoActual.id] : 'transparent',
                  boxSizing: 'border-box',
                  zIndex: 1000,
                  transform: 'translate(-50%, -50%)',
                  opacity: 0,
                  pointerEvents: 'none',
                  boxShadow: `0 0 ${40 + intensidadNormalizada * 40}px rgba(0, 255, 255, 0.8), 0 0 ${80 + intensidadNormalizada * 80}px rgba(0, 128, 255, 0.6)`,
                  willChange: 'transform, box-shadow'
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
                      borderRadius: '50%',
                      filter: `brightness(${1 + intensidadNormalizada * 0.8})`
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

          {invitadosEnEsquinas.map((invitado, index) => {
            const offsetFinal = invitado.offsetFinal || 12;

            return (
              <React.Fragment key={`container-${invitado.id}-${index}`}>
                <div
                  key={`nombre-${invitado.id}-${index}`}
                  data-invitado-nombre-id={invitado.id}
                  className="invitado-nombre"
                  style={{
                    position: 'absolute',
                    left: invitado.posicion.x,
                    top: invitado.posicion.y,
                    transform: `translate(calc(-50% + ${offsetFinal}dvh), -50%) scale(${1 + (intensidadNormalizada * 0.1)})`,
                    width: 'var(--ancho-invitado)',
                    height: 'var(--ancho-invitado)',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    color: 'black',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4.5dvh',
                    fontFamily: 'VCR',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '4dvh',
                    boxSizing: 'border-box',
                    opacity: 1,
                    zIndex: 1001,
                    pointerEvents: 'none',
                    lineHeight: 1.2,
                    boxShadow: `0 0 ${40 + intensidadNormalizada * 40}px rgba(0, 255, 255, 0.8), 0 0 ${80 + intensidadNormalizada * 80}px rgba(0, 128, 255, 0.6)`,
                    willChange: 'transform, box-shadow'
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
                    transform: `translate(calc(-50% - ${offsetFinal}dvh), -50%) scale(${1 + (intensidadNormalizada * 0.1)})`,
                    width: 'var(--ancho-invitado)',
                    height: 'var(--ancho-invitado)',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    backgroundColor: !invitado.imagen ? coloresInvitados[invitado.id] : 'transparent',
                    boxSizing: 'border-box',
                    opacity: 1,
                    zIndex: 1000,
                    pointerEvents: 'none',
                    boxShadow: `0 0 ${40 + intensidadNormalizada * 40}px rgba(0, 255, 255, 0.8), 0 0 ${80 + intensidadNormalizada * 80}px rgba(0, 128, 255, 0.6)`,
                    willChange: 'transform, box-shadow'
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
                        borderRadius: '50%',
                        filter: `brightness(${1 + intensidadNormalizada * 0.8})`
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
            );
          })}

          <div className="audio-progress-container">
            <div className="progress-wrapper">
              <input
                type="range"
                ref={progressRef}
                className="audio-progress"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => {
                  const value = e.target.value;
                  setProgress(value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = (value / 100) * audioRef.current.duration;
                  }
                }}
              />
              <div className="time-display">{currentTime}</div>
              <button
                className={`pause-button ${isPlaying ? 'playing' : ''}`}
                onClick={() => {
                  if (audioRef.current) {
                    if (audioRef.current.paused) {
                      audioRef.current.play();
                    } else {
                      audioRef.current.pause();
                    }
                  }
                }}
              />
            </div>
          </div>
          <GaleriaPersecucion 
            audioRef={audioRef}
            startTime={TIEMPO_INICIO_GALERIA}
            endTime={TIEMPO_FIN_GALERIA}
            analyser={analyser}
          />
        </>
      )}
    </div>
  );
};

export default Creditos;