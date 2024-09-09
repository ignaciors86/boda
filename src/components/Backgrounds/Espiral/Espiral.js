import React, { useState } from "react";
import "./Espiral.scss"; // Asegúrate de importar el SCSS correctamente

const Espiral = () => {
  const [paused, setPaused] = useState(false);

  const toggleAnimation = () => {
    setPaused(!paused);
  };

  // Generador de estrellas SVG (simplificado y corregido)
  const generateStars = (numberOfStars) => {
    const starSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        ${Array.from({ length: numberOfStars }).map((_, i) => `
          <polygon points="12,2 15,8 22,8 17,12 19,19 12,15 5,19 7,12 2,8 9,8" fill="#c8102e" transform="translate(${i * 4}px, ${i * 4}px)" />
        `).join('')}
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(starSVG)}`;
  };

  return (
    <>
      <div className="espiral">
        {Array.from({ length: 7 }, (_, i) => (
          <i
            key={i}
            style={{ 
              backgroundImage: `url(${generateStars(i + 1)})` // Añadimos estrellas como fondo
            }}
          />
        ))}
      </div>
      <div className="button-container">
        <button onClick={toggleAnimation}>
          {paused ? "Reanudar Animación" : "Pausar Animación"}
        </button>
      </div>
      <style>
        {`
          .espiral i {
            animation-play-state: ${paused ? 'paused' : 'running'};
          }
        `}
      </style>
    </>
  );
};

export default Espiral;
