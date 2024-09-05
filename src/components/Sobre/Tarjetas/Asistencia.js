import { useState } from "react";
import "./Asistencia.scss";
import { useDragContext } from "../../DragContext";
import OsitoBox from "../../OsitoBox/OsitoBox";

const Asistencia = () => {
    const { activeCard, setActiveCard } = useDragContext();
    const [confirmacion, setConfirmacion] = useState(true);
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
        const mensaje = `Hola, soy ${nombre}.\nConfirmo mi asistencia: ${confirmacion ? "Sí" : "No"}.\nComentarios: ${comentarios}`;

        // Construir la URL de WhatsApp
        const urlWhatsApp = `https://wa.me/34${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;

        // Abrir WhatsApp
        window.open(urlWhatsApp, "_blank");
    };

    const isButtonDisabled = formData.nombre.trim() === "";

    return (
        <>
            <div className="asistencia seccion">
                <form>
                    <div className="form-group">
                        <OsitoBox                         
                            confirmacion={confirmacion}
                            setConfirmacion={setConfirmacion}
                        />
                    </div>
                    <div className="form-group">
                        <input 
                            type="text" 
                            id="nombre" 
                            name="nombre" 
                            value={formData.nombre}
                            onChange={handleChange}
                            required 
                            placeholder="Nombre (y mote, si procede)"
                        />
                    </div>
                    <div className="form-group">
                        <h2><label htmlFor="comentarios">Comentarios:</label></h2>
                        <textarea 
                            id="comentarios" 
                            name="comentarios" 
                            value={formData.comentarios}
                            onChange={handleChange}
                            placeholder="Si eres vegano, inviegno, alérgico o necesitas aclarar cualquier cosa, hazlo aquí."
                        />
                    </div>
                    <div className="form-group horizontal quien">
                        <label><h4>Enviar a:</h4></label>
                        <div className="switch">
                            <label>
                                <em>Mario</em>
                                <input 
                                    type="checkbox" 
                                    checked={formData.enviarANacho}
                                    onChange={handleSwitchChange}
                                />
                                <span className="slider"></span>
                                <em>Nacho</em>
                            </label>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className="btn-enviar" 
                        onClick={handleSendWhatsApp}
                        disabled={isButtonDisabled}
                    >
                        <h2>{isButtonDisabled ? "Relléname" : "DILOOO!!"}</h2>
                    </button>
                </form>
            </div>
            <button className="back" onClick={() => setActiveCard("home")} />
        </>
    );
};

export default Asistencia;
