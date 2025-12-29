import React, { forwardRef } from 'react';
import './Croqueta.scss';

const MAINCLASS = 'croqueta';

const getCroquetaSVG = (index) => {
  const variations = [
    <svg 
      key={`croqueta-${index}-1`}
      className={`${MAINCLASS}__svg`}
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 20 60 
           Q 15 40, 20 25 
           Q 25 15, 40 18 
           Q 60 22, 80 20 
           Q 100 18, 120 25 
           Q 140 32, 155 40 
           Q 170 48, 175 60 
           Q 180 72, 175 85 
           Q 170 98, 160 100 
           Q 150 102, 140 100 
           Q 130 98, 120 95 
           Q 110 92, 100 88 
           Q 90 84, 80 80 
           Q 70 76, 60 72 
           Q 50 68, 40 65 
           Q 30 62, 22 60 
           Q 20 60, 20 60 Z"
        fill="currentColor"
        fillOpacity="0"
        pointerEvents="all"
      />
      <path
        d="M 20 60 
           Q 15 40, 20 25 
           Q 25 15, 40 18 
           Q 60 22, 80 20 
           Q 100 18, 120 25 
           Q 140 32, 155 40 
           Q 170 48, 175 60 
           Q 180 72, 175 85 
           Q 170 98, 160 100 
           Q 150 102, 140 100 
           Q 130 98, 120 95 
           Q 110 92, 100 88 
           Q 90 84, 80 80 
           Q 70 76, 60 72 
           Q 50 68, 40 65 
           Q 30 62, 22 60 
           Q 20 60, 20 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </svg>,
    <svg 
      key={`croqueta-${index}-2`}
      className={`${MAINCLASS}__svg`}
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 30 60 
           Q 25 35, 35 20 
           Q 45 10, 65 15 
           Q 85 20, 100 18 
           Q 115 16, 130 22 
           Q 145 28, 160 35 
           Q 175 42, 170 60 
           Q 165 78, 155 90 
           Q 145 102, 130 100 
           Q 115 98, 100 95 
           Q 85 92, 70 88 
           Q 55 84, 45 75 
           Q 35 66, 30 60 Z"
        fill="currentColor"
        fillOpacity="0"
        pointerEvents="all"
      />
      <path
        d="M 30 60 
           Q 25 35, 35 20 
           Q 45 10, 65 15 
           Q 85 20, 100 18 
           Q 115 16, 130 22 
           Q 145 28, 160 35 
           Q 175 42, 170 60 
           Q 165 78, 155 90 
           Q 145 102, 130 100 
           Q 115 98, 100 95 
           Q 85 92, 70 88 
           Q 55 84, 45 75 
           Q 35 66, 30 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </svg>
  ];
  
  return variations[index % variations.length];
};

const Croqueta = forwardRef(({ 
  index = 0, 
  text = '', 
  onClick, 
  rotation = 0,
  className = '',
  style = {}
}, ref) => {
  return (
    <button
      ref={ref}
      className={`${MAINCLASS} ${className}`}
      onClick={onClick}
      style={{
        ...style,
        ...(rotation !== 0 && { '--rotation': `${rotation}deg` })
      }}
    >
      <div 
        className={`${MAINCLASS}__svgWrapper`}
        onClick={onClick}
      >
        {getCroquetaSVG(index)}
      </div>
      {text && (
        <span className={`${MAINCLASS}__text`}>
          {text}
        </span>
      )}
    </button>
  );
});

Croqueta.displayName = 'Croqueta';

export default Croqueta;
