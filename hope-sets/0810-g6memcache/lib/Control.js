// TODO:
//			- remove string-based stuff from base control, such as minLength, maxLength, etc
//				and move to a StringControl (or something)?

var Control = Class.create(ProtoWidget, {
	klass 			: "Control",
	isAControl		: true,					// for duck typing

	// value/reference properties
	value			: undefined,			// current value of the control
	reference		: undefined,			// reference in our controller.value used to obtain our value
											// TODOC: either a string or a function
	
	name			: "",					// name of this control

	label			: undefined,			// label for our control  (set to a function for dynamic label)
	labelSuffix		: ":",					// text tacked on after the label

	info			: undefined,			// Info message to show for the control 
											// -- will be added to label if drawn automatically.
											// Will be interpolated with this before being shown.
	enableIf		: undefined,			// function which tells us dynamically if we're enabled or not
	showIf			: undefined,			// function which tells us dynamically if we're visible or not
	
	emptyMeansNull	: false,				// if true, an empty string value will be mapped to null


	// appearance properties

	className		: "Control",			// css class name of outer element
	style			: "",					// css style of outer element
	attributes		: "",					// element attributes for our outer element
	tabIndex		: undefined,			// tab index for tabbing through controls
	
	showErrorIcon	: true,					// if true, show an error icon next to the field
											// which will show up if there's a problem


	

	eventHandlers	: "onChange",	// list of event handlers to hook up in element on draw
	
	// validation properties
	minLength		: undefined,
	maxLength		: undefined,

	tooLongMessage	: "Value must be less than #{maxLength} letter(s) long.",
	tooShortMessage	: "Value must be at least #{minLength} letter(s) long.",

	invalidMessage	: undefined,			// Message to show if the value cannot be validated.
											// If not provided, we'll try this.info as well.
											// Will be interpolated with this before being shown.

											// Message to show if value is too long.
											// Will be interpolated with this before being shown.
	
	pattern			: undefined,			// Regular Expression which will be used to validate the value
											// ( see control.validate() )

	trimWhitespace	: true,					// if true, we trim whitespace from field silently
	

	$element		: undefined,			// node that we actually update (eg: the actual <INPUT> etc
	$label			: undefined,			// node that represents our label


	


	//
	//	value getting/setting
	//
	
	// update the control according to its reference
	update : function(clearError) {
		var value = this.value;
		if (this.reference) {
			value = this.controller.getControlValue(this);
		}
		this.setValue(value, true);
		if (typeof this.label == "function") this.drawLabel();

		if (clearError) this.clearError();
	},


	setValue : function(value, updateElement) {
		this.value = value;
		if (updateElement != false) this.setElementValue(value);
	},
	

	// save the value (by having our controller do the work)
	//	also updates our visual value in case the controller morphed the value
	saveValue : function(value) {
		try {
			value = this.controller.setControlValue(this, value);
		} catch (e) {
			console.warn(e.message);	// TOTHROW
			return;
		}
		
		// remember the value (and update the element in case the value changed)
		this.setValue(value, true);
	},
	
	
	// RENAME: to "updateElement" ?
	setElementValue : function(value) {
		if (this.$element) this.$element.value = this.toDisplayValue(value);
	},
	
	getElementValue : function(element) {
		if (!element) element = this.$element;
		if (!element) return undefined;
		
		var value = element.value;
		
		// trim whitespace here if desired
		if (this.trimWhitespace) {
			var trimmed = value.strip();
			if (trimmed != value) element.value = value = trimmed;
		}
		
		return this.fromDisplayValue(value);
	},


	// transform an internal value to value actually displayed in the element
	toDisplayValue : function(value) {
		return value;
	},
	
	// transform value from the element to internal value
	fromDisplayValue : function(value) {
		return value;
	},


	// standard event handlers

	// change calls validate() which will throw an exception if the number could not be validated
	onChange : function(event, element) {
		var newValue = this.getElementValue(element),
			error,
			validated
		;
		// try and validate the value
		//	if not valid, we will get an exception at either WARNING or ERROR level
		//	If it's a WARNING, error.newValue will be a valid value
		try {
			this.clearError();
			validated = this.validate(newValue);

			// check max and min lengths
			if (typeof validated == "string") {
				if (this.maxLength && validated.length > this.maxLength) {
					throw new ValidationWarning(this, this.tooLongMessage, 
												validated.substring(0, this.maxLength)
							  				  );
				}
				
				if (this.minLength && validated.length < this.minLength) {
					throw new ValidationError(this, this.tooShortMessage);
				}
			}

			// TODO: check required
			
		} catch (error) {
			this._error = error;
			
			// default the error message
			var message = error.message || this.invalidMessage || this.info || "";
			// and interpolate it through us to catch any dynamic properties in the message
			error.message = message.interpolate(this);

			if (error.level == DynaForm.WARNING) {
				this.showWarning(error);
				validated = error.newValue;
			} else {
				this.showError(error);
				validated = (error.newValue !== undefined ? error.newValue : newValue);
			}
		}
		
		this.saveValue(validated);

		// if there was a warning, select the field again to give them a chance
		//	to change the value we put in there
		if (this._error) {
			if (element.select) 	(function(){ try {element.focus();element.select()} catch (e) {} }).delay(0);
			else if (element.focus) (function(){ try {element.focus();} catch (e) {} }).delay(0);
		}
		return true;
	},	
	
	
	clearError : function() {
		delete this._error;
		this.toggleParentClass("Error", false);
		this.toggleParentClass("Warning", false);
	},
	
	showWarning : function(error) {
//		return this.controller.addError(error);
		var parent =  $(this.$main.parentNode);
		var originalColor = parent.getStyle("background-color");
		this.toggleParentClass("Warning", true);
		var highlightColor = parent.getStyle("background-color");

		function flashWarn() {
			this.toggleParentClass("Warning", false);
			new Effect.Highlight(parent, {
				startcolor	 : highlightColor,
				endColor	 : originalColor,
				afterFinish : function(){parent.style.backgroundColor=""}
			});
		}
		this.controller.flashMessage(error.message, flashWarn.bind(this));
	},
	
	showError : function(error) {
//		this.controller.addError(error);
		this.controller.flashMessage(error.message);
		this.toggleParentClass("Error", true);
	},
	
	
	//
	//	validate value
	//

	//	Try to validate the value.
	//	If the value is OK, just return the value.
	//
	//	If the value is invalid but can reasonably be transformed to a correct value:
	//	  	throw new VaildationWarning(this, <error message>, <newValue>)
	//	
	//	If the value is just not acceptable in some way:
	//		throw new ValidationError(this, <error message>)
	//
	//	Default behavior is to check against a 'validator' regular expression if provided.
	//
	validate : function(newValue) {
		// if there is a pattern RE, try to match that
		if (this.pattern && typeof newValue == "string") {
			var match = (""+newValue).match(this.pattern);
			if (!match) throw new ValidationError(this);

			// return the parenthesized value in the expression if there was one
			var valid = match[1] || match[0];
			if (valid != newValue) throw new ValidationError(this, valid);
		}

		return newValue;
	},


	//
	//	enable/disable
	//
	enable : function($super) {
		if (this.$element) this.$element.removeAttribute("disabled");
		return $super();
	},
	
	disable : function($super) {
		if (this.$element) this.$element.setAttribute("disabled", true);
		return $super();
	},


	//
	//	show/hide
	//
	show : function($super) {
		$super();
		if (this.$label) 	this.$label.show();
	},

	hide : function($super) {
		$super();
		if (this.$label) 	this.$label.hide();
	},

	
	//
	//	controller/dependent fields
	//
	
	// initialize us in the context of our controller
	setController : function(controller) {
		this.controller = controller;
		this.controller.registerControl(this.name || this.id, this);
	},
	
	
	//
	//	drawing
	//
	
	prepareToDraw : function() {
		// set up attributes
		var attributes = "id='" + this.id + "' ";
		if (this.reference && typeof this.reference != "function") 		
									attributes += "reference='"+this.reference+"'";
		if (this.className) 		attributes += "class='"+this.className+"' ";
		if (this.style) 			attributes += "style='"+this.style+"' ";
		if (this.name)			 	attributes += "name='"+this.name+"' ";
		if (this.tabIndex != null) 	attributes += "tabindex='"+this.tabIndex+"' ";
		if (this.enabled != true)	attributes += "disabled='true' ";
		if (this.maxLength != null)	attributes += "maxlength='"+this.maxLength+"' ";
		if (this.attributes) 		attributes += this.attributes;
		
		this._attributes = attributes;
		
		// set up event handlers to point back to us
		if (this.eventHandlers) {
			var names = $w(this.eventHandlers);
			var handlers = "";
			names.forEach(function(eventName) {
				eventName = eventName.split(":");
				var handlerName = (eventName[1] || eventName[0]);
				eventName = eventName[0].toLowerCase();
				
				handlers += eventName + "='return " + this.globalRef + "."+handlerName+"(Event.extend(event||window.event), this)' ";
			}, this);
			this._eventHandlers = handlers;
		}
	},
	
	onDraw : function(parent) {
		this.$main = Element.htmlToElements(this.getHTML())[0];

		// if an element with this id already exists on the page,
		//	replace it with our main element
		var element = $(this.id);
		if (element) {
			element.parentNode.replaceChild(this.$main, element);
		} else {
			parent.appendChild(this.$main);
		}
		
		this.drawLabel();
	},
	
	onAfterDraw : function() {
		this.$element = this.$main;	
	},
	
	getHTML : function() {
		if (this.showErrorIcon) 
			this._ErrorIconHTML = this.ErrorIconTemplate.evaluate(this);
		return this.OuterTemplate.evaluate(this);
	},
	
	onRedraw : function() {},
	prepareToRedraw : function() {},
	onAfterRedraw : function() {},
	onResize : function() {},
	
	toggleParentClass : function(className, toAdd) {
		var parent = $(this.$main.parentNode);
		if (toAdd == undefined) toAdd = !(parent.hasClassName(className));
		
		if (toAdd) 	parent.addClassName(className);
		else		parent.removeClassName(className);

		// see if we have a label
		//	if so, add or remove from their parent node as well
		if (this.$label) {
			parent = $(this.$label.parentNode);
			if (toAdd) 	parent.addClassName(className);
			else		parent.removeClassName(className);
		}
	},
	
	
	// if we have a label, try to set it up dynamically
	drawLabel : function() {
		if (!this.label) return;
		
		// if we don't already have a pointer to our label element, try to find one
		if (!this.$label) this.$label = $(this.id + "_label");
		
		// if we couldn't find one, forget it
		if (!this.$label) return;
		
		this._label = {
			className 	: "Label",
			value 		: (typeof this.label == "string" 
								? this.label.interpolate(this)
								: this.label(this.controller, this.controller.value)
						  )
		};
		if (this._label.value && this.labelSuffix) this._label.value += this.labelSuffix;
		
		if (this.info) {
			this._label.info  = this.info.interpolate(this);
			this._label.className += " InfoLabel";
		}

		var label = Element.htmlToElements(this.LabelTemplate.evaluate(this))[0];
		this.$label.parentNode.replaceChild(label, this.$label);
		this.$label = label;
	},

	LabelTemplate : new Template(
		"<span class='#{_label.className}' for='#{id}' title='#{_label.info}'>#{_label.value}</span>"
	),
	
	
	onErrorIconClick : function() {
		alert(this.info.interpolate(this));
	},
	
	ErrorIconTemplate : new Template(
		"<span class='ErrorIcon'\
		 ></span>"
	),
// stick the following in the ErrorIconTemplate to receive clicks
//			onclick='#{globalRef}.onErrorIconClick()'\

// stick the follwing in the ErrorIconTemplate to do rollover on the ErrorIcon
//			onmouseover='$(this).addClassName(\"Over\")'\
//			onmouseout='$(this).removeClassName(\"Over\")'\
	
	
	hasSimpleReference : function() {
		return 	   this.reference
				&& typeof this.reference != "function" 
				&& this.reference.indexOf(".") == -1 
				&& this.reference.indexOf("(") == -1	
				&& typeof this.label != "function"
	}	
});


