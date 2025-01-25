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
  const [circleBgImage, setCircleBgImage] = useState(null);
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
      gsap.to(correctCircleRef.current, { 
        opacity: 1, duration: .15,
      });
      
      console.log("Nombre actual:", nextInvitado.nombre);
      gsap.to(".qeq .invitado, .qeq .name-circle", {
        opacity: 1,
        duration: .5,
        delay: .5,
      })
    } else {
      console.log("Todos los invitados han sido acertados o mostrados.");
      setCurrentName(false);
      currentNameRef.current = null;
    }
  };

  useEffect(() => {
    if (!mesaSeleccionada) return;

    setInvitadosAcertados([]);
    setInvitadosMostrados([]);
    setCurrentName(null);
    setCircleBgImage(null);
    
    currentNameRef.current = null;
    updateCurrentName();

    draggablesRef.current.forEach((draggable) => draggable.kill());
    draggablesRef.current = [];

    const reseteoBg = () => {
      setCircleBgImage(null);
      gsap.to(correctCircleRef.current, { 
        opacity: 1, duration: .25,
      });
      gsap.to(".qeq .invitado", { 
        opacity: 1, duration: .25,
      });
    }
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
          gsap.set(correctCircleRef.current, {
            animation: "shadowPulse 1s ease-in-out infinite",
          });
          gsap.timeline()
            .to(invitadoRef, {
              scale: 1,
              duration: 0.5,
            })
            .to(invitadoRef.querySelector("p.primero"), { // Selecciona el <p> hijo directamente
              opacity: 1,
              duration: 0.25,
              ease: "power1.inOut",
            }, 0)
            .to(invitadoRef.querySelector("p.segundo"), { // Selecciona el <p> hijo directamente
              opacity: 1,
              duration: 0.5,
              ease: "power1.inOut",
            }, ">")
            .to(invitadoRef.querySelector("p.primero"), {
              rotation: -6, // Gira 10 grados hacia un lado
              duration: 3.5, // Tiempo para alcanzar la rotación
              ease: "power1.inOut", // Animación suave
              yoyo: true, // Vuelve al estado inicial
              repeat: -1, // Repite infinitamente
              y: "+=1dvh",
              x: "+=1dvh",
            }, "<")
            .to(invitadoRef.querySelector("p.segundo"), {
              rotation: -5, // Gira 10 grados hacia un lado
              duration: 2, // Tiempo para alcanzar la rotación
              ease: "power1.inOut", // Animación suave
              yoyo: true, // Vuelve al estado inicial
              repeat: -1, // Repite infinitamente
              y: "+=1dvh",
              y: "+=.5dvh",
            }, "<")
          if (this.hitTest(correctCircleRef?.current)) {
            console.log("pincha");
            correctCircleRef?.current?.classList?.add('hover');
            correctCircleRef?.current?.classList?.add('inTouch');
            setCircleBgImage(invitado.personaje?.imagen?.url ? urlstrapi + invitado.personaje.imagen.url : dummyImage);
            gsap.to(invitadoRef, {
              opacity: 0,
              duration: 0.5,
            })
          } else {
            correctCircleRef?.current?.classList?.remove('hover');
            correctCircleRef?.current?.classList?.remove('inTouch');
            reseteoBg();
            gsap.to(invitadoRef, {
              opacity: 1,
              duration: 0.5,
            })
          }
        },
        onRelease: function () {
          const tlRelease = gsap.timeline();
          const droppedId = invitado.id;
          const acertado = droppedName.trim().toLowerCase() === currentNameRef.current?.trim().toLowerCase();
          gsap.set(correctCircleRef.current, {
            animation: "none",
          });
          
          if (this.hitTest(correctCircleRef?.current)) {
            console.log("Nombre objetivo (desde ref):", currentNameRef.current);
            console.log("Nombre arrastrado:", droppedName);
            correctCircleRef?.current?.classList?.remove('inTouch');
            if (acertado) {
              console.log("¡Nombre correcto!");
              correctCircleRef?.current?.classList?.add('correct');
              
              gsap.to(".qeq .invitado", {
                opacity: 0,
                duration: .5,
              }, ">")
              setTimeout(() => {
                correctCircleRef?.current?.classList?.remove('correct');
                updateCurrentName();
              }, 500);
              tlRelease
                .to(invitadoRef, {
                  duration: .5,
                  zIndex: 3000,
                  opacity: 0,
                  ease: "linear",
                  // position: "absolute",
                }, ">")
                .to(invitadoRef, {
                  duration: 0,
                  onComplete: () => {
                    // Excluir el invitado del array, no eliminarlo completamente
                    mesaSeleccionada.invitados = mesaSeleccionada.invitados.filter(
                      (i) => i.id !== droppedId
                    );
                    // Actualizamos los estados de acertados y mostrados
                    setInvitadosAcertados((prev) => [...prev, droppedId]);
                    setInvitadosMostrados((prev) => [...prev, droppedId]);
                    // Animar desvanecimiento antes de eliminar el invitado
                    gsap.timeline()
                      .to(invitadoRef, {
                        // opacity: 0,
                        // scale: 2,
                        duration: 2,
                      }, 0)
                      .to(correctCircleRef.current, {
                        scale: 1,
                        duration: 2,
                        ease: 'power1.inOut',
                        delay: .5,
                      }, ">")
        

                  },

                }, ">")
            } else {
              console.log("Nombre incorrecto.");
              correctCircleRef?.current?.classList?.add('incorrect');
              setTimeout(() => {
                correctCircleRef?.current?.classList?.remove('incorrect');
                gsap.to(correctCircleRef.current, { 
                  opacity: 1, duration: .15,
                });
              
              }, 500);
            }
            correctCircleRef?.current?.classList?.remove('hover');
          }
          tlRelease
            .to(invitadoRef, {
              x: this.initialX,
              y: this.initialY,
              ease: 'power1.out',
            }, ">");
          tlRelease
            .to(invitadoRef, {
              scale: .25,
              duration: acertado ? 1 : 0.5,
              ease: 'power1.out',
            }, "<")
            .to(invitadoRef.querySelector("p.primero"), {
              opacity: 0,
              duration: 0.25,
              ease: 'power1.out',
            }, "<")
            .to(invitadoRef.querySelector("p.primero"), {
              opacity: 0,
              duration: 0.25,
              ease: 'power1.out',
            }, "<")
            .to(invitadoRef.querySelector("p.segundo"), {
              opacity: 0,
              duration: 0.25,
              ease: 'power1.out',
              onComplete: () => {
                gsap.killTweensOf(invitadoRef.querySelector("p.primero"));
                gsap.killTweensOf(invitadoRef.querySelector("p.segundo"));
                gsap.to(correctCircleRef.current, { 
                  opacity: 0, duration: .25,
                  onComplete: () => {
                    reseteoBg();
                  }
                });
                
              }
            }, ">");

        },
      })[0];
      draggablesRef.current.push(draggableInstance);
    });
  }, [mesaSeleccionada]);

  useEffect(() => {
    let tlpalpita = null;
    if (activeCard && "horarios" && !tlpalpita) {
      gsap.to(correctCircleRef.current, {
        scale: 1,
      });
      tlpalpita = gsap.timeline();
      tlpalpita.to(correctCircleRef.current, {
        scale: "+=.1",
        yoyo: true,
        repeat: -1,
        duration: .5,
        ease: 'power1.inOut',
      });
    }
  }, [currentName])

  return activeCard === "horarios" && (
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
                style={{ backgroundColor: generatePastelColor() }}
                src={invitado.personaje?.imagen?.url ? urlstrapi + invitado.personaje.imagen.url : dummyImage}
                alt={invitado.nombre}
              />
              <div className="invitado-info">
                {invitado.personaje?.nombre && (
                  <p className="primero" style={{ backgroundColor: generatePastelColor() }}>
                    {invitado.personaje?.nombre}
                  </p>
                )}
                {invitado.personaje?.descripcion && (
                  <p className="segundo" style={{ backgroundColor: generatePastelColor() }}>
                    {invitado.personaje?.descripcion}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {currentName ? (
        <div
          ref={correctCircleRef}
          className="name-circle"
          style={{
            backgroundImage: circleBgImage ? `url(${circleBgImage})` : 'none',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <span>{currentName}</span>
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
