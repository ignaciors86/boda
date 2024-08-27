import { useEffect } from 'react';
import './Sobre.scss';
import invitacion from "./assets/images/invitacion.jpg";
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
                        <div className="letter invitacion" onClick={handleClick}>
                            <img src={invitacion} alt="Imagen de la carta" />
                        </div>
                        <div className="letter regalo" onClick={() => setSeccion("regalo")}>
                            Regalo
                        </div>
                        <div className="letter ubicaciones" onClick={() => setSeccion("ubicaciones")}>
                            Ubicaciones
                        </div>
                        <div className="letter asistencia" onClick={() => setSeccion("asistencia")}>
                            {/* <img src={invitacion} alt="Imagen de la carta" /> */}
                            Confirma tu asistencia
                        </div>
                        <div className="letter horarios" onClick={() => setSeccion("horarios")}>
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