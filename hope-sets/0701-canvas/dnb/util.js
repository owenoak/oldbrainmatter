

//
//	add cloning methods to the base class
//
dnb.BaseClass.mixIn({
	init : function() {
		this.$cache = {};
		this.setProperties.apply(this, arguments);	
	},

	getFromCache : function(property, getter, getterArgs) {
		if (this.$cache[property] !== undefined) return this.$cache[property];
		if (getter) {
			if (typeof getter == "function") {
				getter = getter.apply(this, getterArgs);
			}
			return this.$cache[property] = getter;
		}
		return;
	},
	
	clearCache : function(property) {
		if (property) {
			delete this.$cache[property];
		} else {
			this.$cache = {};
		}
		return this.$cache;
	},

	
	clone : function(props) {
		BaseClass.cloner.prototype = this;
		return new BaseClass.cloner({id:null,$cache:null},props);
	}
})



//
//	TODO: move these into dnb namespace
//


//
//	misc utility functions
//
function reload() {
	window.location = window.location;
}

function doRequest(fileName) {
	var request = new XMLHttpRequest();
	request.open('GET', fileName, false); 
	request.send(null);
	return request.responseText;
}
dnb.XhrRequest = doRequest;

function loadJSFile(fileName) {
	try {
		var script = doRequest(fileName);
	} catch (e) {
		console.debug("loadJSFile(",fileName,"): error loading file ", e);
	}
	try {
		window.eval.apply(window, [script]);
	} catch (e) {
		console.debug("loadJSFile(",fileName,"): error evaluating script ", e);
		console.debug("--> ", script);
	}

}

function populatePopup(id, list, currentValue) {
	var popup = document.getElementById(id);
	for (var i = 0; i < list.length; i++) {
		var option = document.createElement("option");
		option.text = (list[i].indexOf(".") > -1 
							? unescape(list[i].substr(0, list[i].indexOf("."))) 
							: list[i]
					  );
		option.value = list[i];
		popup.options.add(option);
		if (option.value == currentValue) popup.selectedIndex = i;
	}
}

function getDirectoryListing(dir) {
	var fileList = doRequest(dir);
	fileList = fileList.match(/([^ ]*?\.js)/g);
	return fileList;
}







//
//	console helpers
//
console.table = function() {
	var args = dnb.argumentsToArray(arguments);
	for (var i = 0; i < args.length; i++) {
		var it = args[i];
		if (typeof it == "number") args[i] = r(it);
	}
	console.info(args.join("\t"));
}





//
//	COMPLETE HACKS
//	

// round a number to a certain precision
function r(number, precision) {
	if (precision == null) precision = 2;
	var multiplier = Math.pow(10, precision);
	return Math.round(number * multiplier) / multiplier;
}