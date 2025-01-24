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
  const [invitadosMostrados, setInvitadosMostrados] = useState([]);
  const [currentName, setCurrentName] = useState(null);
  const currentNameRef = useRef(null);
  const { activeCard } = useDragContext();

  const correctCircleRef = useRef(null);
  const invitadosRef = useRef([]);
  const draggablesRef = useRef([]);

  const generatePastelColor = () => {
    const r = Math.floor(200 + Math.random() * 55);
    const g = Math.floor(200 + Math.random() * 55);
    const b = Math.floor(200 + Math.random() * 55);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMesaChange = (event) => {
    setSelectedMesa(event.target.value);
  };

  const mesaSeleccionada = mesas[selectedMesa];

  const getNextRandomInvitado = () => {
    if (!mesaSeleccionada) return null;

    const invitadosRestantes = mesaSeleccionada.invitados.filter(
      (invitado) =>
        !invitadosAcertados.includes(invitado.id) &&
        !invitadosMostrados.includes(invitado.id)
    );

    console.log("Invitados restantes:", invitadosRestantes.map((i) => i.nombre));

    if (invitadosRestantes.length === 0) {
      console.log("No quedan invitados disponibles para mostrar.");
      return null;
    }

    const randomIndex = Math.floor(Math.random() * invitadosRestantes.length);
    const randomInvitado = invitadosRestantes[randomIndex];

    console.log("Siguiente invitado seleccionado:", randomInvitado.nombre);
    return randomInvitado;
  };

  const updateCurrentName = () => {
    const nextInvitado = getNextRandomInvitado();

    if (nextInvitado) {
      setInvitadosMostrados((prev) => [...prev, nextInvitado.id]);
      setCurrentName(nextInvitado.nombre);
      currentNameRef.current = nextInvitado.nombre;
      console.log("Nombre actual:", nextInvitado.nombre);
    } else {
      console.log("Todos los invitados han sido acertados o mostrados.");
      setCurrentName(false);
      currentNameRef.current = null;
    }
  };

  useEffect(() => {
    if (!mesaSeleccionada) return;

    console.log("Mesa seleccionada:", mesaSeleccionada);

    setInvitadosAcertados([]);
    setInvitadosMostrados([]); // Reiniciar mostrados
    setCurrentName(null);
    currentNameRef.current = null;
    updateCurrentName();

    draggablesRef.current.forEach((draggable) => draggable.kill());
    draggablesRef.current = [];

    mesaSeleccionada.invitados.forEach((invitado, index) => {
      const invitadoRef = invitadosRef.current[index];

      gsap.to(invitadoRef, {
        duration: 3 + Math.random() * 3,
        x: "+=2dvh",
        y: "+=2dvh",
        translateX: Math.random() * 4 - 2 + 'dvh',
        translateY: Math.random() * 4 - 2 + 'dvh',
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
      const droppedName = invitado.nombre;
      const draggableInstance = Draggable.create(invitadoRef, {
        type: "x,y",
        onDragStart: function () {
          this.initialX = this.x;
          this.initialY = this.y;
        },
        onDrag: function () {

          gsap.to(invitadoRef, {
            scale: 1,
            duration: .5,
          });

          if (this.hitTest(correctCircleRef?.current)) {
            console.log("pincha");
            correctCircleRef?.current?.classList?.add('hover');
            correctCircleRef?.current?.classList?.add('inTouch');
          }else{
            correctCircleRef?.current?.classList?.remove('inTouch');
          }
        },
        onRelease: function () {
          const droppedId = invitado.id;
          
          if (this.hitTest(correctCircleRef?.current)) {
            console.log("Nombre objetivo (desde ref):", currentNameRef.current);
            console.log("Nombre arrastrado:", droppedName);
            correctCircleRef?.current?.classList?.remove('inTouch');
            if (droppedName.trim().toLowerCase() === currentNameRef.current?.trim().toLowerCase()) {
              console.log("¡Nombre correcto!");
              // Excluir el invitado del array, no eliminarlo completamente
              mesaSeleccionada.invitados = mesaSeleccionada.invitados.filter(
                (i) => i.id !== droppedId
              );

              // Actualizamos los estados de acertados y mostrados
              setInvitadosAcertados((prev) => [...prev, droppedId]);
              setInvitadosMostrados((prev) => [...prev, droppedId]);
              // Animar desvanecimiento antes de eliminar el invitado
              gsap.to(invitadoRef, {
                opacity: 0,
                scale: 2,
                duration: 2,
              });

              gsap.timeline().to(correctCircleRef.current, {
                scale: "+=.1",
                yoyo: true,
                repeat: 2,
                duration: .5,
                ease: 'power1.inOut',
              })
              .to(correctCircleRef.current, {
                scale: 1,
                duration: 2,
                ease: 'power1.inOut',
                delay: .5,
              });

              correctCircleRef?.current?.classList?.add('correct');
              setTimeout(() => {
                correctCircleRef?.current?.classList?.remove('correct');
                updateCurrentName();
              }, 1000);
            } else {
              console.log("Nombre incorrecto.");
              correctCircleRef?.current?.classList?.add('incorrect');
              setTimeout(() => {
                correctCircleRef?.current?.classList?.remove('incorrect');
              }, 500);
            }
            correctCircleRef?.current?.classList?.remove('hover');
          }
          gsap.to(invitadoRef, {
            x: this.initialX,
            y: this.initialY,
            scale: .2,
            duration: 0.5,
            ease: 'power1.out',
          });
        },
      })[0];
      draggablesRef.current.push(draggableInstance);
    });
  }, [mesaSeleccionada]);

  useEffect(() =>{
    activeCard && "horarios" && gsap.to(correctCircleRef.current, {
      scale: "+=.1",
      yoyo: true,
      repeat: -1,
      duration: .5,
      ease: 'power1.inOut',
    });
  }, [currentName])

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
              style={{ backgroundColor: generatePastelColor() }}
            >
              <img
                src={invitado.personaje?.imagen?.url ? urlstrapi + invitado.personaje.imagen.url : dummyImage}
                alt={invitado.nombre}
              />
              <p>{invitado.personaje?.nombre}</p>
              <p>{invitado.personaje?.descripcion}</p>
            </div>
          ))}
        </div>
      )}

      {currentName ? (
        <div ref={correctCircleRef} className="name-circle">
          {currentName}
        </div>
      ) : currentName !== null && (
        <div className="completed-message">
          ¡Todos los invitados de esta mesa han sido acertados!
        </div>
      )}
    </div>
  );
};

export default QEQ;
