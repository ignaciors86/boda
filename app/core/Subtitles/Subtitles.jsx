import { useEffect, useState } from "react";
import gsap from "gsap";

import { getSecondsFromHHMMSS } from "~/utils/client/time";
import Texto from "~/core/Texto";

const Subtitles = ({ className, file, multimedia, showSubtitles }) => {
	const MAINCLASS = "subtitles";

	const [subtitulos, setSubtitulos] = useState([]);
	let currentLineId = 0;

	// Posicionamiento de los subtítulos en la marca de tiempo actual
	const updateSubtitlesPosition = () => {
		// comprobamos si ha cambiado la línea actual
		const newCurrentLine = subtitulos.find(element => multimedia.currentTime > element.start
			&& multimedia.currentTime < element.end);

		if (newCurrentLine && currentLineId !== newCurrentLine?.id) {

			// guardamos la nueva linea en uso
			currentLineId = newCurrentLine?.id;

			const 	selectorLineas = `.${MAINCLASS}__frame__line`,
					selectorLineasUsadas = selectorLineas + `:nth-child(-n+${currentLineId})`;

			// limpiamos las posibles clases active asignadas previamente
			document.querySelectorAll(selectorLineas)
				.forEach(line => line.classList?.remove("active"));

			// Calculo del desplazamiento a partir la suma de todas las líneas recorridas
			let desplazamiento = 0;
			
			const lineasUsadas = document.querySelectorAll(selectorLineasUsadas);
			lineasUsadas.forEach(line => desplazamiento += line.getBoundingClientRect().height);

			const 	tlLine = gsap.timeline(),
					currentLineNode = document.getElementById( `subtitle__${currentLineId}__0`);

			currentLineNode.classList.add("active");
			currentLineNode && tlLine.to(`.${MAINCLASS}__frame`, {
				opacity: 1,
				translateY: -desplazamiento + "px",
				onComplete: tlLine.kill,
			})
		}
	}

	// carga inicial del contenido de los subtítulos en JSON
	useEffect(() => {
		file && fetch(file)
			.then(res => res.text())
			.then(content => {
				const contentSrt = content?.replace(/(\r)/gm, "").replace("00:00:00,000", "00:00:00,100");
				let lineas = contentSrt?.split('\n'),
					subtitulosOutput = [],
					subtituloBuffer = {content: [] };
			
				lineas.forEach((line) => {
					if(!subtituloBuffer.id)
						subtituloBuffer.id = parseInt(line);
					else if(!subtituloBuffer.start) {
						let range = line.split(' --> ');
						const 	startParams = range[0].split(":"),
								start = parseFloat(getSecondsFromHHMMSS(startParams[0], startParams[1], startParams[2].replace(",","."))),
								endParams = range[1].split(":"),
								end = parseFloat(getSecondsFromHHMMSS(endParams[0], endParams[1], endParams[2].replace(",",".")));

						subtituloBuffer.start = start;
						subtituloBuffer.end = end;
					}
					else if(line !== '')
						subtituloBuffer.content.push(line);	
					else {
						subtitulosOutput.push(subtituloBuffer);
						subtituloBuffer = { content: [] };
					}
				});
				setSubtitulos(subtitulosOutput);
			})
	}, [file]);
	
	useEffect(() => {
		multimedia && (multimedia.ontimeupdate = updateSubtitlesPosition);
	}, [subtitulos]);

	return (
		<div className={`${MAINCLASS} ${className} ${showSubtitles ?? "visible"}`}>
			<div className={`${MAINCLASS}__frame`}>
				{subtitulos.map((line, index) => line.content.map((content, i) =>
					i === 0 &&
					<span
						className={`${MAINCLASS}__frame__line`}
						key={`subtitle__${index+1}__${i}`}
						id={`subtitle__${index+1}__${i}`}
					>
						<Texto className={"titulo__3"}>
							{content}
						</Texto>
						{line.content.length > 1 &&
							<Texto className={"titulo__3"}>
								{line.content[1]}
							</Texto>
						}
					</span>
			)) }
			</div>
		</div>
	);
};

Subtitles.displayName = "Subtitles";

export default Subtitles;