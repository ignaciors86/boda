const Stats = () => (
	<div
		id="stats"
		className="hddn"
		style={{ display: "none"}}
	>
		<span
			id="ganalytics"
			data-content="/rtve/"
		></span>
		<span
			id="comscore"
			data-content="/rtve/"
		></span>
		<span
			id="omniture"
			data-json={JSON.stringify({
				eVar2: "WEB",
				eVar3: "Lab RTVE",
				eVar4: "${DISPLAY_PROJECT_NAME} - LAB RTVE",
				hier1: "WEB | RTVE",
				channel: "RTVE"
			})}
		></span>
		<span
			id="usertracker"
			data-json={JSON.stringify({
				digitalData: {
					page: {
						category: {
							pageType: "",
							primaryCategory: "RTVE"
						},
						pageInfo: {
							language: "es-ES",
							sysEnv: "web"
						}
					},
					pageInstanceID: ""
				}
			})}
		></span>
	</div>
);

export default Stats;