import inicial from "./assets/images/ositos-drag.png";

import theoffice from "./assets/images/ceremonia/theoffice.webp"; 
import shameless from "./assets/images/ceremonia/shameless.webp"; 
import monkeyisland from "./assets/images/ceremonia/monkeyisland.jpg";  // Asegúrate de que estas rutas sean correctas
import monkeyisland2 from "./assets/images/ceremonia/monkeyisland2.jpg";  // Asegúrate de que estas rutas sean correctas
import coctel from "./assets/images/coctel.jpg";  // Asegúrate de que estas rutas sean correctas
import comida from "./assets/images/comida.jpg";  // Asegúrate de que estas rutas sean correctas
import gilmoreBaile from "./assets/images/baile/gilmore.webp";  // Asegúrate de que estas rutas sean correctas
import tercerTiempo from "./assets/images/tercerTiempo.webp";  // Asegúrate de que estas rutas sean correctas
import paella from "./assets/images/paella.jpg";  // Asegúrate de que estas rutas sean correctas

import Item from './Item.js';

const imageUrls = [
    inicial,
    theoffice,
    shameless,
    monkeyisland,
    monkeyisland2,
    coctel,
    comida,
    gilmoreBaile,
    tercerTiempo,
    paella,
];

const items = [
    {
        title: "Agenda del finde",
        description: <div><p>Aquí, además de explicar cosas a modo de resumen (si veo que me interesa) pondré una imagen con el cronograma resumido, para que se pueda ver de un vistazo</p></div>,
        images: [inicial]
    },
    {
        title: "20:00: Preboda",
        description: <>
            <p>Traete el bañador, y si tocas algún instrumento y te apetece tenerlo a mano para hacer el bobo un rato, adelante.</p>
        </>,
 images: [monkeyisland, monkeyisland2, comida]
    },
    {
        title: "13:00: Ceremonia",
        description: <p>Palabras bonitas serán dichas y lloraremos todos mucho.</p>,
        
        images: [theoffice, gilmoreBaile, monkeyisland, monkeyisland2, shameless]
    },
    {
        title: "14:00: Cóctel",
        description: <p>Ponte hasta el culo, por favor.</p>,
        images: [coctel]
    },
    {
        title: "15:00: Comida",
        description: <p>Un banquete delicioso es servido para todos los presentes, celebrando la unión de los novios con comida y bebida exquisitas.</p>,
        images: [comida]
    },
    {
        title: "Baile",
        description: <p>El baile de los recién casados abre la pista, seguido de una noche de música y diversión para todos los invitados.</p>,
        images: [gilmoreBaile, monkeyisland2]
    },
    {
        title: "3er Tiempo",
        description: <p>Un momento para relajarse después de las celebraciones principales, disfrutando de una charla y de bebidas en un ambiente más tranquilo.</p>,
        images: [tercerTiempo]
    },
    {
        title: "Domingo",
        description: <p>La fiesta culmina con una gran paellada, donde los invitados se despiden del evento disfrutando de un último plato tradicional.</p>,
        images: [paella]
    }
];

const renderItems = () => {
    return items.map((item, index) => {
        return item && <Item data={item} index={index} key={"item" + index} />;
    });
};

export { items, imageUrls, renderItems };
