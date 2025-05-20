import React, { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import './MapaMesas.scss';
import PanelLateral from './components/PanelLateral/PanelLateral';
import PanelPersonajes from './components/PanelPersonajes/PanelPersonajes';
import { FaPlus, FaEdit, FaHashtag, FaUsers, FaCrown, FaUserFriends, FaBorderAll, FaMagnet, FaLock, FaCompress, FaExpand, FaFileExcel, FaQrcode } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ModalAddMesa from './components/ModalAddMesa/ModalAddMesa';
import ModalDetalleMesa from './components/ModalDetalleMesa/ModalDetalleMesa';
import ModalDetalleInvitado from './components/ModalDetalleInvitado/ModalDetalleInvitado';
import { v4 as uuidv4 } from 'uuid';
import { getPosicionesBolitasMesaSimple } from './components/utilsMesaDibujo';
import QRCode from 'qrcode';
gsap.registerPlugin(Draggable);

const urlstrapi =
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:1337'
    : 'https://boda-strapi-production.up.railway.app';
const STRAPI_TOKEN = process.env.REACT_APP_STRAPI_TOKEN || "40f652de7eb40915bf1bf58a58144c1c9c55de06e2941007ff28a54d236179c4bd24147d27a985afba0e5027535da5b3577db7b850c72507e112e75d6bf4a41711b67e904d1c4e192252070f10d8a7efd72bec1e071c8ca50e5035347935f7ea6e760d727c0695285392a75bcb5e93d44bd395e0cd83fe748350f69e49aa24ca";

// Mapeo de menús a etiquetas más cortas y colores
const menuMap = {
  'normal': { label: 'Normal', color: '#10b981' }, // verde
  'vegano': { label: 'Vegano', color: '#84cc16' }, // verde lima
  'vegetariano': { label: 'Vegetariano', color: '#22c55e' }, // verde esmeralda
  'menú celíaco': { label: 'Celíaco', color: '#f59e0b' }, // ámbar
  'infantil': { label: 'Infantil', color: '#f43f5e' }, // rosa
  'alergia al marisco y/o crustáceos': { label: 'Sin marisco', color: '#6366f1' }, // índigo
  'alergia a la fruta cruda y marisco (solo crustáceos, sí come moluscos)': { label: 'Sin fruta cruda/crustáceos', color: '#8b5cf6' }, // violeta
  'alimentación antiinflamatoria. No ajo, cebolla, gluten, lactosa, fritos... Sí carne magra o pescado/marisco a la plancha/brasa/horno; calabacín, patata, arroz...': { label: 'Antiinflamatorio', color: '#ec4899' } // rosa
};

// Helper para formatear el menú
const formatearMenu = (menu) => {
  if (!menu) return 'No especificado';
  
  const menuInfo = menuMap[menu] || { label: menu, color: '#64748b' }; // gris por defecto

  return (
    <span 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.6rem',
        borderRadius: '1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        backgroundColor: `${menuInfo.color}15`,
        color: menuInfo.color,
        border: `1px solid ${menuInfo.color}30`
      }}
    >
      {menuInfo.label}
    </span>
  );
};

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
  const [isDraggingInvitado, setIsDraggingInvitado] = useState(false);
  const [isDraggingMesa, setIsDraggingMesa] = useState(false);
  const [isDraggingToMesa, setIsDraggingToMesa] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [mesaNumbers, setMesaNumbers] = useState({});
  const [isUpdatingNumbers, setIsUpdatingNumbers] = useState(false);
  const [isPanelPersonajesOpen, setIsPanelPersonajesOpen] = useState(false);
  const [mesasInicializadas, setMesasInicializadas] = useState(false);

  // Refs
  const mesaRefs = useRef({});
  const invitadoRefs = useRef({});
  const bolitaRefs = useRef({});
  const mesaDocumentIds = useRef({});
  const mesaPositions = useRef({});

  const diametroRedonda = 'var(--diametro-redonda)';

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
    try {
      const mesa = mesasPlano.find(m => String(m.id) === String(mesaId));
      if (!mesa) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const xVw = (x / viewportWidth) * 100;
      const yDvh = (y / viewportHeight) * 100;

      // Obtener datos actuales de la mesa
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
              posicion: { x: xVw, y: yDvh }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP al actualizar: ${response.status}`);
      }

      // Actualizar mesaPositions
      mesaPositions.current[mesaId] = { x: xVw, y: yDvh };

      // Actualizar solo la mesa específica en el estado
      setMesasPlano(prev => prev.map(m => 
        m.id === mesaId ? { ...m, x: xVw, y: yDvh } : m
      ));

      // --- Lógica de giro usando hitTest de GSAP ---
      const mesaEl = mesaRefs.current[mesaId]?.current;
      if (mesaEl) {
        // Obtener el valor real de --tamano-bolita en píxeles
        const root = document.documentElement;
        const cssBolita = getComputedStyle(root).getPropertyValue('--tamano-bolita').trim();
        let bolitaNum = parseFloat(cssBolita);
        if (cssBolita.includes('dvh')) {
          bolitaNum = window.innerHeight * (bolitaNum / 100);
        } else if (cssBolita.includes('vw')) {
          bolitaNum = window.innerWidth * (bolitaNum / 100);
        }
        const margen = bolitaNum * 1.2; // Factor ajustable
        Object.entries(mesaRefs.current).forEach(([otraId, ref]) => {
          if (otraId === String(mesaId)) return;
          const otraMesaEl = ref?.current;
          if (!otraMesaEl) return;
          if (Draggable.hitTest(mesaEl, otraMesaEl, margen)) {
            // Comprobar si el contacto es vertical (bordes superior/inferior)
            const rect1 = mesaEl.getBoundingClientRect();
            const rect2 = otraMesaEl.getBoundingClientRect();
            const solapanEnX = rect1.right > rect2.left && rect1.left < rect2.right;
            const contactoSuperior = Math.abs(rect1.bottom - rect2.top) <= margen && solapanEnX;
            const contactoInferior = Math.abs(rect1.top - rect2.bottom) <= margen && solapanEnX;
            if (contactoSuperior || contactoInferior) {
              // Rotar visualmente ambas mesas
              if (mesaEl) mesaEl.classList.add('girada');
              if (otraMesaEl) otraMesaEl.classList.add('girada');
            }
          }
        });
      }

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
      console.error('Error al actualizar posición en Strapi:', error);
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
        
        // Ajustar la posición para que coincida con el punto medio
        el.style.left = `calc(${mesa.x}vw - ${width/2}px)`;
        el.style.top = `calc(${mesa.y}dvh - ${height/2}px)`;
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
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Convertir a vw y dvh
      const xVw = (x / viewportWidth) * 100;
      const yDvh = (y / viewportHeight) * 100;
      
      mesaEl.style.left = `${xVw}vw`;
      mesaEl.style.top = `${yDvh}dvh`;
      mesaEl.style.transform = 'none';
      mesaPositions.current[mesaId] = { x: xVw, y: yDvh };
    }
  };

  useEffect(() => {
    // Primero obtener todas las mesas de Strapi
    fetch(`${urlstrapi}/api/mesas?populate=*`)
      .then(response => response.json())
      .then(mesasData => {
        // Calcular posiciones para las que no tienen posición guardada
        let sinPosicionIdx = 0;
        const startX = 1200;
        const startY = 800;
        const spacing = 180;
        const todasLasMesas = mesasData.data.map((mesa, idx) => {
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
          } else {
            x = 10;
            y = 20;
            tienePosicion = true;
          }
          return {
            id: mesa.id,
            documentId: mesa.id,
            nombre: mesa.nombre || `Mesa ${mesa.id}`,
            tipo: mesa.tipo || 'redonda',
            mapaMesasData: mesa.mapaMesasData || {},
            x,
            y,
            invitados: []
          };
        });
        
        // Luego obtener los invitados
        return fetch(
          `${urlstrapi}/api/invitados?populate[personaje][populate]=*&populate[mesa][populate]=*&populate[grupo_origen][populate]=*`
        )
          .then((response) => response.json())
          .then((data) => {
            const invitadosData = data?.data.map((invitado) => ({
              id: invitado.id,
              documentId: invitado.documentId,
              nombre: invitado?.nombre || '',
              imagen_url: invitado?.personaje?.imagen_url || "",
              mesaId: invitado?.mesa?.id || 0,
              mesaDocumentId: invitado?.mesa?.documentId || "",
              mesa: invitado?.mesa?.nombre || "",
              grupoOrigenId: invitado?.grupo_origen?.id || 0,
              grupoOrigen: invitado?.grupo_origen?.nombre || "Sin grupo",
              menu: invitado?.menu || "",
              alergias: invitado?.alergias || "",
              asistira: invitado?.asistira,
              preboda: invitado?.preboda,
              postboda: invitado?.postboda,
              autobus: invitado?.autobus,
              alojamiento: invitado?.alojamiento,
              dedicatoria: invitado?.dedicatoria || ""
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
              grupos[inv.grupoOrigenId].invitados.push(inv);
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
              mesas[inv.mesaId].invitados.push(inv);
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

            // Posicionar mesas con invitados
            const mesasIniciales = mesasConInvitados.map((mesa, idx) => {
              const mesaStrapi = todasLasMesas.find(m => String(m.id) === String(mesa.id));
              let x = mesaStrapi?.x ?? 0;
              let y = mesaStrapi?.y ?? 0;
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
            mesasSinInvitados.forEach((mesa, idx) => {
              const mesaStrapi = todasLasMesas.find(m => String(m.id) === String(mesa.id));
              let x = mesaStrapi?.x ?? 0;
              let y = mesaStrapi?.y ?? 0;
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
    const maxInv = 11;

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
          tipo: 'redonda',
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
        tipo: 'redonda',
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

  // Función para detectar colisión entre dos mesas
  const detectarColision = (mesa1, mesa2) => {
    const rect1 = mesa1.getBoundingClientRect();
    const rect2 = mesa2.getBoundingClientRect();
    
    // Añadir un margen de colisión
    const margen = 20;
    
    // Colisión normal (solapamiento)
    const hayColision = !(
      rect1.right - margen < rect2.left + margen ||
      rect1.left + margen > rect2.right - margen ||
      rect1.bottom - margen < rect2.top + margen ||
      rect1.top + margen > rect2.bottom - margen
    );

    // Colisión por contacto vertical (bordes superior/inferior)
    const solapanEnX = rect1.right > rect2.left && rect1.left < rect2.right;
    const contactoSuperior = Math.abs(rect1.bottom - rect2.top) <= margen && solapanEnX;
    const contactoInferior = Math.abs(rect1.top - rect2.bottom) <= margen && solapanEnX;
    const hayColisionVertical = contactoSuperior || contactoInferior;

    return hayColision || hayColisionVertical;
  };

  // Efecto para hacer draggables las mesas
  useEffect(() => {
    if (!mesasInicializadas || isDraggingInvitado) {
      return;
    }

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
            const dragRect = el.getBoundingClientRect();
            const planoRect = planoRef.current.getBoundingClientRect();
            const newX = dragRect.left - planoRect.left;
            const newY = dragRect.top - planoRect.top;
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
          },
          onDragEnd: function() {
            const endRect = el.getBoundingClientRect();
            const planoRect = planoRef.current.getBoundingClientRect();
            const newX = endRect.left - planoRect.left + el.offsetWidth / 2;
            const newY = endRect.top - planoRect.top + el.offsetHeight / 2;
            
            console.log('Buscando colisiones...');
            let hayColision = false;
            
            // Detectar colisiones con otras mesas
            Object.values(mesaRefs.current).forEach(ref => {
              const otraMesa = ref.current;
              if (otraMesa && otraMesa !== el) {
                if (detectarColision(el, otraMesa)) {
                  // Transformar ambas mesas en cuadradas
                  const mesaId = mesa.id;
                  let otraMesaId = otraMesa.id;
                  if (!otraMesaId) {
                    otraMesaId = otraMesa.getAttribute('id');
                  }
                  if (!otraMesaId) {
                    console.error('No se pudo obtener el ID de la otra mesa');
                    return;
                  }
                  otraMesaId = otraMesaId.replace('mesa-', '');
                }
              }
            });
            
            actualizarPosicionMesa(mesa.id, newX, newY);
            setIsDraggingMesa(false);
            window.isDraggingMesa = false;
          }
        })[0];
      }
    });
  }, [mesasInicializadas, isDraggingInvitado]);

  // Efecto para hacer draggables las bolitas de invitados
  useEffect(() => {
    if (!mesasInicializadas || isDraggingMesa) return;

    // Hacer draggables las bolitas de invitados
    Object.values(bolitaRefs.current).forEach(ref => {
      if (ref.current && !ref.current._draggableBolita) {
        ref.current._draggableBolita = Draggable.create(ref.current, {
          type: 'left,top',
          bounds: planoRef.current,
          inertia: true,
          onPress: function(e) {
            if (window.isDraggingMesa) return false;
            setIsDraggingInvitado(true);
            window.isDraggingInvitadoOrBolita = true;
          },
          onDrag: function() {
            const dragRect = ref.current.getBoundingClientRect();
            const planoRect = planoRef.current.getBoundingClientRect();
            const newX = dragRect.left - planoRect.left;
            const newY = dragRect.top - planoRect.top;
            ref.current.style.left = `${newX}px`;
            ref.current.style.top = `${newY}px`;
          },
          onDragEnd: function() {
            setIsDraggingInvitado(false);
            window.isDraggingInvitadoOrBolita = false;

            // Detectar colisión con mesas
            const bolitaRect = ref.current.getBoundingClientRect();
            let mesaColisionada = null;
            let distanciaMinima = Infinity;

            Object.values(mesaRefs.current).forEach(mesaRef => {
              if (!mesaRef.current) return;
              const mesaRect = mesaRef.current.getBoundingClientRect();
              const distancia = Math.hypot(
                bolitaRect.left + bolitaRect.width/2 - (mesaRect.left + mesaRect.width/2),
                bolitaRect.top + bolitaRect.height/2 - (mesaRect.top + mesaRect.height/2)
              );
              if (distancia < distanciaMinima) {
                distanciaMinima = distancia;
                mesaColisionada = mesaRef.current;
              }
            });

            // Si hay colisión y la distancia es menor a un umbral
            if (mesaColisionada && distanciaMinima < 100) {
              const mesaId = mesaColisionada.id.replace('mesa-', '');
              const invitadoId = ref.current.getAttribute('data-invitado-id');
              const invitado = invitados.find(inv => inv.id === invitadoId);
              
              if (invitado) {
                actualizarInvitado(invitado.documentId, mesaId);
              }
            }

            // Restaurar posición original
            ref.current.style.left = '';
            ref.current.style.top = '';
          }
        })[0];
      }
    });
  }, [mesasInicializadas, isDraggingMesa, invitados]);

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

  // Función para renderizar mesas como divs
  function renderMesaDiv(mesa) {
    const invitadosMesa = mesa.invitados || [];
    // Tamaños
    const mesaWidth = 'var(--diametro-redonda)';
    const claseMesa = mesa.tipo === 'imperial' ? 'mapa-mesa-div mapa-mesa-imperial' : 'mapa-mesa-div mapa-mesa-simple';
    const label = mesa.tipo === 'imperial' ? 'I' : 'S';
    const borderRadius = mesa.tipo === 'imperial' ? '16px' : '8px';

    // Tamaño del contenedor externo (deja margen para bolitas)
    let paddingTop = 'calc(var(--tamano-bolita) * 1.5)';
    let paddingBottom = 'calc(var(--tamano-bolita) * 1.5)';
    let paddingSides = 'calc(var(--tamano-bolita) * 0.75)';
    let width = `calc(${mesaWidth} + ${paddingSides} * 2)`;
    let height = `calc(${mesaWidth} + ${paddingTop} + ${paddingBottom})`;

    // Guardar el documentId en el ref
    mesaDocumentIds.current[mesa.id] = mesa.documentId;

    // Usar la posición del ref si existe, sino usar la posición inicial
    const posicionActual = mesaPositions.current[mesa.id] || { x: mesa.x, y: mesa.y };

    // Declarar variables para evitar errores de no definidas
    let posiciones = [], areaW = 0, areaH = 0, mesaX = 0, mesaY = 0;
    let mesaGirada = false;
    // Detectar si la mesa está girada (clase girada en el DOM)
    if (typeof window !== 'undefined') {
      const mesaDiv = document.getElementById('mesa-' + mesa.id);
      if (mesaDiv && mesaDiv.classList.contains('girada')) {
        mesaGirada = true;
      }
    }
    if (mesa.tipo === 'imperial') {
      // Valores por defecto para imperiales (ajusta si tienes lógica especial)
      const root = document.documentElement;
      const cssBolita = getComputedStyle(root).getPropertyValue('--tamano-bolita').trim();
      const invitadoSize = parseFloat(cssBolita);
      areaW = invitadoSize * 11.6; // ajusta según el layout real
      areaH = invitadoSize * 8; // ajusta según el layout real
      mesaX = 0;
      mesaY = 0;
      posiciones = [];
    } else {
      const result = getPosicionesBolitasMesaSimple({
        numInvitados: invitadosMesa.length,
        girada: mesaGirada
      });
      posiciones = result.posiciones;
      areaW = result.areaW;
      areaH = result.areaH;
      mesaX = result.mesaX;
      mesaY = result.mesaY;
    }
    // Bolitas alrededor
    let bolitas = [];
    
    bolitas = invitadosMesa.map((inv, idx) => {
      const pos = posiciones[idx] || { x: 0, y: 0 }; // Añadir valor por defecto
      const grupo = inv.grupoOrigen || inv.grupo_origen || inv.grupo;
      const colorGrupo = grupoColorMap[grupo] || '#6366f1';
      return (
        <div
          key={inv.id}
          className="mapa-invitado-bolita"
          data-invitado-id={inv.id}
          style={{ 
            left: `${pos.x}dvh`,
            top: `${pos.y}dvh`,
            position: 'absolute',
            background: inv.imagen_url ? `url(${inv.imagen_url}) center/cover` : colorGrupo,
            border: inv.imagen_url ? `0.33em solid ${colorGrupo}` : 'none',
            fontSize: 'calc(var(--tamano-bolita) * 0.3)'
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
        >{!inv.imagen_url && inv.nombre[0]}</div>
      );
    });
    // Ajustar el área del contenedor y centrar la mesa
    width = `${areaW}dvh`;
    height = `${areaH}dvh`;
    // Determinar si hay solo una bolita en la fila superior o inferior
    const soloUnaBolitaArriba = Math.ceil(invitadosMesa.length / 2) === 1;
    const soloUnaBolitaAbajo = (invitadosMesa.length - Math.ceil(invitadosMesa.length / 2)) === 1;
    // Obtener el valor real de --tamano-bolita en dvh
    const root = document.documentElement;
    const cssBolita = getComputedStyle(root).getPropertyValue('--tamano-bolita').trim();
    const leftBolita = `calc(${cssBolita} * 0.5)`;
    const leftMesa = (soloUnaBolitaArriba || soloUnaBolitaAbajo) ? leftBolita : `${mesaX}dvh`;
    let mesaStyle = {};
    if (mesa.tipo === 'imperial') {
      mesaStyle = {
        width: mesaWidth,
        height: mesaWidth,
        background: getMesaBackground(mesa),
        borderRadius: borderRadius,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else {
      mesaStyle = {
        width: `${areaW}dvh`,
        height: `${areaH}dvh`,
        background: getMesaBackground(mesa),
        borderRadius: borderRadius,
        position: 'absolute',
        left: leftMesa,
        top: `${mesaY}dvh`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '4px solid #10b981',
        minWidth: `${areaW}dvh`
      };
    }

    return (
      <div
        key={mesa.id}
        className="mapa-mesa-contenedor"
        id={`mesa-contenedor-${mesa.id}`}
        style={{ 
          width,
          height,
          position: 'absolute',
          left: `calc(${posicionActual.x}vw - ${parseFloat(width)} / 2)`,
          top: `calc(${posicionActual.y}dvh - ${parseFloat(height)} / 2)`,
          transform: 'none',
          willChange: 'transform',
          display: 'block'
        }}
        ref={getMesaRef(mesa.id)}
      >
        <div
          id={'mesa-' + mesa.id}
          className={claseMesa}
          style={mesaStyle}
        >
          <div 
            className="mapa-mesa-centro"
            style={{
              width: mesaGirada ? `${areaH}dvh` : '60%',
              height: mesaGirada ? `${areaW}dvh` : '60%'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setMesaDetalle(mesa);
            }}
          >
            <span className="mapa-mesa-nombre" style={{
              transform: mesaGirada ? 'translate(-50%, -50%) rotate(-90deg)' : 'translate(-50%, -50%)'
            }}>{mesa.nombre}</span>
          </div>
          <div 
            className="mapa-mesa-numero"
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

  const generarInformeExcel = async () => {
    try {
      // Obtener todas las mesas ordenadas por número
      const mesasOrdenadas = [...mesasPlano].sort((a, b) => {
        const numA = mesaNumbers[a.id] || 0;
        const numB = mesaNumbers[b.id] || 0;
        return numA - numB;
      });

      // Crear un nuevo libro de Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Boda App';
      workbook.lastModifiedBy = 'Boda App';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Para cada mesa, crear una hoja
      for (const mesa of mesasOrdenadas) {
        const sheet = workbook.addWorksheet(`Mesa ${mesaNumbers[mesa.id] || 'Sin número'}`);
        
        // Configurar columnas
        sheet.columns = [
          { header: 'Nombre', key: 'nombre', width: 30 },
          { header: 'Grupo Origen', key: 'grupoOrigen', width: 20 },
          { header: 'Menú', key: 'menu', width: 30 },
          { header: 'Alergias', key: 'alergias', width: 30 },
          { header: 'Asistirá', key: 'asistira', width: 15 },
          { header: 'Preboda', key: 'preboda', width: 15 },
          { header: 'Postboda', key: 'postboda', width: 15 },
          { header: 'Autobús', key: 'autobus', width: 15 },
          { header: 'Alojamiento', key: 'alojamiento', width: 15 },
          { header: 'Dedicatoria', key: 'dedicatoria', width: 40 }
        ];

        // Estilo para el encabezado
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 13 };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F8A8B' } // turquesa suave
        };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).border = {
          bottom: { style: 'medium', color: { argb: 'FF357376' } }
        };

        // Estilo para filas alternas y bordes suaves
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Saltar cabecera
          row.font = { name: 'Segoe UI', size: 12 };
          row.alignment = { vertical: 'middle', horizontal: 'left' };
          row.height = 25;
          row.border = {
            bottom: { style: 'thin', color: { argb: 'FFB8D8D8' } }
          };
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF6F6F6' } // gris muy claro
            };
          } else {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' } // blanco
            };
          }
        });

        // Filtrar invitados de la mesa actual usando los datos locales
        let invitadosMesa = invitados.filter(inv => String(inv.mesaId) === String(mesa.id));
        // Ordenar según mapaMesasData.ordenInvitados si existe
        const ordenInvitados = mesa.mapaMesasData?.ordenInvitados;
        if (ordenInvitados) {
          invitadosMesa = [...invitadosMesa].sort((a, b) => {
            const ordenA = ordenInvitados[a.id] ?? 0;
            const ordenB = ordenInvitados[b.id] ?? 0;
            return ordenA - ordenB;
          });
        }

        // Helper para valores booleanos
        const getBooleanValue = (value) => {
          if (value === null || value === undefined) return 'No especificado';
          return value ? 'Sí' : 'No';
        };

        invitadosMesa.forEach(inv => {
          const row = {
            nombre: inv.nombre || 'Sin nombre',
            grupoOrigen: inv.grupoOrigen || 'Sin grupo',
            menu: menuMap[inv.menu]?.label || inv.menu || 'No especificado',
            alergias: inv.alergias || 'No especificado',
            asistira: getBooleanValue(inv.asistira),
            preboda: getBooleanValue(inv.preboda),
            postboda: getBooleanValue(inv.postboda),
            autobus: getBooleanValue(inv.autobus),
            alojamiento: getBooleanValue(inv.alojamiento),
            dedicatoria: inv.dedicatoria || 'Sin dedicatoria'
          };
          sheet.addRow(row);
        });

        // Ajustar altura de filas
        sheet.eachRow((row) => {
          row.height = 25;
        });
      }

      // Generar el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_Mesas_Boda_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      alert('Error al generar el informe. Por favor, revisa la consola para más detalles.');
    }
  };

  const actualizarInvitado = async (invitadoId, mesaId) => {
    try {
      const response = await fetch(`${urlstrapi}/api/invitados/${invitadoId}`, {
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

      // Actualizar el estado local en lugar de recargar la página
      const data = await response.json();
      const invitadoActualizado = data.data;
      
      // Actualizar invitados
      setInvitados(prev => prev.map(inv => 
        inv.documentId === invitadoId 
          ? { 
              ...inv, 
              mesaId: mesaId,
              mesa: invitadoActualizado.attributes?.mesa?.data?.attributes?.nombre || ''
            }
          : inv
      ));

      // Actualizar mesasPlano
      setMesasPlano(prev => prev.map(mesa => {
        if (String(mesa.id) === String(mesaId)) {
          // Añadir el invitado a la mesa destino
          const invitado = invitados.find(inv => inv.documentId === invitadoId);
          if (invitado) {
            return {
              ...mesa,
              invitados: [...mesa.invitados, invitado]
            };
          }
        } else {
          // Quitar el invitado de la mesa origen
          return {
            ...mesa,
            invitados: mesa.invitados.filter(inv => inv.documentId !== invitadoId)
          };
        }
        return mesa;
      }));

    } catch (error) {
      console.error('Error al actualizar invitado:', error);
      throw error;
    }
  };

  // Función reutilizable para obtener los datos de mesas e invitados ordenados
  function getMesasYInvitadosOrdenados(mesasPlano, invitados, mesaNumbers) {
    return [...mesasPlano].sort((a, b) => {
      const numA = mesaNumbers[a.id] || 0;
      const numB = mesaNumbers[b.id] || 0;
      return numA - numB;
    }).map(mesa => {
      // Filtrar y ordenar invitados según mapaMesasData.ordenInvitados
      let invitadosMesa = invitados.filter(inv => String(inv.mesaId) === String(mesa.id));
      const ordenInvitados = mesa.mapaMesasData?.ordenInvitados;
      if (ordenInvitados) {
        invitadosMesa = [...invitadosMesa].sort((a, b) => {
          const ordenA = ordenInvitados[a.id] ?? 0;
          const ordenB = ordenInvitados[b.id] ?? 0;
          return ordenA - ordenB;
        });
      }
      return { ...mesa, invitados: invitadosMesa };
    });
  }

  // Función para generar PDF para el cátering
  const generarInformePDFCatering = () => {
    try {
      // Filtrar invitados con menú especial (distinto de 'normal')
      const invitadosEspeciales = invitados.filter(inv => inv.menu && inv.menu.toLowerCase() !== 'normal');
      // Agrupar por tipo de menú
      const menus = {};
      invitadosEspeciales.forEach(inv => {
        const key = inv.menu;
        if (!menus[key]) menus[key] = [];
        menus[key].push(inv);
      });
      const doc = new jsPDF();
      let currentY = 18;
      Object.entries(menus).forEach(([menu, invitadosMenu], idx) => {
        if (idx > 0) currentY += 12; // Espacio extra entre menús
        doc.setFontSize(16);
        doc.setTextColor('#2E4057');
        const menuInfo = menuMap[menu] || { label: menu, color: '#64748b' };
        doc.text(`Menú: ${menuInfo.label}`, 14, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setTextColor('#444');
        doc.text(`Descripción: ${menu}`, 14, currentY);
        currentY += 6;
        doc.setFontSize(12);
        doc.setTextColor('#2E4057');
        doc.text(`Total comensales: ${invitadosMenu.length}`, 14, currentY);
        currentY += 7;
        doc.setFontSize(11);
        doc.setTextColor('#222');
        doc.text('Invitados:', 14, currentY);
        currentY += 6;
        // Listar nombres de invitados (en varias columnas si hay muchos)
        const nombres = invitadosMenu.map(inv => inv.nombre);
        const maxPorColumna = 35;
        let col = 0;
        let rowInCol = 0;
        const colWidth = 60;
        const startX = 20;
        let x = startX;
        let y = currentY;
        nombres.forEach((nombre, i) => {
          if (rowInCol >= maxPorColumna) {
            col++;
            rowInCol = 0;
            x = startX + col * colWidth;
            y = currentY;
          }
          doc.text(`- ${nombre}`, x, y);
          y += 5;
          rowInCol++;
        });
        currentY = y + 5;
        if (currentY > 260) { // Si se pasa de página, saltar a la siguiente
          doc.addPage();
          currentY = 18;
        }
      });
      doc.save(`Resumen_Menus_Especiales_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Error al generar el PDF. Revisa la consola para más detalles.');
    }
  };

  // Helper para mostrar valores de texto distinguiendo vacío y no existente
  function mostrarCampoTexto(valor, vacio = '(vacío)', noEspecificado = 'No especificado') {
    if (valor === undefined || valor === null) return noEspecificado;
    if (typeof valor === 'string' && valor.trim() === '') return vacio;
    return valor;
  }

  // Helper para obtener el invitado completo desde mesasOrganizadas
  function getInvitadoCompleto(idInvitado) {
    for (const mesa of Object.values(mesasOrganizadas)) {
      const invitado = mesa.invitados.find(i => i.id === idInvitado);
      if (invitado) return invitado;
    }
    // Si no está en ninguna mesa, buscar en el array plano
    return invitados.find(i => i.id === idInvitado);
  }

  // Función para manejar la adición de una mesa
  const handleAddMesa = (tipo) => {
    setTipoMesa(tipo);
    setShowAddMesa(false);
  };

  // Función para manejar la actualización del orden de invitados
  const handleUpdateOrder = (mesaId, nuevoOrden) => {
    actualizarOrdenInvitados(mesaId, nuevoOrden);
  };

  useEffect(() => {
    if (!mesasInicializadas) return;
    
    // Obtener el valor real de --tamano-bolita en píxeles
    const root = document.documentElement;
    const cssBolita = getComputedStyle(root).getPropertyValue('--tamano-bolita').trim();
    let bolitaNum = parseFloat(cssBolita);
    if (cssBolita.includes('dvh')) {
      bolitaNum = window.innerHeight * (bolitaNum / 100);
    } else if (cssBolita.includes('vw')) {
      bolitaNum = window.innerWidth * (bolitaNum / 100);
    }
    const margen = bolitaNum * 2;

    // Limpiar giros previos
    document.querySelectorAll('.mapa-mesa-div').forEach(mesa => {
      mesa.classList.remove('girada');
      mesa.style.transform = '';
    });

    // Obtener todos los contenedores de mesas
    const contenedores = document.querySelectorAll('.mapa-mesa-contenedor');
    const contenedoresArray = Array.from(contenedores);

    // Comprobar colisiones entre todas las mesas
    for (let i = 0; i < contenedoresArray.length; i++) {
      const contenedorA = contenedoresArray[i];
      const mesaA = contenedorA.querySelector('.mapa-mesa-div');
      if (!mesaA) continue;

      for (let j = i + 1; j < contenedoresArray.length; j++) {
        const contenedorB = contenedoresArray[j];
        const mesaB = contenedorB.querySelector('.mapa-mesa-div');
        if (!mesaB) continue;

        // Obtener los rectángulos de colisión de los contenedores
        const rectA = contenedorA.getBoundingClientRect();
        const rectB = contenedorB.getBoundingClientRect();

        // Comprobar solapamiento en X
        const solapanEnX = rectA.right > rectB.left && rectA.left < rectB.right;

        // Comprobar distancias verticales
        const distSuperior = Math.abs(rectA.bottom - rectB.top);
        const distInferior = Math.abs(rectA.top - rectB.bottom);

        // Solo girar si la colisión es vertical (borde superior o inferior)
        const colisionVertical = solapanEnX && (distSuperior < margen || distInferior < margen);

        if (colisionVertical) {
          console.log('Colisión vertical detectada:', {
            mesaA: mesaA.id,
            mesaB: mesaB.id,
            distSuperior,
            distInferior,
            margen,
            solapanEnX,
            rectA: {
              top: rectA.top,
              bottom: rectA.bottom,
              left: rectA.left,
              right: rectA.right
            },
            rectB: {
              top: rectB.top,
              bottom: rectB.bottom,
              left: rectB.left,
              right: rectB.right
            }
          });

          // Añadir clase girada solo a las mesas implicadas en colisión vertical
          mesaA.classList.add('girada');
          mesaB.classList.add('girada');
        }
      }
    }
  }, [mesasInicializadas, mesasPlano]);

  // Función para generar QRs
  const generarQRs = async () => {
    try {
      // Crear un nuevo libro de Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Boda App';
      workbook.lastModifiedBy = 'Boda App';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Crear una hoja para los QRs
      const sheet = workbook.addWorksheet('QRs');
      
      // Configurar columnas
      sheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'URL', key: 'url', width: 50 },
        { header: 'QR', key: 'qr', width: 20 }
      ];

      // Estilo para el encabezado
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 13 };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F8A8B' }
      };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Generar QRs para cada invitado
      for (const invitado of invitados) {
        const url = `https://boda-umber.vercel.app/${invitado.documentId}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        // Añadir fila con datos
        const row = sheet.addRow({
          nombre: invitado.nombre,
          url: url,
          qr: 'QR'
        });

        // Añadir el QR como imagen
        const imageId = workbook.addImage({
          base64: qrDataUrl.split(',')[1],
          extension: 'png',
        });

        // Insertar la imagen en la celda
        sheet.addImage(imageId, {
          tl: { col: 2, row: row.number - 1 },
          br: { col: 3, row: row.number }
        });

        // Ajustar altura de la fila para acomodar el QR
        row.height = 150;
      }

      // Ajustar anchura de columnas
      sheet.getColumn('qr').width = 30;

      // Generar el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRs_Invitados_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error al generar QRs:', error);
      alert('Error al generar los QRs. Por favor, revisa la consola para más detalles.');
    }
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
        generarInformeExcel={generarInformeExcel}
        actualizarInvitado={actualizarInvitado}
        generarInformePDFCatering={generarInformePDFCatering}
        setIsPanelPersonajesOpen={setIsPanelPersonajesOpen}
        generarQRs={generarQRs}
      />
      <PanelPersonajes
        isPanelOpen={isPanelPersonajesOpen}
        setIsPanelOpen={setIsPanelPersonajesOpen}
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
                      style={{
                        background: inv.imagen_url ? `url(${inv.imagen_url}) center/cover` : colorGrupo,
                        border: inv.imagen_url ? `2px solid ${colorGrupo}` : 'none'
                      }}
                      ref={getInvitadoRef(inv.id)}
                      draggable={true}
                      onClick={() => setInvitadoDetalle(inv)}
                    >
                      {!inv.imagen_url && inv.nombre[0]}
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
          <ModalAddMesa 
            isOpen={showAddMesa} 
            onClose={() => setShowAddMesa(false)}
            onSelectTipo={handleAddMesa}
          />
        )}
        {/* Modal de detalle de mesa */}
        {mesaDetalle && (
          <ModalDetalleMesa
            isOpen={!!mesaDetalle}
            onClose={() => setMesaDetalle(null)}
            mesa={mesaDetalle}
            invitadosOrdenados={invitadosOrdenados}
            grupoColorMap={grupoColorMap}
            isSavingOrder={isSavingOrder}
            onUpdateOrder={handleUpdateOrder}
            getDragAfterElement={getDragAfterElement}
          />
        )}
        {/* Modal de detalle de invitado */}
        {invitadoDetalle && (
          <ModalDetalleInvitado
            isOpen={!!invitadoDetalle}
            onClose={() => setInvitadoDetalle(null)}
            invitado={invitadoDetalle}
            grupoColorMap={grupoColorMap}
            mesasOrganizadas={mesasOrganizadas}
            formatearMenu={formatearMenu}
            actualizarInvitado={actualizarInvitado}
            mesasPlano={mesasPlano}
          />
        )}
      </main>
    </div>
  );
};

export default MapaMesas; 