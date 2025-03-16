/**
 * Calcula qué frases deberían ser visibles en un momento dado
 * @param {Object} bloque - Bloque de texto actual
 * @param {number} tiempoRelativo - Tiempo transcurrido desde el inicio del bloque
 * @returns {number[]} Array con los índices de las frases que deberían mostrarse
 */
export const calcularFrasesVisibles = (bloque, tiempoRelativo) => {
    return bloque.frases.reduce((acc, _, index) => {
        const tiempoFrase = index * bloque.duracionEntreFrases;
        // Tanto en olivetti como en normal, mostramos las frases cuando llegue su tiempo
        if (tiempoRelativo >= tiempoFrase) {
            acc.push(index);
        }
        return acc;
    }, []);
};

/**
 * Inicia el efecto olivetti (máquina de escribir) para una frase
 * @param {string} texto - Texto a escribir
 * @param {string} key - Identificador único de la frase
 * @param {number} velocidad - Velocidad de escritura en ms
 * @param {Function} setTextosMostrados - Función para actualizar el estado
 * @returns {Function} Función de limpieza del intervalo
 */
export const iniciarOlivetti = (texto, key, velocidad, textosMostrados, setTextosMostrados) => {
    if (textosMostrados[key]) return; // Ya está en proceso o completado
    
    let textoActual = '';
    let indiceLetra = 0;
    
    const interval = setInterval(() => {
        if (indiceLetra < texto.length) {
            textoActual += texto[indiceLetra];
            setTextosMostrados(prev => ({
                ...prev,
                [key]: textoActual
            }));
            indiceLetra++;
        } else {
            clearInterval(interval);
        }
    }, velocidad);

    return () => clearInterval(interval);
};

/**
 * Limpia los textos de bloques que ya no están activos
 * @param {Object} textosMostrados - Estado actual de los textos
 * @param {Array} bloquesActivos - Bloques actualmente visibles
 * @param {Function} setTextosMostrados - Función para actualizar el estado
 */
export const limpiarTextosInactivos = (textosMostrados, bloquesActivos, setTextosMostrados) => {
    Object.keys(textosMostrados).forEach(key => {
        const [bloqueId] = key.split('-');
        if (!bloquesActivos.some(b => b.id.toString() === bloqueId)) {
            setTextosMostrados(prev => {
                const newState = { ...prev };
                delete newState[key];
                return newState;
            });
        }
    });
};

/**
 * Calcula si un bloque debe estar activo en un momento dado
 * @param {Object} bloque - Bloque a evaluar
 * @param {number} tiempoActual - Tiempo actual del audio
 * @returns {boolean}
 */
export const esBloqueActivo = (bloque, tiempoActual) => {
    // Incluimos la duración de la última frase
    const duracionTotal = bloque.frases.length * bloque.duracionEntreFrases;
    return tiempoActual >= bloque.tiempoInicio && 
           tiempoActual <= bloque.tiempoInicio + duracionTotal;
}; 