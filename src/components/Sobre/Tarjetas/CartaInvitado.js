
import "./CartaInvitado.scss";
import { useDragContext } from "../../DragContext";
import Rasca from "components/Rasca/Rasca";
const urlstrapi = "https://boda-strapi-production.up.railway.app";
const CartaInvitado = ({ weedding, invitado }) => {
    const { setActiveCard } = useDragContext();
    console.log({ invitado })
    return (
        <div className="cartaInvitado seccion">
            <h1>Detalle de Invitado</h1>
            <h2>{invitado?.nombre}</h2>
            <p>Document ID: {invitado?.documentId}</p>
            <p>Mesa: {invitado?.mesa?.nombre || 'No asignada'}</p>
            <p>Grupo de origen: {invitado?.grupo_origen?.nombre || 'No asignado'}</p>
            <p>{invitado?.dedicatoria || 'No asignado'}</p>
            {/* Agrega más detalles según los datos disponibles */}
            <Rasca url={urlstrapi + invitado?.personaje.imagen.url} alt={invitado?.personaje.imagen.alt} />
        </div>
    );
};

export default CartaInvitado;
