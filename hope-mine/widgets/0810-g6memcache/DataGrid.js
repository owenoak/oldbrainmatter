Class.include("ProtoWidget UpdatingWidgetMixin");

//
//	DataGrid -- encapsulates a series of values (laid out explicitly in a template)
//					and automatically updates values on a timer
//
//	TODO:		- genericise with updateAndHilightValues()
//
var DataGrid = Class.create(ProtoWidget, UpdatingWidgetMixin, {
	klass 			: "DataGrid",

	id				: undefined,
	templateId 		: undefined,
	labels 			: undefined,
	values 			: undefined,
	
	displayValues 	: undefined,		// filled in on update(),
	
	hilightLabels	: true,
	sanitizeJSON	: true,				// if true, we call prototype's evalJSON with
										// a parameter which sanitizes the JSON for XSS attacks
	

	prepareToDraw : function(parent) {
		this.updateDisplayValues();
	},

	onDraw : function(parent) {
		this.expandMainTemplate(parent);
	},
	
	onUpdateSucceeded : function(request, skipAnimation) {
		var values = request.responseText;
		// use prototypes  string.evalJSON()   routine to turn the data into JS.
		//	NOTE: set this.sanitizeJSON = true  to prevent cross-site scripting (XSS) attacks.
		if (values)	{
			values = values.split("\n").join(" ");
			values = values.evalJSON(this.sanitizeJSON);
		}
		if (!values) return this.warn("updateSucceeded(): no values returned");

		this.values = values;
		this.updateHTML(skipAnimation);
	},
	
	updateHTML : function(skipAnimation) {
		var displayValues = this.updateDisplayValues(),
			oldDisplayValues = this._oldDisplayValues || {}
		;
		for (var prop in displayValues) {
			var valueElement = this.$parent.select(".value_"+prop)[0];
			if (!valueElement) continue;

			var displayValue = displayValues[prop],
				labelElement = this.$parent.select(".label_"+prop)[0]
			;
			if (displayValue != oldDisplayValues[prop]) {
				valueElement.innerHTML = displayValue;
				if (skipAnimation != ProtoWidget.SKIP_ANIMATION && window.Effect) {
					new Effect.Highlight(valueElement);
					if (this.hilightLabels && labelElement) new Effect.Highlight(labelElement);
				}
			}
		}
		this._oldDisplayValues = displayValues;
	},
	
	updateDisplayValues : function() {}
});

