// Repeating, observable, pausable timer.
//	var timer = new $.Timer({name:..., interval:...}).start();
//	...
//	somethingElse.observe(timer, "fire", "timerFired");
//	...
//	timer.pause();
//	...
//	timer.start();
//	
//	
//	TODO:
// 		- execute condition?
//		- remember timer start so we can be accurate on timing when they setInterval() ?

(function($) {	// begin hidden from global scope


new $.Class({
	reference : "$.Timer",
	prototype : {
	
		running		: false,		// are we currently running?
		name 		: undefined,	// name for the timer
		interval 	: 15,			// interval, in SECONDS
		autoStart 	: true,			// if true, we start timer on create and restart after fire()
		cookie		: undefined,	// if set, we maintain/get interval from a cookie with this name
	
		//
		// special setters
		//
		
		setCookie : function(cookie) {
			this.cookie = cookie;
			var interval = parseInt($.cookies.get(this.cookie));
			if (!isNaN(interval)) this.setInterval(interval);
			return this.cookie;
		},
		
		setInterval : function(interval) {
			interval = parseInt(interval);
			if (isNaN(interval) || interval === this.interval) return;
			this.interval = interval;
			
			// if we have a cookie, set it if it has changed
			if (this.cookie) {
				var cookieValue = $.cookies.get(this.cookie);
				if (cookieValue != ""+interval) $.cookies.set(this.cookie, interval);
			}
			
			// restart the timer with the new interval if we're running
			//	TODO: take difference of old interval and new?
			if (this.running) {
				this._stopTimer();
				this.fire();
			}
			return interval;
		},
	
		onCreate : function() {
			// bind our fire function for use in the actual JS timer
			this._fire = $.bind(this.fire, this);
			if (this.autoStart) this.start();
		},


		// start the timer
		start : function(_seconds) {
			this._stopTimer();	// stop the current timer if there is one
			if (this.interval === 0) return;
			if (_seconds == null) seconds = this.interval;
			this._timer = setTimeout(this._fire, seconds * 1000);
			this.notify("start", this);
			this.running = true;
			return this;
		},

		// pause the timer
		stop : function() {
			this._stopTimer();
			this.notify("stop", this);
			return this;
		},

		
		// fire immediately and re-start the timer if autoStart is true
		fire : function() {
			this._stopTimer();
			this.notify("fire", this);
			if (this.autoStart) this.start();
			return this;
		},


		// internal function to stop the timer -- use "pause" instead
		_stopTimer : function() {
			if (this._timer) clearTimeout(this._timer);
			this.running = false;
		}	
	}
});



})(jQuery);	// end hidden from global scope
