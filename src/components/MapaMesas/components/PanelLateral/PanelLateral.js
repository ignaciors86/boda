import React from 'react';
import './PanelLateral.scss';

const PanelLateral = ({
  isPanelOpen,
  porGrupoOrigen,
  mesasOrganizadas,
  getInvitadoRef,
  grupoColorMap,
  setInvitadoDetalle,
  setShowAddMesa,
  setIsPanelOpen,
  urlstrapi,
  STRAPI_TOKEN
}) => {
  const handleDragStart = (e, inv) => {
    if (!inv.documentId) {
      console.error('No documentId found for invitee:', inv);
      return;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: inv.id,
      documentId: inv.documentId,
      nombre: inv.nombre
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    try {
      const invitado = JSON.parse(data);
      const mesaId = e.target.closest('.mapa-mesa-div')?.id?.replace('mesa-', '');
      
      if (!mesaId || !invitado.documentId) {
        console.error('Missing mesaId or documentId:', { mesaId, invitado });
        return;
      }

      console.log('Actualizando invitado:', {
        invitadoId: invitado.documentId,
        mesaId: mesaId
      });

      const response = await fetch(`${urlstrapi}/api/invitados/${invitado.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: JSON.stringify({ 
          data: { 
            mesa: mesaId
          } 
        })
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar invitado: ${response.status}`);
      }

      // Recargar la página para actualizar los datos
      window.location.reload();
    } catch (error) {
      console.error('Error al actualizar invitado:', error);
    }
  };

  return (
    <>
      <button 
        className={`panel-lateral-toggle ${isPanelOpen ? 'open' : ''}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        aria-label={isPanelOpen ? "Cerrar panel" : "Abrir panel"}
      />
      <aside className={`panel-lateral ${isPanelOpen ? 'open' : ''}`}>
        <h2>Grupos de origen</h2>
        {Object.values(porGrupoOrigen).map(grupo => (
          <details key={grupo.nombre} className="panel-lateral-grupo">
            <summary>{grupo.nombre}</summary>
            <div className="panel-lateral-grupo-contenido">
              {grupo.invitados.map(inv => {
                const tieneMesaStrapi = inv.mesaId && inv.mesaId !== 0;
                const enMesa = Object.values(mesasOrganizadas).some(mesa => 
                  mesa.invitados.some(i => i.id === inv.id)
                );
                let colorBolita = undefined;
                let colorTexto = undefined;
                if (tieneMesaStrapi) {
                  colorBolita = '#22c55e';
                  colorTexto = '#22c55e';
                } else {
                  colorBolita = '#f43f5e';
                  colorTexto = '#f43f5e';
                }
                return (
                  <div
                    key={inv.id}
                    className="panel-lateral-invitado"
                    ref={(!tieneMesaStrapi) ? getInvitadoRef(inv.id) : null}
                    draggable={!tieneMesaStrapi}
                  >
                    <div
                      className="panel-lateral-bolita"
                      style={{background: colorBolita, color: colorBolita ? '#fff' : undefined}}
                    >{inv.nombre[0]}</div>
                    <span style={{color: colorTexto}}>{inv.nombre}</span>
                  </div>
                );
              })}
            </div>
          </details>
        ))}

        <button 
          className="panel-lateral-btn-add" 
          onClick={() => setShowAddMesa(true)}
        >
          Añadir mesa
        </button>
      </aside>
    </>
  );
};

export default PanelLateral; 