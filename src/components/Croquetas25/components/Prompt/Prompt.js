import React, { useEffect, useRef, useState } from 'react';
import './Prompt.scss';
import Typewriter from 'typewriter-effect';
import { gsap } from 'gsap';
import KITT from '../KITT/KITT';

const MAINCLASS = 'prompt';

const Prompt = ({ textos = [], currentTime = 0, duration = 0, typewriterInstanceRef: externalTypewriterRef, isPaused = false, analyser = null }) => {
  const promptRef = useRef(null);
  const typewriterKeyRef = useRef(0);
  const currentTextIndexRef = useRef(-1);
  const [currentTextIndex, setCurrentTextIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isIntentionallyHidden, setIsIntentionallyHidden] = useState(false);
  const internalTypewriterRef = useRef(null);
  const lastShownTextIndexRef = useRef(-1);
  const pausedTextRef = useRef(null);
  
  const typewriterInstanceRef = externalTypewriterRef || internalTypewriterRef;
  
  useEffect(() => {
    if (isPaused && typewriterInstanceRef.current) {
      try {
        const typewriterElement = document.querySelector(`.${MAINCLASS} .Typewriter__wrapper`);
        if (typewriterElement) {
          const currentText = typewriterElement.textContent || '';
          if (currentText.length > 0) {
            pausedTextRef.current = currentText;
          }
        }
        if (typeof typewriterInstanceRef.current.deleteAll === 'function') {
          typewriterInstanceRef.current.deleteAll();
        }
        typewriterKeyRef.current += 1;
      } catch (error) {
        console.warn('[Prompt] Error pausing typewriter:', error);
      }
    } else if (!isPaused && pausedTextRef.current) {
      typewriterKeyRef.current += 1;
    }
  }, [isPaused]);

  const getCurrentTextIndex = () => {
    if (!textos || textos.length === 0 || !duration || duration === 0) {
      return -1;
    }

    const timePerText = duration / textos.length;
    const index = Math.floor(currentTime / timePerText);
    return Math.min(index, textos.length - 1);
  };

  useEffect(() => {
    const textIndex = getCurrentTextIndex();
    
    if (textIndex !== currentTextIndexRef.current) {
      currentTextIndexRef.current = textIndex;
      setCurrentTextIndex(textIndex);
      typewriterKeyRef.current += 1;
    }
  }, [currentTime, duration, textos.length]);

  const handleTypewriterComplete = (completedTextIndex) => {
    setIsTyping(false);
    
    setTimeout(() => {
      const timePerText = duration > 0 && textos.length > 0 ? duration / textos.length : 0;
      const currentTimeBasedIndex = timePerText > 0 
        ? Math.min(Math.floor(currentTime / timePerText), textos.length - 1)
        : -1;
      
      const hasMoreText = currentTimeBasedIndex > completedTextIndex;
      const hasEnded = duration > 0 && currentTime >= duration;
      
      if (!hasMoreText && !hasEnded && isVisible && promptRef.current && 
          currentTimeBasedIndex === completedTextIndex) {
        const fadeOutProps = { opacity: 0, y: 20, duration: 0.4, ease: 'power2.in' };
        gsap.to(promptRef.current, fadeOutProps);
        setIsIntentionallyHidden(true);
      }
    }, 1000);
  };

  useEffect(() => {
    if (isPaused) return;
    
    const hasText = currentTextIndex >= 0 && currentTextIndex < textos.length;
    const hasEnded = duration > 0 && currentTime >= duration;
    const textIndexChanged = currentTextIndex !== lastShownTextIndexRef.current;
    const isFirstText = lastShownTextIndexRef.current === -1 && currentTextIndex >= 0;
    
    if (hasText && !hasEnded && (textIndexChanged || isFirstText)) {
      lastShownTextIndexRef.current = currentTextIndex;
      setIsIntentionallyHidden(false);
      
      if (promptRef.current) {
        const fadeInProps = { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' };
        gsap.to(promptRef.current, fadeInProps);
        setIsVisible(true);
        setIsTyping(true);
      }
    } else if (hasEnded && isVisible && promptRef.current && !isTyping) {
      const fadeOutProps = { opacity: 0, y: 20, duration: 0.4, ease: 'power2.in' };
      gsap.to(promptRef.current, fadeOutProps);
      setIsVisible(false);
      setIsIntentionallyHidden(true);
    }
  }, [currentTextIndex, textos.length, isVisible, currentTime, duration, isTyping, isPaused]);

  useEffect(() => {
    promptRef.current && gsap.set(promptRef.current, { opacity: 0, y: 20 });
  }, []);

  if (!textos || textos.length === 0) {
    return null;
  }

  const textToShow = currentTextIndex >= 0 && currentTextIndex < textos.length 
    ? textos[currentTextIndex] 
    : '';

  if (!textToShow) {
    return null;
  }

  const shouldRenderTypewriter = !isPaused || !pausedTextRef.current;

  return (
    <div className={MAINCLASS} ref={promptRef}>
      {analyser && (
        <div className={`${MAINCLASS}__kitt`}>
          <KITT analyser={analyser} />
        </div>
      )}
      <div className={`${MAINCLASS}__placeholder`}>
        {shouldRenderTypewriter ? (
          <Typewriter
            key={typewriterKeyRef.current}
            onInit={(typewriter) => {
              typewriterInstanceRef.current = typewriter;
              setIsTyping(true);
              
              const textToType = pausedTextRef.current 
                ? textos[currentTextIndex]?.substring(pausedTextRef.current.length) || textToShow
                : textToShow;
              
              if (pausedTextRef.current && pausedTextRef.current.length > 0) {
                const placeholder = document.querySelector(`.${MAINCLASS}__placeholder`);
                if (placeholder) {
                  placeholder.textContent = pausedTextRef.current;
                }
              }
              
              typewriter
                .typeString(textToType)
                .callFunction(() => {
                  handleTypewriterComplete(currentTextIndex);
                  pausedTextRef.current = null;
                })
                .start();
            }}
            options={{
              autoStart: !isPaused,
              loop: false,
              delay: 25,
            }}
          />
        ) : (
          <span>{pausedTextRef.current}</span>
        )}
      </div>
    </div>
  );
};

export default Prompt;
