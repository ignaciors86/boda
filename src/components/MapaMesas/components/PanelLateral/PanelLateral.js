import React, { useState } from 'react';
import './PanelLateral.scss';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';

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
  STRAPI_TOKEN,
  generarInformeExcel,
  actualizarInvitado,
  generarInformePDFCatering
}) => {
  const [gruposAbiertos, setGruposAbiertos] = useState({});
  const toggleGrupo = (nombre) => {
    setGruposAbiertos(prev => ({ ...prev, [nombre]: !prev[nombre] }));
  };

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

      await actualizarInvitado(invitado.documentId, mesaId);
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
        {Object.values(porGrupoOrigen).map(grupo => {
          const abierto = !!gruposAbiertos[grupo.nombre];
          return (
            <div key={grupo.nombre} className="panel-lateral-grupo">
              <div
                className="panel-lateral-grupo-summary"
                onClick={() => toggleGrupo(grupo.nombre)}
              >
                <span>{grupo.nombre}</span>
                <span
                  className="panel-lateral-grupo-arrow"
                  style={{ transition: 'transform 0.3s', transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >▶</span>
              </div>
              <div
                className={`panel-lateral-grupo-contenido${abierto ? ' panel-lateral-grupo-contenido-abierto' : ''}`}
              >
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
                      onDragStart={(e) => handleDragStart(e, inv)}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      style={{ cursor: 'pointer' }}
                      title="Editar en Strapi"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                        const baseUrl = isLocal
                          ? 'http://localhost:1337'
                          : 'https://boda-strapi-production.up.railway.app';
                        const url = `${baseUrl}/admin/content-manager/collection-types/api::invitado.invitado/${inv.documentId}`;
                        window.open(url, '_blank');
                      }}
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
            </div>
          );
        })}

        <div className="panel-lateral-buttons">
          <button
            className="panel-lateral-btn-add"
            title="Añadir mesa"
            onClick={() => setShowAddMesa(true)}
          >
            <FaPlus /> Añadir mesa
          </button>
          <button
            className="panel-lateral-btn-excel"
            title="Generar informe Excel"
            onClick={generarInformeExcel}
          >
            <FaFileExcel style={{ marginRight: 6 }} /> Informe completo
          </button>
          <button
            className="panel-lateral-btn-pdf"
            title="Generar PDF para cátering"
            onClick={generarInformePDFCatering}
          >
            <FaFilePdf style={{ marginRight: 6 }} /> PDF cátering
          </button>
        </div>
      </aside>
    </>
  );
};

export default PanelLateral; 