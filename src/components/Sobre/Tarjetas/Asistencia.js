import { useEffect, useState } from "react";
import "./Asistencia.scss";
import { useDragContext } from "../../DragContext";
import OsitoBox from "../../OsitoBox/OsitoBox";
import gsap from "gsap";

const Asistencia = () => {
    const { activeCard, setActiveCard, isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext();
    const [confirmacion, setConfirmacion] = useState(true);
    const [formData, setFormData] = useState({
        nombre: "",
        asistencia: "",
        comentarios: "",
        enviarANacho: true,
        eventos: { preboda: false, postboda: false, autobus: false } // Checkboxes para eventos
    });
    const [disclaimerVisible, setDisclaimerVisible] = useState(false);

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

    const handleShowDisclaimer = (state=true) => {
        setDisclaimerVisible(state);
    };

    const handleSendWhatsApp = () => {
        const { nombre, comentarios, enviarANacho, eventos } = formData;

        const numeroTelefono = enviarANacho ? "679692422" : "626767895";

        const eventosSeleccionados = [
            eventos.preboda && "Preboda",
            eventos.postboda && "Postboda",
            eventos.autobus && "Autobús"
        ].filter(Boolean).join(", ");

        const mensaje = `Hola, soy ${nombre}.\nConfirmo mi asistencia: ${confirmacion ? "Sí" : "No"}.\nEventos: ${eventosSeleccionados}\nComentarios: ${comentarios}`;

        const urlWhatsApp = `https://wa.me/34${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;

        window.open(urlWhatsApp, "_blank");
    };

    const isButtonDisabled = formData.nombre.trim() === "";

    useEffect(() => {
        gsap.timeline()
            .to(".disclaimer", {zIndex: disclaimerVisible ? 3 : -1, duration: 0, }, 0)
            .to(".disclaimer", {opacity: disclaimerVisible ? 1 : 0, duration: 1, }, ">")
    }, [disclaimerVisible]);

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
                            <div className="checkbox-group autobus">
                                <label className="raro">
                                    <input
                                        type="checkbox"
                                        name="autobus"
                                        checked={formData.eventos.autobus}
                                        onChange={handleCheckboxChange}
                                    />
                                    <p>Iremos en el bus de la boda</p>
                                </label>
                            </div>
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
                                onClick={handleShowDisclaimer}
                                disabled={isButtonDisabled}
                            >
                                <h2>{!isButtonDisabled ? "¡Listo!" : "Listo"}</h2>
                            </button>
                            <div 
                                className="disclaimer" 
                            >
                                <div className="imagen" />
                                <p>Este formulario solo compondrá un mensaje de whatsapp con la información que necesitamos.</p>
                                <p>Puedes respondernos de la forma en que prefieras, pero por favor, asegúrate de que nos llega tu respuesta.</p>
                                <p><h2>{confirmacion ? "¡Nos vemos allí!" : "¡Te echaremos de menos!"}</h2></p>
                                <button
                                    type="button"
                                    className="btn-cancelar"
                                    onClick={() => handleShowDisclaimer(false)}
                                    disabled={isButtonDisabled}
                                >
                                    <h2>Cancelar</h2>
                                </button>
                                <button
                                    type="button"
                                    className="btn-enviar"
                                    onClick={handleSendWhatsApp}
                                    disabled={isButtonDisabled}
                                >
                                    <h2>{isButtonDisabled ? "¡Enviar!" : "¡Enviar!"}</h2>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
};

export default Asistencia;