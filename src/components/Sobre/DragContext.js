import React, { createContext, useContext, useState } from 'react';

const DragContext = createContext();

export const useDragContext = () => useContext(DragContext);

export const DragProvider = ({ children }) => {
  const [isOtherDraggableActive, setIsOtherDraggableActive] = useState(false);

  return (
    <DragContext.Provider value={{ isOtherDraggableActive, setIsOtherDraggableActive }}>
      {children}
    </DragContext.Provider>
  );
};