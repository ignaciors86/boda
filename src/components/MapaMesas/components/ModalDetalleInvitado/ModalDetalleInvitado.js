import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { FaTimes } from 'react-icons/fa';

const ModalDetalleInvitado = ({ 
  isOpen, 
  onClose, 
  invitado,
  grupoColorMap,
  mesasOrganizadas,
  formatearMenu,
  actualizarInvitado,
  mesasPlano
}) => {
  const [mesaSeleccionada, setMesaSeleccionada] = useState('');
  const [mesaActual, setMesaActual] = useState('');

  useEffect(() => {
    if (invitado) {
      setMesaSeleccionada(invitado.mesaId || '');
      setMesaActual(invitado.mesa || '');
    }
  }, [invitado]);

  const handleMesaChange = async (e) => {
    const nuevaMesaId = e.target.value;
    setMesaSeleccionada(nuevaMesaId);
    try {
      await actualizarInvitado(invitado.documentId, nuevaMesaId);
      onClose();
    } catch (error) {
      console.error('Error al actualizar la mesa:', error);
    }
  };

  // Obtener todas las mesas disponibles (con y sin invitados) y ordenarlas alfabéticamente
  const mesasDisponibles = Array.isArray(mesasPlano) 
    ? [...mesasPlano].sort((a, b) => a.nombre.localeCompare(b.nombre))
    : [];

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
        <div className="mapa-mesas-modal-invitado-avatar">
          {invitado.imagen_url ? (
            <img src={invitado.imagen_url} alt={invitado.nombre} />
          ) : (
            <div className="mapa-mesas-modal-invitado-avatar-placeholder">
              {invitado.nombre[0]}
            </div>
          )}
        </div>
        <div className="mapa-mesas-modal-invitado-info">
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Nombre:</b>
            <span>{invitado.nombre}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Grupo:</b>
            <span style={{ color: grupoColorMap[invitado.grupoOrigen] }}>
              {invitado.grupoOrigen}
            </span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Menú:</b>
            <span>{formatearMenu(invitado.menu)}</span>
          </div>
          <div className="mapa-mesas-modal-invitado-info-row">
            <b>Mesa:</b>
            <select
              value={mesaSeleccionada}
              onChange={handleMesaChange}
              className="mapa-mesas-modal-invitado-select"
            >
              <option value="">Sin mesa asignada</option>
              {mesasDisponibles.map(mesa => (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.nombre} ({mesa.invitados?.length || 0} invitados)
                </option>
              ))}
            </select>
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