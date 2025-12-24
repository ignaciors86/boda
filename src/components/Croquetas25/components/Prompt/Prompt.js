import React, { useEffect } from 'react';
import './Prompt.scss';
import Typewriter from 'typewriter-effect';
import { gsap } from 'gsap';

const Prompt = ({ textos = [] }) => {
  useEffect(() => {
    gsap.set('.croquetas25-prompt', { opacity: 1, duration: 1 });
  }, []);

  if (!textos || textos.length === 0) {
    return null;
  }

  return (
    <div className="croquetas25-prompt">
      <div className="croquetas25-prompt__placeholder">
        <Typewriter
          onInit={(typewriter) => {
            textos.forEach((texto, index) => {
              typewriter
                .typeString(texto)
                .pauseFor(1500)
                .callFunction(() => {
                  if (index < textos.length - 1) {
                    const container = document.querySelector('.croquetas25-prompt .Typewriter__wrapper');
                    if (container) {
                      container.textContent = ''; // Borra el texto inmediatamente
                    }
                  }
                });
            });
            typewriter.start();
          }}
          options={{
            autoStart: true,
            loop: false,
            delay: 25, // Velocidad de escritura
          }}
        />
      </div>
    </div>
  );
};

export default Prompt;

