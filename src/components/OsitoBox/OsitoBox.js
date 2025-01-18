import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './OsitoBox.scss';
import { Draggable } from 'gsap/all';

const OsitoBox = ({ onChange, confirmacion, setConfirmacion }) => {
  const [checked, setChecked] = useState(true);
  const [count, setCount] = useState(1);
  const [ draggedToLimit, setDraggedToLimit ] = useState(false);
  const bearRef = useRef(null);
  const armWrapRef = useRef(null);
  const armRef = useRef(null);
  const pawRef = useRef(null);
  const swearRef = useRef(null);
  const bgRef = useRef(null);
  const indicatorRef = useRef(null);
  const yesTextRef = useRef(null);
  const noTextRef = useRef(null);
  
  const [vueltaHecha, setVueltaHecha] = useState(false);
  const randomInRange = (max, min = 1) => Math.random() * (max - min) + min;
  const TOQUES = 3;
  const armLimit = 0;
  const headLimit = 2;
  const angerLimit = TOQUES;
  const cociente = .35;
  const armDuration = cociente * 0.2;
  const bearDuration = cociente * 1;
  const checkboxDuration = cociente * 0.1;
  const pawDuration = cociente * 0.5;
  const grabBearTL = () => {


    let bearTranslation = '0%';
    if (count === 1 && !vueltaHecha) {
      bearTranslation = '100%';
    } else if (count === 2) {
      bearTranslation = '40%';
    } else if (count === 3) {
      bearTranslation = '0%';
    }

    const onComplete = () => {
      // setChecked(count < TOQUES);
      // setCount(prevCount => prevCount + 1);
      // Disparar onChange con el nuevo estado
      if (onChange) {
        onChange({ target: { checked: !checked } });
      }
    };

    let onBearComplete = () => {};

    

    if (count > 1 || vueltaHecha) {
      onBearComplete = () => (swearRef.current.style.display = 'block');
    }

    const base = armDuration + pawDuration;
    const preDelay = 0;
    const delay = count > armLimit ? base + bearDuration + preDelay : base;

    const bearTL = gsap.timeline({ delay: Math.random(), onComplete });
    
    // console.log(count);
    
    bearTL
      .add(
        count <= TOQUES
          ? gsap.to(bearRef.current, { duration: bearDuration, onComplete: onBearComplete, y: bearTranslation })
          : null
      )
      // count < TOQUES && bearTL.to(armWrapRef.current, { duration: armDuration, x: 50 }, 0)
      count < TOQUES && bearTL.to(armWrapRef.current, { duration: armDuration, marginLeft: "calc(var(--size-unit)* .45)" }, 0)
      .to(armRef.current, { duration: armDuration, scaleX: 1 }, armDuration)

      .to(pawRef.current, { scaleX: 0.8,}, ">")

      count < TOQUES && bearTL
      
      .to(indicatorRef.current, { duration: checkboxDuration, x: '0%' }, delay + pawDuration)
      .to(bgRef.current, { duration: checkboxDuration, backgroundColor: 'var(--purpleTransparent)' }, delay + pawDuration)
      .to(yesTextRef.current, { duration: checkboxDuration, opacity: 1 }, "<")
      .to(noTextRef.current, { duration: checkboxDuration, opacity: 0 }, "<")
    
      .to(pawRef.current, { duration: pawDuration, scaleX: 0 }, ">")
      .to(armRef.current, {duration: pawDuration, scaleX: 1 }, ">")
      .to(armWrapRef.current, { duration: armDuration, marginLeft: 0 }, delay + pawDuration)
      // .to(pawRef.current, { duration: pawDuration, marginLeft: 0, scaleX: 0 }, delay + pawDuration)
      bearTL.to(bearRef.current, { duration: bearDuration, y: '100%', onComplete: () => {
        setCount(count === TOQUES ? 1 : (count + 1));
        count === TOQUES && setVueltaHecha(true);
        swearRef.current.style.display = 'none';
        setDraggedToLimit(false);
      } }, delay + pawDuration);

      setConfirmacion(count < TOQUES);
    return bearTL;
  };

  const showTimeline = () => {
    const checkboxDuration = 0.25;

    const checkTL = gsap.timeline();
    checkTL
      .to(indicatorRef.current, { duration: checkboxDuration, x: checked ? '329%' : 0, }, 0)
      .to(bgRef.current, { duration: checkboxDuration, backgroundColor: !checked ? 'var(--purpleTransparent)' : 'var(--darkGray)' }, "<")
      .to(yesTextRef.current, { duration: checkboxDuration, opacity: checked ? 0 : 1 }, "<")
      .to(noTextRef.current, { duration: checkboxDuration, opacity: checked ? 1 : 0 }, "<")
      .add(grabBearTL(), checkboxDuration);
  };

  const handleCheckbox = () => {
    setChecked(count < TOQUES);
    showTimeline();
  }

  const handleHover = () => {
    
      gsap.to(bearRef.current, { duration: 0.125, y: '40%' });
    
  };

  const handleMouseOut = () => {
    if (!checked) {
      gsap.to(bearRef.current, { duration: 0.125, y: '100%' });
    }
  };

  useEffect(() => {
    // console.log(confirmacion);

  }, [confirmacion])

  useEffect(() => {

  
    if (!bgRef.current || !indicatorRef.current) return;
  
    const bgWidth = bgRef.current.offsetWidth;
    const suelo = bgWidth * 0.5;
    const techo = bgWidth * 0.8;
    setDraggedToLimit(true);
    draggedToLimit !== null && Draggable.create(indicatorRef.current, {
      type: 'x',
      bounds: bgRef.current,
      touchAction: 'none',
      onDrag: function () {
        // console.log('this.x:', this.x);
        this.enable();
        
        // console.log('draggedToLimit:', draggedToLimit);
        if ((this.x < techo || this.x < suelo)) {
          // console.log("Cruce");
          draggedToLimit && this.disable();
          draggedToLimit && handleCheckbox();
        }
      },
      onDragEnd: function () {
        this.enable();
      }
    });
  }, [draggedToLimit]);
  

  return (
    <div className='ositoBox'>
      <div className="bear__wrap">
        <p ref={swearRef} className="bear__swear">
          {vueltaHecha && count === 1? "Bien hecho..." : count === 2 ? "TE VA A COSTAR MÁS QUE ESO" : "$%* VALE! $#@"}
        </p>
        <svg
          ref={bearRef}
          className="bear"
          viewBox="0 0 284.94574 359.73706"
          preserveAspectRatio="xMinYMin"
          // onMouseOver={handleHover}
          // onMouseOut={handleMouseOut}
        >
          <g id="layer1" transform="translate(-7.5271369,-761.38595)">
            <g
              id="g5691"
              transform="matrix(1.2335313,0,0,1.2335313,-35.029693,-212.83637)"
            >
              <path
                id="path4372"
                d="M 263.90933,1081.4151 A 113.96792,96.862576 0 0 0 149.99132,985.71456 113.96792,96.862576 0 0 0 36.090664,1081.4151 l 227.818666,0 z"
                style={{ fill: '#784421', fillOpacity: 1 }}
              />
              <path
                id="path5634"
                d="m 250.42825,903.36218 c 2e-5,66.27108 -44.75411,114.99442 -102.42825,114.99442 -57.674143,0 -98.428271,-48.72334 -98.428251,-114.99442 4e-6,-66.27106 40.754125,-92.99437 98.428251,-92.99437 57.67413,0 102.42825,26.72331 102.42825,92.99437 z"
                style={{ fill: '#784421', fillOpacity: 1 }}
              />
              <path
                id="path5639"
                d="m 217,972.86218 c 2e-5,21.53911 -30.44462,42.00002 -68,42.00002 -37.55538,0 -66.000019,-20.46091 -66,-42.00002 0,-21.53911 28.44464,-36 66,-36 37.55536,0 68,14.46089 68,36 z"
                style={{ fill: '#e9c6af', fillOpacity: 1 }}
              />
              <path
                id="path5636"
                d="m 181.5,944.36218 c 0,8.28427 -20.59974,26.5 -32.75,26.5 -12.15026,0 -34.75,-18.21573 -34.75,-26.5 0,-8.28427 22.59974,-13.5 34.75,-13.5 12.15026,0 32.75,5.21573 32.75,13.5 z"
                style={{ fill: '#000000', fillOpacity: 1 }}
              />
              <g id="g5681">
                <ellipse
                  style={{ fill: '#784421', fillOpacity: 1 }}
                  id="path5657"
                  cx="69"
                  cy="823.07269"
                  rx="34.5"
                  ry="33.289474"
                />
                <path
                  transform="translate(0,750.76214)"
                  id="path5659"
                  d="M 69,47.310547 A 24.25,23.399124 0 0 0 44.75,70.710938 24.25,23.399124 0 0 0 64.720703,93.720703 c 0.276316,-0.40734 0.503874,-0.867778 0.787109,-1.267578 1.70087,-2.400855 3.527087,-4.666237 5.470704,-6.798828 1.943616,-2.132591 4.004963,-4.133318 6.179687,-6.003906 2.174725,-1.870589 4.461274,-3.611714 6.855469,-5.226563 2.394195,-1.614848 4.896019,-3.10338 7.498047,-4.46875 0.539935,-0.283322 1.133058,-0.500695 1.68164,-0.773437 A 24.25,23.399124 0 0 0 69,47.310547 Z"
                  style={{ fill: '#e9c6af', fillOpacity: 1 }}
                />
              </g>
              <g transform="matrix(-1,0,0,1,300,0)" id="g5685">
                <ellipse
                  ry="33.289474"
                  rx="34.5"
                  cy="823.07269"
                  cx="69"
                  id="ellipse5687"
                  style={{ fill: '#784421', fillOpacity: 1 }}
                />
                <path
                  transform="translate(0,750.76214)"
                  id="path5689"
                  d="M 69,47.310547 A 24.25,23.399124 0 0 0 44.75,70.710938 24.25,23.399124 0 0 0 64.720703,93.720703 c 0.276316,-0.40734 0.503874,-0.867778 0.787109,-1.267578 1.70087,-2.400855 3.527087,-4.666237 5.470704,-6.798828 1.943616,-2.132591 4.004963,-4.133318 6.179687,-6.003906 2.174725,-1.870589 4.461274,-3.611714 6.855469,-5.226563 2.394195,-1.614848 4.896019,-3.10338 7.498047,-4.46875 0.539935,-0.283322 1.133058,-0.500695 1.68164,-0.773437 A 24.25,23.399124 0 0 0 69,47.310547 Z"
                  style={{ fill: '#e9c6af', fillOpacity: 1 }}
                />
              </g>
              <ellipse
                ry="9.6790915"
                rx="9.2701159"
                cy="900.38916"
                cx="105.83063"
                id="path4368"
                style={{ fill: '#000000', fillOpacity: 1 }}
              />
              <ellipse
                style={{ fill: '#000000', fillOpacity: 1 }}
                id="ellipse4370"
                cx="186.89894"
                cy="900.38916"
                rx="9.2701159"
                ry="9.6790915"
              />
              {(count === 3 || (vueltaHecha && count === 1)) && (
                <g>
                  <path
                    id="path4396"
                    d="m 92.05833,865.4614 39.42665,22.76299"
                    style={{
                      stroke: '#000000',
                      strokeWidth: 4.86408424,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeMiterlimit: 4,
                      strokeOpacity: 1,
                    }}
                  />
                  <path
                    style={{
                      stroke: '#000000',
                      strokeWidth: 4.86408424,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeMiterlimit: 4,
                      strokeOpacity: 1,
                    }}
                    d="m 202.82482,865.4614 -39.42664,22.76299"
                    id="path4400"
                  />
                </g>
              )}
            </g>
          </g>
        </svg>
      </div>
      <div ref={armWrapRef} className="bear__arm-wrap">
        <svg
          ref={armRef}
          className="bear__arm"
          viewBox="0 0 250.00001 99.999997"
          preserveAspectRatio="xMinYMin"
        >
          <g transform="translate(868.57141,-900.93359)" id="layer1">
            <path
              style={{ fill: '#784421', fillOpacity: 1 }}
              d="m -619.43416,945.05124 c 4.18776,73.01076 -78.25474,53.24342 -150.21568,52.94118 -82.38711,-0.34602 -98.92158,-19.44459 -98.92157,-47.05883 0,-27.61424 4.78794,-42.54902 73.82353,-42.54902 69.03559,0 171.43607,-30.93764 175.31372,36.66667 z"
              id="path4971"
            />
            <ellipse
              style={{ fill: '#e9c6af', fillOpacity: 1 }}
              id="path4974"
              cx="-683.02264"
              cy="950.98572"
              rx="29.910826"
              ry="29.414362"
            />
          </g>
        </svg>

      </div>
      <div className="mask" />
      <div
        className={`checkbox ${checked ? 'checked' : ''}`}
        onClick={handleCheckbox}
      >
        <input type="checkbox" checked={checked} readOnly />
        <div ref={bgRef} className="checkbox__bg" />

        
        <div ref={indicatorRef} className={`checkbox__indicator ${checked ? 'indicator-checked' : ''}`}>
        
          
        </div>
        <div ref={noTextRef} className="checkbox__text no-text">
            <h3>No podré</h3>
          </div>
          <div ref={yesTextRef} className="checkbox__text yes-text">
            <h3>Asistiré</h3>
          </div>

          <svg
          ref={pawRef}
          className={"bear__paw"}
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMinYMin"
          
        >
            <circle cx="25" cy="25" r="20" style={{ fill: '#784421' }} />
            <circle cx="15" cy="15" r="5" style={{ fill: '#e9c6af' }} />
            <circle cx="35" cy="15" r="5" style={{ fill: '#e9c6af' }} />
            <circle cx="25" cy="35" r="5" style={{ fill: '#e9c6af' }} />
          </svg>
      </div>
    </div>
  );
};

export default OsitoBox;
