/**
*	class ProtoWidget
* 	Base class for our widget set.  
*	Provides:
*		- sophisticated drawing semantics, including deferred draw
*		- global reference (to easily point back to an object from an HTML template)
*		- basic enabled/disabled semantics
*		- basic update semantics 
* 		- saving object state in a cookie automatically
*		- debugging facilities
*
* TODO:
*		- unify drawing semantics
*			- getHTML (default to MainTemplate ?)
*			- assign id to main element
*			- get $main automatically
*			- hookup events?  events in HTML?
*			- "style" property applied to outer element
*			- setEnabled() should happen after draw?
*		- review
**/
window.ProtoWidget = Class.create(
{
	/**
	 *	ProtoWidget#klass = "ProtoWidget"
	 *	
	 **/
	klass 					: "ProtoWidget",			// for toString()

	id 						: undefined,
	enabled					: true,
	visible					: true,

	SKIP_ANIMATION 			: "SKIP_ANIMATION",			// pass to certain routines that have animation to skip the animation in this call

	cookieId 				: undefined,				// if defined, we will remember various states (like expanded/collapsed) in cookies
	deferDrawInterval		: undefined,				// if defined, we will defer drawing that # of SECONDS to allow parents to settle out, etc

	autoDraw 				: false,					// if true, we draw at the end of init()
	_drawn					: false,
	

	// TODO: generally you shouldn't override initialize() in your instance
	//			override initializeProperties() instead
	initialize : function(properties) {
		this.setProperties(properties);
		this.identify();
		this.initializeProperties();
		this.setEnabled(this.enabled);
		if (this.autoDraw) this.draw();
	},

	setProperties : function(properties) {
		Object.setProperties(this, properties);
	},
	
	initializeProperties : function() {},


	// note: you should generally override onDraw(), or onAfterDraw() instead of this!
	draw : function(parent) {
		// if the document.body is not defined, defer drawing for a little while
		if (!document.body) return setTimeout(this.draw.bind(this, parent), 0);
		
		if (typeof parent == "string") parent = $(parent);
		if (parent == null && this.parentId) parent = $(this.parentId);

		// TODO: some way to place this inline at the point of invocation?		
		if (parent == null) parent = Element.extend(document.body);
		this.$parent = parent;

		// call our internal _draw routine on a timer (if deferDrawInterval != -1)
		this.delay(this._draw.bind(this, parent), this.deferDrawInterval, "_draw");
		return this;
	},
	_draw : function(parent) {
		this.prepareToDraw(parent);
		this.onDraw(parent);
		this._drawn = true;
		if (this.visible == false) this.hide();
		this.onAfterDraw(parent);
		this.onDrawChildren(parent);
	},
	
	// called right before draw -- use this spot to massage any data, etc
	prepareToDraw : function(parent) {},
	// actually draw this widget
	onDraw : function(parent) {},
	// called after draw -- use this spot to do any cleanup, assign event handlers, etc
	//	note that (this._drawn == true) in this routine
	onAfterDraw : function(parent) {},
	onDrawChildren :function(parent) {},

	
	
	redraw : function() {
		delete this._redrawTimer;
		this.prepareToRedraw();
		this.onRedraw();
		this.onAfterRedraw();
	},
	
	prepareToRedraw : function() {
		this.prepareToDraw();
	},
	
	// actually do redraw for this widget
	onRedraw : function() {},

	// called after redraw() completes
	onAfterRedraw : function() {},	
	
	// Redraw after a little bit
	//	useful if a lot of ops will come in that will each cause a redraw
	//	so we only do one redraw
	scheduleRedraw : function() {
		if (!this._drawn || this._redrawTimer) return;
		this._redrawTimer = setTimeout(this.redraw.bind(this), 0);
	},
	
	expandMainTemplate : function(parent) {
		if (this.templateId) this.template = Template.createFromHTML(this.templateId);
		if (!this.template) return;

		var html = this.template.evaluate(this);
		parent.insert(html);
	},


	//
	//	update
	//
	update : function() {
		return this;
	},


	//
	//	enable/disable
	//
	setEnabled : function(enabled) {
		if (enabled == false) return this.disable();
		return this.enable();
	},
	
	enable : function() {
		this.enabled = true;
		return this;
	},
	
	disable : function() {
		this.enabled = false;
		return this;
	},
	

	//
	//	show/hide
	//
	setVisible : function(visible) {
		if (visible == false) return this.hide();
		return this.show();
	},
	
	show : function() {
		this.visible = true;
		if (this.$main) this.$main.style.display = "";
		return this;
	},
	
	hide : function() {
		this.visible = false;
		if (this.$main) this.$main.style.display = "none";		// TODO: move off screen?
		return this;
	},
	

	//
	//	setting html/styles of various parts of the widget
	//
	
	// Get the 'part' (eg: sub-element) of this widget which matches the given selector.
	//	Only the first matching element will be returned.
	//	<partSelector> 		- if a string, CSS selector to use to locate a sub-element of this.$main
	//						- if null, returns this.$main, the main element
	//						- if anything else, returns the input (which we assume is an html element)
	getPart : function(partSelector) {
		if (!this.$main) return;
		if (partSelector == null) return this.$main;
		if (typeof partSelector == "string") return this.$main.select(partSelector)[0];
		return partSelector;
	},
	
	// set the html of a part of this widget, specified by partSelector
	//	<partSelector>		CSS selector for the part in question (only first one found will be affected)
	//	<html>				new html for part
	//	<setVisibility>		if true, element will be shown (via display=block)
	//						if false, element will be hidden
	//						if undefined/null, no affect on visibility
	setPartHTML : function(partSelector, html, setVisibility) {
		var element = this.getPart(partSelector);
		if (!element) return;
		element.innerHTML = html;
		if (setVisibility) element.style.display = (html || html == 0 ? "block" : "none");		
	},
	
	// toggle the class name of an element of this widget or some sub-part
	//	<partSelector>		CSS selector or element in question (see getPart() for possible values)
	//	<name>				class name to toggle
	//	<toShow>			if true, we will add that className to the element
	//						if false, we will remove that className from the element
	//						if undefined, we will add the class name if it wasn't set, 
	//							and remove it if it was set
	toggleClassName : function(partSelector, name, toShow) {
		var element = this.getPart(partSelector);
		if (!element) return;
		if (toShow == null) toShow = !element.hasClassName(name);
		if (toShow) element.addClassName(name);
		else		element.removeClassName(name);
	},

	// toggle an attribute of an element of this widget or some sub-part
	//	<partSelector>		CSS selector or element in question (see getPart() for possible values)
	//	<attribute>			name of the attribute
	//	<value>				value to set (if toShow == true)
	//	<toShow>			if true, we will add the atribute to the element
	//						if false, we will remove the attribute from the element
	//						if undefined, we will add the attribute if it wasn't set, 
	//							and remove it if it was set
	toggleAttribute : function(partSelector, attribute, value, toShow) {
		var element = this.getPart(partSelector);
		if (!element) return;
		if (toShow == null) toShow = !element.getAttribute(attribute);
		if (toShow) element.setAttribute(attribute, value);
		else		element.removeAttribute(attribute);
	},

	
	//
	//	generic redraw timer logic
	//
	// NOTE: interval is in SECONDS
	delay : function(callback, interval, timerName) {
		// make sure we're the only one doing the delay
		this.clearDelay(timerName);
		if (interval == null) return callback();
		
		var widget = this,
			wrapper = function() {
							widget.clearDelay(timerName);
							callback();
						}
		;
		var timer = setTimeout(wrapper, interval * 1000);
		if (timerName) this._DELAY_TIMERS[timerName] = timer;
	},
	clearDelay : function(timerName) {
		if (!this._DELAY_TIMERS) this._DELAY_TIMERS = {};
		if (timerName) clearTimeout(this._DELAY_TIMERS[timerName]);
	},
	
	
	//
	//	make sure we have an ID
	//	make sure we have a "globalRef" which can be used in a script to refer to us
	//	and make sure our Class's registry has a pointer to us
	//
	//	NOTE:   Requires that every class have a unique  "klass" property 
    //          (generally the name of the class)
	//			If the klass can't be pluralized by simply adding an 's', 
	//				you should also define 'klasses' property
	identify : function() {
		this.constructor.register(this);
	},
	
	byId : function(id) {
		return this.constructor.byId(id);
	},
	
	//
	//	debug
	//
	
	requireProperty : function(property, message) {
		if (this[property] == null) this.warn(message);
		return this;
	},
	
	debug 	: function() {	return this._debug("debug", arguments);	},
	log 	: function() {	return this._debug("log", arguments);	},
	info 	: function() {	return this._debug("info", arguments);	},
	warn 	: function() {	return this._debug("warn", arguments);	},
	error 	: function() {	return this._debug("error", arguments);	},

	_debug : function(methodName, args) {
		if (!window.console) return;
		// put our descriptor 
		args[0] = this + "::" + args[0];
		if (console[methodName]) {
			console[methodName].apply(console, args);
		} else {
			console.log($A(args).join(" "));
		}
		return undefined;
	},
	
	
	toString : function() {
		if (!this.globalRef) this.identify();
		return this.globalRef;
	}
	

});
	
ProtoWidget.SKIP_ANIMATION = "SKIP_ANIMATION";

