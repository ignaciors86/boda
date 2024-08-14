import { useContext, useState } from "react";
import { DataContext } from "~/contexts/Data";

const TestingBar = () => {
	const MAINCLASS = "testingBar";
	const { dataState, dispatchDataState } = useContext(DataContext);
	const [closed, setClosed] = useState(false);

	const handleCloseClick = () => {
		setClosed(true);
	};

	const { language } = dataState;

	return (!closed
		? (
			<div className={MAINCLASS}>
				<h1>{language === "ES" ? "Barra de testing" : "Testing bar"}</h1>
				<div className={`${MAINCLASS}__testings`}>
					<div className={`${MAINCLASS}__testings__lang`}>
						<h2>{language === "ES" ? "Testeo multimedia por lenguaje" : "Multimedia by language testing"}</h2>
						<button onClick={() => { dispatchDataState({ type: "CHANGE_LANG", payload: language === "ES" ? "EN" : "ES" }) }}>
							{language ==="ES"
								? "Cambiar a inglés"
								: "Switch to spanish"
							}
						</button>
					</div>
				</div>
				<div
					className={`${MAINCLASS}__close`}
					onClick={handleCloseClick}
				>
					<button>X</button>
				</div>
			</div>
		)
		: <></>
	);
};

export default TestingBar;