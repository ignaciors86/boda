import React, { useRef, useState, useEffect } from "react";
import opus from "./opus.mp3";
import "./Creditos.scss";

const MAX_INVITADOS_POR_GRUPO = 6;
const TIEMPO_ENTRE_INVITADOS = 1000;
const DURACION_VISIBLE = MAX_INVITADOS_POR_GRUPO * TIEMPO_ENTRE_INVITADOS + 2000;
// Se mantiene NUM_BOLITAS para otras partes, pero en la espiral usaremos el total de invitados
const NUM_BOLITAS = 100; // (No se usa para la espiral)

const Creditos = () => {
  const audioRef = useRef(null);
  const canvasBarsRef = useRef(null);
  const canvasDotsRef = useRef(null);
  const containerRef = useRef(null);
  const rotationRef = useRef(0);
  const scaleRef = useRef(1); // Factor de escala para la expansión
  const [datosInvitados, setDatosInvitados] = useState([]);
  const [grupoActual, setGrupoActual] = useState([]);
  const [mesaActual, setMesaActual] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const indexInvitado = useRef(0);
  const timeoutRef = useRef(null);
  const animationRef = useRef(null);

  // Cargar datos de invitados
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
      })
      .catch((error) =>
        console.error("Error al obtener los datos de los invitados:", error)
      );
  }, []);

  // Ajustar tamaño de los canvas
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

  // Dibujar ecualizadores y espiral
  useEffect(() => {
    if (analyser && canvasBarsRef.current && canvasDotsRef.current) {
      const ctxBars = canvasBarsRef.current.getContext("2d");
      const ctxDots = canvasDotsRef.current.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const { width: barsWidth, height: barsHeight } =
          canvasBarsRef.current.getBoundingClientRect();
        const { width: dotsWidth, height: dotsHeight } =
          canvasDotsRef.current.getBoundingClientRect();

        ctxBars.clearRect(0, 0, barsWidth, barsHeight);
        ctxDots.clearRect(0, 0, dotsWidth, dotsHeight);

        // Ecualizador de barras
        const barWidth = (barsWidth / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * barsHeight;
          ctxBars.fillStyle = `rgb(${dataArray[i] * 2}, ${
            (dataArray[i] * 3) % 255
          }, ${(dataArray[i] * 5) % 255})`;
          ctxBars.fillRect(x, barsHeight - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }

        // Espiral: se dibuja una bola por cada invitado obtenido del fetch
        const centerX = dotsWidth / 2;
        const centerY = dotsHeight / 2;
        const maxRadius = Math.min(dotsWidth, dotsHeight) * 0.4;

        rotationRef.current += 0.003;
        scaleRef.current += 0.0005; // Incremento suave de la escala

        ctxDots.save();
        ctxDots.translate(centerX, centerY);
        ctxDots.scale(scaleRef.current, scaleRef.current);
        ctxDots.translate(-centerX, -centerY);

        const totalInvitados = datosInvitados.length;
        for (let i = 0; i < totalInvitados; i++) {
          const progress = i / totalInvitados;
          const angle = progress * Math.PI * 10 - rotationRef.current;
          const radius = progress * maxRadius;

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const frequencyIndex = Math.floor(progress * bufferLength);
          const intensity = dataArray[frequencyIndex] / 255;
          const opacity = Math.min(1, intensity + 0.2);

          ctxDots.fillStyle = `rgba(${dataArray[frequencyIndex] * 2}, ${
            (dataArray[frequencyIndex] * 3) % 255
          }, ${(dataArray[frequencyIndex] * 5) % 255}, ${opacity})`;
          ctxDots.beginPath();
          ctxDots.arc(x, y, radius / 20 + intensity * 5, 0, Math.PI * 2);
          ctxDots.fill();
        }
        ctxDots.restore();
      };
      draw();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyser, datosInvitados]);

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
      mostrarSiguienteGrupo();
    } else {
      audioRef.current.pause();
      clearTimeout(timeoutRef.current);
    }
  };

  const mostrarSiguienteGrupo = () => {
    if (indexInvitado.current >= datosInvitados.length) return;

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
      }, i * TIEMPO_ENTRE_INVITADOS);
    });

    timeoutRef.current = setTimeout(() => {
      setGrupoActual((prev) =>
        prev.map((invitado) => ({ ...invitado, visible: false }))
      );
      setTimeout(mostrarSiguienteGrupo, 1000);
    }, DURACION_VISIBLE);
  };

  return (
    <div ref={containerRef} className="creditos" onClick={iniciarAudio}>
      <canvas ref={canvasBarsRef} className="ecualizador-barras" />
      <canvas ref={canvasDotsRef} className="ecualizador-bolitas" />
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
