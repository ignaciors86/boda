import { useEffect, useState } from 'react';
import './Item.scss';

const Item = ({ data, index }) => {
    // Estado para mantener la imagen actual visible
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        // Configurar un intervalo para cambiar la imagen visible cada cierto tiempo
        const interval = setInterval(() => {
            setCurrentImageIndex(prevIndex => (prevIndex + 1) % data.images.length);
        }, index === 0 ? 500 : 2500);

        return () => clearInterval(interval); // Limpiar el intervalo al desmontar
    }, [data.images.length]);

    return (
        <div 
            key={index} 
            style={{ backgroundImage: `url(${data.images[currentImageIndex]})`,}} // Usar la imagen actual como fondo
            className={`item item${(parseInt(index) + 1)} ${data?.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
         
        >
            <div className="images-container"
                style={{ backgroundImage: `url(${data.images[currentImageIndex]})` }} // Usar la imagen actual como fondo
            >
                {data.images.map((image, imgIndex) => (
                    currentImageIndex === imgIndex && <img 
                        key={imgIndex} 
                        src={image} 
                        alt={`Slide ${imgIndex}`} 
                        className={`image ${currentImageIndex === imgIndex ? 'visible' : 'hidden'}`}
                    /> 
                ))}
            </div>
            <div className="info">
                <h2>{data?.title}</h2>
                <div className="texts">
                    {data?.description}
                </div>  
            </div>
        </div>
    );
};

export default Item;
