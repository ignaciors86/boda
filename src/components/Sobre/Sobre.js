import { useEffect } from 'react';
import './Sobre.scss';
import invitacion from "./assets/images/invitacion.jpg";
import Card from './Card';
const Sobre = ({setSeccion}) => {

    const handleClick = () => {
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
                        <Card seccion="invitacion" onClick={handleClick}>
                            <img src={invitacion} alt="Invitacion" />
                        </Card>
                        <Card seccion="regalo" onClick={handleClick}>Regalo</Card>
                        <Card seccion="ubicaciones" onClick={handleClick}>Lugar</Card>
                        <Card seccion="asistencia" onClick={handleClick}>Asistencia</Card>                        
                        <Card seccion="horarios" onClick={handleClick}>Horarios</Card>                              
                    </div>
                </div>
                <p className='nombre-invitado'>Invitados 1 y 2</p>
            </div>
        </div>
    );
}

export default Sobre; 