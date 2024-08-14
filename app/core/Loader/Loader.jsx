import gsap, { Power1 } from "gsap";

import { forwardRef, useLayoutEffect, useState, useContext } from "react";
import { DataContext } from "~/contexts/Data";
import { getCopyById } from "~/utils/data/copyGetters";
import { clientUtils } from "~/utils";

const FAST_PERCENT_CHANGE_SPEED = 20;
const SLOW_PERCENT_CHANGE_SPEED = 1;
const REGULAR_PERCENT_CHANGE_SPEED = 5;

const Loader = forwardRef(({ loaded }, ref) => {
	const MAINCLASS = "loader";
	
	const [percentage, setPercentage] = useState(0);
	const { dataState } = useContext(DataContext);
	const copies = dataState?.copies;
	const tl_advance = gsap.timeline();

	// Methods.
	const next = () => {
		// La función next amplía el total de carga en un número dandom del 1 al 5 en cada paso. Como acaba seteando el valor de percent, debajo usamos
		// un useLayoutEffect para que, cada vez que cambie este valor, revisemos si procede seguir aumentandolo, o llamar a la función fadeOut y así
		// mostrar la sección de destino.

		const speed = loaded
			? FAST_PERCENT_CHANGE_SPEED
			: percentage >= 50
				? SLOW_PERCENT_CHANGE_SPEED // Si a la mitad del tiempo, aún no se han cargado los datos, frenamos.
				: REGULAR_PERCENT_CHANGE_SPEED // Velocidad estándar;

		tl_advance.to(`.${MAINCLASS}__progress__bars__grow`, {
			ease: Power1.easeInOut,
			duration: 1 / speed,
			onComplete: handlePercentAdvanced
		}, ">");
	};
	const handlePercentAdvanced = () => {
		const randomIncrement = Math.floor(percentage > 50
			? clientUtils.getRandomInRange(1, percentage > 70 ? 1 : 2) // Si estamos al 70% y no ha cargado, disminuímos a 1
			: clientUtils.getRandomInRange(2, 3) // Si ya se ha cargado todo, incrementamos más.
		);
		let percentToApply = percentage + randomIncrement;

		setPercentage(percentToApply >= 95
			? 100
			: percentToApply
		);
	};
	// Cada vez que cambie el porcentaje a mostrar en la animación, comprobamos si ha llegado a 100 (estando completo).
	// Si la carga ha terminado, se landa el fadeOut. Si no, se llama al siguiente paso para que aumenten la barra y el %
	useLayoutEffect(() => {
		gsap.to(`.${MAINCLASS}__text`, {
			ease: Power1.easeInOut,
			duration: 1.5,
			opacity: 1
		});
	}, []);
	useLayoutEffect(() => {
		percentage < 100 && next();
	}, [percentage]);

	return (
		<div
			className={`${MAINCLASS}`}
			ref={ref}
		>
			<p className={`${MAINCLASS}__text`}>
				{getCopyById(copies, 'ES', "loader_title")}
			</p>
			<div className={`${MAINCLASS}__progress`}>
				<div className={`${MAINCLASS}__progress__bars`}>
					<span
						className={`${MAINCLASS}__progress__bars__base`}
					/>
					<span
						className={`${MAINCLASS}__progress__bars__grow`}
						style={{
							width: `${percentage}%`
						}}
					/>
				</div>
			</div>
			<p className={`${MAINCLASS}__text`}>
				{getCopyById(copies, 'ES', "loader_text")}
			</p>
		</div>
	);
});

Loader.displayName = "Loader";

export default Loader;
