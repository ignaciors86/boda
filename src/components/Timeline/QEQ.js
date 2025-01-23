import './QEQ.scss';
import { useState, useEffect, useRef } from 'react';
import dummyImage from "./assets/images/ositos-drag.png";
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { useDragContext } from 'components/DragContext';

gsap.registerPlugin(Draggable);

const urlstrapi = "https://boda-strapi-production.up.railway.app";

const QEQ = ({ mesas }) => {
  const MAINCLASS = "qeq";

  const [selectedMesa, setSelectedMesa] = useState('');
  const [invitadosAcertados, setInvitadosAcertados] = useState([]);
  const [currentName, setCurrentName] = useState(null);
  const currentNameRef = useRef(null); // Ref para el valor actual de currentName
  const { activeCard } = useDragContext();

  const correctCircleRef = useRef(null);
  const invitadosRef = useRef([]);
  const draggablesRef = useRef([]); // Array para rastrear instancias de Draggable

  // Cambiar de mesa
  const handleMesaChange = (event) => {
    setSelectedMesa(event.target.value);
  };

  // Mesa seleccionada
  const mesaSeleccionada = mesas[selectedMesa];

  // Obtener el próximo invitado no acertado
  const getNextRandomInvitado = () => {
    if (!mesaSeleccionada) return null;

    const invitadosRestantes = mesaSeleccionada.invitados.filter(
      (invitado) => !invitadosAcertados.includes(invitado.id)
    );

    if (invitadosRestantes.length > 0) {
      const randomIndex = Math.floor(Math.random() * invitadosRestantes.length);
      return invitadosRestantes[randomIndex];
    }

    return null;
  };

  // Actualizar el nombre del siguiente invitado
  const updateCurrentName = () => {
    const nextInvitado = getNextRandomInvitado();
    if (nextInvitado) {
      console.log("Nuevo invitado a acertar:", nextInvitado.nombre); // Depuración
      setCurrentName(nextInvitado.nombre); // Actualizar el estado
      currentNameRef.current = nextInvitado.nombre; // Actualizar la referencia
    } else {
      console.log("Todos los invitados han sido acertados.");
      setCurrentName(null);
      currentNameRef.current = null; // Limpiar la referencia
    }
  };

  useEffect(() => {
    if (!mesaSeleccionada) return;

    console.log("Mesa seleccionada:", mesaSeleccionada);

    // Resetear el estado
    setInvitadosAcertados([]);
    setCurrentName(null);
    currentNameRef.current = null; // Limpiar la referencia
    updateCurrentName();

    // Limpiar draggables existentes
    draggablesRef.current.forEach((draggable) => draggable.kill());
    draggablesRef.current = [];

    // Configurar los invitados
    mesaSeleccionada.invitados.forEach((invitado, index) => {
      const invitadoRef = invitadosRef.current[index];

      // Animación de flotación
      gsap.to(invitadoRef, {
        duration: 3 + Math.random() * 3,
        x: Math.random() * 20 - 10 + 'dvh',
        y: Math.random() * 20 - 10 + 'dvh',
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });

      // Configurar Draggable
      const draggableInstance = Draggable.create(invitadoRef, {
        type: "x,y",
        onDragStart: function () {
          this.initialX = this.x;
          this.initialY = this.y;
        },
        onDrag: function () {
          const droppedId = invitado.id;
          const droppedName = invitado.nombre;

          // Verificar si se arrastró al círculo correcto
          if (this.hitTest(correctCircleRef.current)) {
            console.log("Nombre objetivo (desde ref):", currentNameRef.current);
            console.log("Nombre arrastrado:", droppedName);

            // Comparación correcta
            if (droppedName.trim().toLowerCase() === currentNameRef.current?.trim().toLowerCase()) {
              console.log("¡Nombre correcto!");

              setInvitadosAcertados((prev) => [...prev, droppedId]);

              correctCircleRef.current.classList.add('correct');
              setTimeout(() => {
                correctCircleRef.current.classList.remove('correct');
                updateCurrentName(); // Actualizar el siguiente nombre
              }, 500);
            } else {
              console.log("Nombre incorrecto.");
              correctCircleRef.current.classList.add('incorrect');
              setTimeout(() => {
                correctCircleRef.current.classList.remove('incorrect');
              }, 500);
            }
          }
        },
        onRelease: function () {
          gsap.to(invitadoRef, {
            x: this.initialX,
            y: this.initialY,
            duration: 0.5,
            ease: 'power1.out',
          });
        },
      })[0];
      draggablesRef.current.push(draggableInstance);
    });
  }, [mesaSeleccionada]);

  if (activeCard !== "horarios") return null;

  return (
    <div className={MAINCLASS}>
      <h2>Selecciona una Mesa</h2>

      <select onChange={handleMesaChange} value={selectedMesa}>
        <option value="">Seleccione una mesa</option>
        {Object.keys(mesas).map((mesaKey) => (
          <option key={mesaKey} value={mesaKey}>
            {mesas[mesaKey].nombre}
          </option>
        ))}
      </select>

      {mesaSeleccionada && (
        <div className="invitados-container" style={{ "--num-invitados": mesaSeleccionada.invitados.length }}>
          {mesaSeleccionada.invitados.map((invitado, index) => (
            <div
              key={invitado.id}
              className={`invitado ${invitadosAcertados.includes(invitado.id) ? 'correct' : ''}`}
              ref={(el) => (invitadosRef.current[index] = el)}
            >
              <img
                src={invitado.personaje?.imagen?.url ? urlstrapi + invitado.personaje.imagen.url : dummyImage}
                alt={invitado.nombre}
              />
            </div>
          ))}
        </div>
      )}

      {currentName ? (
        <div ref={correctCircleRef} className="name-circle">
          {currentName}
        </div>
      ) : (
        <div className="completed-message">
          ¡Todos los invitados de esta mesa han sido acertados!
        </div>
      )}
    </div>
  );
};

export default QEQ;
