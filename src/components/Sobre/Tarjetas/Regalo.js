import "./Regalo.scss";
import regalo from "../assets/images/Gift_box_present-512.webp";
import { useDragContext } from "components/DragContext";
const Regalo = () => {
    const { activeCard, setActiveCard, isOtherDraggableActive, setIsOtherDraggableActive } = useDragContext();
    return (<>
        <div className="regalo seccion">

            <div className="link">
                <img src={regalo} alt="Imagen 1" />
            </div>
            

            <em>Si alguien se plantea no asistir a la boda por cuestiones económicas, por favor, que nos lo diga en confianza.</em>
            <em>Querremos que estés.</em>
            
        </div>
        <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
}

export default Regalo;