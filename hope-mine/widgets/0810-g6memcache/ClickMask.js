Class.include("ProtoWidget");

var ClickMask = Class.create(ProtoWidget, {
	klass : "ClickMask",
	className : "",
	
	show : function() {
		if (!this.$element) {
			document.body.insert(this.template.evaluate(this));
			this.$element = $(this.id);
		}

// TODO: have a page-level resize event which updates the dims of the clickmask
		var dimensions = document.viewport.getDimensions();
		this.$element.bringToFront();
		this.$element.setStyle({
			width : dimensions.width + "px",
			height : Math.max(window.innerHeight, dimensions.height) + "px",
			display : "block"
		});
		return this;
	},
	
	hide : function(event) {
		this.$element.style.display = "none";
		return this;
	},
	
	onMouseDown : function(event) {
		if (this.callback) this.callback(event);
		this.hide(event);
		return false;
	},
	
	template : new Template("<div id='#{id}' class='ClickMask ${className}' onmousedown='#{globalRef}.onMouseDown(event)'></div>")
	
});