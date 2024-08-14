import { forwardRef } from "react";

const Button = forwardRef(({ className, style, children, onClick, disabled}, ref) => {
	const MAINCLASS = "button";
	return (
		<button 
			className={`${MAINCLASS} ${className ?? ""}`} 
			children={children}
			disabled={disabled}
			ref={ref}
			style={style}
			onClick={onClick}	
		/>
	);
});

Button.displayName = "Button";

export default Button;