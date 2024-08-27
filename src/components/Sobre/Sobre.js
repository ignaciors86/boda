import { useEffect } from 'react';
import './Sobre.scss';
import invitacion from "./assets/images/invitacion.jpg";
const Sobre = () => {

    const handleClick = () => {
        const envelope = document.querySelector('.envelope');
        envelope.classList.toggle('open');
    };

    useEffect(() => {
        const horarios = document.querySelector('.horarios');
        horarios.addEventListener('click', handleClick);
        
        return () => {
            horarios.removeEventListener('click', handleClick);
        };
    }, []);
    return (
        <div className="home">
            <div className="envelope">
                <div className="envelope-flap">
                    <div className="wax-seal" onClick={handleClick}></div>
                </div>
                <div className="envelope-flap-bg"></div>
                <div className="envelope-body">
                    <div className="envelope-content">
                        <div className="letter invitacion" onClick={handleClick}>
                            <img src={invitacion} alt="Imagen de la carta" />
                        </div>
                        <div className="letter regalo">
                            Regalo
                        </div>
                        <div className="letter ubicaciones">
                            Ubicaciones
                        </div>
                        <div className="letter asistencia">
                            {/* <img src={invitacion} alt="Imagen de la carta" /> */}
                            Confirma tu asistencia
                        </div>
                        <div className="letter horarios">
                            Horarios
                        </div>
                        
                    </div>
                </div>
                <p className='nombre-invitado'>Invitados 1 y 2</p>
            </div>
        </div>
    );
}

export default Sobre; 