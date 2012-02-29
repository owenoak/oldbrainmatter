/***	XHR, for loading things via XMLHttpRequest.	***/

Script.require("{{hope}}Script.js", function() {

window.XHR = {

	// Asynchronously fetch an arbitrary file via XHR.
	// 	@callback is called with the responseText.
	//	@errback is called if can't load the file.
	fetch : function (url, callback, errback, cache) {
		var request = new XMLHttpRequest();
		request.open("GET", Script.addCacheParam(url, cache), true);
		request.onreadystatechange = function() {
			if (request.readyState !== 4) return;
			if (request.status === 200) callback(request.responseText);
			else if (errback) 		errback();
			else 					console.warn("Couldn't load "+url);
		}
		request.send(null);
	}
};

Script.loaded("{{hope}}XHR.js");
});// end Script.require()
