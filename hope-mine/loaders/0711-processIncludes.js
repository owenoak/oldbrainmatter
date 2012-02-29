/*
	Standalone mini-library to find all tags in a document like:
		<include src='some/url'/>
	and asynchronously replace them with the document at that url.

	To use: 
		- in your body.onload (or appropriate substitute), call
			$processIncludes()

		- if you later dynamically write some HTML into an element and want to process <include/>s in there
			$processIncludes(yourElement)

*/
;(function() {
	var getXHRObject = function () {
		var methods = [
			function(){return new XMLHttpRequest()}, 					// all except IE
			function(){return new ActiveXObject('Msxml2.XMLHTTP')},		// different versions of IE
			function(){return new ActiveXObject('Microsoft.XMLHTTP')},
			function(){return new ActiveXObject('Msxml2.XMLHTTP.4.0')}
		];
		for (var i = 0, xhrMethod; xhrMethod = methods[i++];) {
			try {
				var xhr = xhrMethod();
				// It worked! Replace the "get" function with the correct one and return the XHR.
				getXHRObject = xhrMethod;
				return xhr;
			} catch (e) {}
		}
		throw new Error("getXHRObject(): Can't get XHR object");
	};

	// utility 
	function setOuterHTML(tag, htmlString) {
		if (tag.outerHTML) {
			tag.outerHTML = htmlString;
		} else {
			var range = tag.ownerDocument.createRange();
			range.setStartBefore(tag);
			var df = range.createContextualFragment(htmlString);
			tag.parentNode.replaceChild(df, tag);
		}
	}

	// given a tag and a URL, replace the tag with the page at the url
	// NOTE: current synchronous
	function includeAndReplace(tag, url) {
		tag.innerHTML = "Loading...";

		var xhr = getXHRObject();
		xhr.open("GET", url, true);		// false == synchronous
		xhr.onload = function() {
			if (xhr.readyState == 4) {
				setOuterHTML(tag, xhr.responseText);				
			}
		}
		try {
			xhr.send(null);
		} catch (e) {
			tag.innerHTML = "Error loading page "+url
		}
		
	}
	
	// load all <include src='...'/> elements
	//	default is to start at the HTML element -- pass a different element to look in that
	window.$processIncludes = function(parent) {
		parent = parent || document.getElementsByTagName("HTML")[0];
		var tags = parent.getElementsByTagName("INCLUDE");
		for (var i = 0, src; i < tags.length; i++) {
			if (!((src = tags[i].getAttribute("src")) && window.console)) {
				(console.warn || console.log)("<include> tag didn't specify a 'src' attribute.");
			} else {
				includeAndReplace(tags[i], src);
			}
		}
	}
})();