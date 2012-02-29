/*	Form extras, for doing things "the MapR way".

	NOTE:  This is included by default on the main page.

	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");

//
// Additions to all Ext.form.BasicForm instances
//
Ext.apply(Ext.form.BasicForm.prototype, {

	// show/hide generic error fields (use xtype "formerror" for your error fields)
	showError : function(error, fieldName) {
		var errorField = this.findField(fieldName || "formError");
		if (error) {
			errorField.show().setValue(error);
		} else {
			errorField.hide().setValue("");
		}
	},
	
	// hide a specific "formerror" type field
	hideError : function(fieldName){
		var field = this.findField(fieldName);
		if (field) field.hide();
	},

	// hide all "formerror"-type fields
	hideErrors : function() {
		var items = this.items.items, item, i = -1;
		while (item = items[++i]) {
			if (item.xtype === "formerror") {
				item.hide();
//				this.findField(item.name).hide();
			}
		}
	},
	
	
	// override "add" to set the items.form to us
	add : function(){
		var items = Array.prototype.slice.call(arguments, 0);
		this.items.addAll(items);
		Ext.each(items, function(it) {
			it.form = this;
		}, this);
		return this;
	},
	
});


//
// Additions to all Ext.form.Field instances
//
Ext.apply(Ext.form.Field.prototype, {
	msgTarget : "under"
});



Ext.form.Checkbox.prototype.setBoxLabel = function(label) {
	this.boxLabel = label;
	if (!this.container) return;
	var el = this.container.child("label", true);
	if (el) el.innerHTML = label;
}


// override CompositeField.onRender to NOT try to subsume the "label" 
//	'cause that is messing up the Filter checkbox
Ext.form.CompositeField.prototype.onRender = function(ct, position) {
	if (!this.el) {
		/**
		 * @property innerCt
		 * @type Ext.Container
		 * A container configured with hbox layout which is responsible for laying out the subfields
		 */
		var innerCt = this.innerCt = new Ext.Container({
			layout  : 'hbox',
			renderTo: ct,
			items   : this.items,
			cls	 : 'x-form-composite',
			defaultMargins: '0 3 0 0'
		});

		this.el = innerCt.getEl();

		var fields = innerCt.findBy(function(c) {
			return c.isFormField;
		}, this);

		/**
		 * @property items
		 * @type Ext.util.MixedCollection
		 * Internal collection of all of the subfields in this Composite
		 */
		this.items = new Ext.util.MixedCollection();
		this.items.addAll(fields);

		//if we're combining subfield errors into a single message, override the markInvalid and clearInvalid
		//methods of each subfield and show them at the Composite level instead
		if (this.combineErrors) {
			this.eachItem(function(field) {
				Ext.apply(field, {
					markInvalid : this.onFieldMarkInvalid.createDelegate(this, [field], 0),
					clearInvalid: this.onFieldClearInvalid.createDelegate(this, [field], 0)
				});
			});
		}

		//set the label 'for' to the first item
		// HACK: skip this if "eatLabel" is false
		if (this.eatLabel != false) {
			var l = this.el.parent().parent().child('label', true);
			if (l && this.items.items[0] && this.items) {
				l.setAttribute('for', this.items.items[0].id);
			}
		}
	}

	Ext.form.CompositeField.superclass.onRender.apply(this, arguments);
};



//
// special types of form widgets
//


// FormError:  hidden field used for showing errors
// TODO: how to hide automatically?
mapr.widgets.FormErrorField = Ext.extend(Ext.form.DisplayField, {
	hidden : true,
	itemCls : "form-error-container",
	msgTarget : "under",
	getRawValue : function() {	return null }
});
Ext.reg("formerror", mapr.widgets.FormErrorField);



// FormHeader:  header-look label in forms
mapr.widgets.FormHeader = Ext.extend(Ext.form.Label, {
	cls : "form-header"
});
Ext.reg("formheader", mapr.widgets.FormHeader);


// FormHint:  smaller hint text to show above or below a field
//				based on DisplayField, so use .value for text
//				Also, use .hideLabel if you want it to be full-width.
//
//				set .beside  == true to display beside the field
//				(use a compositefield with the field to lay beside)
mapr.widgets.FormHint = Ext.extend(Ext.form.DisplayField, {
	cls : "form-hint",
	besideCls : "form-hint-side",
	beside : false,
	getRawValue : function() {	return null },
	
	constructor : function() {
		mapr.widgets.FormHint.superclass.constructor.apply(this, arguments);
		if (this.beside) this.cls = this.besideCls;
	}
});
Ext.reg("formhint", mapr.widgets.FormHint);



