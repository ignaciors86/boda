import React, { createContext, useState, useContext, useEffect } from 'react';

const InvitadoImageContext = createContext();

export const InvitadoImageProvider = ({ children }) => {
    // Intentar cargar la URL desde localStorage al inicializar
    const [currentImageUrl, setCurrentImageUrl] = useState(() => {
        const savedUrl = localStorage.getItem('invitadoImageUrl');
        return savedUrl || null;
    });

    const setImageUrl = (url) => {
        setCurrentImageUrl(url);
        // Guardar en localStorage cada vez que se actualice
        localStorage.setItem('invitadoImageUrl', url);
    };

    return (
        <InvitadoImageContext.Provider value={{ 
            currentImageUrl, 
            setCurrentImageUrl: setImageUrl
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