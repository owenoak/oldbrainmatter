//
//	AutoUpdater
//
//	An intelligent timer which fires an onUpdate routine periodically if some condition
//		(specifed as updateCondition() is true).
//
//	Initialize with the following properties:
//		onUpdate	 			-- (mandatory) callback to do the update
//		updateCondition			-- (optional) method which returns a boolean -- we don't autoUpdate if this return false
//		updateInterval			-- (optional, default 10) number of seconds between update checks
//		<condition variables>	-- (optional) boolean condition variables in their initial state (see below)
//
//	e.g.
//
//		The following models a rooster which crows every 5 seconds 
//			if it is day time and the rooster is not currently eating.
//
//		var rooster = new AutoUpdater({
//						onUpdate : function() { console.warn('cock-a-doodle-doo!') },
//						conditions : {
//							itIsDayTime : true,
//							currentlyEating : false
//						},
//						updateInterval : 5,
//						enabled : true
//				});
//
//		   ...time passes...
//		>> cock-a-doodle-doo
//		   ...time passes...
//		>> cock-a-doodle-doo
//
//		// Feeding time!
//		rooster.setCondition("currentlyEating", true);
//		
//		   ...time passes...
//		(blessed silence)
//		   ...time passes...
//
//		// done eating
//		rooster.setCondition("currentlyEating", false);
//		   ...time passes...
//		>> cock-a-doodle-doo
//
//
//	

var AutoUpdater = Class.create({
	klass	 				: "AutoUpdater",

	debugging				: false,		// set to true to show debug messages
	
	enabled 				: false,		// we only update if this is true
	updateInterval	 		: 10,			// interval in SECONDS between auto-updates

	onUpdate 				: undefined,	// (function) method we call to actually do the update
	conditions				: undefined,	// (optional, object) conditions which must be true for the update to fire
	updateCondition 		: undefined,	// (optional, function) if defined, we only start the timer when updateCondtion() == true


	// master enable switch for the updater
	enable : function() {
		this.enabled = true;
		this.resume();
		return this;
	},
	
	// master disable switch for the updater
	disable : function() {
		this.enabled = false;
		this.pause();
		return this;
	},
	
	// pause the updater
	pause : function() {
		clearTimeout(this._updateTimer);
		return this;
	},
	
	// resume the updater
	resume : function() {
		clearTimeout(this._updateTimer);
		this._updateTimer = setTimeout(this._update, this.updateInterval * 1000);		
		this.debug("resume(): starting timer (",this.updateInterval," seconds)");
		return this;
	},
	
	// update if (we are enabled and our condition is true) or (force == true)
	// if (enabled == true), restarts the timer
	update : function(force) {
		var condition = this.updateCondition();
		
		if (this.debugging) {
			if (force == true) 		this.debug("update(): updating because <force> is true.");
			else if (!this.enabled) this.debug("update(): not updating because not enabled.");
			else if (!condition) 	this.debug("update(): not updating because condition is false.");
			else					this.debug("update(): updating!");
		}
		this.pause();
		if (force == true || (this.enabled && condition)) this.onUpdate();
		if (this.enabled) this.resume();
		return this;
	},

	// set a property of the object (which will presumably change the updateCondition)
	//	if the updateCondition value actually changed
	//		if true,  resume()
	//		if false, pause()
	setCondition : function(property, value) {
		if (this.debugging) var oldCondition = this.updateCondition();
		
		this[property] = value;
		var newCondition = this.updateCondition();
		
		this.debug("setCondition(",property,",",value,"): conditional was:",oldCondition,
			" now is:",newCondition);	

		// resume if the condition is now true
		if (newCondition) {
			this.resume();

		// and pause if its not
		} else {
			this.debug("setCondition(): pausing the timer");
			this.pause();
		}
	},

	// set things up
	initialize : function(properties) {
		Object.extend(this, properties);
		
		// make sure we have an id (for debugging)
		if (!this.id) {
			this.constructor.ID_SEQUENCE = this.constructor.ID_SEQUENCE || 0;
			this.id = this.klass + "_id_"+ this.constructor.ID_SEQUENCE++;
		}

		if (!this.onUpdate && this.debugging) throw "AutoUpdater.initialize("+this.id
													+"): you must pass an onUpdate method";

		// ensure we have SOME sort of updateCondition
		if (!this.updateCondition) this.updateCondition = function() {return true};

		// if any conditions were passed
		if (this.conditions) {

			var initialConditional = this.updateCondition;
			
			// create an updateCondition that checks the conditions
			this.updateCondition = function() {
				for (var prop in this.conditions) {
					if (this.conditions[prop] != this[prop]) return false;
				}
				// and check the initial conditional passed in
				return initialConditional();
			};
		
			// if we are enabled, assume that we want the conditions to initially be true
			if (this.enabled) Object.extend(this, this.conditions);
		}
		
		// bind the update routine once so we don't have to do it again and again when starting the timer
		this._update = this.update.bind(this);

		
		if (this.enabled && this.updateCondition()) this.resume();
	},
	
	debug : function() {
		if (!this.debugging) return;
		var args = $A(arguments);
		args.unshift(this.id+".");
		console.info.apply(console, args);
	}
});