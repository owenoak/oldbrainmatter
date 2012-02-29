/*
	Simple observe/notify pattern.
	
	Mix in to an object as:
		-	$.Observable.mixinTo(SomeClass);
	and it mixes the methods into the prototype as well as the class.

*/

(function($) {	// begin hidden from global scope

var CALLBACKS = {};
function getCallback(event) {
	return (CALLBACKS[event] = "on" + $.string.capitalize(event));
}
var slice = Array.prototype.slice;

$.Observable = {

	// set to true to see a console message about each actual notify() call
	trace : false,

	mixinTo : function(it) {
		// mixin to class AND prototype
		$.mixin(it, this.properties);
		if (it.prototype) $.mixin(it.prototype, this.properties);
	},
	
	properties : {
		isObservable : true,
		
		// Observe an event on some other target.
		// You can call in three ways:
		//	- passing three separate arguments
		//	- pass a single array of three arguments
		//	- pass an object with .target, .event and .callback
		observe : function(target, event, callback) {
			// can call with a single array as well
			if (arguments.length === 1) {
				if (target instanceof Array) {
					callback = target[2];
					event = target[1];
					target = target[0];
				} else if (target.target && target.event) {
					callback = target.callback;
					event = target.event;
					target = target.target;
				}
			}
if (!target.addObservation) debugger;
			target.addObservation(this, event, callback);
		},
		
		// Notify observers about some event.  Can pass up to 3 arguments.
		notify : function(event, data, data2, data3) {
			var callbackArgs = slice.call(arguments, 1),
				callback = CALLBACKS[event] || getCallback(event), 
				result
			;

			// if this object has defined the callback, call that and return the results
			if (this[callback]) result = this[callback].apply(this, callbackArgs);
			
			var observations = (this.observations ? this.observations[event] : null);
			if (observations) {
				$.forEach(observations, function(observation) {
					var observer = observation.observer, callback = observation.callback;
					if (typeof callback === "string") {
						if ($.Observable.trace) console.debug("OBSERVABLE: ",
													this,".notify('"+event+"'): calling: ",
													observer,"."+callback+"() with ",callbackArgs);
						callback = observer[callback];
					} else {
						if ($.Observable.trace) console.debug("OBSERVABLE: ",
													this,".notify('"+event+"'): calling: ",
													observer,": ", callback," with ",callbackArgs);
					}
					if (!callback) {
						console.debug( this,".notify('"+event+"'):",
											"can't find callback: ",observation.callback,
											" for: ",observer);
					} else {
						callback.apply(observer, callbackArgs);
					}
				}, this);
			}
			return result;
		},

		// Stop observing some target.  You can pass null for event to stop for all events.
		ignore : function(target, event) {
			target.removeObservation(this, event);
		},

		
		// Someone wants to observe an event on us.  Must be called with discreet arguments.
		addObservation : function(observer, event, callback) {
			if (!observer) throw TypeError(this+".observe(): observer is not defined");
			if (!event) throw TypeError(this+".observe(): event is not defined");
			if (callback == null) {
				callback = CALLBACKS[event] || getCallback(event);
			}

			if (!this.observations) this.observations = {};
			var observations = (this.observations[event] || (this.observations[event] = []));

			// don't add if in there already
			var alreadyPresent = $.list.firstWhere(function(observation) {
				return observation.observer == observer && observation.callback == callback;			
			});
			if (alreadyPresent) return;
			
			observations.push({observer:observer, callback:callback});
		},

		// Someone wants to stop observing an event on us.
		//	Pass a null event to stop observing all events for the observer.
		removeObservation : function(observer, event) {
			if (!this.observations) return;
			if (event == null) {
				var me = this;
				for (var event in this.observations) {
					this.removeObservation(observer, event);
				}
				return;
			}
			var observations = this.observations[event];
			if (!observations) return console.error("no "+event+"to ignore");
			for (var i = observations.length-1; i > -1; i--) {
				if (observations[i].observer === observer) {
if ($.Observable.trace) console.debug("ignoring ", observer, event);
					observations.splice(i,1);
				}
			}
		}
	},
	
	toString : function(){ return "$.Observable"}
}



})(jQuery);	// end hidden from global scope
