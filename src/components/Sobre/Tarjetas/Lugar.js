import mapa from "./Lugar/map.webp";
import "./Lugar.scss";
const Lugar = () => {
    const url = "https://maps.app.goo.gl/whoswYpUbrrjaCkm7";
    return (
        <div className="lugar seccion">
            <p>Todos los eventos tendrán lugar en Villas de Pomar</p>
            <a className="imagen" href={url} target="_blank" rel="noopener noreferrer">
              <img src={mapa} alt="Mapa del lugar" />
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer">
                <em>(Pedrosillo el Ralo, Salamanca)</em>
            </a>
            
        </div>
    );
}

export default Lugar;