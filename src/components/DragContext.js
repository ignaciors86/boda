import React, { createContext, useContext, useState } from 'react';

const DragContext = createContext();

export const useDragContext = () => useContext(DragContext);

export const DragProvider = ({ children }) => {
  const [isOtherDraggableActive, setIsOtherDraggableActive] = useState(false);
  const [activeCard, setActiveCard] = useState(null);

  return (
    <DragContext.Provider value={{ isOtherDraggableActive, setIsOtherDraggableActive, activeCard, setActiveCard }}>
      {children}
    </DragContext.Provider>
  );
};