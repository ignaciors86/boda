import React from 'react';
import './Intro.scss';

const Intro = ({ tracks, onTrackSelect }) => {
  return (
    <div className="intro-overlay">
      <div className="intro">
        <h2 className="intro__title">Selecciona una canción</h2>
        <div className="intro__buttons">
          {tracks.map(track => (
            <button
              key={track.id}
              className="intro__button"
              onClick={(e) => {
                e.stopPropagation();
                onTrackSelect(track);
              }}
            >
              <span className="intro__button-text">{track.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Intro;

