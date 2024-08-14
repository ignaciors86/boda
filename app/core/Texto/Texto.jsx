import { forwardRef } from 'react';
import Markdown from 'markdown-to-jsx';
import propTypes from 'prop-types';

const Texto = forwardRef(({className, children, id, isMarkdown=false, onClick}, ref) => {
	const MAINCLASS = "texto";

	// para links dentro del markdown
	const renderLink = (props) => {
		if (props.href && (props.href.startsWith("http://") || props.href.startsWith("https://"))) {
			return <a {...props} target="_blank" rel="noopener noreferrer" />;
		} else {
			return <a {...props} />;
		}
	};
	const options = {
		overrides: {
			a: { component: renderLink },
		},
	};
	const isEmptyObject = typeof children === "object" && !Array.isArray(children);

	return (isMarkdown && children && typeof children === 'string')
		? <Markdown
			className={`${MAINCLASS} ${className} markdown`}
			children={isEmptyObject
				? ""
				: children
			}
			id={id}
			options={options}
			onClick={onClick}
		/>
		: <p
			className={`${MAINCLASS} ${className}`}
			children={isEmptyObject
				? ""
				: children
			}
			id={id}
			ref={ref}
			onClick={onClick}
		/>
});

Texto.displayName = "Texto";

export default Texto;

Texto.propTypes = {
	clasName: propTypes.oneOf([
		"titular__1",
		"titular__2",
		"titular__3",
		"titular__4",
		"bcopy__1",
		"bcopy__2",
		"txboton"
	])
};