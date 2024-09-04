import { useState } from "react";
import "./Asistencia.scss";
import { useDragContext } from "../../DragContext";
import OsitoBox from "../../OsitoBox/OsitoBox";

const Asistencia = () => {

    const { activeCard, setActiveCard } = useDragContext();

    const [formData, setFormData] = useState({
        nombre: "",
        asistencia: "",
        comentarios: "",
        enviarANacho: true, // Nuevo estado para el switch
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSwitchChange = () => {
        setFormData({
            ...formData,
            enviarANacho: !formData.enviarANacho, // Cambia el valor del switch
        });
    };

    const handleSendWhatsApp = () => {
        const { nombre, asistencia, comentarios, enviarANacho } = formData;

        // Definir el número según el switch
        const numeroTelefono = enviarANacho ? "679692422" : "626767895"; // Nacho o Mario

        // Crear el mensaje con saltos de línea
        const mensaje = `Hola, soy ${nombre}.\nConfirmo mi asistencia: ${asistencia}.\nComentarios: ${comentarios}`;

        // Construir la URL de WhatsApp
        const urlWhatsApp = `https://wa.me/34${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;

        // Abrir WhatsApp
        window.open(urlWhatsApp, "_blank");
    };

    return (<>
        <div className="asistencia seccion">
            <p>Confirma tu asistencia</p>
            <OsitoBox />
            {/* <form>
                <div className="form-group">
                    <label htmlFor="nombre">Nombre:</label>
                    <input 
                        type="text" 
                        id="nombre" 
                        name="nombre" 
                        value={formData.nombre}
                        onChange={handleChange}
                        required 
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="asistencia">¿Asistirás?:</label>
                    <select 
                        id="asistencia" 
                        name="asistencia" 
                        value={formData.asistencia}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Selecciona una opción</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="comentarios">Comentarios:</label>
                    <textarea 
                        id="comentarios" 
                        name="comentarios" 
                        value={formData.comentarios}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label>Enviar a:</label>
               
                    <div className="switch">
                        <label>
                            Mario
                            <input 
                                type="checkbox" 
                                checked={formData.enviarANacho}
                                onChange={handleSwitchChange}
                            />
                            <span className="slider"></span>
                            Nacho
                        </label>
                    </div>
                </div>
                <button 
                    type="button" 
                    className="btn-enviar" 
                    onClick={handleSendWhatsApp}
                >
                    <em>Confirmar y Enviar por WhatsApp</em>
                </button>
            </form> */}
        </div>
        <button className="back" onClick={() => setActiveCard("home")} />
    </>);
};

export default Asistencia;
