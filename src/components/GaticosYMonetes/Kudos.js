import React, { useState, useRef, useEffect } from 'react';
import './Kudos.scss';

const Kudos = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const bubblesRef = useRef({});

  // Emojis organizados por niveles
  const emojiLevels = {
    inner: ['💑', '💒', '💐', '💍', '🌹', '💝'],
    middle: ['💃', '🕺', '👰', '🤵', '🥂', '🎭', '🎪'],
    outer: ['🎊', '✨', '🎵', '🎶', '🌟', '🎉', '🎼']
  };

  useEffect(() => {
    // Generar las posiciones iniciales una sola vez
    if (Object.keys(bubblesRef.current).length === 0) {
      const newBubbles = {};
      
      Object.entries(emojiLevels).forEach(([level, emojis]) => {
        const radius = level === 'inner' ? 120 : level === 'middle' ? 200 : 280;
        const startAngle = level === 'middle' ? Math.PI / emojis.length : 0;
        
        emojis.forEach((_, index) => {
          const angle = startAngle + (index * 2 * Math.PI) / emojis.length;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const key = `${level}-${index}`;
          
          newBubbles[key] = {
            x,
            y,
            angle,
            ...generateBubbleAnimation()
          };
        });
      });
      
      bubblesRef.current = newBubbles;
    }
  }, []);

  const handleEmojiClick = (emoji) => {
    setIsAnimating(true);
    const like = {
      id: Date.now(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: Math.random() * 0.8 + 0.4,
      rotation: Math.random() * 360,
      emoji: emoji
    };
    localStorage.setItem('newLike', JSON.stringify(like));
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const generateBubbleAnimation = () => {
    const duration = Math.random() * 15 + 20;
    const xOffset = Math.random() * 40 - 20;
    const yOffset = Math.random() * 40 - 20;
    const delay = Math.random() * -30;
    const rotationSpeed = Math.random() * 15 + 10;
    
    return {
      duration: `${duration}s`,
      xOffset: `${xOffset}px`,
      yOffset: `${yOffset}px`,
      delay: `${delay}s`,
      rotationSpeed: `${rotationSpeed}s`
    };
  };

  const renderEmojiRing = (emojis, level) => {
    return emojis.map((emoji, index) => {
      const key = `${level}-${index}`;
      const bubbleProps = bubblesRef.current[key];
      
      if (!bubbleProps) return null;

      return (
        <button
          key={key}
          className="emoji-option floating-bubble"
          style={{
            '--x': `${bubbleProps.x}px`,
            '--y': `${bubbleProps.y}px`,
            '--angle': `${bubbleProps.angle}rad`,
            '--bubble-duration': bubbleProps.duration,
            '--x-offset': bubbleProps.xOffset,
            '--y-offset': bubbleProps.yOffset,
            '--animation-delay': bubbleProps.delay,
            '--rotation-duration': bubbleProps.rotationSpeed
          }}
          onClick={() => handleEmojiClick(emoji)}
        >
          {emoji}
        </button>
      );
    });
  };

  return (
    <div className="kudos-container">
      <div className="emoji-selector">
        {renderEmojiRing(emojiLevels.inner, 'inner')}
        {renderEmojiRing(emojiLevels.middle, 'middle')}
        {renderEmojiRing(emojiLevels.outer, 'outer')}
      </div>
      
      <button 
        className={`like-button ${isAnimating ? 'pulse' : ''}`} 
        onClick={() => handleEmojiClick('❤️')}
      >
        <span className="heart-icon">❤️</span>
      </button>
    </div>
  );
};

export default Kudos; 