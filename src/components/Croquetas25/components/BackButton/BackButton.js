import React from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAudio } from '../../context/AudioContext';
import Croqueta from '../Croqueta/Croqueta';
import './BackButton.scss';

const BackButton = ({ onBack }) => {
  const navigate = useNavigate();
  const { pause } = useAudio();
  const buttonRef = React.useRef(null);
  const croquetaWrapperRef = React.useRef(null);
  const animationRef = React.useRef(null);
  
  React.useEffect(() => {
    if (buttonRef.current) {
      gsap.fromTo(buttonRef.current, 
        { opacity: 0, scale: 0, rotation: -180 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)', delay: 0.3 }
      );
    }
    
    // Animación continua de rotación y flotación suave
    if (croquetaWrapperRef.current) {
      // Rotación continua muy lenta (20 segundos para una vuelta completa)
      const rotationTimeline = gsap.to(croquetaWrapperRef.current, {
        rotation: 360,
        duration: 20,
        ease: 'none',
        repeat: -1
      });
      
      // Flotación suave sin guiño (usando yoyo para que sea continuo)
      const floatTimeline = gsap.to(croquetaWrapperRef.current, {
        y: -10,
        duration: 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
      
      animationRef.current = { rotationTimeline, floatTimeline };
    }
    
    return () => {
      if (animationRef.current) {
        animationRef.current.rotationTimeline?.kill();
        animationRef.current.floatTimeline?.kill();
      }
    };
  }, []);
  
  const handleBack = () => {
    // Pausar audio
    pause();
    // Llamar callback para resetear estados
    if (onBack) {
      onBack();
    }
    // Navegar a la pantalla inicial
    navigate('/nachitos-de-nochevieja');
  };
  
  return (
    <div className="back-button" ref={buttonRef}>
      <div ref={croquetaWrapperRef} className="back-button__croqueta-wrapper">
        <Croqueta
          index={999}
          text="Volver"
          onClick={handleBack}
          rotation={0}
          className="back-button__croqueta"
        />
      </div>
    </div>
  );
};

export default BackButton;

