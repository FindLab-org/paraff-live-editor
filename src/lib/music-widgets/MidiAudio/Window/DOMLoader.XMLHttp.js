



export default function sendRequest (conf) {
	fetch(conf.url, conf.data).then(res => res.text()).then(data => {
		//console.log("data:", data);
		if (conf.onload)
			conf.onload({ responseText: data });
	}).catch(e => {
		console.warn("DOMLoader.sendRequest error:", e);

		if (conf.onerror)
			conf.onerror(e, false);
	});
};
