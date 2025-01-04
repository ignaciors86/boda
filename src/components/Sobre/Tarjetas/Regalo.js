import "./Regalo.scss";
import regalo from "../assets/images/Gift_box_present-512.webp";
import { useDragContext } from "components/DragContext";
import AccountInput from "./Regalo/AccountInput";
const Regalo = () => {
    const { setActiveCard } = useDragContext();
    return (<>
        <div className="regalo seccion">
            <img src={regalo} alt="Imagen 1" />

            <em>Agradeceremos vuestra ayuda y cada penique recibido aliviará la hostia de la boda. Vamos a emplearlo en que la disfrutéis al máximo.
            <br></br><br></br>Y si alguien muy cercano se plantea no asistir por cuestiones económicas, que nos lo diga en confianza, por favor.</em>


             <AccountInput />
        </div>
        <button className="back" onClick={() => setActiveCard("sobre")} />
        </>
    );
}

export default Regalo;