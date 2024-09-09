import "./Regalo.scss";
import bizum from "../assets/images/bizum.png";
const Regalo = () => {
    
    return (
        <div className="regalo seccion">

            <div className="link">
                <a href="ruta_del_primer_bizum">
                    <img src={bizum} alt="Imagen 1" />
                    Bizum Nacho
                </a>
                <a href="ruta_del_segundo_bizum">
                    <img src={bizum} alt="Imagen 1" />
                    Bizum Mario
                </a>    
            </div>
            

            <em>Si alguien se plantea no asistir a la boda por cuestiones económicas, por favor, que nos lo diga en confianza.</em>
            <em>Querremos que estés.</em>
        </div>
    );
}

export default Regalo;