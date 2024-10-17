import preboda from "./assets/images/preboda.jpg";
import ceremonia from "./assets/images/ceremonia.webp";
import coctel from "./assets/images/coctel.jpg";
import comida from "./assets/images/comida.jpg";
import baile from "./assets/images/baile.webp";
import tercerTiempo from "./assets/images/tercerTiempo.webp";
import paella from "./assets/images/paella.jpg";
import inicial from "./assets/images/ositos-drag.png";
import Item from './Item.js';

const imageUrls = [
    inicial,
    preboda,
    ceremonia,
    coctel,
    comida,
    baile,
    tercerTiempo,
    paella,
];

const items = [
  {
    title: "Agenda del finde",
    description: <div><p>Aquí, además de explicar cosas a modo de resumen (si veo que me interesa) pondré una imagen con el cronograma resumido, para que se pueda ver de un vistazo</p></div>,
    bgImage: inicial
  },
  {
    title: "20:00: Preboda",
    description: <>
    {/* <p>
      El viernes podéis pasaros por el sitio donde será la boda para una previa informal. 
    </p> */}
    <p>
      Traete el bañador, y si tocas algún instrumento y te apetece tenerlo a mano para hacer el bobo un rato, adelante. 
    </p>
    </>,
    bgImage: preboda
  },
  {
    title: "13:00: Ceremonia",
    description: <p>Palabras bonitas serán dichas y lloraremos todos mucho.</p>,
    bgImage: ceremonia
  },
  {
    title: "14:00: Cóctel",
    description: <p>Ponte hasta el culo, por favor.</p>,
    bgImage: coctel
  },
  {
    title: "15:00: Comida",
    description: <p>Un banquete delicioso es servido para todos los presentes, celebrando la unión de los novios con comida y bebida exquisitas.</p>,
    bgImage: comida
  },
  {
    title: "Baile",
    description: <p>El baile de los recién casados abre la pista, seguido de una noche de música y diversión para todos los invitados.</p>,
    bgImage: baile
  },
  {
    title: "3er Tiempo",
    description: <p>Un momento para relajarse después de las celebraciones principales, disfrutando de una charla y de bebidas en un ambiente más tranquilo.</p>,
    bgImage: tercerTiempo
  },
  {
    title: "Domingo",
    description: <p>La fiesta culmina con una gran paellada, donde los invitados se despiden del evento disfrutando de un último plato tradicional.</p>,
    bgImage: paella
  }
];


  const renderItems = () => {
    // console.log(items);
    return items.map((item, index) => {
      return item && <Item data={item} index={index} key={"item"+index} />
    });
  };

  export { items, imageUrls, renderItems };