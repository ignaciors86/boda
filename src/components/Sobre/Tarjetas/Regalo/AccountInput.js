import React, { useEffect, useState } from "react";
import "./AccountInput.scss"; // Archivo CSS opcional para estilos
import gsap from "gsap";

const AccountInput = ({ }) => {
    const accountNumber = "ES31 0182 5322 2702 0407 2984"; // 
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(accountNumber).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Vuelve a mostrar el estado normal después de 2 segundos
        });
    };

    useEffect(() => {
        gsap.to(".copiado", { opacity: copied ? 1 : 0, duration: 0.5 });
    }, [copied]);

    return (
        <div className="account-input-container">
            <input
                type="text"
                value={accountNumber}
                readOnly
                className="account-input"
            />
            <button
                onClick={handleCopy}
                className={`copy-button ${copied ? "copied" : ""}`}
                aria-label="Copy to clipboard"
            >
                {/* {copied ? "Copiado!" : "Copiar"} */}
            </button>
            <div className="copiado">
                <h3>¡Copiado!</h3>
            </div>
        </div>
    );
};

export default AccountInput;