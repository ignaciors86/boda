import React, { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import opus from "./opus.mp3";
import "./Creditos.scss";

const NUM_MAX_ELEMENTOS = 10;

const Creditos = () => {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const [invitados, setInvitados] = useState([]);
  const [datosInvitados, setDatosInvitados] = useState([]);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [numBurbujas, setNumBurbujas] = useState(20);
  const burbujasRef = useRef([]);
  const indexInvitado = useRef(0);

  useEffect(() => {
    fetch("https://boda-strapi-production.up.railway.app/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*")
      .then((response) => response.json())
      .then((data) => {
        const invitadosData = data.data
          .map((invitado) => ({
            id: invitado.id,
            nombre: invitado?.nombre,
            imagen: invitado?.personaje ? `https://boda-strapi-production.up.railway.app${invitado?.personaje?.imagen?.url}` : "",
            mesaId: invitado?.mesa?.id || 0,
          }))
          .sort((a, b) => a.mesaId - b.mesaId);

        setDatosInvitados(invitadosData);
        setDatosCargados(true);
        setNumBurbujas(invitadosData.length);
      })
      .catch((error) => console.error("Error al obtener los datos de los invitados:", error));
  }, []);

  useEffect(() => {
    if (audioContext && analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAnimation = () => {
        analyser.getByteFrequencyData(dataArray);
        const avgFreq = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const intensity = Math.min(avgFreq * 2, 255);

        gsap.to(containerRef.current, {
          backgroundColor: `rgb(${intensity * 0.3}, ${intensity * 0.6}, ${intensity})`,
          duration: 0.5,
        });

        burbujasRef.current.forEach((burbuja, index) => {
          if (burbuja) {
            const scale = (dataArray[index % bufferLength] / 255) * 2;
            gsap.to(burbuja, { scale: Math.max(0.5, scale), duration: 0.3 });
          }
        });
        requestAnimationFrame(updateAnimation);
      };

      updateAnimation();
    }
  }, [audioContext, analyser]);

  const agregarInvitado = () => {
    if (invitados.length >= NUM_MAX_ELEMENTOS || datosInvitados.length === 0 || indexInvitado.current >= datosInvitados.length) return;

    const invitado = datosInvitados[indexInvitado.current];
    indexInvitado.current += 1;

    const nuevoInvitado = {
      id: invitado.id,
      nombre: invitado.nombre,
      imagen: invitado.imagen,
      x: Math.random() * 80 + 10 + "vw",
      y: Math.random() * 80 + 10 + "vh",
    };

    setInvitados((prev) => [...prev, nuevoInvitado]);

    requestAnimationFrame(() => {
      gsap.fromTo(
        `#invitado-${nuevoInvitado.id}`,
        { opacity: 0, scale: 0.5, y: 50 },
        { opacity: 1, scale: 1, y: 0, duration: 1, ease: "power2.out" }
      );
    });

    setTimeout(() => {
      gsap.to(`#invitado-${nuevoInvitado.id}`, {
        opacity: 0,
        scale: 0.5,
        duration: 1,
        onComplete: () => {
          setInvitados((prev) => prev.filter((i) => i.id !== nuevoInvitado.id));
        },
      });
    }, 5000);
  };

  const handleClick = () => {
    if (!datosCargados) return;

    if (!audioContext) {
      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
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

    setInterval(agregarInvitado, 2000);
  };

  return (
    <div ref={containerRef} className="creditos" onClick={handleClick}>
      {/* Ecualizador */}
      <div className="ecualizador">
        {Array.from({ length: numBurbujas }).map((_, i) => (
          <div key={i} ref={(el) => (burbujasRef.current[i] = el)} className="burbuja" />
        ))}
      </div>

      {/* Invitados */}
      <div className="invitados">
        {invitados.map((invitado) => (
          <div key={invitado.id} id={`invitado-${invitado.id}`} className="invitado" style={{ left: invitado.x, top: invitado.y }}>
            <img src={invitado.imagen} alt={invitado.nombre} />
          </div>
        ))}
      </div>

      {/* Audio */}
      <audio ref={audioRef} src={opus} controls className="audio-player" />
    </div>
  );
};

export default Creditos;
