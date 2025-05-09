import React, { useState, useEffect } from "react";
import "./Espiral.scss";
import Prompt from "../../Prompt/Prompt";
import gsap from "gsap";

const Espiral = ({ weedding, option2, isOpen, uri }) => {
  const [paused, setPaused] = useState(false);

  const toggleAnimation = () => {
    setPaused(!paused);
  };

  const generateStarSVG = () => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <polygon points="12,2 15,8 22,8 17,12 19,19 12,15 5,19 7,12 2,8 9,8" fill="#c8102e" />
    </svg>
  `;

  const generateStars = (numberOfStars) => {
    return Array.from({ length: numberOfStars }).map(() => `
      <div class="star">
        ${generateStarSVG()}
      </div>
    `).join('');
  };

  return (
    <>
      <div className={`espiral ${paused ? "paused" : ""}`}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={`bola bola-${i}`}>
            <div
              className="star-container"
              dangerouslySetInnerHTML={{ __html: generateStars(i + 1) }} // Añadimos estrellas como contenido HTML
            />
          </div>
        ))}
      </div>

      <Prompt weedding={weedding} option2={option2} isOpen={isOpen} uri={uri}/>

      {/* <div className="button-container">
        <button onClick={toggleAnimation}>
          {paused ? "Reanudar Animación" : "Pausar Animación"}
        </button>
      </div> */}
    </>
  );
};

export default Espiral;
