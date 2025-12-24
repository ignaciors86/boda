import './QEQ.scss';
import { useState, useEffect, useRef } from 'react';
import dummyImage from "./assets/images/ositos-drag.png";
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { useDragContext } from 'components/DragContext';
import Bubbles from 'components/Backgrounds/Bubles/Bubles';
import Select from 'react-select';
import Typewriter from "typewriter-effect";
gsap.registerPlugin(Draggable);

const urlstrapi = "https://boda-strapi-production.up.railway.app";

const QEQ = ({ mesas, invitado }) => {
  const MAINCLASS = "qeq";

  const [selectedMesa, setSelectedMesa] = useState(null);
  const [invitadosAcertados, setInvitadosAcertados] = useState([]);
  const [invitadosMostrados, setInvitadosMostrados] = useState([]);
  const [currentName, setCurrentName] = useState(null);
  const [circleBgImage, setCircleBgImage] = useState(null);
  const currentNameRef = useRef(null);
  const { activeCard, setActiveCard } = useDragContext();

  const correctCircleRef = useRef(null);
  const invitadosRef = useRef([]);
  const draggablesRef = useRef([]);

  const escala = .5;

  const generatePastelColor = (short) => {
    const r = Math.floor(200 + Math.random() * 55);
    const g = Math.floor(200 + Math.random() * 55);
    const b = Math.floor(200 + Math.random() * 55);
    return short ? [parseInt(r), parseInt(g), parseInt(b)] : `rgb(${r}, ${g}, ${b})`;
  };

  // Estilos personalizados para react-select
  const customStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: 'white',
      border: '2px solid #f59e0b',
      borderRadius: '1dvh',
      boxShadow: 'none',
      minHeight: '5dvh',
      fontSize: 'calc(var(--size-unit) * 0.15)',
      fontFamily: 'var(--tipo)',
      '&:hover': {
        borderColor: '#d97706',
      },
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isFocused ? '#fff7ed' : isSelected ? '#f59e0b' : 'white',
      color: isSelected ? 'white' : '#1f2937',
      padding: '1.2dvh 2dvh',
      cursor: 'pointer',
      fontSize: 'calc(var(--size-unit) * 0.15)',
      fontFamily: 'var(--tipo)',
      '&:hover': {
        backgroundColor: '#fff7ed',
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'white',
      borderRadius: '1dvh',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      marginTop: '0.5dvh',
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: '0.5dvh',
      maxHeight: '40dvh',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1f2937',
      fontSize: 'calc(var(--size-unit) * 0.15)',
      fontFamily: 'var(--tipo)',
      fontWeight: 500,
    }),
    placeholder: (base) => ({
      ...base,
      color: '#6b7280',
      fontSize: 'calc(var(--size-unit) * 0.15)',
      fontFamily: 'var(--tipo)',
    }),
  };

  const options = Object.keys(mesas).map((mesaKey) => ({
    value: mesaKey,
    label: mesas[mesaKey].nombre,
  }));

  const handleMesaChange = (selectedOption) => {
    if (!selectedOption) return;
    
    gsap.to(".qeq .name-circle, .qeq .invitado", {
      opacity: 0,
      duration: .25,
      onComplete: () => {
        setSelectedMesa(selectedOption.value);
      }
    });
  };

  const mesaSeleccionada = mesas[selectedMesa];

  const getNextRandomInvitado = () => {
    if (!mesaSeleccionada) return null;

    const invitadosRestantes = mesaSeleccionada.invitados.filter(
      (invitado) =>
        !invitadosAcertados.includes(invitado.id) &&
        !invitadosMostrados.includes(invitado.id)
    );

    //console.log("Invitados restantes:", invitadosRestantes.map((i) => i.nombre));

    if (invitadosRestantes.length === 0) {
      //console.log("No quedan invitados disponibles para mostrar.");
      return null;
    }

    const randomIndex = Math.floor(Math.random() * invitadosRestantes.length);
    const randomInvitado = invitadosRestantes[randomIndex];

    //console.log("Siguiente invitado seleccionado:", randomInvitado.nombre);
    return randomInvitado;
  };

  const updateCurrentName = () => {
    const nextInvitado = getNextRandomInvitado();

    if (nextInvitado) {
      setInvitadosMostrados((prev) => [...prev, nextInvitado.id]);
      setCurrentName(nextInvitado.nombre);
      currentNameRef.current = nextInvitado.nombre;
      gsap.to(correctCircleRef.current, {
        opacity: 1, duration: .5,
      });

      //console.log("Nombre actual:", nextInvitado.nombre);
      gsap.to(".qeq .name-circle", {
        opacity: 1,
        duration: .5,
        delay: 0,
      })
      // Orden aleatorio de los invitados
      const invitados = gsap.utils.toArray(".qeq .invitado");
      gsap.set(".qeq .invitado", { opacity: 0, scale: 0, })
      const shuffledInvitados = gsap.utils.shuffle(invitados);

      // Animación secuencial para cada invitado
      shuffledInvitados.forEach((invitado, index) => {
        //console.log(index);
        gsap.to(invitado, {
          opacity: 1,
          scale: escala,
          duration: .5,
          delay: 0 + index * 0.2,
          ease: "power2.out",
        });
      });
    } else {
      //console.log("Todos los invitados han sido acertados o mostrados.");
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
    gsap.to(correctCircleRef?.current, {
      opacity: 1,
      duration: 1,
      delay: .5,
      onStart: () => {
        updateCurrentName();
      }
    })

    draggablesRef?.current?.forEach((draggable) => draggable?.kill());
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
        x: `${Math.random() < 0.5 ? '+' : '-'}=${Math.random() * 2}dvh`,
        y: `${Math.random() < 0.5 ? '+' : '-'}=${Math.random() * 2}dvh`,

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
          const tlondrag = gsap.timeline();
          gsap.set(".mi-select", {
            zIndex: 1001,
          })
          gsap.set(correctCircleRef.current, {
            animation: "shadowPulse 1s ease-in-out infinite",
          });
     
          invitadoRef && tlondrag
            .to(invitadoRef, {
              scale: 1,
              duration: 0.5,
            })
            
          // Añadir clase visible a los textos
          const textoPrimero = invitadoRef.querySelector("p.primero");
          const textoSegundo = invitadoRef.querySelector("p.segundo");
          
          // Forzar la visibilidad de los textos cada vez que se arrastra
          if (textoPrimero) {
              textoPrimero.style.opacity = '0';
              textoPrimero.classList.add('visible');
              // Forzar un reflow para asegurar que la transición se aplique
              void textoPrimero.offsetWidth;
              textoPrimero.style.opacity = '1';
          }
          if (textoSegundo) {
              textoSegundo.style.opacity = '0';
              textoSegundo.classList.add('visible');
              // Forzar un reflow para asegurar que la transición se aplique
              void textoSegundo.offsetWidth;
              textoSegundo.style.opacity = '1';
          }
          
          // Añadir clase has-visible-text al contenedor
          if (textoPrimero || textoSegundo) {
              invitadoRef.classList.add('has-visible-text');
          }

          if (this.hitTest(correctCircleRef?.current)) {
            correctCircleRef?.current?.classList?.add('hover');
            correctCircleRef?.current?.classList?.add('inTouch');
            setCircleBgImage(invitado.personaje?.imagen_url || dummyImage);
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
          gsap.killTweensOf(invitadoRef);
          const tlRelease = gsap.timeline();
          const droppedId = invitado.id;
          const acertado = droppedName.trim().toLowerCase() === currentNameRef.current?.trim().toLowerCase();
          gsap.set(correctCircleRef.current, {
            animation: "none",
          });
          gsap.set(".mi-select", {
            zIndex: 4001,
          })

          // Quitar clase visible de los textos
          const textoPrimero = invitadoRef.querySelector("p.primero");
          const textoSegundo = invitadoRef.querySelector("p.segundo");
          if (textoPrimero) {
              textoPrimero.classList.remove('visible');
              textoPrimero.style.opacity = '0';
          }
          if (textoSegundo) {
              textoSegundo.classList.remove('visible');
              textoSegundo.style.opacity = '0';
          }
          
          // Quitar clase has-visible-text del contenedor
          invitadoRef.classList.remove('has-visible-text');

          if (this.hitTest(correctCircleRef?.current)) {
            //console.log("Nombre objetivo (desde ref):", currentNameRef.current);
            //console.log("Nombre arrastrado:", droppedName);
            correctCircleRef?.current?.classList?.remove('inTouch');
            if (acertado) {
              //console.log("¡Nombre correcto!");
              correctCircleRef?.current?.classList?.add('correct');

              gsap.to(".qeq .invitado", {
                opacity: 0,
                duration: .25,
                onComplete: () => {
                  correctCircleRef?.current?.classList?.remove('correct');
                  updateCurrentName();
                }
              })
              tlRelease
                .to(invitadoRef, {
                  duration: .25,
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
                      .to(correctCircleRef.current, {
                        scale: 1,
                        duration: .125,
                        ease: 'power1.inOut',
                        delay: .5,
                      }, ">")


                  },

                }, ">")
            } else {
              //console.log("Nombre incorrecto.");
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
          invitadoRef && tlRelease
            .to(invitadoRef, {
              x: this.initialX,
              y: this.initialY,
              ease: 'power1.out',
            }, ">")
            .to(invitadoRef, {
              scale: escala,
              duration: acertado ? .5 : .5,
              delay: acertado ? .5 : 0,
              ease: 'power1.out',
            }, "<")
            const primero = invitadoRef.querySelector("p.primero");
            const segundo = invitadoRef.querySelector("p.segundo");
            invitadoRef && primero && tlRelease.to(primero, {
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
                tlRelease.to(".name-circle span", {
                  opacity: 1, duration: .25,
                  onComplete: () => {
                    reseteoBg();
                  }
                }, ">");

              }
            }, ">");

        },
      })[0];
      draggablesRef.current.push(draggableInstance);
    });
  }, [mesaSeleccionada, activeCard]);

  useEffect(() => {
    //console.log(invitado?.mesa?.nombre);
    activeCard === "horarios" && setSelectedMesa(invitado?.mesa?.nombre)
  }, [activeCard]);

  useEffect(() => {
    console.log(invitadosAcertados.length);
    console.log(options.length);
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
        duration: .125,
        ease: 'power1.inOut',
      });
    }
  }, [currentName])
  //console.log(generatePastelColor(true));


  return activeCard === "horarios" && (<>
    <div className={MAINCLASS}>
      {/* <Bubbles amount={10} color={generatePastelColor(true)} /> */}
      {/* <h2>Selecciona una Mesa</h2> */}
      <div className="qeq-selector">
        <Select
          className="mi-select"
          styles={customStyles}
          options={options}
          value={options.find((option) => option.value === selectedMesa)}
          onChange={handleMesaChange}
          isSearchable={false}
          placeholder="Selecciona una mesa"
          noOptionsMessage={() => "No hay mesas disponibles"}
          isClearable={false}
        />
      </div>
      {/* <select onChange={handleMesaChange} value={selectedMesa}>
        <option value="">Seleccione una mesa</option>
        {Object.keys(mesas).map((mesaKey) => (
          <option key={mesaKey} value={mesaKey}>
            {mesas[mesaKey].nombre}
          </option>
        ))}
      </select> */}
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
                src={invitado.personaje?.imagen_url || dummyImage}
                alt={invitado.nombre}
              />
              <div className="invitado-info">
                {(
                  <p className="primero" style={{ backgroundColor: generatePastelColor() }}>
                    {invitado.personaje?.nombre || "nombre personaje"}
                  </p>
                )}
                {(
                  <p className="segundo" style={{ backgroundColor: generatePastelColor() }}>
                    {invitado.personaje?.descripcion || "descripción personaje"}
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
      <Typewriter
        onInit={(typewriter) => {
          typewriter
            .typeString(
              "Arrastra el personaje correcto hasta el nombre del invitado"
            )
            .start();
        }}
        options={{
          autoStart: true,
          loop: false, // No repetir la animación
          delay: 50, // Velocidad de escritura
          // cursor: "", // Elimina el cursor al finalizar
        }}
      />

    </div>
    <button className="back orange" onClick={() => setActiveCard("sobre")} />
  </>
  );
};

export default QEQ;
