import React from 'react';
import './Sobre.scss';
import invitacion from './assets/images/invitacion.jpg';
import Card from './Card';
import Timeline from '../Horarios/Timeline';
import Lugar from './Tarjetas/Lugar';
import Regalo from './Tarjetas/Regalo';
import Invitacion from './Tarjetas/Invitacion';

const Sobre = ({ setSeccion }) => {

	const handleClick = () => {
		const cards = document.querySelectorAll('.card');
		cards.forEach(card => {
			card.classList.remove('flipped');
      card.classList.remove('unflipped');
			card.style.transform = 'none';
		});
		const envelope = document.querySelector('.envelope');
		envelope.classList.toggle('open');
	};

	return (
		<div className="home">
			<div className="envelope">
				<div className="envelope-flap">
					<div className="wax-seal back" onClick={handleClick} />
				</div>
				<div className="envelope-flap-bg"></div>
				<div className="envelope-body">
					<div className="envelope-content">
						<Card seccion="invitacion" onClick={handleClick} trasera={<Invitacion />}>
							<img src={invitacion} alt="Invitacion" />
						</Card>
						<Card seccion="horarios" onClick={handleClick} trasera={<Timeline />}>
							<h2>Agenda</h2>
						</Card>
						<Card seccion="regalo" onClick={handleClick} trasera={<Regalo />}>
							<h2>Regalo</h2>
						</Card>
						<Card seccion="ubicaciones" onClick={handleClick} trasera={<Lugar />}>
							<h2>Lugar</h2>
						</Card>
						<Card seccion="asistencia" onClick={handleClick} trasera={<Lugar />}>
							<h2>Asistencia</h2>
						</Card>
					</div>
				</div>
				<p className="nombre-invitado">Invitados 1 y 2</p>
			</div>
		</div>
	);
}

export default Sobre;
