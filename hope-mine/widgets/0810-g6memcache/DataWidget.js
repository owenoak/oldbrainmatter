//
//	DataWidget -- widget with data values (which can inherit from prototype.data)
//
//	Data values are kept separate (in widget.data) and are managed through  widget.setData()
//	When setData is called, if any data has actually changed, forces a redraw.
//	If widget.updateDifferences is true (default), rather than redrawing all of the html,
//	 we look inside our main element for elements with "updateThis='key'" attributes 
//	 -- if we find that data[key] has actually changed, we update just that bit.
//	
//  As an adjunct to this, prepareToDraw() creates a property "snapshot" which:
//		1) initially holds all of the 'data' of the widget
//		2) where you can store derived values needed for expanding templates.
//
//	On a redraw, if this.updateDifferences
//

window.DataWidget = Class.create(ProtoWidget, {
	debugUpdate : false,			// set to true to print out LOTS of info while redrawing

	data : {},						// data for this instance
	
	updateDifferences : function(){ return !this.majorChange },
									// true|false|function() --> boolean
									// if true, we replace values on redraw rather than 
									// drawing the entire thing again

	highlightDifferences : true,	// true|false|function() --> boolean
									// if true, we use Scriptaculous's Highlight() effect
									// to show differences on redraw

	highlightParams : {},			// provide particular parameters for the hilight
									// of inidividual properties in this object.
									// set to "skip" to manually skip hilight for this one.

	updateElementSelector : null,	// set to a css selector if your updateAndHighlightDifferences
									// should act on something other than your main element
	
	$mainSelector : "##{id}",
	
	initialize : function($super, props) {
		// give us a data object which is a clone of our parent's data (so we pick up defaults)
		this.data = Object.protoClone(this.constructor.prototype.data);
		$super(props);
	},
	
	
	// get a data property
	get : function(key) {
		return this.data[key];
	},
	
	set : function(key, value) {
		// skip this if the value is already set
// FIXME:  somehow this[key] is getting set to value before we got here?
//		if (this[key] == value) return;
		var setter =  String._setters[key] || key.setter();
		if (typeof this[setter] == "function") {
			this[setter](value);
		} else {
			this.data[key] = value;
		}
		return this.data[key];
	},
	
	// Change some of our data properties.
	//	Returns differences between original data and new data passed in.
	//	If anything actually changes, starts redraw timer so we'll redraw.
	//
	//	NOTE: this automatically works for simple strings/numbers/booleans.
	//	If you have object-type data, create special setters for that as   set<Key>()
	//	 and they will be called automatically.
	setData : function(newData) {
		var diffs;
		for (var key in newData) {
			var newValue = this.set(key, newData[key]);
			if (newValue != null) {
				if (!diffs) diffs = {};
				diffs[key] = newValue;
			}
		}
//console.error("setData("+(this.id||this.data.ip)+"):\n",diffs, "\n",newData);		
		// if any differences were detected, start the redraw	
		if (diffs) this.scheduleRedraw();
		return diffs;
	},
	
	getData : function() {
		return this.data;
	},
	
	// clone this object
	//	(returns a cloned outer object and a cloned data object)
	clone : function() {
		var clone = Object.protoClone(this);
		clone.data = Object.protoClone(this.data);;
		return clone;
	},
	
	
	// return the differences between our.data and some other.data object
	getDeltas : function(other) {
		return Object.getDifferences(this.data, other.data);
	},
	
	//
	//	snapshot data normalization
	//
	
	//	return the data necessary to draw a graph of the ratio of  used:total
	//		name		= name for the graph
	//		title		= title for the graph
	//		total 		= total quantity
	//		used 		= used quantity   (must be in same units)
	//		type		= if not undefined, we'll prettify the results:
	//					= 			-  commaize()'s values
	//					= 			-  toBytesString()'s values
	//		precision	= if prettifying, precision for commaize or toBytesString()
	//
	//	returns object:
	//		{
	//			name	: <name>,
	//			title	: <title>,
	//			total 	: <total>,
	//			used 	: <used>,
	//			free	: <total> - <free>,
	//			percent	: (<total>/<used>).toPercent(0, true)	(no decimals, pinned 0-100)
	//			ratio	: (<total>/<used>).toPercent(2, false)	(2 decimals, not pinned)
	//
	//			// if <type> passed: 
	//
	//			Total 	: <total>, 	 prettified
	//			Used	: <used>, 	 prettified
	//			Free	: <free>, 	 prettified
	//			Percent	: <percent>, prettified (adds %)
	//			Ratio	: <ratio>,   prettfied (adds %)
	//		}
	formatGraphData : function(name, title, total, used, type, precision) {
		var output = {};
		output.name = name;
		output.title = title;

		var prettifier;
		switch (type) {
			case "bytes":	prettifier = "toBytesString"; 	break;
			case "integer":	prettifier = "commaize";		break;
		}
		
		// total
		output.total = total = (total || 0);
		if (prettifier) output.Total = output.total[prettifier](precision)
		
		if (used == null) return output;
		
		output.used = used = (used || 0);
		output.free = total - used;
		output.ratio = (total ? (used/total).toPercent(2, false) : 0);
		output.percent = (total ? (used / total).toPercent(0, true) : 0);

		if (prettifier) {
			output.Used = output.used[prettifier](precision)
			output.Free = output.free[prettifier](precision)
			output.Ratio = (total ? (used/total).toPercent(0, false) : 0) + "%";
			output.Percent = output.percent + "%";
		}

		return output;
	},
	

	// pass true to scheduleRedraw to indicate that a major change has occurred
	//	and that we should redraw everything
	scheduleRedraw : function($super, majorChange) {
		if (majorChange) this.majorChange = true;
		$super();
	},

	prepareToDraw : function() {
		if (this.snapshot) this.lastSnapshot = this.snapshot;

		// start the snapshot object off with a clone of the widget's data
// NOTE: no longer doing protoClone as this was causing us to not pick up some
//			changes from this run to the next
//		this.snapshot = Object.protoClone(this.data);
		this.snapshot = Object.extend({}, this.data);

		// NOTE: your subclass should $super() 
		//		  and then poke any derived values into this.snapshot
		//		  rather than adding them directly to the widget
	},
	
	getHTML : function() {
		return (this.OuterTemplate ? this.OuterTemplate.evaluate(this) : "");
	},
	
	onDraw : function(parent) {
		this.$main = Element.htmlToElements(this.getHTML())[0];
		parent.insert(this.$main);
		// turn off majorChange since we just redrew everything
		delete this.majorChange;
	},
	
	// Redraw the entire thing
	//
	// If noone has notified us of a major change, and we can updateDifferences
	//	just call updateAndHilightDifferences() to show the diffs.
	//
	//	Otherwise, replaces the entire HTML of the widget.
	//
	// NOTE: prepareToRedraw will already have been called
	onRedraw : function() {
		var update = this.checkConditional("updateDifferences");
		if (update) this.updateAndHighlightDifferences();
		else		this.replaceMain();
	},
	
	replaceMain : function() {
		if (this.debugUpdate) console.warn("replaceMain: redrawing entire thing",this);
		delete this.majorChange;
		var newMain = Element.htmlToElements(this.getHTML())[0];
		this.$main.parentNode.replaceChild(newMain, this.$main);
		this.$main = newMain;
	},
	
	getMainElement : function(parent) {
		if (!parent) return;
		this.$main = parent.select(this.$mainSelector.interpolate(this))[0];
	},
	
	//	Redraw just this differences now from the last rendering.
	//	Also highlights the differences.
	//
	// NOTE: * prepareToRedraw() has already been called
	//		 * this.snapshot = snapshot properties (including copy of this.data)
	//		 * this.lastSnapshot = snapshot properties from last snapshot
	//
	updateAndHighlightDifferences : function() {
		if (!this._drawn) return;
		if (this.debugUpdate) console.group("updateAndHighlightDifferences",this);
		if (!this.$main) this.getMainElement();
		var $updateMain = (this.updateElementSelector 
								? this.$main.select(this.updateElementSelector)[0] 
								: this.$main
						  );
		if (!$updateMain) {
		        if(this.debugUpdate) console.warn("Can't find update element for ",this);
			if (this.debugUpdate) console.groupEnd();
			return;
		}
		var	snapshot = this.snapshot,
			lastSnapshot = this.lastSnapshot,
			toHighlight = {},
			highlightParams = this.highlightParams || {},
            updaters = []
		;

		// update all elements with attribute "updateThis"
        if (this.$mainElements != undefined) {
            updaters = this.$mainElements.map(function(el) {
              return el.select("[updateThis]");}).flatten();
        } else {
            updaters = $updateMain.select("[updateThis]");
        }
		// (add the main element if it has an "updateThis" attribute as well)
		if ($updateMain.hasAttribute("updateThis")) updaters.unshift($updateMain);
		
		updaters.forEach(function(element) {
            var attributeValue = element.getAttribute("updateThis").split(":"),
				key = attributeValue[0],
				what = attributeValue[1] || "html",
				oldValue = Object.dereference(lastSnapshot, key), 
				newValue = Object.dereference(snapshot, key) || ""
			;
			if (oldValue != newValue) {
				if (this.debugUpdate) console.info("updating "+what+" of ",key,"to",newValue);
				if (what == "html") {
					element.innerHTML = newValue;
					// add to the list of items to highlight
					if (highlightParams[key] != "skip") {
						toHighlight[key] = element;
					}
				} else if (what == "class") {
					element.className = newValue;
				} else {
					element.style[what] = newValue;
				}
			}
		}, this);

		// hilight differences if we're supposed to
		var highlight = this.checkConditional("highlightDifferences");
		if (highlight) {
			// highlight any differences
			for (var key in toHighlight) {
				if (this.debugUpdate) console.info("highlighting ",key);
				var element = toHighlight[key];
				new Effect.Highlight(element, highlightParams[key]);
			}
		}

		if (this.debugUpdate) console.groupEnd();
	},
	
	// Check a conditional property of this object (this[key])
	// Conditional can be one of:  true, false, function() that returns true|false
	checkConditional : function(key) {
		var value = (typeof this[key] == "function" ? this[key]() : this[key]);
		return (value ? true : false);
	},
	
	
	//
	//	operation support
	//
	beginOperation : function(operationId, params) {
		if (this.operationPrefix) operationId = this.operationPrefix + operationId;
		if (!params) params = {};
		if (!params.target) params.target = this;
		page.beginOperation(operationId, params);
	}
});
