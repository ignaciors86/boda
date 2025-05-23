import React from "react";
import "./CartaInvitado.scss";
import { useDragContext } from "../../DragContext";
import Rasca from "components/Rasca/Rasca";
import Loading from "components/Timeline/Loading";

const urlstrapi = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:1337'
  : 'https://boda-strapi-production.up.railway.app';

const CartaInvitado = ({ weedding, invitado, currentImageUrl, setCurrentImageUrl }) => {
    const { activeCard, setActiveCard } = useDragContext();

    console.log('DEBUG_INFO_CARTA', {
        message: 'Datos del invitado en CartaInvitado',
        invitadoId: invitado?.id,
        documentId: invitado?.documentId,
        imagen: invitado?.imagen,
        personaje: invitado?.personaje,
        currentImageUrl
    });

    const personajeUrl = invitado?.personaje?.imagen_url || '';
    const imagenUrl = currentImageUrl || invitado?.imagen_url || '';
    const tieneImagen = Boolean(currentImageUrl || invitado?.imagen_url);
    
    console.log('URLs construidas:', {
        personajeUrl,
        imagenUrl,
        urlstrapi,
        personajeImagenUrl: invitado?.personaje?.imagen_url,
        invitadoImagenUrl: invitado?.imagen_url,
        tieneImagen
    });

    const resultado = <>
        <h1>Detalle de Invitado</h1>
        <h2>{invitado?.nombre}</h2>
        <p>Document ID: {invitado?.documentId}</p>
        <p>Mesa: {invitado?.mesa?.nombre || 'No asignada'}</p>
        <p>Grupo de origen: {invitado?.grupo_origen?.nombre || 'No asignado'}</p>
        <p>{invitado?.dedicatoria || 'No asignado'}</p>
    </>

    console.log('PERSONAJE:', invitado?.personaje);
    console.log('INVITADO:', invitado);

    return (
        activeCard === "invitado" ? <><div className="cartaInvitado seccion">
            <Rasca 
                url={personajeUrl}
                url2={imagenUrl}
                setCurrentImageUrl={setCurrentImageUrl}
                personaje={invitado?.personaje}
                dedicatoria={invitado?.dedicatoria}
                invitadoNombre={invitado?.nombre}
                invitadoId={invitado?.documentId} 
            />
        </div><button className="back orange" onClick={() => setActiveCard("sobre")} /></> : <Loading />
    );
};

export default CartaInvitado;
