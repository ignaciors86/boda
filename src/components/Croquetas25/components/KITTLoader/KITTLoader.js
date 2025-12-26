import React from 'react';
import './KITTLoader.scss';

const MAINCLASS = 'kittLoader';

const KITTLoader = ({ fast = false }) => {
  return (
    <div className={`${MAINCLASS} ${fast ? `${MAINCLASS}--fast` : ''}`}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className={`${MAINCLASS}__segment`} />
      ))}
    </div>
  );
};

export default KITTLoader;


