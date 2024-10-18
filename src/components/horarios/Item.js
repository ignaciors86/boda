import { useEffect, useState } from 'react';
import './Item.scss';

const Item = ({ data, index }) => {
    // Estado para mantener la imagen de fondo actual
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        // Configurar un intervalo para cambiar la imagen cada 2 segundos
        const interval = setInterval(() => {
            setCurrentImageIndex(prevIndex => (prevIndex + 1) % data.images.length);
        }, 2000); // Cambiar cada 2 segundos

        return () => clearInterval(interval); // Limpiar el intervalo al desmontar
    }, [data.images.length]);

    return (
        <div 
            key={index} 
            className={`item item${(parseInt(index) + 1)} ${data?.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} 
            style={{ backgroundImage: `url(${data.images[currentImageIndex]})` }} // Usar la imagen actual como fondo
        >
            <div className="info">
                <h2>{data?.title}</h2>
                <div className="texts">
                    {data?.description}
                </div>  
            </div>
        </div>
    );
}

export default Item;
