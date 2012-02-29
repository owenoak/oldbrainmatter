/* like an expanded select where only one value can be seen at a time */

var ItemSelector = Class.create(Select, {
	klass			: "ItemSelector",
	options			: undefined,

	onAfterDraw : function() {
		this.$element = this.$main;
		this.$items = this.$main.select(".Item");
	},

	setValue : function(value, updateElement) {
		this.value = value;
		if (updateElement != false) this.setElementValue(value);
	},
	
	setElementValue : function(value) {
		if (!this.$element) return;

		var index = this.indexOf(value);
		if (index == -1) this.warn("ItemSelector.setElementValue(",value,"): invalid value");

		var options = this.getOptions();
		for (var i = 0; i < options.length; i++) {
			if (options[i].value == value) {
				this.$items[i].addClassName("Selected");
			} else {
				this.$items[i].removeClassName("Selected");
			}
		}
		return value;
	},
	
	getElementValue : function() {
		return this.value;
	},

	onSelectValue : function(value) {
		this.setValue(value);
		this.onChange();
	},

	OuterTemplate : new Template("\
		<div class='ItemSelector'>\
			#{_optionsHTML}\
		</div>\
	"),

	OptionTemplate : new Template("\
		<div class='Item #{_option.classname}'\
			onmousedown='#{globalRef}.onSelectValue(\"#{_option.value}\")'\
		 ><span class='ItemColor' style='background-color:##{_option.colour};'></span> \
				#{_option.title}\
		 </div>\
	")
});
