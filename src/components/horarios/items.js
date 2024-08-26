import preboda from "./assets/images/preboda.jpg";
import ceremonia from "./assets/images/ceremonia.jpg";
import coctel from "./assets/images/coctel.jpg";
import comida from "./assets/images/comida.jpg";
import baile from "./assets/images/baile.jpg";
import tercerTiempo from "./assets/images/tercerTiempo.jpg";
import paella from "./assets/images/paella.jpg";
import ositosDrag from "./assets/images/ositos-drag.png";

const imageUrls = [
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
      title: "Preboda",
      description: "Los novios se preparan para el gran día, ajustando los últimos detalles y compartiendo momentos especiales con sus seres queridos.",
      buttonText: "Inicio",
      bgImage: preboda
    },
    {
      title: "Ceremonia",
      description: "La ceremonia nupcial donde los novios intercambian sus votos, rodeados de amigos y familiares en un ambiente lleno de emoción.",
      buttonText: "Botón 1",
      bgImage: ceremonia
    },
    {
      title: "Cóctel",
      description: "Después de la ceremonia, los invitados disfrutan de un cóctel refrescante mientras los novios se toman un respiro para las fotos.",
      buttonText: "Botón 2",
      bgImage: coctel
    },
    {
      title: "Comida",
      description: "Un banquete delicioso es servido para todos los presentes, celebrando la unión de los novios con comida y bebida exquisitas.",
      buttonText: "Botón 3",
      bgImage: comida
    },
    {
      title: "Baile",
      description: "El baile de los recién casados abre la pista, seguido de una noche de música y diversión para todos los invitados.",
      buttonText: "Botón 4",
      bgImage: baile
    },
    {
      title: "3er Tiempo",
      description: "Un momento para relajarse después de las celebraciones principales, disfrutando de una charla y de bebidas en un ambiente más tranquilo.",
      buttonText: "¿?",
      bgImage: tercerTiempo
    },
    {
      title: "Paellada",
      description: "La fiesta culmina con una gran paellada, donde los invitados se despiden del evento disfrutando de un último plato tradicional.",
      buttonText: "Final",
      bgImage: paella
    }
  ];

  const renderItems = () => {
    return items.map((item, index) => (
      <div key={index} className={`item item${index + 1} ${item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
      <div className="info">
        <h2>{item.title}</h2>
        <div className="texts">
          <p>{item.description}</p>
        </div>
        <button>{item.buttonText}</button>
      </div>
      </div>
    ));
  };

  export { items, imageUrls, renderItems };