////////////
//
//	Output -- dynamic output
//
//	TODO:	replace entire outer template?
//
////////////
var Output = Class.create(Control, {
	klass			: "Output",
	className		: "Output",
	tagName			: "span",
	
	// no events
	eventHandlers	: undefined,
	
	setElementValue : function(value) {
		if (this.$element) this.$element.innerHTML = this.toDisplayValue(value);
	},
	
	getElementValue : function(element) {
		return this.value;
	},
	
	OuterTemplate : new Template(
		"<#{tagName} #{attributes}></#{tagName}>"
	)
});



////////////
//
//	TextField -- encapsulates a normal input	
//
// TODO: do the keypress change thing here
//
////////////
var TextField = Class.create(Control, {
	klass 			: "TextField",
	className 		: "TextField",
	type			: "text",
	
//	returnEqualsTab : (Prototype.Browser.Gecko == true),
	
	// fire the onChange handler on blur just in case
    // NO DON'T!  Messes up cancel if any fields are wonky.  Handle it in 
    // form or controls overriding validate functions
    //	eventHandlers	: "onblur:onChange",// onkeydown:onKeyDown",

	// transform an internal value to value actually displayed in the element
	toDisplayValue : function(value) {
		if (value == null) value = "";
		return value;
	},
	
	// transform value from the element to internal value
	fromDisplayValue : function(value) {
		if (value == "" && this.emptyMeansNull) value = null;
		return value;
	},
	
//	onKeyDown : function(event, element) {
//		if (event.keyCode == 13 && this.returnEqualsTab) event.keyCode = 9;
//		return true;
//	},

	onAfterDraw : function() {
		this.$element = this.$main.select("INPUT")[0];
		
		// if we have info and an ErrorIcon, hook our parent element up
		//	to show rollovers
//		if (this.showErrorIcon && this.info) {
//			var parent = $(this.$main.parentNode);
//			parent.observe("mouseover", function(){ $(this).addClassName("ParentOver")});
//			parent.observe("mouseout",  function(){ $(this).removeClassName("ParentOver")});
//		}
	},
	
	OuterTemplate : new Template(
		"<span style='white-space:nowrap'>\
			<input type='#{type}' #{_attributes} #{_eventHandlers}>\
			#{_ErrorIconHTML}\
		</span>"
	)
});


