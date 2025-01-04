import { useEffect, useState } from 'react';
import './Item.scss';
import { useDragContext } from 'components/DragContext';

const Item = ({ data, index, currentIndex }) => {
    // Estado para mantener la imagen actual visible
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { activeCard } = useDragContext();

    useEffect(() => {
        // Configurar un intervalo para cambiar la imagen visible cada cierto tiempo
        // if(activeCard === "horarios"){
            const interval = setInterval(() => {
                setCurrentImageIndex(prevIndex => (prevIndex + 1) % data.images.length);
            }, index === 0 ? 500 : 2500);
    
            return () => clearInterval(interval); // Limpiar el intervalo al desmontar
        // }
    }, [data.images.length]);

    return (
        <div 
            key={index} 
            // style={{ backgroundImage: `url(${data.images[currentImageIndex]})`,}} // Usar la imagen actual como fondo
            className={`item item${(parseInt(index) + 1)} ${data?.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
            style={{display: (index === currentIndex || index === 0)  ? "flex" : "none"}}
        >
            { <div className="images-container"
                // style={{ backgroundImage: `url(${data.images[currentImageIndex]})` }} // Usar la imagen actual como fondo
            >
                {data.images.map((image, imgIndex) => (
                    <>
                        <img 
                            key={imgIndex} 
                            src={image} 
                            alt={`Slide ${imgIndex}`} 
                            className={`image ${currentImageIndex === imgIndex ? "visible" : "hidden" } replica`}
                            loading="lazy" 
                        /> 
                        <img 
                            key={imgIndex} 
                            src={image} 
                            alt={`Slide ${imgIndex}`} 
                            className={`image ${currentImageIndex === imgIndex ? "visible" : "hidden" }`}
                            loading="lazy" 
                        /> 
                    </>
                ))}
            </div> }
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
