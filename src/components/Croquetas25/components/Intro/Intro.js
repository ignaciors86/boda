import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import Croqueta from '../Croqueta/Croqueta';
import './Intro.scss';

const MAINCLASS = 'intro';

const Intro = ({ tracks, onTrackSelect, selectedTrackId = null, isDirectUri = false }) => {
  const titleRef = useRef(null);
  const buttonsRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef(null);
  const [croquetasUnlocked, setCroquetasUnlocked] = useState(false);
  const rotationTimelinesRef = useRef([]);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  const normalizeId = useCallback((id) => id?.toLowerCase().replace(/\s+/g, '-') || null, []);

  const isMainCroqueta = useCallback((track) => {
    if (!selectedTrackId || !track) return false;
    const normalizedId = normalizeId(selectedTrackId);
    return normalizeId(track.id) === normalizedId || normalizeId(track.name) === normalizedId;
  }, [selectedTrackId, normalizeId]);

  const getCroquetaClasses = useCallback((isMain = false) => {
    return isMain 
      ? `${MAINCLASS}__button--main ${isDirectUri ? `${MAINCLASS}__button--mainUri` : ''}`
      : `${MAINCLASS}__button--normal`;
  }, [isDirectUri]);

  const setButtonRef = useCallback((index) => (el) => {
    if (el) {
      buttonsRef.current[index] = el;
    } else {
      const idx = buttonsRef.current.indexOf(el);
      if (idx !== -1) buttonsRef.current[idx] = null;
    }
  }, []);

  const handleTrackSelect = useCallback((track, index) => {
    if (isAnimating) return;
    
    if (isDirectUri && selectedTrackId && isMainCroqueta(track)) {
      setCroquetasUnlocked(true);
    }
    
    if (isDirectUri && !croquetasUnlocked && !isMainCroqueta(track)) return;
    
    setIsAnimating(true);
    rotationTimelinesRef.current.forEach(tl => tl?.kill());

    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
        onTrackSelect?.(track);
      }
    });

    const fadeOut = { opacity: 0, ease: 'power2.in' };
    titleRef.current && tl.to(titleRef.current, { ...fadeOut, y: -30, duration: 1.2 });

    buttonsRef.current.forEach((buttonRef, i) => {
      if (!buttonRef) return;
      tl.to(buttonRef, {
        ...fadeOut,
        scale: 0,
        rotation: `+=${i === index ? 180 : 0}`,
        duration: 0.8,
        transformOrigin: 'center center'
      }, i === index ? 0 : Math.abs(i - index) * 0.1);
    });
  }, [isAnimating, isDirectUri, selectedTrackId, croquetasUnlocked, isMainCroqueta, onTrackSelect]);

  const handleCroquetaClick = useCallback((track, index) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleTrackSelect(track, index);
  }, [handleTrackSelect]);

  useEffect(() => {
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);
  
  useEffect(() => {
    setCroquetasUnlocked(false);
  }, [selectedTrackId]);
  
  useEffect(() => {
    const initProps = { opacity: 0 };
    [titleRef, overlayRef].forEach(ref => {
      if (ref.current) gsap.set(ref.current, ref === titleRef ? { ...initProps, y: -30 } : initProps);
    });
    
    buttonsRef.current.forEach(buttonRef => {
      if (buttonRef) gsap.set(buttonRef, { ...initProps, scale: 0, rotation: 0 });
    });

    const tl = gsap.timeline();
    const fadeIn = { opacity: 1, ease: 'power2.out' };
    
    overlayRef.current && tl.to(overlayRef.current, { ...fadeIn, duration: 0.8 });
    titleRef.current && tl.to(titleRef.current, {
      ...fadeIn,
      y: 0,
      duration: 1.0,
      onComplete: () => titleRef.current && gsap.set(titleRef.current, { opacity: 1, y: 0 })
    }, '-=0.5');

    buttonsRef.current.forEach((buttonRef, i) => {
      buttonRef && tl.to(buttonRef, {
        ...fadeIn,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.7)'
      }, 0.4 + (i * 0.1));
    });
  }, []);

  useEffect(() => {
    rotationTimelinesRef.current.forEach(tl => tl?.kill());
    rotationTimelinesRef.current = [];

    buttonsRef.current.forEach((buttonRef, index) => {
      if (!buttonRef) return;
      const track = tracks[index];
      if (!track || isMainCroqueta(track)) return;

      const rotationSpeed = 20 + Math.random() * 10;
      const direction = Math.random() > 0.5 ? 1 : -1;
      
      rotationTimelinesRef.current[index] = gsap.to(buttonRef, {
        rotation: `+=${360 * direction}`,
        duration: rotationSpeed,
        ease: 'none',
        repeat: -1
      });
    });

    return () => {
      rotationTimelinesRef.current.forEach(tl => tl?.kill());
      rotationTimelinesRef.current = [];
    };
  }, [tracks, selectedTrackId, isMainCroqueta]);

  return (
    <div 
      className={MAINCLASS} 
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && e.preventDefault()}
    >
      <div className={`${MAINCLASS}__container`}>
        <h2 ref={titleRef} className={`${MAINCLASS}__title`}>Coge una croqueta</h2>
        
        {selectedTrackId && memoizedTracks.map((track, index) => {
          if (!isMainCroqueta(track)) return null;
          
          return (
            <Croqueta
              key={track.id}
              index={index}
              text={track.name}
              onClick={handleCroquetaClick(track, index)}
              rotation={0}
              className={`${MAINCLASS}__button ${getCroquetaClasses(true)} ${isDirectUri ? `${MAINCLASS}__button--activeUri` : ''}`}
              ref={setButtonRef(index)}
            />
          );
        })}
        
        <div className={`${MAINCLASS}__buttons`}>
          {memoizedTracks.map((track, index) => {
            if (isMainCroqueta(track) || (isDirectUri && !croquetasUnlocked)) return null;
            
            return (
              <Croqueta
                key={track.id}
                index={index}
                text={track.name}
                onClick={handleCroquetaClick(track, index)}
                rotation={0}
                className={`${MAINCLASS}__button ${getCroquetaClasses(false)}`}
                ref={setButtonRef(index)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Intro;
