	// Persistently load a single CSS file (no callback behavior)
	loadStyle : function(url) {
//TOOD: check this in IE
//TODO: don't re-load a stylesheet (?)
		var style = document.createElement("link");
		style.type = "text/css";
		style.setAttribute("rel","stylesheet");
		style.setAttribute("href", url);
		($1("head")||$1("body")).appendChild(style);
	},
	
	
	// Persistently load one or more CSS files (no callback behavior)
	loadStyles : function(urls) {
		if (!urls) return;
		if (typeof urls === "string") {
			Browser.loadStyle(urls);
		} else {
			for (var i = 0; i < urls.length; i++) {
				if (urls[i]) Browser.loadStyles(urls[i]);
			}
		}
	},
	
	


// Update our list of which script/css files have already been loaded by inspecting the dom.
function $updateLoaded() {

	// note which LINK rel=stylesheet elements have already been loaded
	Ext.select("link").each(function(link) {
		// skip non-stylesheet links
		if (link.dom.getAttribute("rel") != "stylesheet") return;

		// get the link href attribute --
		//	note: don't use link.href as that will be an absolute path (http://...)
		var src = link.dom.getAttribute("href");
		if (src) Script.loaded.styles[src] = true;
	});
