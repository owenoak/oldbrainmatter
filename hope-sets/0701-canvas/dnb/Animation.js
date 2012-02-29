
//
//
//	Quick/clean animation API
//
//	TODO:	- get linear working -- other effects?
//			- chaining
//			- colors
//			- total duration rather than stepDuration?
//
//

dnb.createClass("Animation", {
	stepCount : 50,
	stepDuration : 15,
	units : "px",
	autoPlay : false,
	currentStep : 0,

	addSteps : function() {
		for (var a = 0; a < arguments.length; a++) {
			var args = arguments[a],
				el, 
				list = []
			;

			for (var prop in args) {
				switch (prop) {
					case "el":  
					case "id":				el = dnb.byId(args[prop]);			break;
					case "callback" : 		this.addCallback(args[prop]);		break;
					case "stepCallback" : 	this.addStepCallback(args[prop]);	break;
					case "autoPlay" :
					case "units" : 	
					case "stepList" :
					case "stepDuration" :
					case "stepFunction" :	
					case "stepCount":		this[prop] = args[prop];			break;
					default: 				list.push({prop:prop, end:args[prop]});
				}
			}
			for (var i = 0, it; it = list[i]; i++) {
				it.el = el;
				it.steps = dnb.Animation._makeStepList(el, it.prop, it.start, it.end, this.stepCount, this.stepFunction);
				this.stepList.push(it);
			}
		}
	},

	init : function() {
console.debug(this);
//		this.inherit("init", arguments);
		this.stepList = [];
		this.addSteps.apply(this, arguments);
console.debug(this);
		if (this.autoPlay) this.play();
	},

	addCallback : function(fn) {
		if (this.callbacks == null) this.callbacks = [fn];
		else this.callbacks.push(fn);
	},

	addStepCallback : function(fn) {
		if (this.stepCallbacks == null) this.stepCallbacks = [fn];
		else this.stepCallbacks.push(fn);
	},

	play : function() {
		this.currentStep = 0;
		this._execute();
	},

	reverse : function() {
		for (var i = 0, step; step = this.stepList[i]; i++) {
			step.steps.reverse();
		}
		this.play();
	},

	_execute : function() {
		for (var i = 0, item; item = this.stepList[i]; i++) {
			item.el.style[item.prop] = item.steps[this.currentStep];
		}
		if (this.stepCallbacks) {
			for (var i = 0, stepCallback; stepCallback = this.stepCallbacks[i]; i++) {
				stepCallback();
			}
		}
		if (++this.currentStep < this.stepCount) {
			var animation = this;
			setTimeout(function() {animation._execute()}, this.stepDuration);
		} else {
			if (this.callbacks) {
				for (var i = 0, callback; callback = this.callbacks[i]; i++) {
					callback();
				}
			}			
		}
	}
});


dnb.Animation.addToClass({
	_makeStepList : function(el, prop, start, end, stepCount, stepFunction) {
		var units = dnb.getUnits(end);
		var start = parseFloat(start || dnb.getDimension(el, prop, units));
		var end = parseFloat(end);
		if (units == null) units = '';
		if (stepFunction == null) stepFunction = dnb.Animation.easeInOut;
		
		var list = [];
		for (var i = 0; i < stepCount - 1; i++) {
			list[i] = stepFunction(i, stepCount, start, (end-start)) + units;
		}
		list[i] = end + units;
		return list;
	},
	
	linear : function(stepNum, totalSteps, start, delta) {
		return ((stepNum / totalSteps) * delta) + start;
	},
	
	easeInOut : function(stepNum, totalSteps, start, delta) {
		return (-delta / 2 * (Math.cos(Math.PI * stepNum / totalSteps) - 1) + start);
	}
});

dnb.Animation.addToPrototype(	{stepFunction : dnb.Animation.easeInOut} );