////////////
//
//	RestrictedField
//		Restrict field to a certain set of characters.
//		Default chars are alpha-numeric and "_" .
//
//		TODO: have keypress handler which only lets these chars through
//
////////////
var RestrictedField = Class.create(TextField, {
	klass 			: "RestrictedField",
	
	restrictedChars : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890_",
	replacementChar	: "_",
	
	validate : function($super, newValue) {
		newValue = $super(newValue);

		if (newValue == null || newValue == "") return newValue;
		
		var valid = [],
			len = newValue.length
		;
		if (this.maxLength) len = Math.min(len, this.maxLength);
		
		for (var i = 0; i < len; i++) {
			var it = newValue.charAt(i);
			if (this.restrictedChars.indexOf(it) == -1) it = this.replacementChar;
			valid[i] = it;
		}
		valid = valid.join("");
		if (valid != newValue) throw new ValidationWarning(this, null, valid);
		return newValue;
	}
	
});


////////////
//
//	IntegerField
//
//	TODO: error messages if not valid
//
////////////
var IntegerField = Class.create(TextField, {
	klass 			: "IntegerField",
	
	commaize		: false,
	
	maxValue		: undefined,
	minValue		: undefined,
	
	label			: "Value",
	
	invalidMessage	: "#{label} must be a number between #{_minValue} and #{_maxValue}",

	initialize : function($super, arg1, arg2, arg3) {
		$super(arg1, arg2, arg3);

		// set max/min value so that our error message comes out right
		if (this.minValue != undefined) this.setMinValue();
		if (this.maxValue != undefined) this.setMaxValue();

		if (!this.info) this.info = this.invalidMessage;
	},
	
	validate : function(value) {
		if (isNaN(value)) 
			throw new ValidationWarning(this, null, this.value);
		
		if (this.minValue != null && value < this.minValue)
			throw new ValidationWarning(this, null, this.minValue);
		
		if (this.maxValue != null && value > this.maxValue)
			throw new ValidationWarning(this, null, this.maxValue);

		return value;
	},

	toDisplayValue : function(value) {
		value = parseInt(value);
		if (this.commaize) return value.commaize();
		return value;
	},
	
	fromDisplayValue : function(value) {
		value = value.toLowerCase();
		if (this.commaize) value = value.split(",").join("");
		
		if (value.indexOf("k") > -1) 		return parseInt(value) * Math.k;
		else if (value.indexOf("m") > -1) 	return parseInt(value) * Math.m;
		else if (value.indexOf("b") > -1) 	return parseInt(value) * Math.b;
		else if (value.indexOf("t") > -1)	return parseInt(value) * Math.t;
		
		return parseInt(value);
	},
	
	setMaxValue : function(max) {
		if (max != undefined) this.maxValue = max;
		if (typeof this.maxValue == "number") 
			this._maxValue = this.toDisplayValue(this.maxValue);
	},
	
	setMinValue : function(min) {
		if (min != undefined) this.minValue = min;
		if (typeof this.minValue == "number") 
			this._minValue = this.toDisplayValue(this.minValue);
	}
});


