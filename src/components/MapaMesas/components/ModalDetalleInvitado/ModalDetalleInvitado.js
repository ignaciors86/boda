import React from 'react';
import Modal from '../Modal/Modal';

const ModalDetalleInvitado = ({ 
  isOpen, 
  onClose, 
  invitado,
  grupoColorMap,
  mesasOrganizadas,
  formatearMenu
}) => {
  const mostrarCampoTexto = (valor, vacio = '(vacío)', noEspecificado = 'No especificado') => {
    if (valor === undefined || valor === null) return noEspecificado;
    if (typeof valor === 'string' && valor.trim() === '') return vacio;
    return valor;
  };

  if (!invitado) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invitado.nombre}
      className="mapa-mesas-modal-invitado-detalle"
    >
      <div className="mapa-mesas-modal-invitado-detalle-content">
        <div 
          className="mapa-mesas-modal-invitado-avatar" 
          style={{ 
            background: invitado?.imagen_url 
              ? `url(${invitado.imagen_url}) center/cover` 
              : grupoColorMap[invitado?.grupoOrigen] || '#6366f1'
          }}
        >
          {invitado?.nombre?.[0]}
        </div>
        <div className="mapa-mesas-modal-invitado-info">
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Nombre</b>
            <span>{mostrarCampoTexto(invitado?.nombre)}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Grupo</b>
            <span>{mostrarCampoTexto(invitado?.grupoOrigen, '(vacío)', 'Sin grupo')}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Mesa</b>
            <span>{(() => {
              const mesaActual = Object.values(mesasOrganizadas).find(mesa => mesa.invitados.some(i => i.id === invitado?.id));
              return mesaActual ? mostrarCampoTexto(mesaActual.nombre) : 'Sin asignar';
            })()}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Menú</b>
            <span>{formatearMenu(invitado?.menu)}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Alergias</b>
            <span>{mostrarCampoTexto(invitado?.alergias)}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Asistirá</b>
            <span>{invitado?.asistira === true ? 'Sí' : invitado?.asistira === false ? 'No' : 'No especificado'}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Preboda</b>
            <span>{invitado?.preboda === true ? 'Sí' : invitado?.preboda === false ? 'No' : 'No especificado'}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Postboda</b>
            <span>{invitado?.postboda === true ? 'Sí' : invitado?.postboda === false ? 'No' : 'No especificado'}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Autobús</b>
            <span>{invitado?.autobus === true ? 'Sí' : invitado?.autobus === false ? 'No' : 'No especificado'}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Alojamiento</b>
            <span>{invitado?.alojamiento === true ? 'Sí' : invitado?.alojamiento === false ? 'No' : 'No especificado'}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModalDetalleInvitado; 