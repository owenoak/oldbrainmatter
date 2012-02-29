new $.Drawable.subclass({
	reference : "$.Label",
	prototype : {
		_cssClass		: "Label",
		value	 		: undefined,
		getInnerHTML 	: function() {	return $.expand(this.value, this)	},
		template 		: "<div class='#{className} #{_cssClass}' #{getAttributes()}>#{getInnerHTML()}</div>"
	}
});
