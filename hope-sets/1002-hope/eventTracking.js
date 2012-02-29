/* 
	Event Tracking -- keeping track of event particulars, event when there is no current event object.
	
	1) Body inspects events on 'capture' phase so we always know:
		- where the mouse is:
			- Event.button		- 'none', 'right', 'left', 'middle'
			- Event.pageX		- global x coordinate, takes scrolling into account
			- Event.pageY		- global y coordinate, takes scrolling into account
			- Event.windowX		- global x WITHOUT scrolling
			- Event.windowY		- global y WITHOUT scrolling
			- Event.offsetX		- x coordinate relative to offsetParent, no scrolling
			- Event.offsetY		- y coordinate relative to offsetParent, no scrolling
			- Event.target		- element which would receive the event (ignores text nodes)
			- Event.hopeTarget	- closest hope element to target
			
		- which keys are down
			- Event.character							- character value of key pressed or ""
			- Event.shiftKey							- true/false
			- Event.altKey aka .optionKey				- true/false
			- Event.metaKey aka .commandKey				- true/false
			- Event.controlKey aka Event.ctrlKey		- true/false
			
	Installs in the enclosing document automatically on load.
	
	To hook up in an iframe, load this script in the iframe.

*/

(function() {	// Begin hidden from global scope


// GLOBAL -- name of the 'hopeTarget' attribute
// TODO: set this from hope itself
var hopeTargetAttribute = "hope";


//
//	mouse properties
//

// private variables for tracking mouse properties
var 
	button = 0,
	mouseEvent = {
		pageX	: 0,
		pageY	: 0,
		windowX	: 0,
		windowY	: 0,
		offsetX	: 0,
		offsetY	: 0,
		target	: undefined,
		hopeTarget : undefined
	}
;

// capture mouse events on capture phase to set global variables
document.addEventListener("mousemove", 	function(event){	mouseEvent = event 		}, true);
document.addEventListener("mousedown", 	function(event){	button = event.which 	}, true);
document.addEventListener("mouseup", 	function(event){	button = 0 				}, true);

//
// define getters on Event to return the appropriate mouse properties
//

// which mouse button is down?
Event.__defineGetter__("button", 	function() { return mouseButtonMap[button] });
var mouseButtonMap = ["none","left","middle","right"];

// global coordinate WITH scrolling taken into account
Event.__defineGetter__("pageX", 	function() { return mouseEvent.pageX });
Event.__defineGetter__("pageY", 	function() { return mouseEvent.pageY });

// global coordinate WITHOUT scrolling
Event.__defineGetter__("windowX", 	function() { return mouseEvent.clientX });
Event.__defineGetter__("windowY", 	function() { return mouseEvent.clientY });

// coordinate relative to offset parent
Event.__defineGetter__("offsetX", 	function() { return mouseEvent.layerX });
Event.__defineGetter__("offsetY", 	function() { return mouseEvent.layerY });

// target of the event
Event.__defineGetter__("target", function() { 
	var target = mouseEvent.target; 
	return (target && target.nodeType === 3 ? target.parentNode : target);
});

// 'hopeTarget' -- first element above the target with a 'hope' attribute
Event.__defineGetter__("hopeTarget", function() {
	var target = Event.target;
	while (target && target.getAttribute) {
		if (target.getAttribute(hopeTargetAttribute)) return target;
		target = target.parentNode;
	}
});


//
//	key properties
//

// private variables for tracking mouse properties
var	charCode = 0,
	keyEvent = {
		shiftKey	: false,
		altKey		: false,
		optionKey	: false,
		metaKey		: false,
		commandKey	: false,
		controlKey	: false,
		ctrlKey		: false
	};

// capture mouse events on capture phase to set global variables
document.addEventListener("keydown",   function(event){	keyEvent = event 		},  true);
document.addEventListener("keypress",  function(event){	charCode = event.which 	},  true);
document.addEventListener("keyup",     function(event){	charCode = 0		 	},  true);


//
// define getters on Event to return the appropriate key properties
//

// actual character that was pressed
Event.__defineGetter__("character", function() { return charCode ? String.fromCharCode(charCode) : "" });

// were various special keys pressed?
Event.__defineGetter__("shiftKey", 	function() { return keyEvent.shiftKey 	});
Event.__defineGetter__("altKey", 	function() { return keyEvent.altKey 	});
Event.__defineGetter__("optionKey", function() { return keyEvent.altKey 	});
Event.__defineGetter__("metaKey", 	function() { return keyEvent.metaKey 	});
Event.__defineGetter__("commandKey",function() { return keyEvent.metaKey 	});
Event.__defineGetter__("controlKey",function() { return keyEvent.ctrlKey	});
Event.__defineGetter__("ctrlKey", 	function() { return keyEvent.ctrlKey 	});



// debug:  show all properties we've put on the event
function debug(name) {
	console.group(name);
	console.log("button", Event.button);	
	console.log("pageX", Event.pageX);	
	console.log("pageY", Event.pageY);	
	console.log("windowX", Event.windowX);
	console.log("windowY", Event.windowY);
	console.log("offsetX", Event.offsetX);
	console.log("offsetY", Event.offsetY);
	console.log("target", Event.target);	
	console.log("hopeTarget", Event.hopeTarget);	

	console.log("character", Event.character);
	console.log("shiftKey", Event.shiftKey);
	console.log("altKey", Event.altKey);
	console.log("metaKey", Event.metaKey);
	console.log("controlKey", Event.controlKey);
	console.groupEnd();
}
Event.debug = debug;


/*
document.addEventListener("mousemove",  function(event){	debug("mousemove"); },  true);
document.addEventListener("mousedown",  function(event){	debug("mousedown"); },  true);
document.addEventListener("mouseup",   	function(event){	debug("mouseup");   },  true);

document.addEventListener("keydown",   	function(event){	debug("keydown");	},  true);
document.addEventListener("keypress",   function(event){	debug("keypress");	},  true);
document.addEventListener("keyup",   	function(event){	debug("keyup");	 	},  true);
*/



})(); // End hidden from global scope
