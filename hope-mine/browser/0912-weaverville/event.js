/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Special event handling code for drawables. */

// TODO:	- hover support w/ a timer
//			- could do event-capture phase for IE with this...


$.extend({

	/** Pass $.CONTINUE from your event handler to continue event propagation. */
	CONTINUE : "CONTINUE",

	/** Map of event names to the methods we'll call for each event. */
	eventTypeMap : {
		"click" 	: "onClick",
		"dblclick" 	: "onDoubleClick",
		"mousemove" : "onMouseMove",
		"mouseover" : "onMouseOver",
		"mouseout" 	: "onMouseOut",
		"mousedown" : "onMouseDown",
		"mouseup" 	: "onMouseUp",
		"focus" 	: "onFocus",
		"blur" 		: "onBlur",
		"change" 	: "onChange",
		"select" 	: "onSelect",
		"keydown"	: "onKeyDown",
		"keypress"	: "onKeyPress",
		"keyup"		: "onKeyUp",
		"scroll"	: "onScroll",
		
		// special mouseenter and mouseleave events!  cool!
		"mouseenter": "onMouseEnter",
		"mouseleave": "onMouseLeave"
	},

	/** Map of our method handler name to event types.  Filled in below. */
	eventMethodMap : {}


});	// end $.extend()
	
	
// go through all keys in the eventTypeMap and:
//	1) build a reversed, "eventMethodMap", and
//	2) add to eventTypeMap as "onclick" as well as "click"
for (var key in $.eventTypeMap) {
	var method = $.eventTypeMap[key];
	$.eventMethodMap[method] = key;
	$.eventTypeMap["on"+key] = method;
}

	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
