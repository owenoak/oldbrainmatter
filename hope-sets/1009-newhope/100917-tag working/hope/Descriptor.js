
Script.require("{{hope}}Object.js", function() {


//
//	Create Descriptors 
//

// use new Descriptor(getter,setter) to create a quick property descriptor for working with
//	Object.defineProperty, etc

var Descriptor = window.Descriptor = function Descriptor(props) {
	if (arguments.length === 2 && typeof arguments[1] == "function" && typeof arguments[1] == "function") {
		this.get = arguments[0];
		this.set = arguments[1];
	} else {
		if (props) for (key in props) this[key] = props[key];
		if (this.hasOwnProperty("value")) this.writeable = true;
	}
}
Descriptor.prototype = {
	configurable 	: true,
	enumerable 		: true
}


// InheritedObject automatically creates a unique object for each instance[key]
//	which inherits from a common prototype[key] object (also automatically created);
window.InheritedObject = function InheritedObject(props) {
	return Descriptor.apply(this, arguments);
}
InheritedObject.prototype = new Descriptor({
	init : function(proto, key){
		proto.before("init", function() {
			this[key] = Object.clone(proto[key]);
		});
		proto[key] = {};
	}
});


// InstanceList automatically creates a unique array for each instance[key].
window.InstanceList = function InstanceList(props) {
	return Descriptor.apply(this, arguments);
}
InstanceList.prototype = new Descriptor({
	init : function(proto, key){
		proto.before("init", function() {
			this[key] = [];
		});
	}
});


// InstanceList automatically creates a unique array for each instance[key].
window.Attribute = function InstanceList(props) {
	return Descriptor.apply(this, arguments);
}
Attribute.prototype = new Descriptor({
	init : function(proto, key){
		
	}
});



Script.loaded("{{hope}}Descriptor.js");
});// end Script.require()
