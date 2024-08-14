import {
    useState,
    useEffect
} from "react";
import PropTypes from 'prop-types';

import { clientUtils } from '~/utils';

const Resizer = ({ children, onResize, ms=200 }) => {
    const [dimensions, setDimensions] = useState({
        height: window.innerHeight,
        width: window.innerWidth
    });

    useEffect(() => {
        // Aplicamos un debound para evitar re-renders contínuos.
        const handleResizeDebound = clientUtils.debounce(function handleResize() {
            // Previene eventos resize en scroll de iOS.
            if (window.innerWidth === dimensions.width)
                return;
            setDimensions({
                height: window.innerHeight,
                width: window.innerWidth
            });
        }, ms);

        onResize(dimensions);
      
        window.addEventListener('resize', handleResizeDebound);

        return () => window.removeEventListener('resize', handleResizeDebound)
    }, [dimensions]);

    return (
        <>
            {children}
        </>
    );
}

export default Resizer;

Resizer.propTypes = {
    onResize: PropTypes.func.isRequired
};