import React from 'react';
import Modal from '../Modal/Modal';

const ModalAddMesa = ({ isOpen, onClose, onSelectTipo }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tipo de mesa"
      className="mapa-mesas-modal"
    >
      <button onClick={() => onSelectTipo('redonda')}>Redonda (máx. 11)</button>
      <button onClick={() => onSelectTipo('imperial')}>Imperial (máx. 16)</button>
      <button onClick={onClose}>Cancelar</button>
    </Modal>
  );
};

export default ModalAddMesa; 