////////////
//
//	BytesField
//
//	TODO: error messages if not valid  (check for NaN)
//
////////////
var BytesField = Class.create(IntegerField, {
	klass 			: "BytesField",
	
	precision		: 2,
	showSuffix		: true,
	
	scaleFactor		: 1,			// eg: set to Math.MB to scale value to/from megabytes

	invalidMessage	: "#{label} must be a number of bytes between #{_minValue} and #{_maxValue}",

	toDisplayValue : function(value) {
		value = (value || 0) * this.scaleFactor;
		
		return value.toBytesString(this.precision);
	},
	
	fromDisplayValue : function(value) {
		value = value.fromBytesString();
		return value / this.scaleFactor;
	}
});



////////////
//
//	PasswordField
//
////////////
var PasswordField = Class.create(TextField, {
	klass 			: "PasswordField",
	type 			: "password"
});



////////////
//
//	HiddenField
//
////////////
var HiddenField = Class.create(TextField, {
	klass 			: "HiddenField",
	type 			: "hidden",
	eventHandlers 	: undefined
});




////////////
//
//	Checkbox
//
////////////
var Checkbox = Class.create(TextField, {
	klass 			: "Checkbox",
	className		: "Checkbox",
	type			: "checkbox",
	
	showErrorIcon	: false,
	trueValue		: true,						// value we hold when considered 'true'
	falseValue		: false,					// value we hold when considered 'false'

	// IE doesn't fire 'change' event until focus leaves the radio button
	//	so use the 'onClick' event to fire 'onChange'
	eventHandlers	: (Prototype.Browser.IE ? "onclick:onChange" : "onChange"),


	//
	//	value
	//
	setElementValue : function(value) {
		if (!this.$element) return;
		this.$element.checked = (value == this.trueValue);
	},

	getElementValue : function(element) {
		if (!element) element = this.$element;
		if (element) return (element.checked ? this.trueValue : this.falseValue);
	}
});
var CheckBox = Checkbox;




