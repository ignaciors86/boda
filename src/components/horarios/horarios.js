import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

const Horarios = () => {
  const sliderRef = useRef(null);
  const progressBarRef = useRef(null);
  const timelineRef = useRef(gsap.timeline({ paused: true }));

  const setupDraggableAndTimeline = () => {
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;

    // Destruir Draggable anterior si existe
    Draggable.get(sliderRef.current)?.kill();

    if (isPortrait) {
      // Timeline para orientación vertical (portrait)
      timelineRef.current.clear().to('.item1', { opacity: 1, duration: 0.5 }, 0)
        .to('.item2', { opacity: 1, duration: 0.5 }, 0.2)
        .to('.item1', { opacity: 0, duration: 0.5 }, 0.4)
        .to('.item3', { opacity: 1, duration: 0.5 }, 0.4)
        .to('.item2', { opacity: 0, duration: 0.5 }, 0.6)
        .to('.item4', { opacity: 1, duration: 0.5 }, 0.6)
        .to('.item3', { opacity: 0, duration: 0.5 }, 0.8)
        .to('.item5', { opacity: 1, duration: 0.5 }, 0.8)
        .to('.item4', { opacity: 0, duration: 0.5 }, 1)
        .to('.item5', { opacity: 1, duration: 0.5 }, 1);  // Asegura que el último elemento siga visible

      // Configuramos el Draggable para orientación vertical
      Draggable.create(sliderRef.current, {
        type: 'y',
        bounds: progressBarRef.current,
        onDrag: function () {
          const progress = this.y / progressBarRef.current.clientHeight;
          timelineRef.current.progress(progress);
        },
      });
    } else {
      // Timeline para orientación horizontal (landscape)
      timelineRef.current.clear().to('.item1', { opacity: 1, duration: 0.5 }, 0)
        .to('.item2', { opacity: 1, duration: 0.5 }, 0.2)
        .to('.item1', { opacity: 0, duration: 0.5 }, 0.4)
        .to('.item3', { opacity: 1, duration: 0.5 }, 0.4)
        .to('.item2', { opacity: 0, duration: 0.5 }, 0.6)
        .to('.item4', { opacity: 1, duration: 0.5 }, 0.6)
        .to('.item3', { opacity: 0, duration: 0.5 }, 0.8)
        .to('.item5', { opacity: 1, duration: 0.5 }, 0.8)
        .to('.item4', { opacity: 0, duration: 0.5 }, 1)
        .to('.item5', { opacity: 1, duration: 0.5 }, 1);  // Asegura que el último elemento siga visible

      // Configuramos el Draggable para orientación horizontal
      Draggable.create(sliderRef.current, {
        type: 'x',
        bounds: progressBarRef.current,
        onDrag: function () {
          const progress = this.x / progressBarRef.current.clientWidth;
          timelineRef.current.progress(progress);
        },
      });
    }
  };

  useEffect(() => {
    setupDraggableAndTimeline();

    // Listener para detectar cambios en la orientación
    const handleResize = () => {
      setupDraggableAndTimeline();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      // Limpiar el evento resize al desmontar el componente
      window.removeEventListener('resize', handleResize);
      Draggable.get(sliderRef.current)?.kill(); // Destruir Draggable al desmontar
    };
  }, []);

  return (
    <div style={styles.container}>
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
      <div className="elements" style={styles.elements}>
        <div className="item1" style={styles.item}>
          <p>Descripción del Elemento 1</p>
          <button>Botón 1</button>
        </div>
        <div className="item2" style={styles.item}>
          <p>Descripción del Elemento 2</p>
          <button>Botón 2</button>
        </div>
        <div className="item3" style={styles.item}>
          <p>Descripción del Elemento 3</p>
          <button>Botón 3</button>
        </div>
        <div className="item4" style={styles.item}>
          <p>Descripción del Elemento 4</p>
          <button>Botón 4</button>
        </div>
        <div className="item5" style={styles.item}>
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
    flexDirection: 'column', // Orientación vertical por defecto
    alignItems: 'center', // Centra horizontalmente
    justifyContent: 'center', // Centra verticalmente
    height: '100vh', // Ocupa toda la altura de la pantalla
    padding: '20px',
  },
  progressBar: {
    position: 'relative',
    width: '87%', // Barra horizontal por defecto
    height: '5px',
    background: '#ddd',
    margin: 'auto',
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
    width: '100%',
    maxWidth: '1200px',
  },
  item: {
    opacity: 0,
    width: '150px',
    textAlign: 'center',
  },
};

// Ajustes dinámicos para media queries
const applyMediaQueries = () => {
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;

  if (isPortrait) {
    // Cambiar a disposición vertical para portrait
    styles.container.flexDirection = 'row';
    styles.progressBar.width = '5px';
    styles.progressBar.height = '87%';
    styles.slider.left = '-25px';
    styles.slider.top = '0';
    styles.elements.flexDirection = 'column';
    styles.elements.alignItems = 'flex-start';
    styles.elements.marginTop = '0';
    styles.elements.marginLeft = '20px';
  } else {
    // Cambiar a disposición horizontal para landscape
    styles.container.flexDirection = 'column';
    styles.progressBar.width = '87%';
    styles.progressBar.height = '5px';
    styles.slider.left = '0';
    styles.slider.top = '-25px';
    styles.elements.flexDirection = 'row';
    styles.elements.alignItems = 'center';
    styles.elements.marginTop = '20px';
    styles.elements.marginLeft = '0';
  }
};

window.addEventListener('resize', applyMediaQueries);
applyMediaQueries();

export default Horarios;
