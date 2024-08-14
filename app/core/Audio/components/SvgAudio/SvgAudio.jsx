const SvgAudio = ({ estilo="default", animPathRef, progressStroke, pathTotalLength, pathType }) => {
	const MAINCLASS = "svgAudio";

    const progressDashoffset = pathType === 'animated' ? progressStroke : '';
	
	const estiloChildren = {
		"default": 
			<svg width="481px" height="230px" viewBox="0 0 481 230" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                <g id="Moodboard" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd" opacity="0.4">
                    <g id="Guia-P8---SeccionAudios" transform="translate(-857, -3899)" stroke="#000000">
                        <path d="M858.124146,4068.41699 C867.91451,4086.16406 872.203068,4108.3556 887.495239,4121.6582 C895.256981,4128.41011 905.84746,4128.65602 916.044434,4127.29416 C934.802783,4124.78889 957.049923,4100.70284 969.889648,4088.51758 C985.275611,4073.91586 1002.24248,4060.54323 1014.85266,4043.48682 C1039.25411,4010.48165 1079.7204,3940.81849 1033.33276,3907.55859 C1028.17318,3903.85917 1019.07312,3903.89733 1014.85266,3907.55859 C1014.80611,3907.59898 999.559845,3917.9044 989.111206,3938.83875 C980.580168,3955.93108 977.527573,3981.32887 974.43457,3999.36853 C966.471561,4045.81206 994.21971,4124.08129 1055.2561,4109.98596 C1143.47947,4089.61226 1163.81617,3991.40079 1216.61743,3934.72339 C1247.85273,3901.19511 1295.83767,3888.69467 1336.98755,3913.13123" id="Path-26" ref={animPathRef} strokeDashoffset={progressDashoffset} strokeDasharray={pathTotalLength} ></path>
                    </g>
                </g>
            </svg>
	}

	return <div className={`${MAINCLASS} path ${pathType}`} children={estiloChildren[estilo]} />
};

export default SvgAudio;