////////////
//
//	RadioButton
//
////////////
var RadioButton = Class.create(Checkbox, {
	klass 			: "RadioButton",
	className		: "RadioButton",
	type			: "radio",
	
	group			: undefined,				// name of related radio buttons
	
	trueValue		: true,						// value we hold when considered 'true'
	falseValue		: false,					// value we hold when considered 'false'
		
	prepareToDraw : function($super) {
		$super();
		if (this.group) this._attributes += " name='"+this.group+"' ";
	}
	

});



////////////
//
//	Select  (single)
//
//	TODO: 	- syntax for option labels
//			- option labels
//
////////////
var Select = Class.create(Control, {
	klass			: "Select",
	className		: "Select",
	
	options			: undefined, // list of options, either:
      //		{value:title} map, or
      //		[value,value,value]
      //
      // NOTE: don't access this directly, instead use
      //	select.getOptions() to get a normalized list of
      //		[ {value:x,title:y}, {value:x,title:y} ]
      optionClasses  : undefined,
      defaultOptionClass: "normalOption",
      optionColours : undefined,
      defaultOptionColour: "333333",
      onAfterDraw : function() {
		this.$element = this.$main.select("SELECT")[0];	
	},

	//
	//	value
	//
	setElementValue : function(value) {
		if (!this.$element) return;
		this.$element.selectedIndex = this.indexOf(value);
	},

	getElementValue : function(element) {
		if (!element) element = this.$element;
		if (element) return this.valueOf(element.selectedIndex);
	},


	//
	//	options
	//
	getOptions : function() {
		if (!this.options) return [];
		if (this._options) return this._options;
		
		var normalized = this._options = [];
		if (Object.isArray(this.options)) {
			this.options.forEach(function(value) {
				normalized.push({value : value, title : value});
			});
		} else {
			for (var value in this.options) {
				var classname = this.defaultOptionClass;
				var colour    = this.defaultOptionColour;
				if (this.optionClasses != undefined) {
					if (this.optionClasses[value] != undefined) {
						classname = this.optionClasses[value];
					}
				}
				if (this.optionColours != undefined) {
					if (this.optionColours[value] != undefined) {
						colour = this.optionColours[value];
					}
				}
				normalized.push(
				{
					value     : value, 
					title     : this.options[value],
					classname : classname,
					colour    : colour
				});
			}
		}
		return normalized;
	},	

	// return the index in the (normalized) options array for the specified value
	indexOf : function(value) {
		var options = this.getOptions();
		for (var i = 0, len = options.length; i < len; i++) {
			if (options[i].value == value) return i;
		}
		return -1;
	},

	// return the value at a particular index
	valueOf : function(index) {
		var options = this.getOptions();
		if (!options[index]) return undefined;
		return options[index].value;
	},
	
	// return the title of a particular index
	titleOf : function(index) {
		var options = this.getOptions();
		if (!options[index]) return undefined;
		return options[index].title;
	},


	//
	//	drawing
	//

	prepareToDraw : function($super) {
		$super();
		
		var html = "";
		this.getOptions().forEach(function(option) {
			this._option = option;
			html += this.OptionTemplate.evaluate(this);
		}, this);

		this._optionsHTML = html;
	},
	
	
	OuterTemplate : new Template(
		"<span style='white-space:nowrap'>\
			<select #{_attributes} #{_eventHandlers}>\
				#{_optionsHTML}\
			</select>\
			#{_ErrorIconHTML}\
		</span>"
	),
	
	OptionTemplate : new Template(
		"<option value='#{_option.value}'>#{_option.title}</option>"
	)

});



