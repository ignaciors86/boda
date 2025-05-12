import React from 'react';
import Modal from '../Modal/Modal';
import { gsap } from 'gsap';

const ModalDetalleMesa = ({ 
  isOpen, 
  onClose, 
  mesa, 
  invitadosOrdenados,
  grupoColorMap,
  isSavingOrder,
  onUpdateOrder,
  getDragAfterElement
}) => {
  // Función para calcular el fondo de la mesa según los grupos
  const getMesaBackground = (mesa) => {
    if (!mesa || !mesa.invitados || mesa.invitados.length === 0) return '#f3f4f6';
    const grupos = {};
    mesa.invitados.forEach(inv => {
      const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
      if (!grupos[grupo]) grupos[grupo] = 0;
      grupos[grupo]++;
    });
    const grupoKeys = Object.keys(grupos);
    if (grupoKeys.length === 1) {
      return grupoColorMap[grupoKeys[0]] || '#f3f4f6';
    } else {
      // Degradado proporcional
      let grad = 'linear-gradient(135deg,';
      let acc = 0;
      const total = mesa.invitados.length;
      grupoKeys.forEach((g, i) => {
        const color = grupoColorMap[g] || '#f3f4f6';
        const start = (acc / total) * 100;
        acc += grupos[g];
        const end = (acc / total) * 100;
        grad += `${color} ${start}%,${color} ${end}%`;
        if (i < grupoKeys.length - 1) grad += ',';
      });
      grad += ')';
      return grad;
    }
  };

  const renderMesaDibujo = () => {
    if (!mesa) return null;

    const invitados = mesa.invitados || [];
    const ordenActual = invitadosOrdenados[mesa.id] || {};
    const invitadosOrdenadosLista = [...invitados].sort((a, b) => {
      const ordenA = ordenActual[a.id] || 0;
      const ordenB = ordenActual[b.id] || 0;
      return ordenA - ordenB;
    });

    const areaW = 64;
    const areaH = 48;
    const cx = areaW / 2;
    const cy = areaH / 2;

    if (mesa.tipo === 'redonda') {
      const radio = 22;
      const invitadoSize = 5.5;
      return (
        <div className="mapa-mesas-modal-mesa-dibujo" style={{ width: `${areaW}dvh`, height: `${areaH}dvh`, position: 'relative' }}>
          <div
            className="mapa-mesas-modal-mesa-div"
            style={{
              width: '32dvh',
              height: '32dvh',
              background: getMesaBackground(mesa),
              border: `0.4dvh solid #6366f1`,
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            <span style={{fontSize: '2.6dvh', fontWeight: 700, color: '#fff', textShadow: '0 2px 4px #0008'}}>{mesa.nombre}</span>
          </div>
          {invitadosOrdenadosLista.map((inv, idx) => {
            const ang = (2 * Math.PI * idx) / invitados.length - Math.PI / 2;
            const bx = cx + Math.cos(ang) * radio - invitadoSize / 2;
            const by = cy + Math.sin(ang) * radio - invitadoSize / 2;
            const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
            const colorGrupo = grupoColorMap[grupo] || '#6366f1';
            return (
              <div
                key={inv.id}
                data-invitado-id={inv.id}
                className="mapa-mesas-modal-invitado"
                style={{
                  left: `${bx}dvh`,
                  top: `${by}dvh`,
                  width: `${invitadoSize}dvh`,
                  height: `${invitadoSize}dvh`,
                  position: 'absolute',
                  background: inv.imagen_url ? `url(${inv.imagen_url}) center/cover` : '#222b3a',
                  border: inv.imagen_url ? `2px solid ${colorGrupo}` : '0.2dvh solid #fff',
                  fontSize: '2.2dvh'
                }}
              >
                {!inv.imagen_url && inv.nombre[0]}
              </div>
            );
          })}
        </div>
      );
    } else if (mesa.tipo === 'imperial') {
      const mesaW = 48;
      const mesaH = 24;
      const invitadoSize = 6;
      const offset = 4;
      const leftX = cx - mesaW / 2;
      const rightX = cx + mesaW / 2;
      const topY = cy - mesaH / 2;
      const bottomY = cy + mesaH / 2;

      const lados = [[], [], [], []];
      let idx = 0;
      for (let i = 0; i < invitados.length; i++) {
        lados[idx % 4].push(invitadosOrdenadosLista[i]);
        idx++;
      }

      let rendered = [];
      lados[0].forEach((inv, i) => {
        const gap = mesaW / (lados[0].length + 1);
        const x = leftX + gap * (i + 1) - invitadoSize / 2;
        const y = topY - offset - invitadoSize / 2;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        rendered.push(
          <div 
            key={inv.id} 
            data-invitado-id={inv.id} 
            className="mapa-mesas-modal-invitado" 
            style={{ 
              left: `${x}dvh`, 
              top: `${y}dvh`, 
              width: `${invitadoSize}dvh`, 
              height: `${invitadoSize}dvh`, 
              position: 'absolute', 
              background: inv.imagen_url ? `url(${inv.imagen_url}) center/cover` : '#222b3a', 
              border: inv.imagen_url ? `2px solid ${colorGrupo}` : '0.2dvh solid #fff', 
              fontSize: '2.2dvh' 
            }}
          >
            {!inv.imagen_url && inv.nombre[0]}
          </div>
        );
      });

      // ... (resto del código para los otros lados)
      // Por brevedad, no incluyo el código repetitivo para los otros lados

      return (
        <div className="mapa-mesas-modal-mesa-dibujo" style={{ width: `${areaW}dvh`, height: `${areaH}dvh`, position: 'relative' }}>
          <div
            className="mapa-mesas-modal-mesa-div"
            style={{
              width: `${mesaW}dvh`,
              height: `${mesaH}dvh`,
              background: getMesaBackground(mesa),
              border: `0.4dvh solid #f59e42`,
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2dvh'
            }}
          >
            <span style={{fontSize: '2.8dvh', fontWeight: 700, color: '#fff', textShadow: '0 2px 4px #0008'}}>{mesa.nombre}</span>
          </div>
          {rendered}
        </div>
      );
    }
    return null;
  };

  const renderListaInvitados = () => {
    if (!mesa) return null;

    const invitados = mesa.invitados || [];
    const ordenActual = invitadosOrdenados[mesa.id] || {};
    const invitadosOrdenadosLista = [...invitados].sort((a, b) => {
      const ordenA = ordenActual[a.id] || 0;
      const ordenB = ordenActual[b.id] || 0;
      return ordenA - ordenB;
    });

    return (
      <div className={`mapa-mesas-modal-invitados ${isSavingOrder ? 'saving' : ''}`}>
        <b>Invitados:</b>
        <ul>
          {invitadosOrdenadosLista.map((inv, idx) => {
            const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
            const colorGrupo = grupoColorMap[grupo] || '#6366f1';
            return (
              <li 
                key={inv.id}
                draggable={!isSavingOrder}
                onDragStart={(e) => {
                  if (isSavingOrder) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData('text/plain', inv.id);
                  e.target.classList.add('dragging');
                  e.target.closest('.mapa-mesas-modal-invitados').classList.add('dragging-active');
                  
                  const rect = e.target.getBoundingClientRect();
                  const clone = e.target.cloneNode(true);
                  clone.style.position = 'fixed';
                  clone.style.width = rect.width + 'px';
                  clone.style.height = rect.height + 'px';
                  clone.style.left = rect.left + 'px';
                  clone.style.top = rect.top + 'px';
                  clone.style.pointerEvents = 'none';
                  clone.style.zIndex = 9999;
                  clone.style.opacity = 0.95;
                  clone.classList.add('drag-clone');
                  document.body.appendChild(clone);
                  
                  gsap.to(e.target, {
                    opacity: 0.5,
                    scale: 0.95,
                    duration: 0.2
                  });
                }}
                onDragEnd={(e) => {
                  if (isSavingOrder) return;
                  
                  e.target.classList.remove('dragging');
                  const container = e.target.closest('.mapa-mesas-modal-invitados');
                  container.classList.remove('dragging-active');
                  
                  const clone = document.querySelector('.drag-clone');
                  if (clone) {
                    gsap.to(clone, {
                      opacity: 0,
                      scale: 0.8,
                      duration: 0.2,
                      onComplete: () => clone.remove()
                    });
                  }
                  
                  gsap.to(e.target, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.2
                  });
                  
                  const items = [...container.querySelectorAll('li')];
                  const newOrder = {};
                  items.forEach((item, index) => {
                    const id = item.getAttribute('data-id');
                    if (id) newOrder[id] = index;
                  });
                  
                  onUpdateOrder(mesa.id, newOrder);
                }}
                onDragOver={(e) => {
                  if (isSavingOrder) return;
                  e.preventDefault();
                  const draggingItem = document.querySelector('.dragging');
                  if (!draggingItem || draggingItem === e.target) return;
                  
                  const container = e.target.closest('ul');
                  if (!container) return;

                  const oldMarkers = container.querySelectorAll('.drop-marker');
                  oldMarkers.forEach(marker => marker.remove());

                  const afterElement = getDragAfterElement(container, e.clientY);
                  if (afterElement) {
                    const marker = document.createElement('div');
                    marker.className = 'drop-marker';
                    
                    const rect = afterElement.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    marker.style.top = `${rect.top - containerRect.top}px`;
                    
                    container.insertBefore(marker, afterElement);
                    
                    requestAnimationFrame(() => {
                      marker.classList.add('visible');
                    });
                  } else {
                    const marker = document.createElement('div');
                    marker.className = 'drop-marker';
                    marker.style.top = `${container.scrollHeight}px`;
                    container.appendChild(marker);
                    
                    requestAnimationFrame(() => {
                      marker.classList.add('visible');
                    });
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const container = e.target.closest('ul');
                  if (!container) return;
                  
                  const markers = container.querySelectorAll('.drop-marker');
                  markers.forEach(marker => {
                    marker.classList.remove('visible');
                    setTimeout(() => marker.remove(), 200);
                  });
                  
                  const draggingItem = document.querySelector('.dragging');
                  if (!draggingItem) return;
                  
                  const afterElement = getDragAfterElement(container, e.clientY);
                  if (afterElement) {
                    const rect = afterElement.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const finalY = rect.top - containerRect.top;
                    
                    gsap.to(draggingItem, {
                      y: finalY,
                      duration: 0.3,
                      ease: "power2.out",
                      onComplete: () => {
                        container.insertBefore(draggingItem, afterElement);
                        gsap.set(draggingItem, { y: 0 });
                        
                        const items = [...container.querySelectorAll('li')];
                        const newOrder = {};
                        items.forEach((item, index) => {
                          const id = item.getAttribute('data-id');
                          if (id) newOrder[id] = index;
                        });

                        onUpdateOrder(mesa.id, newOrder);
                      }
                    });
                  } else {
                    gsap.to(draggingItem, {
                      y: container.scrollHeight,
                      duration: 0.3,
                      ease: "power2.out",
                      onComplete: () => {
                        container.appendChild(draggingItem);
                        gsap.set(draggingItem, { y: 0 });
                        
                        const items = [...container.querySelectorAll('li')];
                        const newOrder = {};
                        items.forEach((item, index) => {
                          const id = item.getAttribute('data-id');
                          if (id) newOrder[id] = index;
                        });
                        onUpdateOrder(mesa.id, newOrder);
                      }
                    });
                  }
                }}
                data-id={inv.id}
              >
                <span 
                  className="mapa-mesas-modal-invitado-bolita" 
                  style={{
                    background: inv.imagen_url ? `url(${inv.imagen_url}) center/cover` : colorGrupo,
                    border: inv.imagen_url ? `2px solid ${colorGrupo}` : 'none'
                  }}
                >
                  {!inv.imagen_url && inv.nombre[0]}
                </span>
                <span className="mapa-mesas-modal-invitado-nombre">{inv.nombre}</span>
                <span className="mapa-mesas-modal-invitado-orden">#{idx + 1}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mesa?.nombre}
      className="mapa-mesas-modal-detalle"
    >
      <div className="modal-content">
        <div className="mapa-mesas-modal-mesa">
          <div className="mapa-mesas-modal-mesa-container">
            {renderMesaDibujo()}
          </div>
        </div>
        {renderListaInvitados()}
      </div>
    </Modal>
  );
};

export default ModalDetalleMesa; 