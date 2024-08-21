import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

const Horarios = () => {
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));

  useEffect(() => {
    // Definimos el timeline que controla la aparición y desaparición de los elementos
    timelineRef.current
      .to('.item1', { opacity: 1, duration: 0.5 }, 0)    // Muestra el elemento 1 al comienzo
      .to('.item2', { opacity: 1, duration: 0.5 }, 0.2)  // Muestra el elemento 2 al 20%
      .to('.item1', { opacity: 0, duration: 0.5 }, 0.4)  // Desaparece el elemento 1 al 40%
      .to('.item3', { opacity: 1, duration: 0.5 }, 0.4)  // Muestra el elemento 3 al 40%
      .to('.item2', { opacity: 0, duration: 0.5 }, 0.6)  // Desaparece el elemento 2 al 60%
      .to('.item4', { opacity: 1, duration: 0.5 }, 0.6)  // Muestra el elemento 4 al 60%
      .to('.item3', { opacity: 0, duration: 0.5 }, 0.8)  // Desaparece el elemento 3 al 80%
      .to('.item5', { opacity: 1, duration: 0.5 }, 0.8)  // Muestra el elemento 5 al 80%
      .to('.item4', { opacity: 0, duration: 0.5 }, 1)    // Desaparece el elemento 4 al 100%
      .to('.item5', { opacity: 1, duration: 0.5 }, 1);   // Mantiene visible el elemento 5 al final

    // Configuramos el Draggable para el slider
    Draggable.create(sliderRef.current, {
      type: 'x',
      bounds: progressBarRef.current,
      onDrag: function () {
        const progress = this.x / progressBarRef.current.clientWidth;
        timelineRef.current.progress(progress);
      },
    });
  }, []);

  return (
    <div style={styles.container}>
      {/* Barra de progreso con slider */}
      <div
        className="progress-bar"
        ref={progressBarRef}
        style={styles.progressBar}
      >
        <img
          src="https://picsum.photos/50"  // Imagen de ejemplo real
          alt="Bubu y Dudu sonriendo"
          ref={sliderRef}
          style={styles.slider}
        />
      </div>

      {/* Elementos que se mostrarán al avanzar */}
      <div
        className="elements"
        style={styles.elements}
      >
        <div className="item1" style={styles.item1}>
          <p>Descripción del Elemento 1</p>
          <button>Botón 1</button>
        </div>
        <div className="item2" style={styles.item2}>
          <p>Descripción del Elemento 2</p>
          <button>Botón 2</button>
        </div>
        <div className="item3" style={styles.item3}>
          <p>Descripción del Elemento 3</p>
          <button>Botón 3</button>
        </div>
        <div className="item4" style={styles.item4}>
          <p>Descripción del Elemento 4</p>
          <button>Botón 4</button>
        </div>
        <div className="item5" style={styles.item5}>
          <p>Descripción del Elemento 5</p>
          <button>Botón 5</button>
        </div>
      </div>
    </div>
  );
};

// Estilos en línea
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Centra horizontalmente
    justifyContent: 'center', // Centra verticalmente
    height: '50%',
    width: "100%",
    padding: '20px', // Añade un poco de padding para no estar pegado a los bordes
    boxSizing: 'border-box', // Asegura que padding no afecte el tamaño
  },
  progressBar: {
    position: 'relative',
    width: '87%', // Ancho de la barra de progreso ajustado
    height: '5px',
    background: '#ddd',
    margin: 'auto', // Centramos la barra de progreso
  },
  slider: {
    width: '50px',
    height: '50px',
    position: 'absolute',
    top: '-25px',
    left: '0',
    cursor: 'pointer',
  },
  elements: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%', // Alineación con la barra de progreso
    margin: '0 auto', // Centramos los elementos
    maxWidth: '1200px', // Añade un ancho máximo para la visualización
  },
  item1: {
    opacity: 1,
    width: '150px',
    textAlign: 'center',
  },
  item2: {
    opacity: 0,
    width: '150px',
    textAlign: 'center',
  },
  item3: {
    opacity: 0,
    width: '150px',
    textAlign: 'center',
  },
  item4: {
    opacity: 0,
    width: '150px',
    textAlign: 'center',
  },
  item5: {
    opacity: 0,
    width: '150px',
    textAlign: 'center',
  },
};

export default Horarios;
