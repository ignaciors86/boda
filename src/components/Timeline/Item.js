import { useEffect, useState } from 'react';
import './Item.scss';
import { useDragContext } from 'components/DragContext';

const Item = ({ data, index, currentIndex, weedding }) => {
    // Estado para mantener la imagen actual visible
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { activeCard } = useDragContext();

    const imagenes = weedding && data.imagesWeedding ? data.imagesWeedding : data.images;

    useEffect(() => {
        // Configurar un intervalo para cambiar la imagen visible cada cierto tiempo
        // if(activeCard === "horarios"){
            const interval = setInterval(() => {
                setCurrentImageIndex(prevIndex => (prevIndex + 1) % imagenes.length);
            }, index === 0 ? 500 : 1500);
    
            return () => clearInterval(interval); // Limpiar el intervalo al desmontar
        // }
    }, [imagenes.length]);

    return (
        <div 
            key={index} 
            // style={{ backgroundImage: `url(${imagenes[currentImageIndex]})`,}} // Usar la imagen actual como fondo
            className={`item item${(parseInt(index) + 1)} ${data?.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
            style={{display: (index === currentIndex)  ? "flex" : "none"}}
        >
            { <div className="images-container elementsToHide"
                // style={{ backgroundImage: `url(${imagenes[currentImageIndex]})` }} // Usar la imagen actual como fondo
            >
                {imagenes.map((image, imgIndex) => (
                    (imgIndex === currentImageIndex || imgIndex === (currentImageIndex+1) || imgIndex === 0) && <>
                    
                        <img 
                            key={"item-image-"+imgIndex} 
                            src={image} 
                            alt={`Slide ${imgIndex}`} 
                            className={`image ${currentImageIndex === imgIndex ? "visible" : "hidden" } replica`}
                            loading="lazy" 
                        /> 
                        <img 
                            key={"item-image-"+imgIndex+"-replica"} 
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
                <div className="texts elementsToHide">
                    {weedding && data?.descriptionWeedding ? data?.descriptionWeedding : data?.description}
                </div>  
            </div>
        </div>
    );
};

export default Item;
