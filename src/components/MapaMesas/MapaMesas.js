import React, { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import './MapaMesas.scss';
import Modal from './components/Modal/Modal';
import PanelLateral from './components/PanelLateral/PanelLateral';
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
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [invitadosOrdenados, setInvitadosOrdenados] = useState({});
  const diametroRedonda = 'var(--diametro-redonda)';
  const largoImperial = 'var(--largo-imperial)';
  const anchoImperial = 'var(--ancho-imperial)';
  // Refs para cada mesa
  const mesaRefs = useRef({});
  // Refs para invitados sin mesa
  const invitadoRefs = useRef({});
  // Refs para bolitas
  const bolitaRefs = useRef({});
  // Ref para almacenar los documentIds de las mesas
  const mesaDocumentIds = useRef({});
  const [mesasInicializadas, setMesasInicializadas] = useState(false);
  const mesaPositions = useRef({});
  const [isDraggingInvitado, setIsDraggingInvitado] = useState(false);
  const [isDraggingMesa, setIsDraggingMesa] = useState(false);
  const DISTANCIA_SCALE = 7; // Factor de escala para las distancias en dvh
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [mesaNumbers, setMesaNumbers] = useState({});
  const [isUpdatingNumbers, setIsUpdatingNumbers] = useState(false);

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

  // Función para actualizar la posición de una mesa en Strapi
  const actualizarPosicionMesa = async (mesaId, x, y) => {
    console.log('[MAPA-MESAS] Iniciando actualización de posición para mesa:', mesaId);
    try {
      // Obtener el documentId de la mesa
      const mesa = mesasPlano.find(m => String(m.id) === String(mesaId));
      if (!mesa) {
        console.error('[MAPA-MESAS] No se encontró la mesa:', mesaId);
        return;
      }

      // Primero obtener los datos actuales de la mesa
      const getResponse = await fetch(`${urlstrapi}/api/mesas/${mesa.documentId}`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });

      if (!getResponse.ok) {
        throw new Error(`Error HTTP al obtener datos: ${getResponse.status}`);
      }

      const mesaData = await getResponse.json();
      console.log('Datos de la mesa:', mesaData);
      
      // Obtener mapaMesasData actual o crear uno nuevo
      const mapaMesasDataActual = mesaData.data?.attributes?.mapaMesasData || {};

      // Actualizar manteniendo los datos existentes
      const response = await fetch(`${urlstrapi}/api/mesas/${mesa.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: JSON.stringify({
          data: {
            mapaMesasData: {
              ...mapaMesasDataActual,
              posicion: { x, y }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP al actualizar: ${response.status}`);
      }

      console.log(`[MAPA-MESAS] Posición actualizada en Strapi para mesa ${mesaId}:`, { x, y });

      // Actualizar mesaPositions
      mesaPositions.current[mesaId] = { x, y };

      // Forzar actualización de mesasPlano y lanzar animación
      setMesasPlano(prev => {
        const nuevas = prev.map(m => m.id === mesaId ? { ...m, x, y } : m);
        return nuevas;
      });

      // Lanzar animación de números
      setIsUpdatingNumbers(true);
      const numerosActuales = document.querySelectorAll('.mapa-mesa-numero');
      numerosActuales.forEach(num => {
        gsap.to(num, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            // Calcular nuevos números
            const nuevosNumeros = calcularOrdenMesas(mesasPlano);
            setMesaNumbers(nuevosNumeros);
            
            // Animar la aparición de los nuevos números
            requestAnimationFrame(() => {
              const nuevosNumerosElementos = document.querySelectorAll('.mapa-mesa-numero');
              nuevosNumerosElementos.forEach(num => {
                gsap.fromTo(num, 
                  { scale: 0, opacity: 0 },
                  { 
                    scale: 1, 
                    opacity: 1, 
                    duration: 0.4,
                    ease: "elastic.out(1, 0.5)",
                    onComplete: () => setIsUpdatingNumbers(false)
                  }
                );
              });
            });
          }
        });
      });

    } catch (error) {
      console.error('[MAPA-MESAS] Error al actualizar posición en Strapi:', error);
    }
  };

  // Efecto para inicializar las posiciones de las mesas
  useEffect(() => {
    if (!mesasPlano.length || mesasInicializadas) return;
    
    mesasPlano.forEach(mesa => {
      const el = mesaRefs.current[mesa.id]?.current;
      if (el) {
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        el.style.left = `${mesa.x - width/2}px`;
        el.style.top = `${mesa.y - height/2}px`;
        el.style.transform = 'none';
        mesaPositions.current[mesa.id] = { x: mesa.x, y: mesa.y };
      }
    });
    
    setMesasInicializadas(true);
  }, [mesasPlano, mesasInicializadas]);

  // Función para actualizar la posición de una mesa en el DOM
  const updateMesaPosition = (mesaId, x, y) => {
    const mesaEl = mesaRefs.current[mesaId]?.current;
    if (mesaEl) {
      const width = mesaEl.offsetWidth;
      const height = mesaEl.offsetHeight;
      mesaEl.style.left = `${x - width/2}px`;
      mesaEl.style.top = `${y - height/2}px`;
      mesaEl.style.transform = 'none';
      mesaPositions.current[mesaId] = { x, y };
    }
  };

  useEffect(() => {
    // Primero obtener todas las mesas de Strapi
    fetch(`${urlstrapi}/api/mesas?populate=*`)
      .then(response => response.json())
      .then(mesasData => {
        console.log('Mesas de Strapi:', mesasData);
        // Calcular posiciones para las que no tienen posición guardada
        let sinPosicionIdx = 0;
        const startX = 1200;
        const startY = 800;
        const spacing = 180;
        const todasLasMesas = mesasData.data.map((mesa, idx) => {
          // Log completo para depuración
          console.log('Mesa recibida de Strapi:', mesa);
          // Leer posición correctamente del JSON de Strapi
          let x = 0;
          let y = 0;
          let tienePosicion = false;
          if (
            mesa.mapaMesasData &&
            mesa.mapaMesasData.posicion &&
            typeof mesa.mapaMesasData.posicion.x === 'number' &&
            typeof mesa.mapaMesasData.posicion.y === 'number'
          ) {
            x = mesa.mapaMesasData.posicion.x;
            y = mesa.mapaMesasData.posicion.y;
            tienePosicion = true;
            console.log(`Mesa ${mesa.id} posición encontrada en Strapi:`, x, y);
          } else {
            // Asignar posición en fila abajo a la derecha
            x = startX + sinPosicionIdx * spacing;
            y = startY;
            sinPosicionIdx++;
            console.log(`Mesa ${mesa.id} SIN posición guardada en Strapi, usando fila:`, x, y);
          }
          return {
            id: mesa.id,
            documentId: mesa.id,
            nombre: mesa.nombre || `Mesa ${mesa.id}`,
            tipo: mesa.tipo || 'redonda',
            mapaMesasData: mesa.mapaMesasData || {},
            x,
            y
          };
        });
        
        // Luego obtener los invitados
        return fetch(
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

            // Separar mesas con y sin invitados
            const mesasConInvitados = [];
            const mesasSinInvitados = [];
            
            todasLasMesas.forEach(mesaStrapi => {
              const mesaId = mesaStrapi.id;
              const mesa = mesas[mesaId] || {
                id: mesaId,
                documentId: mesaStrapi.documentId,
                nombre: mesaStrapi.nombre,
                tipo: mesaStrapi.tipo,
                invitados: [],
                x: mesaStrapi.x,
                y: mesaStrapi.y
              };
              
              if (mesa.invitados && mesa.invitados.length > 0) {
                mesasConInvitados.push(mesa);
              } else {
                mesasSinInvitados.push(mesa);
              }
            });

            console.log('Mesas con invitados:', mesasConInvitados);
            console.log('Mesas sin invitados:', mesasSinInvitados);
            console.log('Todas las mesas de Strapi:', todasLasMesas);

            // Posicionar mesas con invitados
            const mesasIniciales = mesasConInvitados.map((mesa, idx) => {
              // Usar SIEMPRE la posición guardada en Strapi
              const mesaStrapi = todasLasMesas.find(m => String(m.id) === String(mesa.id));
              let x = mesaStrapi?.x ?? 0;
              let y = mesaStrapi?.y ?? 0;
              // Eliminar cálculo circular
              let maxInv = 11;
              if (mesa.invitados.length > 11) maxInv = 16;
              mesaDocumentIds.current[mesa.id] = mesa.documentId;
              return {
                id: String(mesa.id),
                documentId: mesa.documentId,
                tipo: mesa.invitados.length > 11 ? 'imperial' : 'redonda',
                x,
                y,
                invitados: mesa.invitados,
                maxInv,
                nombre: mesa.nombre
              };
            });

            // Posicionar mesas sin invitados
            const startX = 1200;
            const startY = 800;
            const spacing = 180;
            mesasSinInvitados.forEach((mesa, idx) => {
              // Usar SIEMPRE la posición guardada en Strapi
              const mesaStrapi = todasLasMesas.find(m => String(m.id) === String(mesa.id));
              let x = mesaStrapi?.x ?? 0;
              let y = mesaStrapi?.y ?? 0;
              // Eliminar cálculo alternativo
              mesaDocumentIds.current[mesa.id] = mesa.documentId;
              mesasIniciales.push({
                id: String(mesa.id),
                documentId: mesa.documentId,
                tipo: mesa.tipo || 'redonda',
                x,
                y,
                invitados: [],
                maxInv: 11,
                nombre: mesa.nombre
              });
            });

            console.log('Mesas iniciales finales:', mesasIniciales);
            setMesasPlano(mesasIniciales);
            setCargando(false);

            // Dentro del .then donde se procesan los datos de las mesas:
            const ordenInvitados = {};
            mesasData.data.forEach(mesa => {
              if (mesa.mapaMesasData?.ordenInvitados) {
                ordenInvitados[mesa.id] = mesa.mapaMesasData.ordenInvitados;
              }
            });
            setInvitadosOrdenados(ordenInvitados);
          });
      })
      .catch((err) => {
        console.error('Error al obtener datos:', err);
        setError("Error al obtener los datos");
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
          tipo: tipoMesa,
          mapaMesasData: {
            posicion: { x, y }
          }
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
      // Actualizar la posición usando el ref
      updateMesaPosition(nuevaMesa.id, x, y);
    })
    .catch(error => {
      console.error('Error al crear la mesa:', error);
    });

    setTipoMesa(null);
  }, [tipoMesa]);

  // Efecto para hacer draggables las mesas
  useEffect(() => {
    if (!mesasInicializadas || isDraggingInvitado) return;

    mesasPlano.forEach(mesa => {
      if (!mesaRefs.current[mesa.id]) {
        mesaRefs.current[mesa.id] = React.createRef();
      }
      const el = mesaRefs.current[mesa.id].current;
      if (el && !el._draggable) {
        el._draggable = Draggable.create(el, {
          type: 'left,top',
          bounds: planoRef.current,
          inertia: true,
          onPress: function(e) {
            if (window.isDraggingInvitadoOrBolita) return false;
            if (e && e.target && e.target.classList && e.target.classList.contains('mapa-invitado-bolita')) return false;
            setIsDraggingMesa(true);
            window.isDraggingMesa = true;
          },
          onDrag: function() {
            // Mantener la posición relativa al contenedor
            const rect = el.getBoundingClientRect();
            const planoRect = planoRef.current.getBoundingClientRect();
            const newX = rect.left - planoRect.left;
            const newY = rect.top - planoRect.top;
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
          },
          onDragEnd: function() {
            const rect = el.getBoundingClientRect();
            const planoRect = planoRef.current.getBoundingClientRect();
            const newX = rect.left - planoRect.left + el.offsetWidth / 2;
            const newY = rect.top - planoRect.top + el.offsetHeight / 2;
            
            // Actualizar el estado solo si la posición ha cambiado
            if (newX !== mesa.x || newY !== mesa.y) {
              setMesasPlano(prev => {
                const nuevas = prev.map(m => m.id === mesa.id ? { ...m, x: newX, y: newY } : m);
                return nuevas;
              });
              actualizarPosicionMesa(mesa.id, newX, newY);
            }

            setIsDraggingMesa(false);
            window.isDraggingMesa = false;
          }
        })[0];
      }
    });
  }, [mesasPlano, isDraggingInvitado, mesasInicializadas]);

  // Efecto para hacer arrastrables los invitados sin mesa
  useEffect(() => {
    if (!porGrupoOrigen || !mesasPlano) return;

    Object.values(porGrupoOrigen).forEach(grupo => {
      grupo.invitados.forEach(inv => {
        if (!inv.mesaId || inv.mesaId === 0) {
          const ref = getInvitadoRef(inv.id);
          const el = ref.current;
          if (el && !el._draggable) {
            el._draggable = Draggable.create(el, {
              type: 'left,top',
              minimumMovement: 2,
              onPress: function(e) {
                if (e && e.preventDefault) e.preventDefault();
                setIsDraggingInvitado(true);
                window.isDraggingInvitadoOrBolita = true;
                
                // Matar todos los draggables de las mesas
                Object.values(mesaRefs.current).forEach(ref => {
                  const mesaEl = ref.current;
                  if (mesaEl && mesaEl._draggable) {
                    mesaEl._draggable.kill();
                    mesaEl._draggable = null;
                  }
                });
                
                // Crear clon flotante
                const rect = el.getBoundingClientRect();
                const clone = el.cloneNode(true);
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
                      const mesaElement = mesaDrop.querySelector('.mapa-mesa-div');
                      if (!mesaElement) return;

                      const mesaIdDropDom = mesaElement.id.replace('mesa-', '');
                      if (!mesaIdDropDom) return;

                      const documentId = mesaDocumentIds.current[mesaIdDropDom];
                      if (!documentId) return;

                      const idMesaStrapi = documentId;
                      console.log('Intentando asignar invitado a mesa:', {
                        invitadoId: inv.id,
                        mesaId: mesaIdDropDom,
                        mesaStrapiId: idMesaStrapi
                      });

                      // Siempre intentar guardar cuando se suelta sobre una mesa
                      const invitadoIdStrapi = inv.documentId;
                      console.log('Actualizando invitado:', {
                        invitadoId: invitadoIdStrapi,
                        mesaId: idMesaStrapi
                      });

                      fetch(`${urlstrapi}/api/invitados/${invitadoIdStrapi}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${STRAPI_TOKEN}`
                        },
                        body: JSON.stringify({ 
                          data: { 
                            mesa: idMesaStrapi
                          } 
                        })
                      })
                      .then(res => {
                        if (!res.ok) {
                          console.error('Error en la respuesta:', res.status, res.statusText);
                          throw new Error('Error al actualizar invitado');
                        }
                        console.log('Invitado actualizado exitosamente');
                        return res.json();
                      })
                      .then(() => {
                        console.log('Obteniendo datos actualizados...');
                        return fetch(
                          `${urlstrapi}/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
                        );
                      })
                      .then(res => {
                        if (!res.ok) {
                          console.error('Error al obtener datos actualizados:', res.status, res.statusText);
                          throw new Error('Error al obtener datos actualizados');
                        }
                        return res.json();
                      })
                      .then((data) => {
                        console.log('Datos actualizados recibidos:', data);
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
                        setInvitadoDetalle(null);
                      })
                      .catch(error => {
                        console.error('Error en el proceso de actualización:', error);
                      });
                    }

                    if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                    gsap.set(el, { opacity: 1, x: 0, y: 0 });
                    if (tempDraggable && typeof tempDraggable.kill === 'function') tempDraggable.kill();
                    setIsDraggingInvitado(false);
                    window.isDraggingInvitadoOrBolita = false;

                    // Recrear los draggables de las mesas
                    mesasPlano.forEach(mesa => {
                      const el = mesaRefs.current[mesa.id]?.current;
                      if (el && !el._draggable) {
                        el._draggable = Draggable.create(el, {
                          type: 'left,top',
                          bounds: planoRef.current,
                          inertia: true,
                          onPress: function(e) {
                            if (window.isDraggingInvitadoOrBolita) return false;
                            if (e && e.target && e.target.classList && e.target.classList.contains('mapa-invitado-bolita')) return false;
                            setIsDraggingMesa(true);
                            window.isDraggingMesa = true;
                          },
                          onDrag: function() {
                            // Mantener la posición relativa al contenedor
                            const rect = el.getBoundingClientRect();
                            const planoRect = planoRef.current.getBoundingClientRect();
                            const newX = rect.left - planoRect.left;
                            const newY = rect.top - planoRect.top;
                            el.style.left = `${newX}px`;
                            el.style.top = `${newY}px`;
                          },
                          onDragEnd: function() {
                            const rect = el.getBoundingClientRect();
                            const planoRect = planoRef.current.getBoundingClientRect();
                            const newX = rect.left - planoRect.left + el.offsetWidth / 2;
                            const newY = rect.top - planoRect.top + el.offsetHeight / 2;
                            
                            // Actualizar el estado solo si la posición ha cambiado
                            if (newX !== mesa.x || newY !== mesa.y) {
                              setMesasPlano(prev => {
                                const nuevas = prev.map(m => m.id === mesa.id ? { ...m, x: newX, y: newY } : m);
                                return nuevas;
                              });
                              actualizarPosicionMesa(mesa.id, newX, newY);
                            }

                            setIsDraggingMesa(false);
                            window.isDraggingMesa = false;
                          }
                        })[0];
                      }
                    });
                  }
                })[0];
                tempDraggable.startDrag(e);
                return false;
              }
            })[0];
          }
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
          const mesaIdOriginal = mesa.id;
          el._draggableBolita = Draggable.create(el, {
            type: 'left,top',
            minimumMovement: 2,
            onPress: function(e) {
              window.isDraggingInvitadoOrBolita = true;
              setIsDraggingInvitado(true);
              
              // Matar todos los draggables de las mesas
              Object.values(mesaRefs.current).forEach(ref => {
                const mesaEl = ref.current;
                if (mesaEl && mesaEl._draggable) {
                  mesaEl._draggable.kill();
                  mesaEl._draggable = null;
                }
              });
              
              // Crear clon flotante
              const rect = el.getBoundingClientRect();
              const clone = el.cloneNode(true);
              clone.style.position = 'fixed';
              clone.style.width = rect.width + 'px';
              clone.style.height = rect.height + 'px';
              clone.style.left = rect.left + 'px';
              clone.style.top = rect.top + 'px';
              clone.style.pointerEvents = 'none';
              clone.style.zIndex = 9999;
              clone.style.opacity = 0.97;
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
                    const mesaElement = mesaDrop.querySelector('.mapa-mesa-div');
                    if (!mesaElement) return;

                    const mesaIdDropDom = mesaElement.id.replace('mesa-', '');
                    if (!mesaIdDropDom) return;

                    const documentId = mesaDocumentIds.current[mesaIdDropDom];
                    const mesaDestino = mesasPlano.find(m => String(m.id) === String(mesaIdDropDom));
                    
                    if (!documentId) return;

                    const idMesaStrapi = documentId;
                    
                    if (String(mesaIdDropDom) !== String(mesaIdOriginal)) {
                      const invitadoIdStrapi = inv.documentId;
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
                        return fetch(
                          `${urlstrapi}/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
                        );
                      })
                      .then(res => res.json())
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

                        // Actualizar mesasPlano
                        setMesasPlano(prev => prev.map(m => {
                          const mesaActualizada = mesas[m.id];
                          if (mesaActualizada) {
                            return { ...m, invitados: mesaActualizada.invitados };
                          }
                          return { ...m, invitados: [] };
                        }));
                      });
                    }
                  }

                  if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                  gsap.set(el, { opacity: 1 });
                  if (tempDraggable && typeof tempDraggable.kill === 'function') tempDraggable.kill();
                  setIsDraggingInvitado(false);
                  window.isDraggingInvitadoOrBolita = false;

                  // Recrear los draggables de las mesas
                  mesasPlano.forEach(mesa => {
                    const el = mesaRefs.current[mesa.id]?.current;
                    if (el && !el._draggable) {
                      el._draggable = Draggable.create(el, {
                        type: 'left,top',
                        bounds: planoRef.current,
                        inertia: true,
                        onPress: function(e) {
                          if (window.isDraggingInvitadoOrBolita) return false;
                          if (e && e.target && e.target.classList && e.target.classList.contains('mapa-invitado-bolita')) return false;
                          setIsDraggingMesa(true);
                          window.isDraggingMesa = true;
                        },
                        onDrag: function() {
                          // Mantener la posición relativa al contenedor
                          const rect = el.getBoundingClientRect();
                          const planoRect = planoRef.current.getBoundingClientRect();
                          const newX = rect.left - planoRect.left;
                          const newY = rect.top - planoRect.top;
                          el.style.left = `${newX}px`;
                          el.style.top = `${newY}px`;
                        },
                        onDragEnd: function() {
                          const rect = el.getBoundingClientRect();
                          const planoRect = planoRef.current.getBoundingClientRect();
                          const newX = rect.left - planoRect.left + el.offsetWidth / 2;
                          const newY = rect.top - planoRect.top + el.offsetHeight / 2;
                          
                          // Actualizar el estado solo si la posición ha cambiado
                          if (newX !== mesa.x || newY !== mesa.y) {
                            setMesasPlano(prev => {
                              const nuevas = prev.map(m => m.id === mesa.id ? { ...m, x: newX, y: newY } : m);
                              return nuevas;
                            });
                            actualizarPosicionMesa(mesa.id, newX, newY);
                          }

                          setIsDraggingMesa(false);
                          window.isDraggingMesa = false;
                        }
                      })[0];
                    }
                  });
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

  // Función para calcular el orden de las mesas
  const calcularOrdenMesas = (mesas) => {
    // Ordenar mesas por posición (arriba a abajo, izquierda a derecha)
    const mesasOrdenadas = [...mesas].sort((a, b) => {
      const posA = mesaPositions.current[a.id] || { x: a.x, y: a.y };
      const posB = mesaPositions.current[b.id] || { x: b.x, y: b.y };
      
      // Primero comparar por Y (arriba a abajo)
      if (Math.abs(posA.y - posB.y) > 50) {
        return posA.y - posB.y;
      }
      // Si están aproximadamente en la misma altura, comparar por X (izquierda a derecha)
      return posA.x - posB.x;
    });

    // Crear nuevo objeto de números
    const nuevosNumeros = {};
    mesasOrdenadas.forEach((mesa, idx) => {
      nuevosNumeros[mesa.id] = idx + 1;
    });

    return nuevosNumeros;
  };

  // Efecto para actualizar números cuando cambian las posiciones
  useEffect(() => {
    if (!mesasPlano.length || isDraggingMesa) return;

    // Solo calcular números iniciales
    const nuevosNumeros = calcularOrdenMesas(mesasPlano);
    setMesaNumbers(nuevosNumeros);
  }, [mesasPlano, isDraggingMesa]);

  function renderMesa(mesa) {
    // Obtener invitados de la mesa (por id)
    const invitadosMesa = mesa.invitados || [];
    // Bolitas de invitados
    let bolitas = [];
    if (mesa.tipo === 'redonda') {
      // Distribuir en círculo
      const radio = 'calc(var(--diametro-redonda) / 2 + 2dvh)';
      bolitas = invitadosMesa.map((inv, idx) => {
        const ang = (2 * Math.PI * idx) / invitadosMesa.length - Math.PI/2;
        const bx = Math.cos(ang) * parseFloat(radio);
        const by = Math.sin(ang) * parseFloat(radio);
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#6366f1';
        return (
          <g key={inv.id} transform={`translate(${bx},${by})`} style={{cursor: 'pointer'}} onClick={() => setInvitadoDetalle(inv)}>
            <circle r={13} fill={colorGrupo} stroke="#fff" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>{inv.nombre.length > 6 ? inv.nombre.slice(0,6)+'…' : inv.nombre}</text>
          </g>
        );
      });
    } else if (mesa.tipo === 'imperial') {
      // Distribuir invitados en un patrón organizado alrededor de la mesa imperial
      const total = invitadosMesa.length;
      // Leer largo y ancho en dvh desde las variables CSS
      let largo = 16, ancho = 6;
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        const l = getComputedStyle(root).getPropertyValue('--largo-imperial');
        const a = getComputedStyle(root).getPropertyValue('--ancho-imperial');
        if (l) largo = parseFloat(l);
        if (a) ancho = parseFloat(a);
      }

      // Calcular el número de invitados por lado
      const invitadosPorLado = Math.ceil(total / 4);
      const espacioLateral = largo / (invitadosPorLado + 1);
      const espacioVertical = ancho / (invitadosPorLado + 1);
      const offset = 4; // Separación de la mesa

      bolitas = invitadosMesa.map((inv, idx) => {
        let bx = 0, by = 0;
        const lado = Math.floor(idx / invitadosPorLado);
        const posicionEnLado = idx % invitadosPorLado;

        switch (lado) {
          case 0: // Lado superior
            bx = -largo/2 + espacioLateral * (posicionEnLado + 1);
            by = -ancho/2 - offset;
            break;
          case 1: // Lado derecho
            bx = largo/2 + offset;
            by = -ancho/2 + espacioVertical * (posicionEnLado + 1);
            break;
          case 2: // Lado inferior
            bx = largo/2 - espacioLateral * (posicionEnLado + 1);
            by = ancho/2 + offset;
            break;
          case 3: // Lado izquierdo
            bx = -largo/2 - offset;
            by = ancho/2 - espacioVertical * (posicionEnLado + 1);
            break;
        }

        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        return (
          <div
            key={inv.id}
            className="mapa-invitado-bolita imperial"
            style={{ 
              transform: `translate(calc(-50% + ${bx}dvh), calc(-50% + ${by}dvh))`,
              background: colorGrupo
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
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
    // Mesa
    if (mesa.tipo === 'redonda') {
      return (
        <g key={mesa.id} id={'mesa-' + mesa.id} style={{cursor:'grab'}} transform={`translate(${mesa.x},${mesa.y})`}>
          <circle r="calc(var(--diametro-redonda) / 2)" fill="#f3f4f6" stroke="#6366f1" strokeWidth={5} filter="url(#mesaShadow)" />
          <text x={0} y={0} textAnchor="middle" dy=".3em" fontSize={22} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008'}}>R</text>
          <g>
            <rect x={-35} y={34} width={70} height={18} rx={6} fill="#fff" fillOpacity={0.85} />
            <text x={0} y={46} textAnchor="middle" fontSize="2.2dvh" fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008', letterSpacing:0.5}}>{mesa.nombre}</text>
          </g>
          {bolitas}
        </g>
      );
    }
    if (mesa.tipo === 'imperial') {
      return (
        <g key={mesa.id} id={'mesa-' + mesa.id} style={{cursor:'grab'}} transform={`translate(${mesa.x},${mesa.y})`}>
          <rect x="calc(var(--largo-imperial) / -2)" y="calc(var(--ancho-imperial) / -2)" width="var(--largo-imperial)" height="var(--ancho-imperial)" rx={16} fill="#f3f4f6" stroke="#f59e42" strokeWidth={5} filter="url(#mesaShadow)" />
          <text x={0} y={0} textAnchor="middle" dy=".3em" fontSize={22} fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008'}}>I</text>
          <g>
            <rect x={-45} y={34} width={90} height={18} rx={6} fill="#fff" fillOpacity={0.85} />
            <text x={0} y={46} textAnchor="middle" fontSize="2.2dvh" fill="#18181b" fontWeight={700} style={{textShadow:'0 2px 8px #fff, 0 1px 0 #0008', letterSpacing:0.5}}>{mesa.nombre}</text>
          </g>
          {bolitas}
        </g>
      );
    }
  }

  // Función para renderizar mesas como divs (ahora dentro del componente)
  function renderMesaDiv(mesa) {
    const invitadosMesa = mesa.invitados || [];
    // Tamaños
    let mesaWidth, mesaHeight, claseMesa, label, borderRadius;
    if (mesa.tipo === 'redonda') {
      mesaWidth = mesaHeight = 'var(--diametro-redonda)';
      claseMesa = 'mapa-mesa-div mapa-mesa-redonda';
      label = 'R';
      borderRadius = '50%';
    } else if (mesa.tipo === 'imperial') {
      mesaWidth = 'var(--largo-imperial)';
      mesaHeight = 'var(--ancho-imperial)';
      claseMesa = 'mapa-mesa-div mapa-mesa-imperial';
      label = 'I';
      borderRadius = 'calc(var(--ancho-imperial) / 4)';
    }

    // Tamaño del contenedor externo (deja margen para bolitas)
    const padding = '3dvh';
    const width = `calc(${mesaWidth} + ${padding} * 2)`;
    const height = `calc(${mesaHeight} + ${padding} * 2)`;

    // Guardar el documentId en el ref
    mesaDocumentIds.current[mesa.id] = mesa.documentId;

    // Usar la posición del ref si existe, sino usar la posición inicial
    const posicionActual = mesaPositions.current[mesa.id] || { x: mesa.x, y: mesa.y };

    // Bolitas alrededor
    let bolitas = [];
    if (mesa.tipo === 'redonda') {
      // Distribuir en círculo
      const radio = 'calc(var(--diametro-redonda) / 2 + 3dvh)';
      bolitas = invitadosMesa.map((inv, idx) => {
        const ang = (2 * Math.PI * idx) / Math.max(1, invitadosMesa.length) - Math.PI/2;
        const bx = `calc(${Math.cos(ang)} * var(--diametro-redonda) / 2 + ${Math.cos(ang)} * 3dvh)`;
        const by = `calc(${Math.sin(ang)} * var(--diametro-redonda) / 2 + ${Math.sin(ang)} * 3dvh)`;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#6366f1';
        return (
          <div
            key={inv.id}
            className="mapa-invitado-bolita"
            style={{ 
              transform: `translate(calc(-50% + ${bx}), calc(-50% + ${by}))`,
              background: colorGrupo
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setInvitadoDetalle(inv);
            }}
          >{inv.nombre[0]}</div>
        );
      });
    } else if (mesa.tipo === 'imperial') {
      // Distribuir en los 4 lados del rectángulo
      const total = invitadosMesa.length;
      let largo = 16, ancho = 6;
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        const l = getComputedStyle(root).getPropertyValue('--largo-imperial');
        const a = getComputedStyle(root).getPropertyValue('--ancho-imperial');
        if (l) largo = parseFloat(l);
        if (a) ancho = parseFloat(a);
      }
      // Área de dibujo cuadrada para referencia
      const area = Math.max(largo, ancho) + 8; // margen extra
      const cx = 0;
      const cy = 0;
      const mesaW = largo;
      const mesaH = ancho;
      const invitadoSize = 2.8; // en dvh
      const offset = 2.5; // separación desde el borde
      // Reparto en 4 lados
      const lados = [[], [], [], []];
      let idx = 0;
      for (let i = 0; i < total; i++) {
        lados[idx % 4].push(invitadosMesa[i]);
        idx++;
      }
      // Superior
      lados[0].forEach((inv, i) => {
        const gap = mesaW / (lados[0].length + 1);
        const bx = gap * (i + 1) - mesaW / 2;
        const by = -mesaH / 2 - offset;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        bolitas.push(
          <div
            key={inv.id}
            className="mapa-invitado-bolita imperial"
            style={{
              transform: `translate(calc(-50% + ${bx}dvh), calc(-50% + ${by}dvh))`,
              background: colorGrupo,
              width: `${invitadoSize}dvh`,
              height: `${invitadoSize}dvh`
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setInvitadoDetalle(inv);
            }}
          >{inv.nombre[0]}</div>
        );
      });
      // Derecha
      lados[1].forEach((inv, i) => {
        const gap = mesaH / (lados[1].length + 1);
        const bx = mesaW / 2 + offset;
        const by = gap * (i + 1) - mesaH / 2;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        bolitas.push(
          <div
            key={inv.id}
            className="mapa-invitado-bolita imperial"
            style={{
              transform: `translate(calc(-50% + ${bx}dvh), calc(-50% + ${by}dvh))`,
              background: colorGrupo,
              width: `${invitadoSize}dvh`,
              height: `${invitadoSize}dvh`
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setInvitadoDetalle(inv);
            }}
          >{inv.nombre[0]}</div>
        );
      });
      // Inferior
      lados[2].forEach((inv, i) => {
        const gap = mesaW / (lados[2].length + 1);
        const bx = mesaW / 2 - gap * (i + 1);
        const by = mesaH / 2 + offset;
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        bolitas.push(
          <div
            key={inv.id}
            className="mapa-invitado-bolita imperial"
            style={{
              transform: `translate(calc(-50% + ${bx}dvh), calc(-50% + ${by}dvh))`,
              background: colorGrupo,
              width: `${invitadoSize}dvh`,
              height: `${invitadoSize}dvh`
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setInvitadoDetalle(inv);
            }}
          >{inv.nombre[0]}</div>
        );
      });
      // Izquierda
      lados[3].forEach((inv, i) => {
        const gap = mesaH / (lados[3].length + 1);
        const bx = -mesaW / 2 - offset;
        const by = mesaH / 2 - gap * (i + 1);
        const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
        const colorGrupo = grupoColorMap[grupo] || '#f59e42';
        bolitas.push(
          <div
            key={inv.id}
            className="mapa-invitado-bolita imperial"
            style={{
              transform: `translate(calc(-50% + ${bx}dvh), calc(-50% + ${by}dvh))`,
              background: colorGrupo,
              width: `${invitadoSize}dvh`,
              height: `${invitadoSize}dvh`
            }}
            ref={bolitaRefs.current[`${mesa.id}-${inv.id}`]}
            onMouseDown={e => {
              e.stopPropagation();
              const el = bolitaRefs.current[`${mesa.id}-${inv.id}`].current;
              if (el && el._draggableBolita) {
                el._draggableBolita.startDrag(e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setInvitadoDetalle(inv);
            }}
          >{inv.nombre[0]}</div>
        );
      });
    }

    return (
      <div
        key={mesa.id}
        className="mapa-mesa-contenedor"
        style={{ 
          width, 
          height, 
          position: 'absolute',
          left: `${posicionActual.x - width/2}px`,
          top: `${posicionActual.y - height/2}px`,
          transform: 'none',
          willChange: 'transform'
        }}
        ref={getMesaRef(mesa.id)}
      >
        <div
          id={'mesa-' + mesa.id}
          className={claseMesa}
          style={{ 
            width: mesaWidth, 
            height: mesaHeight, 
            background: getMesaBackground(mesa),
            borderRadius: borderRadius,
            position: 'relative'
          }}
        >
          <div 
            className="mapa-mesa-centro"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60%',
              height: '60%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2
            }}
            onClick={(e) => {
              e.stopPropagation();
              setMesaDetalle(mesa);
            }}
          >
            <span className="mapa-mesa-nombre">{mesa.nombre}</span>
          </div>
          {/* Añadir el número de mesa */}
          <div 
            className="mapa-mesa-numero"
            style={{
              position: 'absolute',
              top: '10%',
              right: '10%',
              background: '#fff',
              color: '#18181b',
              width: '2.4dvh',
              height: '2.4dvh',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8dvh',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 3
            }}
          >
            {mesaNumbers[mesa.id] || ''}
          </div>
        </div>
        {bolitas}
      </div>
    );
  }

  // Función para actualizar el orden de los invitados
  const actualizarOrdenInvitados = async (mesaId, nuevoOrden) => {
    try {
      setIsSavingOrder(true);
      const mesa = mesasPlano.find(m => String(m.id) === String(mesaId));
      if (!mesa) return;

      // Obtener los datos actuales de la mesa
      const getResponse = await fetch(`${urlstrapi}/api/mesas/${mesa.documentId}`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });

      if (!getResponse.ok) {
        throw new Error(`Error HTTP al obtener datos: ${getResponse.status}`);
      }

      const mesaData = await getResponse.json();
      const mapaMesasDataActual = mesaData.data?.attributes?.mapaMesasData || {};

      // Asegurarnos de mantener la posición actual
      const posicionActual = mapaMesasDataActual.posicion || { x: mesa.x, y: mesa.y };

      // Actualizar manteniendo TODOS los datos existentes
      const response = await fetch(`${urlstrapi}/api/mesas/${mesa.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: JSON.stringify({
          data: {
            mapaMesasData: {
              ...mapaMesasDataActual,
              posicion: posicionActual,
              ordenInvitados: nuevoOrden
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP al actualizar: ${response.status}`);
      }

      // Actualizar el estado local
      setInvitadosOrdenados(prev => ({
        ...prev,
        [mesaId]: nuevoOrden
      }));

      // Actualizar mesasPlano manteniendo la posición
      setMesasPlano(prev => prev.map(m => {
        if (String(m.id) === String(mesaId)) {
          const invitadosOrdenados = [...m.invitados].sort((a, b) => {
            const ordenA = nuevoOrden[a.id] || 0;
            const ordenB = nuevoOrden[b.id] || 0;
            return ordenA - ordenB;
          });
          return { 
            ...m, 
            invitados: invitadosOrdenados,
            x: posicionActual.x,
            y: posicionActual.y
          };
        }
        return m;
      }));

      // Actualizar también la posición en mesaPositions
      mesaPositions.current[mesaId] = posicionActual;

      // Animar las bolitas después de guardar exitosamente
      setTimeout(() => {
        const dibujoContainer = document.querySelector('.mapa-mesas-modal-mesa-dibujo');
        if (!dibujoContainer) return;

        const invitados = mesa.invitados || [];
        const invitadosOrdenadosLista = [...invitados].sort((a, b) => {
          const ordenA = nuevoOrden[a.id] || 0;
          const ordenB = nuevoOrden[b.id] || 0;
          return ordenA - ordenB;
        });

        if (mesa.tipo === 'redonda') {
          const areaW = 64;
          const areaH = 48;
          const cx = areaW / 2;
          const cy = areaH / 2;
          const radio = 22;
          const invitadoSize = 5.5;

          // Animar cada bolita a su nueva posición
          invitadosOrdenadosLista.forEach((inv, idx) => {
            const ang = (2 * Math.PI * idx) / invitados.length - Math.PI / 2;
            const bx = cx + Math.cos(ang) * radio - invitadoSize / 2;
            const by = cy + Math.sin(ang) * radio - invitadoSize / 2;
            
            const bolita = dibujoContainer.querySelector(`[data-invitado-id="${inv.id}"]`);
            if (bolita) {
              // Guardar posición inicial
              const rect = bolita.getBoundingClientRect();
              const containerRect = dibujoContainer.getBoundingClientRect();
              const initialX = rect.left - containerRect.left;
              const initialY = rect.top - containerRect.top;

              // Animar a la nueva posición
              gsap.fromTo(bolita, 
                {
                  left: `${initialX}px`,
                  top: `${initialY}px`
                },
                {
                  left: `${bx}dvh`,
                  top: `${by}dvh`,
                  duration: 0.8,
                  ease: "elastic.out(1, 0.5)",
                  onStart: () => {
                    bolita.style.zIndex = "2";
                  },
                  onComplete: () => {
                    bolita.style.zIndex = "1";
                  }
                }
              );
            }
          });
        } else if (mesa.tipo === 'imperial') {
          const areaW = 64;
          const areaH = 48;
          const cx = areaW / 2;
          const cy = areaH / 2;
          const mesaW = 48;
          const mesaH = 24;
          const invitadoSize = 6;
          const offset = 4;
          const leftX = cx - mesaW / 2;
          const rightX = cx + mesaW / 2;
          const topY = cy - mesaH / 2;
          const bottomY = cy + mesaH / 2;

          // Distribuir en lados
          const lados = [[], [], [], []];
          let idx = 0;
          for (let i = 0; i < invitados.length; i++) {
            lados[idx % 4].push(invitadosOrdenadosLista[i]);
            idx++;
          }

          // Animar cada bolita a su nueva posición
          lados.forEach((lado, ladoIdx) => {
            lado.forEach((inv, posIdx) => {
              let bx = 0, by = 0;
              switch (ladoIdx) {
                case 0: // Superior
                  const gapTop = mesaW / (lado.length + 1);
                  bx = leftX + gapTop * (posIdx + 1) - invitadoSize / 2;
                  by = topY - offset - invitadoSize / 2;
                  break;
                case 1: // Derecha
                  const gapRight = mesaH / (lado.length + 1);
                  bx = rightX + offset - invitadoSize / 2;
                  by = topY + gapRight * (posIdx + 1) - invitadoSize / 2;
                  break;
                case 2: // Inferior
                  const gapBottom = mesaW / (lado.length + 1);
                  bx = leftX + gapBottom * (posIdx + 1) - invitadoSize / 2;
                  by = bottomY + offset - invitadoSize / 2;
                  break;
                case 3: // Izquierda
                  const gapLeft = mesaH / (lado.length + 1);
                  bx = leftX - offset - invitadoSize / 2;
                  by = topY + gapLeft * (posIdx + 1) - invitadoSize / 2;
                  break;
              }

              const bolita = dibujoContainer.querySelector(`[data-invitado-id="${inv.id}"]`);
              if (bolita) {
                // Guardar posición inicial
                const rect = bolita.getBoundingClientRect();
                const containerRect = dibujoContainer.getBoundingClientRect();
                const initialX = rect.left - containerRect.left;
                const initialY = rect.top - containerRect.top;

                // Animar a la nueva posición
                gsap.fromTo(bolita, 
                  {
                    left: `${initialX}px`,
                    top: `${initialY}px`
                  },
                  {
                    left: `${bx}dvh`,
                    top: `${by}dvh`,
                    duration: 0.8,
                    ease: "elastic.out(1, 0.5)",
                    onStart: () => {
                      bolita.style.zIndex = "2";
                    },
                    onComplete: () => {
                      bolita.style.zIndex = "1";
                    }
                  }
                );
              }
            });
          });
        }
      }, 100); // Pequeño delay para asegurar que el DOM se ha actualizado

    } catch (error) {
      console.error('Error al actualizar orden de invitados:', error);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Función para quitar un invitado de una mesa
  const quitarInvitadoMesa = async (invitadoId) => {
    try {
      const invitado = invitados.find(inv => inv.id === invitadoId);
      if (!invitado) return;

      // Actualizar el invitado en Strapi
      const response = await fetch(`${urlstrapi}/api/invitados/${invitado.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: JSON.stringify({
          data: {
            mesa: null
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP al actualizar invitado: ${response.status}`);
      }

      // Actualizar el estado local
      setInvitados(prev => prev.map(inv => 
        inv.id === invitadoId ? { ...inv, mesa: null, mesaId: null } : inv
      ));

      // Actualizar mesasPlano
      setMesasPlano(prev => prev.map(mesa => ({
        ...mesa,
        invitados: mesa.invitados.filter(inv => inv.id !== invitadoId)
      })));

      // Actualizar el orden de invitados
      const mesaId = mesaDetalle?.id;
      if (mesaId) {
        const ordenActual = invitadosOrdenados[mesaId] || {};
        const { [invitadoId]: removed, ...newOrder } = ordenActual;
        setInvitadosOrdenados(prev => ({
          ...prev,
          [mesaId]: newOrder
        }));
        actualizarOrdenInvitados(mesaId, newOrder);
      }

    } catch (error) {
      console.error('Error al quitar invitado de la mesa:', error);
    }
  };

  // Función helper para el drag & drop
  const getDragAfterElement = (container, y) => {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  };

  if (cargando) return <p>Cargando datos de invitados...</p>;
  if (error) return <p>{error}</p>;

  // Layout base y panel lateral
  return (
    <div className="mapa-mesas-root">
      {/* Panel lateral */}
      <PanelLateral
        isPanelOpen={isPanelOpen}
        porGrupoOrigen={porGrupoOrigen}
        mesasOrganizadas={mesasOrganizadas}
        getInvitadoRef={getInvitadoRef}
        grupoColorMap={grupoColorMap}
        setInvitadoDetalle={setInvitadoDetalle}
        setShowAddMesa={setShowAddMesa}
        setIsPanelOpen={setIsPanelOpen}
        urlstrapi={urlstrapi}
        STRAPI_TOKEN={STRAPI_TOKEN}
      />
      
      {/* Plano central */}
      <main ref={planoRef} className="mapa-mesas-main">
        <div className="mapa-mesas-area">
          {mesasPlano.map(mesa => renderMesaDiv(mesa))}
          
          {/* Sección de invitados sin mesa */}
          <div className="mapa-mesas-pendientes">
            <h3>Invitados sin mesa</h3>
            <div className="mapa-mesas-pendientes-container">
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
                      className="mapa-mesas-pendiente-bolita"
                      style={{background: colorGrupo}}
                      ref={getInvitadoRef(inv.id)}
                      draggable={true}
                      onClick={() => setInvitadoDetalle(inv)}
                    >
                      {inv.nombre[0]}
                      <span className="mapa-mesas-pendiente-nombre">{inv.nombre}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        {/* Modal para añadir mesa */}
        {showAddMesa && (
          <Modal
            isOpen={showAddMesa}
            onClose={() => setShowAddMesa(false)}
            title="Tipo de mesa"
            className="mapa-mesas-modal"
          >
            <button onClick={()=>{setTipoMesa('redonda');setShowAddMesa(false);}}>Redonda (máx. 11)</button>
            <button onClick={()=>{setTipoMesa('imperial');setShowAddMesa(false);}}>Imperial (máx. 16)</button>
            <button onClick={()=>setShowAddMesa(false)}>Cancelar</button>
          </Modal>
        )}
        {/* Modal de detalle de mesa */}
        {mesaDetalle && (
          <Modal
            isOpen={!!mesaDetalle}
            onClose={() => setMesaDetalle(null)}
            title={mesaDetalle?.nombre}
            className="mapa-mesas-modal-detalle"
          >
            <div className="modal-content">
              <div className="mapa-mesas-modal-mesa">
                <div className="mapa-mesas-modal-mesa-container">
                  {(() => {
                    const invitados = mesaDetalle?.invitados || [];
                    const ordenActual = invitadosOrdenados[mesaDetalle?.id] || {};
                    const invitadosOrdenadosLista = [...invitados].sort((a, b) => {
                      const ordenA = ordenActual[a.id] || 0;
                      const ordenB = ordenActual[b.id] || 0;
                      return ordenA - ordenB;
                    });
                    const areaW = 64;
                    const areaH = 48;
                    const cx = areaW / 2;
                    const cy = areaH / 2;
                    if (mesaDetalle?.tipo === 'redonda') {
                      const radio = 22;
                      const invitadoSize = 5.5;
                      return (
                        <div className="mapa-mesas-modal-mesa-dibujo" style={{ width: `${areaW}dvh`, height: `${areaH}dvh`, position: 'relative' }}>
                          <div
                            className="mapa-mesas-modal-mesa-div"
                            style={{
                              width: '32dvh',
                              height: '32dvh',
                              background: getMesaBackground(mesaDetalle),
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
                            <span style={{fontSize: '2.6dvh', fontWeight: 700, color: '#fff', textShadow: '0 2px 4px #0008'}}>{mesaDetalle?.nombre}</span>
                          </div>
                          {invitadosOrdenadosLista.map((inv, idx) => {
                            const ang = (2 * Math.PI * idx) / invitados.length - Math.PI / 2;
                            const bx = cx + Math.cos(ang) * radio - invitadoSize / 2;
                            const by = cy + Math.sin(ang) * radio - invitadoSize / 2;
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
                                  background: '#222b3a',
                                  border: '0.2dvh solid #fff',
                                  fontSize: '2.2dvh'
                                }}
                              >
                                {inv.nombre[0]}
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else if (mesaDetalle?.tipo === 'imperial') {
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
                        rendered.push(
                          <div key={inv.id} data-invitado-id={inv.id} className="mapa-mesas-modal-invitado" style={{ left: `${x}dvh`, top: `${y}dvh`, width: `${invitadoSize}dvh`, height: `${invitadoSize}dvh`, position: 'absolute', background: '#222b3a', border: '0.2dvh solid #fff', fontSize: '2.2dvh' }}>{inv.nombre[0]}</div>
                        );
                      });
                      lados[1].forEach((inv, i) => {
                        const gap = mesaH / (lados[1].length + 1);
                        const x = rightX + offset - invitadoSize / 2;
                        const y = topY + gap * (i + 1) - invitadoSize / 2;
                        rendered.push(
                          <div key={inv.id} data-invitado-id={inv.id} className="mapa-mesas-modal-invitado" style={{ left: `${x}dvh`, top: `${y}dvh`, width: `${invitadoSize}dvh`, height: `${invitadoSize}dvh`, position: 'absolute', background: '#222b3a', border: '0.2dvh solid #fff', fontSize: '2.2dvh' }}>{inv.nombre[0]}</div>
                        );
                      });
                      lados[2].forEach((inv, i) => {
                        const gap = mesaW / (lados[2].length + 1);
                        const x = leftX + gap * (i + 1) - invitadoSize / 2;
                        const y = bottomY + offset - invitadoSize / 2;
                        rendered.push(
                          <div key={inv.id} data-invitado-id={inv.id} className="mapa-mesas-modal-invitado" style={{ left: `${x}dvh`, top: `${y}dvh`, width: `${invitadoSize}dvh`, height: `${invitadoSize}dvh`, position: 'absolute', background: '#222b3a', border: '0.2dvh solid #fff', fontSize: '2.2dvh' }}>{inv.nombre[0]}</div>
                        );
                      });
                      lados[3].forEach((inv, i) => {
                        const gap = mesaH / (lados[3].length + 1);
                        const x = leftX - offset - invitadoSize / 2;
                        const y = topY + gap * (i + 1) - invitadoSize / 2;
                        rendered.push(
                          <div key={inv.id} data-invitado-id={inv.id} className="mapa-mesas-modal-invitado" style={{ left: `${x}dvh`, top: `${y}dvh`, width: `${invitadoSize}dvh`, height: `${invitadoSize}dvh`, position: 'absolute', background: '#222b3a', border: '0.2dvh solid #fff', fontSize: '2.2dvh' }}>{inv.nombre[0]}</div>
                        );
                      });
                      return (
                        <div className="mapa-mesas-modal-mesa-dibujo" style={{ width: `${areaW}dvh`, height: `${areaH}dvh`, position: 'relative' }}>
                          <div
                            className="mapa-mesas-modal-mesa-div"
                            style={{
                              width: `${mesaW}dvh`,
                              height: `${mesaH}dvh`,
                              background: getMesaBackground(mesaDetalle),
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
                            <span style={{fontSize: '2.8dvh', fontWeight: 700, color: '#fff', textShadow: '0 2px 4px #0008'}}>{mesaDetalle?.nombre}</span>
                          </div>
                          {rendered}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className={`mapa-mesas-modal-invitados ${isSavingOrder ? 'saving' : ''}`}>
                <b>Invitados:</b>
                <ul>
                  {(() => {
                    const invitados = mesaDetalle?.invitados || [];
                    const ordenActual = invitadosOrdenados[mesaDetalle?.id] || {};
                    const invitadosOrdenadosLista = [...invitados].sort((a, b) => {
                      const ordenA = ordenActual[a.id] || 0;
                      const ordenB = ordenActual[b.id] || 0;
                      return ordenA - ordenB;
                    });

                    return invitadosOrdenadosLista.map((inv, idx) => {
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
                              
                              // Crear clon flotante
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
                              
                              // Animar el elemento original
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
                              
                              // Remover clon flotante
                              const clone = document.querySelector('.drag-clone');
                              if (clone) {
                                gsap.to(clone, {
                                  opacity: 0,
                                  scale: 0.8,
                                  duration: 0.2,
                                  onComplete: () => clone.remove()
                                });
                              }
                              
                              // Animar el elemento original de vuelta
                              gsap.to(e.target, {
                                opacity: 1,
                                scale: 1,
                                duration: 0.2
                              });
                            
                            // Obtener el orden final de todos los elementos
                            const items = [...container.querySelectorAll('li')];
                            const newOrder = {};
                            items.forEach((item, index) => {
                              const id = item.getAttribute('data-id');
                              if (id) newOrder[id] = index;
                            });
                            
                            // Actualizar el orden solo al finalizar el drag
                            actualizarOrdenInvitados(mesaDetalle.id, newOrder);
                          }}
                          onDragOver={(e) => {
                              if (isSavingOrder) return;
                            e.preventDefault();
                            const draggingItem = document.querySelector('.dragging');
                            if (!draggingItem || draggingItem === e.target) return;
                            
                            const container = e.target.closest('ul');
                            if (!container) return;

                            // Remover marcadores anteriores
                            const oldMarkers = container.querySelectorAll('.drop-marker');
                            oldMarkers.forEach(marker => marker.remove());

                            const afterElement = getDragAfterElement(container, e.clientY);
                            if (afterElement) {
                                // Crear marcador visual
                                const marker = document.createElement('div');
                                marker.className = 'drop-marker';
                                
                                // Posicionar marcador
                                const rect = afterElement.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                marker.style.top = `${rect.top - containerRect.top}px`;
                                
                                // Insertar marcador
                                container.insertBefore(marker, afterElement);
                                
                                // Animar el marcador
                                requestAnimationFrame(() => {
                                    marker.classList.add('visible');
                                });
                            } else {
                                // Si no hay elemento después, crear marcador al final
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
                              
                              // Remover marcadores
                              const markers = container.querySelectorAll('.drop-marker');
                              markers.forEach(marker => {
                                  marker.classList.remove('visible');
                                  setTimeout(() => marker.remove(), 200);
                              });
                              
                              const draggingItem = document.querySelector('.dragging');
                              if (!draggingItem) return;
                              
                              const afterElement = getDragAfterElement(container, e.clientY);
                              if (afterElement) {
                                  // Animar la inserción
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
                                          
                                          // Actualizar orden
                                          const items = [...container.querySelectorAll('li')];
                                          const newOrder = {};
                                          items.forEach((item, index) => {
                                              const id = item.getAttribute('data-id');
                                              if (id) newOrder[id] = index;
                                          });

                                          // Animar las bolitas en el dibujo
                                          const mesaId = mesaDetalle.id;
                                          const invitados = mesaDetalle.invitados || [];
                                          const ordenActual = invitadosOrdenados[mesaId] || {};
                                          const invitadosOrdenadosLista = [...invitados].sort((a, b) => {
                                            const ordenA = ordenActual[a.id] || 0;
                                            const ordenB = ordenActual[b.id] || 0;
                                            return ordenA - ordenB;
                                          });

                                          // Obtener el contenedor del dibujo
                                          const dibujoContainer = document.querySelector('.mapa-mesas-modal-mesa-dibujo');
                                          if (!dibujoContainer) return;

                                          // Calcular nuevas posiciones
                                          if (mesaDetalle.tipo === 'redonda') {
                                            const areaW = 64;
                                            const areaH = 48;
                                            const cx = areaW / 2;
                                            const cy = areaH / 2;
                                            const radio = 22;
                                            const invitadoSize = 5.5;

                                            // Animar cada bolita a su nueva posición
                                            invitadosOrdenadosLista.forEach((inv, idx) => {
                                              const ang = (2 * Math.PI * idx) / invitados.length - Math.PI / 2;
                                              const bx = cx + Math.cos(ang) * radio - invitadoSize / 2;
                                              const by = cy + Math.sin(ang) * radio - invitadoSize / 2;
                                              
                                              const bolita = dibujoContainer.querySelector(`[data-invitado-id="${inv.id}"]`);
                                              if (bolita) {
                                                gsap.to(bolita, {
                                                  left: `${bx}dvh`,
                                                  top: `${by}dvh`,
                                                  duration: 0.5,
                                                  ease: "elastic.out(1, 0.5)",
                                                  onStart: () => {
                                                    bolita.style.zIndex = "2";
                                                  },
                                                  onComplete: () => {
                                                    bolita.style.zIndex = "1";
                                                  }
                                                });
                                              }
                                            });
                                          } else if (mesaDetalle.tipo === 'imperial') {
                                            const areaW = 64;
                                            const areaH = 48;
                                            const cx = areaW / 2;
                                            const cy = areaH / 2;
                                            const mesaW = 48;
                                            const mesaH = 24;
                                            const invitadoSize = 6;
                                            const offset = 4;
                                            const leftX = cx - mesaW / 2;
                                            const rightX = cx + mesaW / 2;
                                            const topY = cy - mesaH / 2;
                                            const bottomY = cy + mesaH / 2;

                                            // Distribuir en lados
                                            const lados = [[], [], [], []];
                                            let idx = 0;
                                            for (let i = 0; i < invitados.length; i++) {
                                              lados[idx % 4].push(invitadosOrdenadosLista[i]);
                                              idx++;
                                            }

                                            // Animar cada bolita a su nueva posición
                                            lados.forEach((lado, ladoIdx) => {
                                              lado.forEach((inv, posIdx) => {
                                                let bx = 0, by = 0;
                                                switch (ladoIdx) {
                                                  case 0: // Superior
                                                    const gapTop = mesaW / (lado.length + 1);
                                                    bx = leftX + gapTop * (posIdx + 1) - invitadoSize / 2;
                                                    by = topY - offset - invitadoSize / 2;
                                                    break;
                                                  case 1: // Derecha
                                                    const gapRight = mesaH / (lado.length + 1);
                                                    bx = rightX + offset - invitadoSize / 2;
                                                    by = topY + gapRight * (posIdx + 1) - invitadoSize / 2;
                                                    break;
                                                  case 2: // Inferior
                                                    const gapBottom = mesaW / (lado.length + 1);
                                                    bx = leftX + gapBottom * (posIdx + 1) - invitadoSize / 2;
                                                    by = bottomY + offset - invitadoSize / 2;
                                                    break;
                                                  case 3: // Izquierda
                                                    const gapLeft = mesaH / (lado.length + 1);
                                                    bx = leftX - offset - invitadoSize / 2;
                                                    by = topY + gapLeft * (posIdx + 1) - invitadoSize / 2;
                                                    break;
                                                }

                                                const bolita = dibujoContainer.querySelector(`[data-invitado-id="${inv.id}"]`);
                                                if (bolita) {
                                                  gsap.to(bolita, {
                                                    left: `${bx}dvh`,
                                                    top: `${by}dvh`,
                                                    duration: 0.5,
                                                    ease: "elastic.out(1, 0.5)",
                                                    onStart: () => {
                                                      bolita.style.zIndex = "2";
                                                    },
                                                    onComplete: () => {
                                                      bolita.style.zIndex = "1";
                                                    }
                                                  });
                                                }
                                              });
                                            });
                                          }

                                          actualizarOrdenInvitados(mesaDetalle.id, newOrder);
                                      }
                                  });
                              } else {
                                  // Animar al final
                                  gsap.to(draggingItem, {
                                      y: container.scrollHeight,
                                      duration: 0.3,
                                      ease: "power2.out",
                                      onComplete: () => {
                                          container.appendChild(draggingItem);
                                          gsap.set(draggingItem, { y: 0 });
                                          
                                          // Actualizar orden
                                          const items = [...container.querySelectorAll('li')];
                                          const newOrder = {};
                                          items.forEach((item, index) => {
                                              const id = item.getAttribute('data-id');
                                              if (id) newOrder[id] = index;
                                          });
                                          actualizarOrdenInvitados(mesaDetalle.id, newOrder);
                                      }
                                  });
                              }
                          }}
                          data-id={inv.id}
                        >
                          <span className="mapa-mesas-modal-invitado-bolita" style={{background: colorGrupo}}>
                            {inv.nombre[0]}
                          </span>
                          <span className="mapa-mesas-modal-invitado-nombre">{inv.nombre}</span>
                          <span className="mapa-mesas-modal-invitado-orden">#{idx + 1}</span>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            </div>
          </Modal>
        )}
        {/* Modal de detalle de invitado */}
        <Modal
          isOpen={!!invitadoDetalle}
          onClose={() => setInvitadoDetalle(null)}
          title={invitadoDetalle?.nombre}
          className="mapa-mesas-modal-invitado-detalle"
        >
          <div className="mapa-mesas-modal-invitado-avatar" style={{
            background: grupoColorMap[invitadoDetalle?.grupoOrigen] || '#6366f1'
          }}>
            {invitadoDetalle?.nombre[0]}
          </div>
          <div className="mapa-mesas-modal-invitado-info" style={{ position: 'relative' }}>
            <p>
              <b>Grupo:</b> {invitadoDetalle?.grupoOrigen}
            </p>
            <p>
              <b>Mesa:</b> {
                (() => {
                  const mesaActual = Object.values(mesasOrganizadas).find(mesa => 
                    mesa.invitados.some(i => i.id === invitadoDetalle?.id)
                  );
                  return mesaActual ? mesaActual.nombre : 'Sin asignar';
                })()
              }
            </p>
            {(() => {
              const mesaActual = Object.values(mesasOrganizadas).find(mesa => 
                mesa.invitados.some(i => i.id === invitadoDetalle?.id)
              );
              if (mesaActual) {
                return (
                  <button 
                    className="mapa-mesas-modal-quitar-mesa"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Estás seguro de quitar este invitado de la mesa?')) {
                        const invitadoIdStrapi = invitadoDetalle?.documentId;
                        fetch(`${urlstrapi}/api/invitados/${invitadoIdStrapi}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${STRAPI_TOKEN}`
                          },
                          body: JSON.stringify({ 
                            data: { 
                              mesa: null
                            } 
                          })
                        })
                        .then(res => res.json())
                        .then(() => {
                          return fetch(
                            `${urlstrapi}/api/invitados?populate[personaje][populate]=imagen&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
                          );
                        })
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
                          setInvitadoDetalle(null);
                        });
                      }
                    }}
                  >
                    Quitar de la mesa
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </Modal>
      </main>
    </div>
  );
};

export default MapaMesas; 