// FormSpacer:  header-look label in forms
mapr.widgets.FormSpacer = Ext.extend(Ext.form.Label, {
	cls : "form-header"
});
Ext.reg("formheader", mapr.widgets.FormHeader);



// BoxField:  Display field which draws a box around itself.
//				use: 		row:[top|middle|bottom|single]   to control borders
//							align:[left|center|right] to control sizing
mapr.widgets.FormBoxField = Ext.extend(Ext.form.DisplayField, {
	margins : "0 0 0 0",
	row  : "top",		// "top", "middle", "bottom", "single"
	align : "center",	// "left", "center", "right"
	
	// units for displaying with the value
	units : "",
	
	constructor : function() {
		mapr.widgets.FormBoxField.superclass.constructor.apply(this, arguments);

		// set alignment
		this.cls = this.cls + " "+this.align+"-align";

		// set row
		this.cls = this.cls + " form-box " + this.row;
	},
	
	setValue : function(v) {
		this.setRawValue(v + this.units);
	}
});
Ext.reg("formbox", mapr.widgets.FormBoxField);


// BoxContainer:  Composite which surrounds a set of BoxFields
mapr.widgets.BoxContainer = Ext.extend(Ext.form.CompositeField, {
	defaultMargins : "0 0 0 0",
	itemCls  : "form-box-container"
});
Ext.reg("formboxcontainer", mapr.widgets.BoxContainer);



// fire change event if current field value is different from field.startValue
// NOTE: resets field.startValue !!!  THIS MAY BE DANGEROUS!!!
function changeIfDifferent() {
	var v = this.getValue();
	if(String(v) !== String(this.startValue)){
		this.fireEvent('change', this, v, this.startValue);
		this.startValue = v;
	}
}


// ChangeOnKeyPress plugin -- fires change event for text fields after a short delay
mapr.widgets.ChangeOnKeyPress = Ext.extend(Object, {
	changeDelay : 1000,

	init : function(field) {
		this.field = field;
		this.field.enableKeyEvents = true;
		var delay = field.changeDelay || this.changeDelay;

		// fire change if the field value actually has changed
		field.on("keyup", changeIfDifferent, field, {buffer:delay});
	}
});
Ext.preg("changeonkeypress", mapr.widgets.ChangeOnKeyPress);



// QuickChangeField -- text field or select which calls it 'owner's onFieldChanged 
//	as keys are pressed.
mapr.widgets.QuickChangeField = Ext.extend(Object, {
	changeDelay : 100,
	init : function(field) {
		this.field = field;
		this.field.enableKeyEvents = true;
		var delay = field.changeDelay || this.changeDelay;

		// fire change if the field value actually has changed
		field.on("keyup", changeIfDifferent, field, {buffer:delay});
		
		// set our 'change' event to notify our 'owner'
		function onChange() {
			this.owner.onFieldChanged(this, this.getValue());
		}
		field.on("change", onChange, field);
		
		// if a combobox, hook up the 'select' event as well
		if (field instanceof Ext.form.ComboBox) {
			field.on("select", onChange, field);
		}
		
	}
});
Ext.preg("quickchange", mapr.widgets.QuickChangeField);




// QuickChangeField -- text field or select which calls it 'owner's onFieldChanged 
//	as keys are pressed.
mapr.widgets.RemoteValidation = {
	validationDelay : 750,
	
	init : function(field) {
		Ext.apply(field, this.defaults);
	},
	
	defaults : {
		// (REQUIRED) api call to execute for the validation call
		//	should be an object with an "execute" command
//		validationApi : undefined,

		// (REQUIRED) function to return request parametrs for validation call
		//	signature:  newValue
//		getRequestParams : undefined,

		// specify why the field is invalid with field.invalidText
//		invalidText : undefined,
		
		// function to process the JSON reply and return true if the field is valid
		//	signature:  whatever your default api.defaults.onSuccess returns
		//	default is just to return the first parameter
//		replyIsValid : undefined,
		
		validator : function(newValue) {
			var field = this;
			if (!this._validateTask) {
				function onReply(reply) {
					isValid = (field.replyIsValid ? field.replyIsValid(reply) : reply);

					if (isValid) {
						field.clearInvalid();
					} else {
						field.markInvalid(field.invalidText);					
					}
					if (field.onReply) field.onReply(isValid);
				}

				function doValidation() {
					var options = {
						scope : field,
						onReply : onReply,
						params : field.getRequestParams(field._checkValue)
					};
					field.validationApi.execute(options);
				}
			
				this._validateTask = new Ext.util.DelayedTask(doValidation, this);
			}
			if (newValue == "" || newValue == this._checkValue) {
				this._validateTask.cancel();
			} else {
				this._validateTask.delay(mapr.widgets.RemoteValidation.validationDelay);
			}
			this._checkValue = newValue;
			
			// return true since we don't know if the field is valid or not
			return true;
		}
	}
};
Ext.preg("remotevalidation", mapr.widgets.RemoteValidation);


