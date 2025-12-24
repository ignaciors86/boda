import React, { createContext, useState, useContext } from 'react';

const InvitadoImageContext = createContext();

export const InvitadoImageProvider = ({ children }) => {
    const [currentImageUrl, setCurrentImageUrl] = useState(null);

    return (
        <InvitadoImageContext.Provider value={{ 
            currentImageUrl, 
            setCurrentImageUrl
        }}>
            {children}
        </InvitadoImageContext.Provider>
    );
};

export const useInvitadoImage = () => {
    const context = useContext(InvitadoImageContext);
    if (!context) {
        throw new Error('useInvitadoImage debe ser usado dentro de un InvitadoImageProvider');
    }
    return context;
}; 