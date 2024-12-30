import "./Invitacion.scss";
import invitacionBack from '../assets/images/invitacion-back.jpg';
const Invitacion = () => {
    return (
        <div className="invitacion seccion" style={{background: "url(" +  invitacionBack + ")"}}>
            <em>Queremos invitarte a nuestra boda. No sabemos si será la del año o no, pero sí que queremos que estés.</em>
            <p>En cada tarjeta tienes información relevante para ese día. Lo más importante es que confirmes tu asistencia lo antes posible, pero antes, mira con calma las demás</p>
        </div>
    );
}

export default Invitacion;