// checkbox which represents a "flag"
//	(generally 0 == off, 1 = on; set trueValue and falseValue to change this)
mapr.widgets.FlagCheckbox = Ext.extend(Ext.form.Checkbox, {
	trueValue : 1,
	falseValue : 0,
	
	// return the trueValue or falseValue
	getValue : function() {
		var checked = (this.rendered ? this.el.dom.checked : this.checked);
		return (checked ? this.trueValue : this.falseValue);
	},
	
	// if value is set to non-boolean, set checkbox to true if value == this.trueValue
	setValue : function(value) {
		if (typeof value != "boolean") value = value == this.trueValue;
		return mapr.widgets.FlagCheckbox.superclass.setValue.call(this, value);
	}
});
Ext.reg("flag", mapr.widgets.FlagCheckbox);



// form widget which shows an enumerated value as an icon
//	set widget.options to key->iconCls
mapr.widgets.FormIcon = Ext.extend(Ext.form.DisplayField, {
	// map of value=> icon class
	options : ["off","on"],

	width: 16,

	onRender : function(ct, position) {
		mapr.widgets.FormIcon.superclass.onRender.apply(this, arguments);
		this.icon = Ext.DomHelper.append(ct, 
			{	tag:"span", cls:"mapr-icon"	}, 
			true
		);
	},
	
	// if value is set to non-boolean, set checkbox to true if value == this.trueValue
	setValue : function(value) {
		var cls = this.options[value] || "";
		this.icon.set({"class":"mapr-icon icon-"+cls});
	}
});
Ext.reg("formicon", mapr.widgets.FormIcon);


// heartbeat display
mapr.widgets.HeartbeatDisplay = Ext.extend(Ext.form.DisplayField, {
	align : "right",
	setValue : function(value) {
		if (value < 120) {
			value = value + "s ago";
		} else {
			value = Math.round((value/60)) + "m ago";
		}
		this.setRawValue(value);
	}
});
Ext.reg("heartbeat", mapr.widgets.HeartbeatDisplay);


// "formtable": table for showing a bunch of record values in a graphical table
//
// NOTE: you must set formtable.owner, which must have owner.getRecord() which returns
//			simple object to get values from
mapr.widgets.FormTable = Ext.extend(Ext.form.Field, {
	hideLabel : true,
	
	// <rows> is a list of:
	//	["headerRowLabel", 	"colHeader1", "colHeader2", "colHeader3"...]
	//	["rowLabel", 		"colField1",  "colField2",  "colField3"...]
	//	["rowLabel", 		"colField1",  "colField2",  "colField3"...]
	//	...
	rows : undefined,

	// <widths> is either:
	//	- a single width (int) to apply to all cells, or
	//	- an array of widths for each cell
	widths: 100,
	
	// function which gets the record to use for determining values
	getRecord : function() {
		return this.owner.record;
	},
	
	// value is the percent
	setValue : function() {
		var record = this.getRecord();
		
		var cols = this.rows[0].length, widths = this.widths;
		// spread widths out per column
		if (typeof this.widths == "number") {
			this.widths = [];
			for (var c = 0; c < cols; c++) this.widths[c] = widths;
			this.widths = widths;
		}
		
		var output = "<table class='form-table'>", value;
		for (var r = 0; r < this.rows.length; r++) {
			var row = this.rows[r], cellTag = (r==0 ? "th" : "td");
			if (!row) return;
			
			// output the row label
			output += "<tr class='form-table-row'>"
						+"<"+cellTag+" class='form-table-label' style='width:"+widths[0]+"px'>"
							+row[0]
						+"</"+cellTag+">";
			
			for (var c = 1; c < row.length; c++) {
				var cell = row[c];
				if (typeof cell == "function") {
					cell = cell.apply(this, record);
				} else if (typeof cell == "string" && cell.charAt(0) == "@") {
					cell = record[cell.substr(1)];
				}
				if (cell == null) value = "";
				
				output += "<"+cellTag+" class='form-table-cell' style='width:"+widths[c]+"px'>"
								+cell
						 +"</"+cellTag+">";
			}
			output += "</tr>";
		}
		output += "</table>";

		this.el.dom.innerHTML = output;
	},

	defaultAutoCreate : { tag:"div", cls:"form-table-container" }
});
Ext.reg("formtable", mapr.widgets.FormTable);




})();			// end hidden from global scope
