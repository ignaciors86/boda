import React from "react";
import "./CartaInvitado.scss";
import { useDragContext } from "../../DragContext";
import Rasca from "components/Rasca/Rasca";
import Loading from "components/Timeline/Loading";

const urlstrapi = "https://boda-strapi-production.up.railway.app";

const CartaInvitado = ({ weedding, invitado }) => {
    const { activeCard, setActiveCard } = useDragContext();
    console.log('DEBUG_INFO', {
        message: 'Datos del invitado en CartaInvitado',
        invitadoId: invitado?.id,
        documentId: invitado?.documentId,
        invitadoData: invitado
    });

    const resultado = <>
        <h1>Detalle de Invitado</h1>
        <h2>{invitado?.nombre}</h2>
        <p>Document ID: {invitado?.documentId}</p>
        <p>Mesa: {invitado?.mesa?.nombre || 'No asignada'}</p>
        <p>Grupo de origen: {invitado?.grupo_origen?.nombre || 'No asignado'}</p>
        <p>{invitado?.dedicatoria || 'No asignado'}</p>
    </>

    return (
        activeCard === "invitado" ? <><div className="cartaInvitado seccion">
            <Rasca 
                url={urlstrapi + invitado?.personaje?.imagen?.url} 
                alt={invitado?.personaje?.imagen?.alt} 
                resultado={resultado}
                invitadoId={invitado?.documentId} 
            />
        </div><button className="back orange" onClick={() => setActiveCard("sobre")} /></> : <Loading />
    );
};

export default CartaInvitado;