////////////
//
//	Button		--  'value' is the title of the button
//
////////////
var Button = Class.create(Control, {
	klass			: "Button",
	className		: "Button",
	
	// no events
	eventHandlers	: "onclick:onActivate",
	
	setElementValue : function(value) {
		if (this.$element) this.$element.innerHTML = this.toDisplayValue(value);
	},
	
	getElementValue : function(element) {
		return this.value;
	},
	
	OuterTemplate : new Template(
		"<button #{_attributes} #{_eventHandlers}>#{value}</button>"
	)
});





////////////
//
//	HBarGraph		-- shows items as percentages of a total value
//
////////////
var HBarGraph = Class.create(Control, {
	klass 		: "HBarGraph",
	className	: "UsageGraph HBarGraph",
	
	reference	: function(){},			// no-op reference just so we are always updated
	
	items 		: undefined,			// [ {reference : <ref>, title:"", color:""}, ... ]
	
	showLegend 	: true,
	showSizes	: true,
	
	
	// update to reflect the current values
	setElementValue : function() {
		this.getCurrentValues();
		this.items.forEach(function(item) {
			// set the segment width, segment title, displayValue
			if (item.$segment) {
				item.$segment.style.width = item._width + "%";
				item.$segment.setAttribute("title", item._info);
			}
			if (item.$display) {
				item.$display.innerHTML = item._displayValue;
			}
		}, this);
	},
	
	// go through the items getting the current values
	getCurrentValues : function() {
		var total = 0,
			totalItem = -1
		;
		this.items.forEach(function(item, index) {
			if (item.isTotal) {
				totalItem = index;
				return;
			}
			var value = item._value = this.controller.getControlValue(item);
			item._displayValue = this.toDisplayValue(value);
			total += value;

			// get the info title 
			this._item = item;
			item._info = this.SegmentInfoTemplate.evaluate(this);

		}, this);
		
		if (totalItem != -1) {
			var totalItem = this.items[totalItem];
			totalItem._value = total;
			totalItem._displayValue = this.toDisplayValue(total);
		}
		
		// calculate the widths of each item as a percentage
		this.items.forEach(function(item) {
			if (item.isTotal) return;
			item._width = Math.round(item._value * 100 / total);
		}, this);
	},
	

	prepareToDraw : function() {
		this._segmentsHTML = "";
		this._legendItemsHTML = "";

		this.items.forEach(function(item, index) {
			item.index = index;
			this._item = item;
			
			if (!item.isTotal) {
				this._segmentsHTML += this.SegmentTemplate.evaluate(this);
				this._legendItemsHTML += this.LegendColorKeyTemplate.evaluate(this);
			}
			this._legendItemsHTML += this.LegendItemTemplate.evaluate(this);
		}, this);

		this._barHTML = this.BarTemplate.evaluate(this);
		this._legendHTML = this.LegendTemplate.evaluate(this);
	},
	
	onAfterDraw : function() {
		this.$element = this.$main;	

		// cache the segment and displayValue elements
		var segments = this.$main.select(".BarSegment");
		segments.forEach(function(segment) {
			var item = this.items[parseInt(segment.getAttribute("item"))];
			item.$segment = segment;
		}, this);

		var displays = this.$main.select(".DisplayValue");
		displays.forEach(function(display) {
			var item = this.items[parseInt(display.getAttribute("item"))];
			item.$display = display;
		}, this);
	},
	
	OuterTemplate : new Template(
		"<div class='#{className}'>\
			#{_barHTML}\
			#{_legendHTML}\
		</div>"
	),
	

	// usage bar
	BarTemplate : new Template(
		"<table class='BarTable' cellspacing=0 cellpadding=0>\
			<tr>\
				#{_segmentsHTML}\
			</tr>\
		</table>"
	),
	
	SegmentTemplate : new Template(
		"<td class='BarSegment' item='#{_item.index}' style='background-color:#{_item.color};'>\
			<div></div>\
		</td>"
	),
	
	SegmentInfoTemplate : new Template(
		"#{_item.title} : #{_item._displayValue}"
	),


	// legend
	LegendTemplate : new Template(
		"<table class='LegendTable' round='large' cellspacing=0 cellpadding=0>\
			<tr>\
				#{_legendItemsHTML}\
			</tr>\
		</table>"
	),
	
	LegendColorKeyTemplate : new Template(
		"<td class='LegendSeparatorTd'><div></div></td>\
		 <td class='ColorKeyTd'>\
			<div class='ColorKey' style='background-color:#{_item.color};'></div>\
		 </td>"
	),
	
	LegendItemTemplate : new Template(
		"<td class='ItemLabelTd'>\
			<span class='Title'>#{_item.title}</span>\
			<br>\
			<span class='DisplayValue' item='#{_item.index}'></span>\
		</td>"
	
	)
});
