import "./Regalo.scss";
const Regalo = () => {
    return (
        <div className="regalo seccion">

            
            <a href="ruta_del_primer_bizum">
                <img src="ruta_de_la_primera_imagen" alt="Imagen 1" />
            </a>
            <a href="ruta_del_segundo_bizum">
                <img src="ruta_de_la_segunda_imagen" alt="Imagen 2" />
            </a>

            <em>Si alguien se plantea no asistir a la boda por cuestiones económicas, por favor, que nos lo diga en confianza.</em>
            <em>Querremos que estés.</em>
        </div>
    );
}

export default Regalo;