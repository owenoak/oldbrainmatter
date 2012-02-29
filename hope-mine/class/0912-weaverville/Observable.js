/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function(hope) {
// 
//		Begin hidden from global scope:
//

//
// Observable pattern -- you can mix this in to any class or object as:
//		$.Observable.mixinTo(someObject)
//


/** For a given observer, return it's observations for 
	a particular observable/event/callback combo.
 */
function getObservations(observer, observable, event, callback) {
	var list = observer._observations;
	if (!list || !list.length) return;
	
	// if no observable was specified, return them all.	
	if (!observable) return list;

	if (event == null) event = "*";
	if (callback == null) callback = event;
	
	return list.filter(function(observation) {
		return (	observation.observed == observable
				 && observation.event == event
				 && observation.callback == callback);
	});
}


/** Execute a list of observations, with args passed in. */
function notifyAll(observations, args) {
	if (!observations || observations.length == 0) return;
	observations.forEach(function(observation) {
		var target = observation.target, callback = observation.callback;
		// if callback is a string, it's a method of the target
		if (typeof callback == "string") callback = target[callback];
		if (callback) callback.apply(target, args);
	});
}

$.extend({

Observable : {
	mixinTo : function(it) {
		if (it.extend) 	it.extend(this.defaults);
		else			$.extend(it, this.defaults);
		it.asObservable = this.defaults;
	},
	
	defaults : {
	
		/** Observe events on another object. 
			@param	[method]	If null, we observe *all* events on the observable.
								If a string, a single event to observe.
								If an object, {event->callback} map.
			@param	[callback]	Callback to execute when particular method is fired.
								(note: only when method is defined).
		*/
		observe : function(observable, event, callback) {
			if (event && typeof event != "string") {
				var me = this;
				$.each(event, function(event, callback) {
					me.observe(observable, event, callback);
				});
				return this;
			}

			// if no event was specified, default to all events.
			if (event == null) 		event = "*";
			if (callback == null)	callback = event;
			var observation = {	observed 	: observable,
								event 		: event,
								target 		: this, 
								callback 	: callback
							};

			// add the observation to the observers' observation list for the event
			var _observers = (observable._observers || (observable._observers = {})),
				eventList = (_observers[event] || (_observers[event] = []))
			;
			eventList.push(observation);
			
			// and remember the observation in our list of observations
			//	so we can ignore it later
			if (this._observations == null) this._observations = [];
			this._observations.push(observation);

			return this;
		},
		
		/** Stop observing events on another object. */
		ignore : function(observable, event, callback) {
			// get the list of observations that match the call signature
			var observations = getObservations(this, observable, event, callbacks);
			if (observations) {
				observations.forEach(function(observation) {
					// get the list of observations on observed
					var observed = observation.observed,
						_observers = observed._observers,
						list = (_observers ? _observers[observation.event] : null);
					if (!list) return;
					// find the observation in the _observers list and remove if found
					var index = list.indexOf(observation);
					if (index != -1) list.splice(index, 1);
					
					// remove from our list of _observations as well
					index = this._observations.indexOf(observation);
					if (index == -1) this._observations.splice(index, 1);
				}, this);
			}
			return this;
		},
		
		/** Notify observers of an event on this object. 
			For notifications, arguments[0] will be this object,
				args 1..N will be other args passed in to notify()
		*/
		notify : function(event) {
			if (!this._observers || (!this._observers[event] && !this._observers["*"])) return;
			// get the arguments to pass to the notify function
			var args = $.args(arguments); args[0] = this;
			
			// notify for the specific event and for all events
			notifyAll(this._observers[event], args);
			notifyAll(this._observers["*"], args);

			return this;
		}
	},	// end defaults

	toString : function() {	return "$.Observable" }

}		


});	// end $.extend()
	
//
//		End hidden from global scope: 
//
})(hope);
