import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";

import ButtonCore from "../Button";
import TextoCore from "../Texto";
import TurnDevice from "../TurnDevice";
import { clientUtils } from "~/utils";

const Error = ({ btnText, cbBtnText, cbBtnCopiedText, openBtnText, landscapeOnly=false, redirectionUrl, title, text }) => {
	const MAINCLASS = "error";
	const [ copiedClipboard, setCopiedClipboard ] = useState(false);

	const isServerSide = typeof process !== "undefined";

	const handleGoToButtonClick = () => {
		const link = document.createElement("A");

		link.href = `intent:${redirectionUrl}#Intent;end`;
		link.target="_blank";
		link.rel="noreferrer";

		link.click();
	};
	const handleCopyToClipboard = () => {
		setCopiedClipboard(true)
	};
	
	const backHome = () => {
		window.open(redirectionUrl, "_self");
	};

	const common = <>
		<section className={`${MAINCLASS}`}>
			<TextoCore className="bcopy__1" isMarkdown={true}>
				{title}
			</TextoCore>
			<TextoCore className={'bcopy__2'}>
				{text}
			</TextoCore>
			<ButtonCore
				className={'button4 credits'}
				children={btnText}
				onClick={backHome}
			/>
		</section>
		{landscapeOnly && <TurnDevice />}
	</>;

	const insta = <section>
		<TextoCore className="titular__1" isMarkdown={true}>
			{title}
		</TextoCore>
		<TextoCore className={'bcopy__1'}>
			{text}
		</TextoCore>
		{(!isServerSide && redirectionUrl && redirectionUrl !== "") &&
			(clientUtils.isApple() // Ipad tb tiene app de Instagram, pero no se considera iOS según el userAgent.
				? (
					<CopyToClipboard
						text={redirectionUrl}
						onCopy={handleCopyToClipboard}
					>
						<ButtonCore className={`azul squared`}>
							<TextoCore className="bcopy__1">
								{copiedClipboard
									? cbBtnCopiedText
									: cbBtnText
								}
							</TextoCore>
						</ButtonCore>
					</CopyToClipboard>
				)
				: (
					<ButtonCore
						className={`azul squared`}
						onClick={handleGoToButtonClick}
					>
						<TextoCore className="bcopy__1">
							{openBtnText}
						</TextoCore>
					</ButtonCore>
				))
		}
	</section>;

	return !title
		? common
		: insta
	;
};

export default Error;