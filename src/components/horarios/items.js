import preboda from "./assets/images/preboda.jpg";
import ceremonia from "./assets/images/ceremonia.jpg";
import coctel from "./assets/images/coctel.jpg";
import comida from "./assets/images/comida.jpg";
import baile from "./assets/images/baile.jpg";
import tercerTiempo from "./assets/images/tercerTiempo.jpg";
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
    title: "Preboda",
    description: <p>Los novios se preparan para el gran día, ajustando los últimos detalles y compartiendo momentos especiales con sus seres queridos.</p>,
    bgImage: preboda
  },
  {
    title: "Ceremonia",
    description: <p>La ceremonia nupcial donde los novios intercambian sus votos, rodeados de amigos y familiares en un ambiente lleno de emoción.</p>,
    bgImage: ceremonia
  },
  {
    title: "Cóctel",
    description: <p>Después de la ceremonia, los invitados disfrutan de un cóctel refrescante mientras los novios se toman un respiro para las fotos.</p>,
    bgImage: coctel
  },
  {
    title: "Comida",
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