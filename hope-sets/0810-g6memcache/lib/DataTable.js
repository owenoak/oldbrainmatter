//
//	DataTable -- encapsulates a series of values (laid out explicitly in a template)
//					and automatically updates all of the values
//
var DataTable = Class.create(UpdatingWidget, {
	klass : "DataTable",

	id				: undefined,
	templateId 		: undefined,
	labels 			: undefined,
	values 			: undefined,
	
	displayValues : undefined,		// filled in on update(),
	

	onDraw : function(parent) {
// TODO: is the parent stuff generic ?
// TODO: if no parent passed, use BODY tag?
		if (!parent) parent = $(this.parentId);
		if (!parent) return this.warn("draw(): must pass a parent or set item.parentId");
		this._parentElement = parent;
		
		if (this.templateId) this.template = Template.createFromHTML(this.templateId);
		if (this.template) {
			this.updateDisplayValues();
			this._parentElement.insert(this.template.evaluate(this));
		}
		return this;
	},
	
	onUpdateSucceeded : function(request) {
		var values = request.responseText;	// TOOD: prototype can return this as safe JS for us
		if (values)	values = eval(values);	// TODO: not safe
		if (!values) return this.warn("updateSucceeded(): no values returned");

		this.values = values;
		this.updateHTML();
	},
	
	updateHTML : function() {
		var displayValues = this.updateDisplayValues();
		for (var prop in displayValues) {
			var valueElement = this._parentElement.select(".value_"+prop)[0];
			if (!valueElement) continue;

			var displayValue = displayValues[prop],
				labelElement = this._parentElement.select(".label_"+prop)[0]
			;
			
			if (displayValue != valueElement.innerHTML) {
				valueElement.innerHTML = displayValue;
				new Effect.Highlight(valueElement);
				if (labelElement) new Effect.Highlight(labelElement);
			}
		}
	},
	
	updateDisplayValues : function() {}
});

