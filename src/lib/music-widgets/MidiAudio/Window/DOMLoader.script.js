
const Script = function () {
	this.loaded = {};
	this.loading = {};
	return this;
};


Script.prototype.add = function (config) {
	const that = this;
	if (typeof (config) === "string")
		config = { src: config };

	let srcs = config.srcs;
	if (typeof (srcs) === "undefined") {
		srcs = [{
			src: config.src,
			verify: config.verify,
		}];
	}
	/// adding the elements to the head
	const doc = document.getElementsByTagName("head")[0];
	///
	const testElement = function (element, test) {
		if (that.loaded[element.src]) return;
		if (test && typeof (window[test]) === "undefined") return;
		that.loaded[element.src] = true;
		//
		if (that.loading[element.src]) that.loading[element.src]();
		delete that.loading[element.src];
		//
		if (element.callback) element.callback();
		if (typeof (getNext) !== "undefined") getNext();
	};
	///
	const batchTest = [];
	const addElement = function (element) {
		if (typeof (element) === "string") {
			element = {
				src: element,
				verify: config.verify,
			};
		}
		if (/([\w\d.])$/.test(element.verify)) { // check whether its a variable reference
			element.test = element.verify;
			if (typeof (element.test) === "object") {
				for (const key in element.test)
					batchTest.push(element.test[key]);
			}
			else
				batchTest.push(element.test);
		}
		if (that.loaded[element.src]) return;
		const script = document.createElement("script");
		script.onreadystatechange = function () {
			if (this.readyState !== "loaded" && this.readyState !== "complete") return;
			testElement(element);
		};
		script.onload = function () {
			testElement(element);
		};
		script.onerror = function () {
		};
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", element.src);
		doc.appendChild(script);
		that.loading[element.src] = function () {};
	};
	/// checking to see whether everything loaded properly
	const onLoad = function (element) {
		if (element)
			testElement(element, element.test);
		else {
			for (let n = 0; n < srcs.length; n++)
				testElement(srcs[n], srcs[n].test);
		}
		let istrue = true;
		for (let n = 0; n < batchTest.length; n++) {
			let test = batchTest[n];
			if (test && test.indexOf(".") !== -1) {
				test = test.split(".");
				const level0 = window[test[0]];
				if (typeof (level0) === "undefined") continue;
				if (test.length === 2) { //- this is a bit messy and could handle more cases
					if (typeof (level0[test[1]]) === "undefined")
						istrue = false;
				}
				else if (test.length === 3) {
					if (typeof (level0[test[1]][test[2]]) === "undefined")
						istrue = false;
				}
			}
			else {
				if (typeof (window[test]) === "undefined")
					istrue = false;
			}
		}
		if (!config.strictOrder && istrue) { // finished loading all the requested scripts
			if (config.callback) config.callback();
		}
		else { // keep calling back the function
			setTimeout(function () { //- should get slower over time?
				onLoad(element);
			}, 10);
		}
	};
	/// loading methods;  strict ordering or loose ordering
	if (config.strictOrder) {
		let ID = -1;
		const getNext = function () {
			ID++;
			if (!srcs[ID]) { // all elements are loaded
				if (config.callback) config.callback();
			}
			else { // loading new script
				const element = srcs[ID];
				const src = element.src;
				if (that.loading[src]) { // already loading from another call (attach to event)
					that.loading[src] = function () {
						if (element.callback) element.callback();
						getNext();
					};
				}
				else if (!that.loaded[src]) { // create script element
					addElement(element);
					onLoad(element);
				}
				else { // it's already been successfully loaded
					getNext();
				}
			}
		};
		getNext();
	}
	else { // loose ordering
		for (let ID = 0; ID < srcs.length; ID++)
			addElement(srcs[ID]);

		onLoad();
	}
};



const script = new Script();
export default script;
