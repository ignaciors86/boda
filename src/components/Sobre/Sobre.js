import React from 'react';
import './Sobre.scss';
import invitacion from "./assets/images/invitacion.jpg";
import Card from './Card';
import Timeline from '../Horarios/Timeline';
import { useDragContext } from './DragContext'; // Importa el contexto

const Sobre = ({ setSeccion }) => {
  const { setIsOtherDraggableActive } = useDragContext(); // Usa el contexto

const handleClick = () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('flipped');
        card.style.transform = 'none';
    });
    const envelope = document.querySelector('.envelope');
    envelope.classList.toggle('open');
};

  return (
    <div className="home">
      <div className="envelope">
        <div className="envelope-flap">
          <div className="wax-seal back" onClick={handleClick} />
        </div>
        <div className="envelope-flap-bg"></div>
        <div className="envelope-body">
          <div className="envelope-content">
            <Card seccion="invitacion" onClick={handleClick} trasera={<img src={invitacion} alt="Invitacion" />}>
              <img src={invitacion} alt="Invitacion" />
            </Card>
            <Card seccion="regalo" onClick={handleClick}>Regalo</Card>
            <Card seccion="ubicaciones" onClick={handleClick}>Lugar</Card>
            <Card seccion="asistencia" onClick={handleClick}>Asistencia</Card>                        
            <Card seccion="horarios" onClick={handleClick} trasera={<Timeline />}>Horarios</Card>                              
          </div>
        </div>
        <p className='nombre-invitado'>Invitados 1 y 2</p>
      </div>
    </div>
  );
}

export default Sobre;
