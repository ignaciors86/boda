import "./Card.scss";
const Card = ({seccion, onClick, children}) => <div className={`card ${seccion}`} onClick={() => onClick(seccion)}>
        {children}
    </div>
export default Card;