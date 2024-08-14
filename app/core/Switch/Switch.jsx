import { useState } from "react";

const Switch = ({ onChange, option1, option2, vertical }) => {
	const MAINCLASS = "switch";

	const [checkedOpt, setCheckedOpt] = useState(option1.value);
	
	// Methods.
	// -- no methods

	// Handlers.
	const handleChange = ({ target }) => {
		const { value } = target;
		setCheckedOpt(value);
		onChange && onChange(value);
	};
	const handleMouseOut = () => {};
	const handleMouseOver = () => {};

	// Life Cycle.
	// -- no life cycle

	return (
		<div 
			className={`${MAINCLASS} ${vertical ? "vertical" : ""}`}
			onMouseOver={handleMouseOver}
			onMouseOut={handleMouseOut}
		>
			<input
				checked={checkedOpt === option1.value}
				className={`${MAINCLASS}__input`}
				id={option1.id}
				name={option1.name}
				type="radio"
				value={option1.value}
				onChange={handleChange}
			/>
			<label
				htmlFor={option1.name}
				className={`${MAINCLASS}__label first`}
			>
				{option1?.text ?? ""}
			</label>
			<input
				checked={checkedOpt === option2.value}
				className={`${MAINCLASS}__input`}
				id={option2.id}
				name={option2.name}
				type="radio"
				value={option2.value}
				onChange={handleChange}
			/>
			<label
				htmlFor={option2.name}
				className={`${MAINCLASS}__label second`}
			>
				{option2?.text ?? ""}
			</label>
			<span className={`${MAINCLASS}__thumb`}></span>
		</div>
	);
};

export default Switch;

Switch.defaultProps = {
	option1: {
		id: "opt1",
		name: "opt1",
		text: "Opt 1",
		value: "opt1"
	},
	option2: {
		id: "opt2",
		name: "opt2",
		text: "Opt 2",
		value: "opt2"
	}
};
