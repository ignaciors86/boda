import React, { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import './MapaMesas.scss';
gsap.registerPlugin(Draggable);

const urlstrapi =
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:1337'
    : 'https://boda-strapi-production.up.railway.app';
const STRAPI_TOKEN = process.env.REACT_APP_STRAPI_TOKEN || "40f652de7eb40915bf1bf58a58144c1c9c55de06e2941007ff28a54d236179c4bd24147d27a985afba0e5027535da5b3577db7b850c72507e112e75d6bf4a41711b67e904d1c4e192252070f10d8a7efd72bec1e071c8ca50e5035347935f7ea6e760d727c0695285392a75bcb5e93d44bd395e0cd83fe748350f69e49aa24ca";
const MapaMesas = () => {
  const [invitados, setInvitados] = useState([]);
  const [porGrupoOrigen, setPorGrupoOrigen] = useState({});
  const [mesasOrganizadas, setMesasOrganizadas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const planoRef = useRef(null);
  const [showAddMesa, setShowAddMesa] = useState(false);
  const [tipoMesa, setTipoMesa] = useState(null);
  const [mesasPlano, setMesasPlano] = useState([]);
  const [mesaDetalle, setMesaDetalle] = useState(null);
  const [invitadoDetalle, setInvitadoDetalle] = useState(null);
  const diametroRedonda = 90;
  const largoImperial = 160;
  const anchoImperial = 50;
  const diametroSimple = 60;
  // Refs para cada mesa
  const mesaRefs = useRef({});
  // Refs para invitados sin mesa
  const invitadoRefs = useRef({});
  // Refs para bolitas
  const bolitaRefs = useRef({});
  // Ref para almacenar los documentIds de las mesas
  const mesaDocumentIds = useRef({});
  const [isDraggingInvitado, setIsDraggingInvitado] = useState(false);
  const snapshotMesasPlano = useRef([]);

  // Paleta de colores para grupos de origen
  const coloresGrupos = [
    '#6366f1', // azul
    '#f59e42', // naranja
    '#10b981', // verde
    '#f43f5e', // rojo
    '#eab308', // amarillo
    '#a21caf', // morado
    '#0ea5e9', // celeste
    '#f472b6', // rosa
    '#64748b', // gris
    '#84cc16', // lima
    '#f87171', // coral
    '#8b5cf6', // violeta
    '#facc15', // dorado
    '#14b8a6', // turquesa
    '#e11d48', // magenta
  ];
  // Asignar color a cada grupo de origen por id
  const grupoColorMap = {};
  let grupoIdx = 0;
  Object.values(porGrupoOrigen).forEach(grupo => {
    if (!grupoColorMap[grupo.nombre]) {
      grupoColorMap[grupo.nombre] = coloresGrupos[grupoIdx % coloresGrupos.length];
      grupoIdx++;
    }
  });

  // Helper para calcular fondo de mesa según grupos de origen
  function getMesaBackground(mesa) {
    if (!mesa.invitados || mesa.invitados.length === 0) return '#f3f4f6';
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
  }

  // Helper para obtener o crear un ref estable para una mesa
  function getMesaRef(id) {
    if (!mesaRefs.current[id]) {
      mesaRefs.current[id] = React.createRef();
    }
    return mesaRefs.current[id];
  }

  // Helper para obtener o crear un ref estable para un invitado
  function getInvitadoRef(id) {
    if (!invitadoRefs.current[id]) {
      invitadoRefs.current[id] = React.createRef();
    }
    return invitadoRefs.current[id];
  }

  // Función auxiliar para actualizar el snapshot
  const actualizarSnapshot = () => {
    snapshotMesasPlano.current = mesasPlano.map(m => ({
      ...m,
      invitados: m.invitados ? [...m.invitados] : []
    }));
  };

  useEffect(() => {
    fetch(
      `${urlstrapi}/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
    )
      .then((response) => response.json())
      .then((data) => {
        const invitadosData = data?.data.map((invitado) => ({
          id: invitado.id,
          documentId: invitado.documentId,
          nombre: invitado?.nombre,
          imagen: invitado?.personaje
            ? `https://boda-strapi-production.up.railway.app${invitado?.personaje?.imagen?.url}`
            : "",
          mesaId: invitado?.mesa?.id || 0,
          mesaDocumentId: invitado?.mesa?.documentId || "",
          mesa: invitado?.mesa?.nombre || "",
          grupoOrigenId: invitado?.grupo_origen?.id || 0,
          grupoOrigen: invitado?.grupo_origen?.nombre || "Sin grupo"
        }));
        setInvitados(invitadosData);

        // Organizar por grupo de origen
        const grupos = {};
        invitadosData.forEach((inv) => {
          if (!grupos[inv.grupoOrigenId]) {
            grupos[inv.grupoOrigenId] = {
              nombre: inv.grupoOrigen,
              invitados: []
            };
          }
          grupos[inv.grupoOrigenId].invitados.push({
            id: inv.id,
            documentId: inv.documentId,
            nombre: inv.nombre,
            imagen: inv.imagen,
            mesa: inv.mesa,
            mesaId: inv.mesaId,
            mesaDocumentId: inv.mesaDocumentId
          });
        });
        setPorGrupoOrigen(grupos);

        // Organizar por mesa
        const mesas = {};
        invitadosData.forEach((inv) => {
          if (!mesas[inv.mesaId]) {
            mesas[inv.mesaId] = {
              id: inv.mesaId,
              documentId: inv.mesaDocumentId,
              nombre: inv.mesa,
              invitados: []
            };
          }
          mesas[inv.mesaId].invitados.push({
            id: inv.id,
            documentId: inv.documentId,
            nombre: inv.nombre,
            imagen: inv.imagen,
            grupoOrigen: inv.grupoOrigen
          });
        });
        setMesasOrganizadas(mesas);

        // Inicializar mesasPlano con las mesas existentes
        const mesaKeys = Object.keys(mesas).filter(k => k !== '0');
        const totalMesas = mesaKeys.length;
        // Calcular el radio mínimo para que no se solapen
        const mesaSize = 130; // tamaño aproximado de la mesa más grande (con margen)
        const minRadio = Math.max(320, (mesaSize / 2) / Math.sin(Math.PI / Math.max(2, totalMesas)) + 80);
        const radioPlano = minRadio;
        const centroX = 800; // más centrado en pantallas grandes
        const centroY = 450;
        const mesasIniciales = mesaKeys.map((key, idx) => {
          const mesa = mesas[key];
          // Detectar tipo por número de invitados
          let tipo = 'redonda';
          if (mesa.invitados.length > 11) tipo = 'imperial';
          const angulo = (2 * Math.PI * idx) / totalMesas;
          const x = centroX + radioPlano * Math.cos(angulo);
          const y = centroY + radioPlano * Math.sin(angulo);
          let maxInv = 11;
          if (tipo === 'imperial') maxInv = 16;

          // Guardar el documentId en el ref
          mesaDocumentIds.current[mesa.id] = mesa.documentId;

          return {
            id: String(mesa.id),
            documentId: mesa.documentId,
            tipo,
            x,
            y,
            invitados: mesa.invitados,
            maxInv,
            nombre: mesa.nombre
          };
        });

        console.log('[MAPA-MESAS] Mesas iniciales:', mesasIniciales);
        console.log('[MAPA-MESAS] DocumentIds guardados:', mesaDocumentIds.current);

        // Recuperar posiciones guardadas en localStorage
        const posicionesGuardadas = localStorage.getItem('mesasPosiciones');
        let mesasConPosiciones = mesasIniciales;
        if (posicionesGuardadas) {
          try {
            const posiciones = JSON.parse(posicionesGuardadas);
            mesasConPosiciones = mesasIniciales.map(mesa => {
              if (posiciones[mesa.id]) {
                return { ...mesa, x: posiciones[mesa.id].x, y: posiciones[mesa.id].y };
              }
              return mesa;
            });
          } catch (e) {
            // Si hay error, usar las posiciones por defecto
          }
        }
        setMesasPlano(mesasConPosiciones);

        // LOGS CLAROS
        console.log("INVITADOS:", invitadosData);
        console.log("GRUPOS DE ORIGEN:", grupos);
        console.log("MESAS ORGANIZADAS:", mesas);
        setCargando(false);
      })
      .catch((err) => {
        setError("Error al obtener los datos de los invitados");
        setCargando(false);
      });
  }, []);

  useEffect(() => {
    if (!tipoMesa) return;
    const total = mesasPlano.length + 1;
    const radioPlano = 300;
    const centroX = 600;
    const centroY = 350;
    const angulo = (2 * Math.PI * mesasPlano.length) / total;
    let x = centroX + radioPlano * Math.cos(angulo);
    let y = centroY + radioPlano * Math.sin(angulo);
    if (mesasPlano.length === 0) { x = centroX; y = centroY; }
    let maxInv = 7;
    if (tipoMesa === 'redonda') maxInv = 11;
    if (tipoMesa === 'imperial') maxInv = 16;

    // Crear la mesa en Strapi primero
    fetch(`${urlstrapi}/api/mesas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_TOKEN}`
      },
      body: JSON.stringify({
        data: {
          nombre: `Mesa ${mesasPlano.length + 1}`,
          tipo: tipoMesa
        }
      })
    })
    .then(res => res.json())
    .then(data => {
      const nuevaMesa = {
        id: String(data.data.id),
        documentId: data.data.id,
        tipo: tipoMesa,
        x,
        y,
        invitados: [],
        maxInv,
        nombre: data.data.attributes.nombre
      };
      setMesasPlano(prev => [...prev, nuevaMesa]);
    })
    .catch(error => {
      console.error('Error al crear la mesa:', error);
    });

    setTipoMesa(null);
  }, [tipoMesa]);

  useEffect(() => {
    // Deshabilitar o habilitar los Draggables de las mesas según isDraggingInvitado
    Object.values(mesaRefs.current).forEach(ref => {
      const mesaEl = ref.current;
      if (mesaEl && mesaEl._draggable) {
        if (isDraggingInvitado) {
          mesaEl._draggable.disable();
        } else {
          mesaEl._draggable.enable();
        }
      }
    });
    // Inicializar Draggables solo si no hay drag de invitado
    if (isDraggingInvitado) return;
    mesasPlano.forEach(mesa => {
      if (!mesaRefs.current[mesa.id]) {
        mesaRefs.current[mesa.id] = React.createRef();
      }
      const el = mesaRefs.current[mesa.id].current;
      if (el) {
        // Calcular width y height igual que en renderMesaDiv
        let mesaWidth, mesaHeight;
        if (mesa.tipo === 'redonda') {
          mesaWidth = 90;
          mesaHeight = 90;
        } else if (mesa.tipo === 'imperial') {
          mesaWidth = 160;
          mesaHeight = 50;
        } else {
          mesaWidth = 60;
          mesaHeight = 60;
        }
        const padding = 36;
        const width = mesaWidth + padding * 2;
        const height = mesaHeight + padding * 2;
        // Inicializar posición solo con left/top
        el.style.left = (mesa.x - width / 2) + 'px';
        el.style.top = (mesa.y - height / 2) + 'px';
        // Eliminar cualquier transform residual
        el.style.transform = '';
        if (!el._draggable) {
          el._draggable = Draggable.create(el, {
            type: 'left,top',
            bounds: planoRef.current,
            inertia: true,
            onPress: function(e) {
              if (window.isDraggingInvitadoOrBolita) return false;
              if (e && e.target && e.target.classList && e.target.classList.contains('mapa-invitado-bolita')) return false;
            },
            onDragEnd: function() {
              const left = parseFloat(el.style.left);
              const top = parseFloat(el.style.top);
              const newX = left + width / 2;
              const newY = top + height / 2;
              setMesasPlano(prev => {
                const nuevas = prev.map(m => m.id === mesa.id ? { ...m, x: newX, y: newY } : m);
                const posiciones = {};
                nuevas.forEach(m => {
                  posiciones[m.id] = { x: m.x, y: m.y };
                });
                localStorage.setItem('mesasPosiciones', JSON.stringify(posiciones));
                return nuevas;
              });
            }
          })[0];
        }
      }
    });
  }, [mesasPlano, isDraggingInvitado]);

  // Efecto para hacer arrastrables los invitados sin mesa (con clon flotante)
  useEffect(() => {
    Object.values(porGrupoOrigen).forEach(grupo => {
      grupo.invitados.forEach(inv => {
        const ref = getInvitadoRef(inv.id);
        const el = ref.current;
        if (el && !el._draggable) {
          const mesaIdOriginal = inv.mesaId || 0;
          el._draggable = Draggable.create(el, {
            type: 'left,top',
            minimumMovement: 2,
            onPress: function(e) {
              if (e && e.preventDefault) e.preventDefault();
              actualizarSnapshot();
              Object.values(mesaRefs.current).forEach(ref => {
                const mesaEl = ref.current;
                if (mesaEl) {
                  gsap.set(mesaEl, { x: 0, y: 0 });
                }
              });
              setIsDraggingInvitado(true);
              const clone = el.cloneNode(true);
              const rect = el.getBoundingClientRect();
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
              gsap.set(el, { opacity: 0 });

              let tempDraggable = Draggable.create(clone, {
                type: 'left,top',
                bounds: document.body,
                zIndexBoost: true,
                minimumMovement: 2,
                onDrag: function() {
                  let mesaHover = null;
                  Object.values(mesaRefs.current).forEach(ref => {
                    const mesaEl = ref.current;
                    if (mesaEl && Draggable.hitTest(clone, mesaEl, '50%')) {
                      mesaHover = mesaEl;
                    }
                    if (mesaEl) mesaEl.style.transform = '';
                  });
                  if (mesaHover) {
                    mesaHover.style.transform = 'scale(1.12)';
                  }
                },
                onRelease: function() {
                  Object.values(mesaRefs.current).forEach(ref => {
                    const mesaEl = ref.current;
                    if (mesaEl) mesaEl.style.transform = '';
                  });
                  let mesaDrop = null;
                  Object.values(mesaRefs.current).forEach(ref => {
                    const mesaEl = ref.current;
                    if (mesaEl && Draggable.hitTest(clone, mesaEl, '50%')) {
                      mesaDrop = mesaEl;
                    }
                  });

                  if (mesaDrop) {
                    console.log('[MAPA-MESAS] Mesa drop completa:', mesaDrop);
                    
                    // Buscar el elemento hijo que contiene el ID de la mesa
                    const mesaElement = mesaDrop.querySelector('.mapa-mesa-div');
                    console.log('[MAPA-MESAS] Elemento mesa encontrado:', mesaElement);
                    
                    if (!mesaElement) {
                      console.error('[MAPA-MESAS] No se encontró el elemento de la mesa');
                      return;
                    }

                    const mesaIdDropDom = mesaElement.id.replace('mesa-', '');
                    console.log('[MAPA-MESAS] Mesa ID del DOM:', mesaIdDropDom);
                    console.log('[MAPA-MESAS] DocumentIds guardados:', mesaDocumentIds.current);
                    
                    if (!mesaIdDropDom) {
                      console.error('[MAPA-MESAS] No se pudo obtener el ID de la mesa del DOM');
                      return;
                    }

                    const documentId = mesaDocumentIds.current[mesaIdDropDom];
                    const mesaDestino = mesasPlano.find(m => String(m.id) === String(mesaIdDropDom));
                    
                    console.log('[MAPA-MESAS] Mesa golpeada:', {
                      id: mesaIdDropDom,
                      documentId: documentId,
                      mesaCompleta: mesaDestino
                    });
                    
                    if (!documentId) {
                      console.error('[MAPA-MESAS] No se encontró el documentId para la mesa:', mesaIdDropDom);
                      return;
                    }

                    const idMesaStrapi = documentId;
                    
                    if (String(mesaIdDropDom) !== String(mesaIdOriginal)) {
                      const invitadoIdStrapi = inv.documentId;
                      console.log('[MAPA-MESAS] PUT invitado', { 
                        invitadoIdStrapi, 
                        idMesaStrapi,
                        inv,
                        mesaDestino
                      });

                      fetch(`${urlstrapi}/api/invitados/${invitadoIdStrapi}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${STRAPI_TOKEN}`
                        },
                        body: JSON.stringify({ 
                          data: { 
                            mesa: idMesaStrapi ? idMesaStrapi : null
                          } 
                        })
                      })
                      .then(res => res.json())
                      .then(() => {
                        fetch(
                          `${urlstrapi}/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
                        )
                          .then((response) => response.json())
                          .then((data) => {
                            const invitadosData = data?.data.map((invitado) => ({
                              id: invitado.id,
                              documentId: invitado.documentId,
                              nombre: invitado?.nombre,
                              imagen: invitado?.personaje
                                ? `https://boda-strapi-production.up.railway.app${invitado?.personaje?.imagen?.url}`
                                : "",
                              mesaId: invitado?.mesa?.id || 0,
                              mesaDocumentId: invitado?.mesa?.documentId || "",
                              mesa: invitado?.mesa?.nombre || "",
                              grupoOrigenId: invitado?.grupo_origen?.id || 0,
                              grupoOrigen: invitado?.grupo_origen?.nombre || "Sin grupo"
                            }));
                            setInvitados(invitadosData);
                            // Organizar por grupo de origen
                            const grupos = {};
                            invitadosData.forEach((inv) => {
                              if (!grupos[inv.grupoOrigenId]) {
                                grupos[inv.grupoOrigenId] = {
                                  nombre: inv.grupoOrigen,
                                  invitados: []
                                };
                              }
                              grupos[inv.grupoOrigenId].invitados.push({
                                id: inv.id,
                                documentId: inv.documentId,
                                nombre: inv.nombre,
                                imagen: inv.imagen,
                                mesa: inv.mesa,
                                mesaId: inv.mesaId,
                                mesaDocumentId: inv.mesaDocumentId
                              });
                            });
                            setPorGrupoOrigen(grupos);
                            // Organizar por mesa
                            const mesas = {};
                            invitadosData.forEach((inv) => {
                              if (!mesas[inv.mesaId]) {
                                mesas[inv.mesaId] = {
                                  id: inv.mesaId,
                                  documentId: inv.mesaDocumentId,
                                  nombre: inv.mesa,
                                  invitados: []
                                };
                              }
                              mesas[inv.mesaId].invitados.push({
                                id: inv.id,
                                documentId: inv.documentId,
                                nombre: inv.nombre,
                                imagen: inv.imagen,
                                grupoOrigen: inv.grupoOrigen
                              });
                            });
                            setMesasOrganizadas(mesas);
                            // Actualizar mesasPlano con los nuevos invitados
                            setMesasPlano(prev => prev.map(m => {
                              const mesaActualizada = mesas[m.id];
                              if (mesaActualizada) {
                                return { ...m, invitados: mesaActualizada.invitados };
                              }
                              return { ...m, invitados: [] };
                            }));
                          });
                      });
                    }
                  }

                  if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                  gsap.set(el, { opacity: 1, x: 0, y: 0 });
                  // Destruir el Draggable temporal de forma ultra-defensiva
                  try {
                    if (this && this._draggableTemp && typeof this._draggableTemp.kill === 'function') {
                      this._draggableTemp.kill();
                    } else if (this && this._draggableTemp && Array.isArray(this._draggableTemp) && this._draggableTemp[0] && typeof this._draggableTemp[0].kill === 'function') {
                      this._draggableTemp[0].kill();
                    }
                    if (this) this._draggableTemp = null;
                  } catch (e) {}
                  setIsDraggingInvitado(false);
                }
              })[0];
              tempDraggable.startDrag(e);
              return false;
            }
          })[0];
        }
      });
    });
  }, [porGrupoOrigen, mesasPlano]);

  // Efecto para hacer draggables las bolitas de invitados en las mesas
  useEffect(() => {
    mesasPlano.forEach(mesa => {
      (mesa.invitados || []).forEach(inv => {
        const refKey = `${mesa.id}-${inv.id}`;
        if (!bolitaRefs.current[refKey]) {
          bolitaRefs.current[refKey] = React.createRef();
        }
        const el = bolitaRefs.current[refKey].current;
        if (el && !el._draggableBolita) {
          const mesaIdOriginal = mesa.id; // Captura el id de la mesa original
          el._draggableBolita = Draggable.create(el, {
            type: 'left,top',
            minimumMovement: 2,
            onPress: function(e) {
              window.isDraggingInvitadoOrBolita = true;
              // DESHABILITAR TODOS LOS DRAGGABLES DE MESAS
              Object.values(mesaRefs.current).forEach(ref => {
                const mesaEl = ref.current;
                if (mesaEl && mesaEl._draggable) {
                  mesaEl._draggable.disable();
                }
              });
              // Guardar snapshot de las posiciones de las mesas (copia profunda)
              snapshotMesasPlano.current = mesasPlano.map(m => ({
                ...m,
                invitados: m.invitados ? m.invitados.map(inv => ({ ...inv })) : []
              }));
              // Resetear transformaciones de GSAP en todas las mesas para el snapshot
              Object.values(mesaRefs.current).forEach(ref => {
                const mesaEl = ref.current;
                if (mesaEl) {
                  gsap.set(mesaEl, { x: 0, y: 0 });
                }
              });
              console.log('SNAPSHOT MESAS:', snapshotMesasPlano.current);
              setIsDraggingInvitado(true);
              // Crear clon flotante
              const rect = el.getBoundingClientRect();
              const offsetX = e.clientX - rect.left;
              const offsetY = e.clientY - rect.top;
              const clone = el.cloneNode(true);
              clone.style.position = 'fixed';
              clone.style.width = rect.width + 'px';
              clone.style.height = rect.height + 'px';
              clone.style.pointerEvents = 'none';
              clone.style.zIndex = 9999;
              clone.style.opacity = 0.97;
              clone.classList.add('drag-clone');
              document.body.appendChild(clone);
              gsap.set(el, { opacity: 0 });
              // Centrar el clon bajo el cursor
              const offsetXClone = rect.width / 2;
              const offsetYClone = rect.height / 2;
              // Listener para mover el clon bajo el cursor
              function moveListener(ev) {
                clone.style.left = (ev.clientX - offsetXClone) + 'px';
                clone.style.top = (ev.clientY - offsetYClone) + 'px';
              }
              document.addEventListener('mousemove', moveListener);
              // Posicionar el clon en el primer frame
              clone.style.left = (e.clientX - offsetXClone) + 'px';
              clone.style.top = (e.clientY - offsetYClone) + 'px';
              let tempDraggable = Draggable.create(clone, {
                type: 'left,top',
                bounds: document.body,
                zIndexBoost: true,
                minimumMovement: 2,
                onPressInit: function() {
                  clone.style.left = (e.clientX - offsetXClone) + 'px';
                  clone.style.top = (e.clientY - offsetYClone) + 'px';
                },
                onDrag: function() {
                  clone.style.left = (this.pointerX - offsetXClone) + 'px';
                  clone.style.top = (this.pointerY - offsetYClone) + 'px';
                  let mesaHover = null;
                  Object.values(mesaRefs.current).forEach(ref => {
                    const mesaEl = ref.current;
                    if (mesaEl && Draggable.hitTest(clone, mesaEl, '50%')) {
                      mesaHover = mesaEl;
                    }
                    if (mesaEl) mesaEl.style.transform = '';
                  });
                  if (mesaHover) {
                    mesaHover.style.transform = 'scale(1.12)';
                  }
                },
                onRelease: function() {
                  Object.values(mesaRefs.current).forEach(ref => {
                    const mesaEl = ref.current;
                    if (mesaEl) mesaEl.style.transform = '';
                  });
                  let mesaDrop = null;
                  Object.values(mesaRefs.current).forEach(ref => {
                    const mesaEl = ref.current;
                    if (mesaEl && Draggable.hitTest(clone, mesaEl, '50%')) {
                      mesaDrop = mesaEl;
                    }
                  });
                  if (mesaDrop) {
                    console.log('[MAPA-MESAS] Mesa drop completa:', mesaDrop);
                    
                    // Buscar el elemento hijo que contiene el ID de la mesa
                    const mesaElement = mesaDrop.querySelector('.mapa-mesa-div');
                    console.log('[MAPA-MESAS] Elemento mesa encontrado:', mesaElement);
                    
                    if (!mesaElement) {
                      console.error('[MAPA-MESAS] No se encontró el elemento de la mesa');
                      return;
                    }

                    const mesaIdDropDom = mesaElement.id.replace('mesa-', '');
                    console.log('[MAPA-MESAS] Mesa ID del DOM:', mesaIdDropDom);
                    console.log('[MAPA-MESAS] DocumentIds guardados:', mesaDocumentIds.current);
                    
                    if (!mesaIdDropDom) {
                      console.error('[MAPA-MESAS] No se pudo obtener el ID de la mesa del DOM');
                      return;
                    }

                    const documentId = mesaDocumentIds.current[mesaIdDropDom];
                    const mesaDestino = mesasPlano.find(m => String(m.id) === String(mesaIdDropDom));
                    
                    console.log('[MAPA-MESAS] Mesa golpeada:', {
                      id: mesaIdDropDom,
                      documentId: documentId,
                      mesaCompleta: mesaDestino
                    });
                    
                    if (!documentId) {
                      console.error('[MAPA-MESAS] No se encontró el documentId para la mesa:', mesaIdDropDom);
                      return;
                    }

                    const idMesaStrapi = documentId;
                    const mesaIdOriginal = mesa.id;
                    
                    if (mesaIdDropDom !== mesaIdOriginal) {
                      const invitadoIdStrapi = inv.documentId;
                      console.log('[MAPA-MESAS] PUT invitado', { 
                        invitadoIdStrapi, 
                        idMesaStrapi,
                        inv,
                        mesaDestino
                      });

                      fetch(`${urlstrapi}/api/invitados/${invitadoIdStrapi}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${STRAPI_TOKEN}`
                        },
                        body: JSON.stringify({ 
                          data: { 
                            mesa: idMesaStrapi ? idMesaStrapi : null
                          } 
                        })
                      })
                      .then(res => res.json())
                      .then(() => {
                        fetch(
                          `${urlstrapi}/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
                        )
                          .then((response) => response.json())
                          .then((data) => {
                            const invitadosData = data?.data.map((invitado) => ({
                              id: invitado.id,
                              documentId: invitado.documentId,
                              nombre: invitado?.nombre,
                              imagen: invitado?.personaje
                                ? `https://boda-strapi-production.up.railway.app${invitado?.personaje?.imagen?.url}`
                                : "",
                              mesaId: invitado?.mesa?.id || 0,
                              mesaDocumentId: invitado?.mesa?.documentId || "",
                              mesa: invitado?.mesa?.nombre || "",
                              grupoOrigenId: invitado?.grupo_origen?.id || 0,
                              grupoOrigen: invitado?.grupo_origen?.nombre || "Sin grupo"
                            }));
                            setInvitados(invitadosData);
                            // Organizar por grupo de origen
                            const grupos = {};
                            invitadosData.forEach((inv) => {
                              if (!grupos[inv.grupoOrigenId]) {
                                grupos[inv.grupoOrigenId] = {
                                  nombre: inv.grupoOrigen,
                                  invitados: []
                                };
                              }
                              grupos[inv.grupoOrigenId].invitados.push({
                                id: inv.id,
                                documentId: inv.documentId,
                                nombre: inv.nombre,
                                imagen: inv.imagen,
                                mesa: inv.mesa,
                                mesaId: inv.mesaId,
                                mesaDocumentId: inv.mesaDocumentId
                              });
                            });
                            setPorGrupoOrigen(grupos);
                            // Organizar por mesa
                            const mesas = {};
                            invitadosData.forEach((inv) => {
                              if (!mesas[inv.mesaId]) {
                                mesas[inv.mesaId] = {
                                  id: inv.mesaId,
                                  documentId: inv.mesaDocumentId,
                                  nombre: inv.mesa,
                                  invitados: []
                                };
                              }
                              mesas[inv.mesaId].invitados.push({
                                id: inv.id,
                                documentId: inv.documentId,
                                nombre: inv.nombre,
                                imagen: inv.imagen,
                                grupoOrigen: inv.grupoOrigen
                              });
                            });
                            setMesasOrganizadas(mesas);
                            // Actualizar mesasPlano con los nuevos invitados
                            setMesasPlano(prev => prev.map(m => {
                              const mesaActualizada = mesas[m.id];
                              if (mesaActualizada) {
                                return { ...m, invitados: mesaActualizada.invitados };
                              }
                              return { ...m, invitados: [] };
                            }));
                          });
                      });
                    }
                    if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                    gsap.set(el, { opacity: 1 });
                    if (tempDraggable && typeof tempDraggable.kill === 'function') tempDraggable.kill();
                  } else {
                    // Animar el clon de vuelta a su posición inicial
                    gsap.to(clone, {
                      left: rect.left + 'px',
                      top: rect.top + 'px',
                      duration: 0.35,
                      ease: 'power2.inOut',
                      onComplete: () => {
                        if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                        gsap.set(el, { opacity: 1 });
                        if (tempDraggable && typeof tempDraggable.kill === 'function') tempDraggable.kill();
                      }
                    });
                  }
                  setIsDraggingInvitado(false);
                  window.isDraggingInvitadoOrBolita = false;
                }
              })[0];
              tempDraggable.startDrag(e);
              return false;
            }
          })[0];
        }
      });
    });
  }, [mesasPlano]);

  function renderMesa(mesa) {
    // Obtener invitados de la mesa (por id)
    const invitadosMesa = mesa.invitados || [];
    // Bolitas de invitados
    let bolitas = [];
    if (mesa.tipo === 'redonda' || mesa.tipo === 'simple') {
      // Distribuir en círculo
      const radio = (mesa.tipo === 'redonda' ? diametroRedonda : diametroSimple) / 2 + 20;
      bolitas = invitadosMesa.map((inv, idx) => {
        const ang = (2 * Math.PI * idx) / invitadosMesa.length - Math.PI/2;
        const bx = Math.cos(ang) * radio;
        const by = Math.sin(ang) * radio;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || (mesa.tipo==='redonda'?'#6366f1':'#10b981');
        return (
          <g key={inv.id} transform={`translate(${bx},${by})`} style={{cursor: 'pointer'}} onClick={() => setInvitadoDetalle(inv)}>
            <circle r={13} fill={colorGrupo} stroke="#fff" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>{inv.nombre.length > 6 ? inv.nombre.slice(0,6)+'…' : inv.nombre}</text>
          </g>
        );
      });
    } else if (mesa.tipo === 'imperial') {
      // Distribuir en los lados del rectángulo
      const total = invitadosMesa.length;
      const perLado = Math.ceil(total / 2);
      bolitas = invitadosMesa.map((inv, idx) => {
        const lado = idx < perLado ? 'top' : 'bottom';
        const pos = idx % perLado;
        const espacio = largoImperial / (perLado + 1);
        const bx = -largoImperial/2 + espacio * (pos + 1);
        const by = lado === 'top' ? -anchoImperial/2 - 18 : anchoImperial/2 + 18;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        return (
          <g key={inv.id} transform={`translate(${bx},${by})`} style={{cursor: 'pointer'}} onClick={() => setInvitadoDetalle(inv)}>
            <circle r={13} fill={colorGrupo} stroke="#fff" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>{inv.nombre.length > 6 ? inv.nombre.slice(0,6)+'…' : inv.nombre}</text>
          </g>
        );
      });
    }
    // Mesa
    if (mesa.tipo === 'redonda') {
      return (
        <g key={mesa.id} id={'mesa-' + mesa.id} style={{cursor:'grab'}} transform={`translate(${mesa.x},${mesa.y})`}>
          <circle r={diametroRedonda/2} fill="#f3f4f6" stroke="#6366f1" strokeWidth={5} filter="url(#mesaShadow)" />
          <text x={0} y={0} textAnchor="middle" dy=".3em" fontSize={22} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008'}}>R</text>
          <g>
            <rect x={-45} y={34} width={90} height={22} rx={8} fill="#fff" fillOpacity={0.85} />
            <text x={0} y={50} textAnchor="middle" fontSize={15} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008', letterSpacing:0.5}}>{mesa.nombre}</text>
          </g>
          {bolitas}
        </g>
      );
    }
    if (mesa.tipo === 'imperial') {
      return (
        <g key={mesa.id} id={'mesa-' + mesa.id} style={{cursor:'grab'}} transform={`translate(${mesa.x},${mesa.y})`}>
          <rect x={-largoImperial/2} y={-anchoImperial/2} width={largoImperial} height={anchoImperial} rx={16} fill="#f3f4f6" stroke="#f59e42" strokeWidth={5} filter="url(#mesaShadow)" />
          <text x={0} y={0} textAnchor="middle" dy=".3em" fontSize={22} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008'}}>I</text>
          <g>
            <rect x={-60} y={34} width={120} height={22} rx={8} fill="#fff" fillOpacity={0.85} />
            <text x={0} y={50} textAnchor="middle" fontSize={15} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008', letterSpacing:0.5}}>{mesa.nombre}</text>
          </g>
          {bolitas}
        </g>
      );
    }
    // Simple
    return (
      <g key={mesa.id} id={'mesa-' + mesa.id} style={{cursor:'grab'}} transform={`translate(${mesa.x},${mesa.y})`}>
        <circle r={diametroSimple/2} fill="#f3f4f6" stroke="#10b981" strokeWidth={5} filter="url(#mesaShadow)" />
        <text x={0} y={0} textAnchor="middle" dy=".3em" fontSize={22} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008'}}>S</text>
        <g>
          <rect x={-35} y={24} width={70} height={20} rx={8} fill="#fff" fillOpacity={0.85} />
          <text x={0} y={38} textAnchor="middle" fontSize={13} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008', letterSpacing:0.5}}>{mesa.nombre}</text>
        </g>
        {bolitas}
      </g>
    );
  }

  // Función para renderizar mesas como divs (ahora dentro del componente)
  function renderMesaDiv(mesa) {
    const invitadosMesa = mesa.invitados || [];
    // Tamaños
    let mesaWidth, mesaHeight, claseMesa, label;
    if (mesa.tipo === 'redonda') {
      mesaWidth = mesaHeight = 90;
      claseMesa = 'mapa-mesa-div mapa-mesa-redonda';
      label = 'R';
    } else if (mesa.tipo === 'imperial') {
      mesaWidth = 160;
      mesaHeight = 50;
      claseMesa = 'mapa-mesa-div mapa-mesa-imperial';
      label = 'I';
    } else {
      mesaWidth = mesaHeight = 60;
      claseMesa = 'mapa-mesa-div mapa-mesa-simple';
      label = 'S';
    }
    // Tamaño del contenedor externo (deja margen para bolitas)
    const padding = 50; // Aumentado de 40 a 50
    const width = mesaWidth + padding * 2;
    const height = mesaHeight + padding * 2;

    // Guardar el documentId en el ref
    mesaDocumentIds.current[mesa.id] = mesa.documentId;

    // Bolitas alrededor
    let bolitas = [];
    if (mesa.tipo === 'redonda' || mesa.tipo === 'simple') {
      const radio = mesaWidth/2 + 30; // Aumentado de 20 a 30
      bolitas = invitadosMesa.map((inv, idx) => {
        const ang = (2 * Math.PI * idx) / invitadosMesa.length - Math.PI/2;
        const bx = width/2 + Math.cos(ang) * radio - 13;
        const by = height/2 + Math.sin(ang) * radio - 13;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || (mesa.tipo==='redonda'?'#6366f1':'#10b981');
        return (
          <div
            key={inv.id}
            className={"mapa-invitado-bolita" + (mesa.tipo==='imperial' ? ' imperial' : '')}
            style={{ 
              left: bx, 
              top: by, 
              background: colorGrupo,
              width: '26px',
              height: '26px',
              borderRadius: '13px',
              fontSize: '14px',
              cursor: 'grab',
              pointerEvents: 'auto' // Aseguramos que los eventos funcionen
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              // Iniciar el drag inmediatamente
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={() => setInvitadoDetalle(inv)}
          >{inv.nombre[0]}</div>
        );
      });
    } else if (mesa.tipo === 'imperial') {
      const total = invitadosMesa.length;
      const perLado = Math.ceil(total / 2);
      bolitas = invitadosMesa.map((inv, idx) => {
        const lado = idx < perLado ? 'top' : 'bottom';
        const pos = idx % perLado;
        const espacio = mesaWidth / (perLado + 1);
        const bx = width/2 - mesaWidth/2 + espacio * (pos + 1) - 13;
        const by = lado === 'top' ? height/2 - mesaHeight/2 - 25 : height/2 + mesaHeight/2 - 10; // Aumentado de 16 a 25
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        return (
          <div
            key={inv.id}
            className={"mapa-invitado-bolita imperial"}
            style={{ 
              left: bx, 
              top: by, 
              background: colorGrupo,
              width: '26px',
              height: '26px',
              borderRadius: '13px',
              fontSize: '14px',
              cursor: 'grab',
              pointerEvents: 'auto' // Aseguramos que los eventos funcionen
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              // Iniciar el drag inmediatamente
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={() => setInvitadoDetalle(inv)}
          >{inv.nombre[0]}</div>
        );
      });
    }
    return (
      <div
        key={mesa.id}
        className="mapa-mesa-contenedor"
        style={{ width, height, position: 'absolute' }}
        ref={getMesaRef(mesa.id)}
      >
        <div
          id={'mesa-' + mesa.id}
          className={claseMesa}
          style={{ width: mesaWidth, height: mesaHeight, background: getMesaBackground(mesa), position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          onClick={() => setMesaDetalle(mesa)}
        >
          <span className="mapa-mesa-label">{label}</span>
          <span className="mapa-mesa-nombre">{mesa.nombre}</span>
        </div>
        <div className="mapa-mesa-bolitas-area" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {bolitas}
        </div>
      </div>
    );
  }

  if (cargando) return <p>Cargando datos de invitados...</p>;
  if (error) return <p>{error}</p>;

  // Layout base y panel lateral
  return (
    <div className="mapa-mesas-root">
      {/* Panel lateral */}
      <aside className="mapa-mesas-panel">
        <h2 style={{marginTop:0}}>Grupos de origen</h2>
        {Object.values(porGrupoOrigen).map(grupo => (
          <details key={grupo.nombre} className="mapa-mesas-grupo">
            <summary>{grupo.nombre}</summary>
            <div style={{marginLeft:12}}>
              {grupo.invitados.map(inv => {
                // Comprobar si el invitado tiene mesa asignada en Strapi
                const tieneMesaStrapi = inv.mesaId && inv.mesaId !== 0;
                // Comprobar si el invitado está en alguna mesa actualmente
                const enMesa = Object.values(mesasOrganizadas).some(mesa => mesa.invitados.some(i => i.id === inv.id));
                let colorBolita = undefined;
                let colorTexto = undefined;
                if (tieneMesaStrapi) {
                  colorBolita = '#22c55e'; // verde
                  colorTexto = '#22c55e';
                } else {
                  colorBolita = '#f43f5e'; // rojo
                  colorTexto = '#f43f5e';
                }
                return (
                  <div
                    key={inv.id}
                    className="mapa-mesas-invitado"
                    ref={(!tieneMesaStrapi) ? getInvitadoRef(inv.id) : null}
                  >
                    <div
                      className="mapa-mesas-bolita"
                      style={{background: colorBolita, color: colorBolita ? '#fff' : undefined}}
                    >{inv.nombre[0]}</div>
                    <span style={{fontSize:15, color: colorTexto}}>{inv.nombre}</span>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
        
        {/* Sección de invitados sin mesa */}
        <div style={{marginTop: 24, padding: '16px', background: '#2a2a32', borderRadius: '8px'}}>
          <h3 style={{marginTop: 0, marginBottom: 12, fontSize: 16}}>Invitados sin mesa</h3>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
            {Object.values(porGrupoOrigen).flatMap(grupo => 
              grupo.invitados.filter(inv => {
                const sinMesa = !inv.mesaId || inv.mesaId === 0;
                const noEnMesa = !Object.values(mesasOrganizadas).some(mesa => 
                  mesa.invitados.some(i => i.id === inv.id)
                );
                return sinMesa || noEnMesa;
              }).map(inv => {
                const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
                const colorGrupo = grupoColorMap[grupo] || '#6366f1';
                return (
                  <div
                    key={inv.id}
                    className="mapa-mesas-bolita-flotante"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '18px',
                      background: colorGrupo,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      cursor: 'grab',
                      boxShadow: '0 2px 8px #0004',
                      border: '2px solid #fff'
                    }}
                    ref={getInvitadoRef(inv.id)}
                    onClick={() => setInvitadoDetalle(inv)}
                  >
                    {inv.nombre[0]}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button className="mapa-mesas-btn-add" onClick={()=>setShowAddMesa(true)}>Añadir mesa</button>
        {/* Botón para descargar backup */}
        <button
          className="mapa-mesas-btn-backup"
          onClick={() => {
            const data = localStorage.getItem('mesasPosiciones') || '{}';
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mesas-backup.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >Descargar backup</button>
        {/* Botón para subir backup */}
        <input
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          id="input-backup-mesas"
          onChange={e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const data = JSON.parse(ev.target.result);
                localStorage.setItem('mesasPosiciones', JSON.stringify(data));
                // Forzar recarga de posiciones
                setMesasPlano(prev => prev.map(m => data[m.id] ? { ...m, x: data[m.id].x, y: data[m.id].y } : m));
                alert('Backup restaurado correctamente.');
              } catch {
                alert('Archivo de backup no válido.');
              }
            };
            reader.readAsText(file);
            // Limpiar el input para permitir subir el mismo archivo de nuevo si se desea
            e.target.value = '';
          }}
        />
        <button
          className="mapa-mesas-btn-restore"
          onClick={() => document.getElementById('input-backup-mesas').click()}
        >Restaurar backup</button>
      </aside>
      {/* Plano central */}
      <main ref={planoRef} className="mapa-mesas-main">
        <div className="mapa-mesas-area">
          {(isDraggingInvitado ? snapshotMesasPlano.current : mesasPlano).map(mesa => renderMesaDiv(mesa))}
        </div>
        {/* Modal para añadir mesa */}
        {showAddMesa && (
          <div className="mapa-mesas-modal-bg">
            <div className="mapa-mesas-modal">
              <h3>Tipo de mesa</h3>
              <button onClick={()=>{setTipoMesa('redonda');setShowAddMesa(false);}}>Redonda (máx. 11)</button>
              <button onClick={()=>{setTipoMesa('imperial');setShowAddMesa(false);}}>Imperial (máx. 16)</button>
              <button onClick={()=>{setTipoMesa('simple');setShowAddMesa(false);}}>Simple (máx. 7)</button>
              <button onClick={()=>setShowAddMesa(false)}>Cancelar</button>
            </div>
          </div>
        )}
        {/* Modal de detalle de mesa */}
        {mesaDetalle && (
          <div className="mapa-mesas-modal-bg" style={{zIndex: 10000}} onClick={() => setMesaDetalle(null)}>
            <div className="mapa-mesas-modal" style={{minWidth: 420, minHeight: 320, position: 'relative'}} onClick={e => e.stopPropagation()}>
              <button style={{position:'absolute',top:10,right:10,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}} onClick={()=>setMesaDetalle(null)}>&times;</button>
              <h2 style={{textAlign:'center',marginTop:0,marginBottom:12}}>{mesaDetalle.nombre}</h2>
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginBottom:16}}>
                <div style={{
                  width: mesaDetalle.tipo==='imperial'?320:180,
                  height: mesaDetalle.tipo==='imperial'?320:180,
                  position:'relative',
                  margin:'0 auto',
                  display:'block'
                }}>
                  {/* Mesa centrada */}
                  <div style={{
                    position:'absolute',
                    left:'50%',
                    top:'50%',
                    transform:'translate(-50%,-50%)',
                    width: mesaDetalle.tipo==='imperial'?160:180,
                    height: mesaDetalle.tipo==='imperial'?50:180,
                    borderRadius: mesaDetalle.tipo==='imperial'?18:'50%',
                    background: getMesaBackground(mesaDetalle),
                    border: `4px solid ${mesaDetalle.tipo==='imperial'?'#f59e42':'#6366f1'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <span style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',fontSize:28,fontWeight:800,color:'#18181b',opacity:0.9}}>{mesaDetalle.nombre}</span>
                  </div>
                  {/* Invitados centrados alrededor */}
                  {(() => {
                    const invitados = mesaDetalle.invitados;
                    const size = mesaDetalle.tipo==='imperial'?320:180;
                    const radio = mesaDetalle.tipo==='imperial'?110:110;
                    return invitados.map((inv,idx)=>{
                      const ang = (2*Math.PI*idx)/invitados.length-Math.PI/2;
                      const cx = size/2;
                      const cy = size/2;
                      const bx = cx + Math.cos(ang)*radio - 18;
                      const by = cy + Math.sin(ang)*radio - 18;
                      const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
                      const colorGrupo = grupoColorMap[grupo] || (mesaDetalle.tipo==='imperial'?'#f59e42':'#6366f1');
                      return <div key={inv.id} style={{position:'absolute',left:bx,top:by,width:36,height:36,borderRadius:18,background:colorGrupo,color:'#18181b',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,border:'2px solid #fff',boxShadow:'0 2px 8px #0004'}}>{inv.nombre[0]}</div>
                    });
                  })()}
                </div>
              </div>
              <div style={{textAlign:'center',marginTop:24}}>
                <b style={{color:'#18181b',fontSize:16}}>Invitados:</b>
                <ul style={{listStyle:'none',padding:0,margin:0,marginTop:12,display:'flex',flexDirection:'column',alignItems:'center'}}>
                  {mesaDetalle.invitados.map(inv=>{
                    const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
                    const colorGrupo = grupoColorMap[grupo] || '#6366f1';
                    return (
                      <li key={inv.id} style={{marginBottom:7,display:'flex',alignItems:'center',color:'#18181b',fontSize:15}}>
                        <span style={{display:'inline-block',width:18,height:18,borderRadius:9,background:colorGrupo,marginRight:8,border:'2px solid #fff',boxShadow:'0 1px 4px #0002',fontWeight:700,color:'#18181b',textAlign:'center',lineHeight:'18px',fontSize:13}}>{inv.nombre[0]}</span>
                        {inv.nombre}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
        {/* Modal de detalle de invitado */}
        {invitadoDetalle && (
          <div className="mapa-mesas-modal-bg" style={{zIndex: 10000}} onClick={() => setInvitadoDetalle(null)}>
            <div className="mapa-mesas-modal" style={{minWidth: 320, minHeight: 240, position: 'relative'}} onClick={e => e.stopPropagation()}>
              <button style={{position:'absolute',top:10,right:10,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}} onClick={()=>setInvitadoDetalle(null)}>&times;</button>
              <h2 style={{textAlign:'center',marginTop:0,marginBottom:12}}>{invitadoDetalle.nombre}</h2>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: grupoColorMap[invitadoDetalle.grupoOrigen] || '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 48,
                  fontWeight: 700,
                  border: '4px solid #fff',
                  boxShadow: '0 4px 12px #0004'
                }}>
                  {invitadoDetalle.nombre[0]}
                </div>
                <div style={{textAlign:'center'}}>
                  <p style={{margin:0,fontSize:16,color:'#18181b'}}>
                    <b>Grupo:</b> {invitadoDetalle.grupoOrigen}
                  </p>
                  <p style={{margin:'8px 0 0',fontSize:16,color:'#18181b'}}>
                    <b>Mesa:</b> {
                      (() => {
                        // Buscar la mesa actual del invitado
                        const mesaActual = Object.values(mesasOrganizadas).find(mesa => 
                          mesa.invitados.some(i => i.id === invitadoDetalle.id)
                        );
                        return mesaActual ? mesaActual.nombre : 'Sin asignar';
                      })()
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MapaMesas; 