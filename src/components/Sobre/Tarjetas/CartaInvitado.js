
import "./CartaInvitado.scss";
import { useDragContext } from "../../DragContext";

const CartaInvitado = ({ weedding, invitado }) => {
    const { setActiveCard } = useDragContext();
    console.log({ invitado })
    return (
        <div className="cartaInvitado seccion">

            {invitado ? (
                <div>
                    <h1>Detalle de Invitado</h1>
                    <h2>{invitado?.nombre}</h2>
                    <p>Document ID: {invitado?.documentId}</p>
                    <p>Mesa: {invitado?.mesa?.nombre || 'No asignada'}</p>
                    <p>Grupo de origen: {invitado?.grupo_origen?.nombre || 'No asignado'}</p>
                    {/* Agrega más detalles según los datos disponibles */}
                </div>
            ) : (
                <p>Cargando datos del invitado...</p>
            )}

        </div>

    );
};

export default CartaInvitado;
