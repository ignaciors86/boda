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
        enviarANacho: true,
        eventos: { preboda: false, postboda: false } // Checkboxes para eventos
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleCheckboxChange = (e) => {
        setFormData({
            ...formData,
            eventos: {
                ...formData.eventos,
                [e.target.name]: e.target.checked,
            },
        });
    };

    const handleSwitchChange = () => {
        setFormData({
            ...formData,
            enviarANacho: !formData.enviarANacho,
        });
    };

    const handleSendWhatsApp = () => {
        const { nombre, comentarios, enviarANacho, eventos } = formData;

        const numeroTelefono = enviarANacho ? "679692422" : "626767895"; 

        const eventosSeleccionados = [
            eventos.preboda && "Preboda",
            eventos.postboda && "Postboda"
        ].filter(Boolean).join(", ");

        const mensaje = `Hola, soy ${nombre}.\nConfirmo mi asistencia: ${confirmacion ? "Sí" : "No"}.\nComentarios: ${comentarios}`;

        const urlWhatsApp = `https://wa.me/34${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;

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
                            placeholder="Quién/quienes sois"
                        />
                    </div>
                    <div className="form-group">
                        
                        <div className="eventos-checkboxes">
                            <h2>También estaré en:</h2>

                            
                            <div className="checkbox-group">
                                <label>
                                    <input 
                                        type="checkbox" 
                                        name="preboda"
                                        checked={formData.eventos.preboda}
                                        onChange={handleCheckboxChange}
                                    />
                                    <p>Preboda<em>(viernes)</em></p>
                                </label>
                                
                            </div>
                            <div className="checkbox-group">

                                <label className="raro">    
                                    <input 
                                        type="checkbox" 
                                        name="postboda"
                                        checked={formData.eventos.postboda}
                                        onChange={handleCheckboxChange}
                                    />
                                    <p>Postboda<em>(domingo)</em></p>
                                </label>
                            </div>

                        </div>
                    </div>
                    <div className="form-group">
                        {/* <h2><label htmlFor="comentarios">Comentarios:</label></h2> */}
                        <textarea 
                            id="comentarios" 
                            name="comentarios" 
                            value={formData.comentarios}
                            onChange={handleChange}
                            placeholder="Si eres vegano, inviegno, alérgico o necesitas aclarar cualquier cosa, hazlo aquí."
                        />
                    </div>
                    <div className="form-group horizontal quien">
                        <div className="wrap">
                            
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
                            
                            <button 
                                type="button" 
                                className="btn-enviar" 
                                onClick={handleSendWhatsApp}
                                disabled={isButtonDisabled}
                            >
                                <h2>{isButtonDisabled ? "Relléname" : "DILOOO!!"}</h2>
                            </button>
                        </div>
                    </div>
                    
                </form>
            </div>
            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default Asistencia;
