Script.load("{{hope}}tests/loadme2.js,{{hope}}tests/loadme3.js", function() {
	console.warn("loadme inline code");
	function fail() {
		blarg;
	}
	
	Script.loaded("{{hope}}tests/loadme.js");
});
