import { useEffect } from 'react';
import './Sobre.scss';
const Sobre = () => {

    const handleClick = () => {
        const envelope = document.querySelector('.envelope');
        envelope.classList.toggle('open');
    };

    useEffect(() => {
        const waxSeal = document.querySelector('.wax-seal');
        waxSeal.addEventListener('click', handleClick);

        return () => {
            waxSeal.removeEventListener('click', handleClick);
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
                            <h1>¡Bienvenido!</h1>
                            <p>Este es el contenido de la carta.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sobre; 