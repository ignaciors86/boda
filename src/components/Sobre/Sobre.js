import { useEffect } from 'react';
import './Sobre.scss';
import invitacion from "./assets/images/invitacion.jpg";
const Sobre = () => {

    const handleClick = () => {
        const envelope = document.querySelector('.envelope');
        envelope.classList.toggle('open');
    };

    useEffect(() => {
        const waxSeal = document.querySelector('.wax-seal');
        waxSeal.addEventListener('click', handleClick);

        const letter = document.querySelector('.letter');
        letter.addEventListener('click', handleClick);
        
        return () => {
            waxSeal.removeEventListener('click', handleClick);
            letter.removeEventListener('click', handleClick);
        };
    }, []);
    return (
        <div className="home">
            <div className="envelope">
                <div className="envelope-flap">
                    <div className="wax-seal"></div>
                </div>
                <div className="envelope-flap-bg"></div>
                <div className="envelope-body">
                    <div className="envelope-content">
                        <div className="letter">
                            <img src={invitacion} alt="Imagen de la carta" />
                            {/* <h1>¡Bienvenido!</h1>
                            <p>Este es el contenido de la carta.</p> */}
                        </div>
                    </div>
                </div>
                <p className='nombre-invitado'>Invitados 1 y 2</p>
            </div>
        </div>
    );
}

export default Sobre; 