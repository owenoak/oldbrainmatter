/* 	Load the hope scripts in debug fashion.
	In a production environment, this file would be replaced with a single script file
	which concatenates all of the above.
*/

(function(window){//begin hidden from global scope

// scripts we always load
var scripts = [
		"hope.js",
		"Script.js",
		"XHR.js",
		"Function.js",
		"Object.js",
		"Descriptor.js",
		"Number.js",
		"String.js",
		"Observable.js",
		"Class.js",
		"List.js",
		"Element.js",
		"ElementList.js",
		"Tag.js",
//		"Control.js"
	]
;

// Figure out the url of this script and set the `HOPE_PATH` global to its base path.
//	This is so we can make other urls relative to `{{hope}}`.
var script = document.getElementsByTagName("script");
window.HOPE_PATH = script[script.length-1].src;
HOPE_PATH = HOPE_PATH.substr(0, HOPE_PATH.indexOf('loader.js'));


// Write a <script> tag for each of our preload scripts.
//	This will execute them in order.
var i = -1, script;
while (script = scripts[++i]) {
	document.write("<script src='" + HOPE_PATH + script + "'><"+"/script>");
}

})(window);// end hidden from global scope
