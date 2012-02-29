/*
	DirtyForm (FormPanel plugin) -- semantics for:
		- knowing when a form's fields are 'dirty'
		- enabling/disabling/re-titling buttons based on form state
		- standardized save semantics
		
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */
(function() {	// begin hidden from global scope


mapr.widgets.DirtyForm = {

	// initialize the plugin -- ONLY WORKS FOR FormPanels or Pages!
	// call when initializing the form to a new record
	//	call AFTER form values have been set!
	init : function(thing) {
		// apply defaults and overrides
		Ext.applyIf(thing, this.defaults);
		thing.addEvents("formchanged");
	},
	
	// defaults are applied only if dirtyform does not have such a property
	defaults : {
	
		//
		//	stuff you'll generall set:
		//
	
		// api object to execute() when saving
		saveApi : undefined,
		
		// ignore blank fields when reporting current field values?
		ignoreBlankFields : false,
		
		// ignore disabled fields when reporting current field values?
		ignoreDisabledFields : false,

		// true if we only send the deltas to the server
		//	false if we should send everything, every time
		saveDeltas : false,

		// map of fieldName : saveField -- see applySaveMap
		saveMap : undefined,

		// message to show while saving		
		savingMsg : undefined,

		// message to show after saving
		savedMsg : undefined,


		// override this to do something special when the form has been saved successfully
		onSaved : function(reply) {},
	
		// override this to do something special when the form has saved UNsuccessfully
		onSaveFailure : function(reply) {
	//TODO: show errors
			console.error(this,".onFailure(): reply: ",reply);
		},


		//
		//	init / setup
		//

		// true if the form is currently valid
		valid : true,
		
		// true if the form is currently dirty
		dirty : false,


		// return a pointer to the form we manage
		getForm : function() {
			if (this.form) return this.form;

			var form;
			// handle Page case
			if (this.ui) form = this.ui.getForm();
			
			// handle other cases?
			
			if (!form) throw "Must initialize with a form parameter";
			return form;
		},

		// reset our .originalValues according to the current form values
		//	and clear our .deltas.  Also initializes data structures if necessary.
		resetDirty : function() {
			this.dirty = false;
			this.deltas = {};
			this.originalValues = this.getFormValues();
			this.onFormChanged();
		},

		findField : function(field) {
			return this.getForm().findField(field);
		},

		//
		//	setting values
		//

		// set form values
		setValues : function(values) {
			var form = this.getForm();
			form.reset();
			form.hideErrors();
			form.setValues(values);
			this.resetDirty();
		},
		
		
		// set value for a particular field and fire onchange
		setValue : function(field, value, fireFormChanged) {
			if (typeof field === "string") field = this.findField(field);
			field.setValue(value);
			field.fireEvent("change", value);
			if (fireFormChanged) this.onFormChanged();
		},
		
		// get the value from a particular form field
		getValue : function(field) {
			return this.findField(field).getValue();
		},
		
		
		//
		// getting values / validating the form
		//
		
		// return the current values in the form for the fields we manage
		//	NOTE: doesn't do any validation - use validate() for that
		getFormValues : function() {
			if (!this.dirtyFields) return {};
			
			var	values = {}, i = -1, field, value;
			while (field = this.dirtyFields[++i]) {
				value = (field.field.getGroupValue 
							? field.field.getGroupValue() 
							: field.field.getValue());
				
				// if ignoreBlankFields is true, skip null or empty string values 
				if (this.ignoreBlankFields && (value === null || value === "")) continue;

				// if ignoreDisabledFields is true, skip disabled fields
				if (this.ignoreDisabledFields && field.field.disabled) continue;
				values[field.name] = value;
			}
			return values;
		},
		
		
		// validate the fields we manage
		//	returns form values if successful
		//	returns undefined if validation error
		validateForm : function() {
			var form = this.getForm();

			// do quick validation check and return immediately if it fails
			if (!form.isValid()) return undefined;
			
			return this.getFormValues();
		},



		//
		// change handling
		//
		

		// fire the formchanged event with us as the only argument
		//	note:  you can use   form.valid, form.dirty and form.saving to detect current state
		onFormChanged : function() {
			this.fireEvent("formchanged", this);
		},

		
		// called when any of the form fields changes
		onFieldChanged : function(field, value) {
			// if originalValues is not set, haven't completed setup so just bail
			if (!this.originalValues) return;
			
			var fieldName = field.name,
				originalValue = this.originalValues[fieldName]
			;
	
			if (originalValue == value) {
				delete this.deltas[fieldName];
			} else {
				this.deltas[fieldName] = value;
			}
		
			var keys = util.keys(this.deltas);
			this.dirty = (keys.length != 0);
			
			this.onFormChanged();
		},
	


		//	
		// saving
		//


		// actual save routine -- this is where you call the server api
		onSave : function(deactivateOnSuccess) {
			// attempt to validate -- will set errors and return null if not valid
			var values = this.validateForm();
			if (!values) return;
			
			// transform form parameters to output parameters
			var params = this.getSaveParams(values);
			
			if (!this.saveApi) throw "Dialog must provide .saveApi";
			
			// remember the close parameter for onSuccess handling
			this._deactivateOnSuccess = (deactivateOnSuccess == true);
			
			this.saving = true;
			
			// toggle saving message
			this.toggleSavingMsg();
			
			// call formChanged() to enable/disable buttons
			this.onFormChanged();
			
			// get the saveOptions and add some default values to it
			var options = this.getSaveOptions(params);
			this.saveApi.execute(options);
		},

		// given map of validated form values
		//	return output parameters for saving the form
		getSaveParams : function(values) {
			var outputs = values;
			if (this.saveMap) {
				outputs = this.applySaveMap(values);
			}
			return outputs;
		},

		// Apply saveMap to values to figure out exactly what to save.
		//
		// this.saveMap is map of fieldName => saveField
		//	- if saveField is a string, that's the name name of the output parameter
		//	- if saveField is a string which starts with @, alias for a different fieldName
		//	- if saveField is a function, function to calculate value and set params[xxx] to value
		//		signature:	function(params, values, deltas), with "this" as the dirtyForm
		//
		applySaveMap : function(values) {
			var deltas = (this.saveDeltas ? this.deltas : this.values);
			var params = {},
				deltas = this.deltas
			;
			for (var key in deltas) {
				var it = this.saveMap[key];
				if (!it) continue;
				
				// if a string starting with "@", alias for a different field
				if (typeof it === "string" && it.charAt(0) == "@") {
					it = this.saveMap[it.substr(1)];
				}
				
				// if a function, output under that name
				if (typeof it === "string") {
					params[it] = deltas[key];
				} else {
					// otherwise call the function, which should set params.xxx
					it.call(this, params, values, deltas);
				}
			}
			return params;
		},
		
		// Given the form outputs, return an options cfg to send to the save api.
		// Default is just to set outputs as "params" and set default api callback stuff up.
		//
		//	To do anything tricky with values:
		//		- process outputs first, THEN call super,
		//		- or fix up the options.params AFTER calling super.
		getSaveOptions : function(params) {
			return { 
				scope : this,
				onSuccess : this._onSaveSuccess,
				onFailure : this._onSaveFailure,
				params : params
			}
		},
		
		// save success handler
		// NOTE: don't override this, use "onSaved" instead
		_onSaveSuccess : function(reply, options, request) {
			this.dirty = false;
			this.saving = false;
			this.toggleSavingMsg();
			this.onFormChanged();
			if (this._deactivateOnSuccess) this.deactivate();
			this.showSavedMsg();
			this.onSaved(reply);
		},
	
		// save failure handler
		//	NOTE: don't override this, use "onSaveFailure" instead
		_onSaveFailure : function(reply, options, request) {
			this.saving = false;
			this.toggleSavingMsg();
			this.onFormChanged();
			this.onSaveFailure(reply);
		},
		
		// show/hide the saving message (based on this.saving)
		toggleSavingMsg : function() {
			if (!this.savingMsg) return;
			
			if (this.saving) {
				this.getForm().el.mask(this.savingMsg);
			} else {
				this.getForm().el.unmask();
			}
		},
		
		// show the "saved" msg (which is assumed to hide itself)
		showSavedMsg : function() {
			if (this.savedMsg) ui.notifier.flash(this.savedMsg);		
		}
	}
};
Ext.preg("dirtyform", mapr.widgets.DirtyForm);




// DirtyField -- text field, combo, select, checkbox or radio
//	which calls it 'owner's onFieldChanged as keys are pressed/things are changed
//
//	TODO: how to add to list of dirtyFields automatically????
//
//	TODO: enhance for checkboxes/radios
//
mapr.widgets.DirtyField = {
	changeDelay : 100,
	
	init : function(field) {
		// field.owner MUST be set to the dirtyForm (generally done manually)
		if (!field.owner) throw field+" MUST set .owner to a dirtyForm";

		// add to list of owner's dirtyfields
		if (!field.owner.dirtyFields) field.owner.dirtyFields = [];
		field.owner.dirtyFields.push({name:field.name, field:field});
	
		// field setup
		field.enableKeyEvents = true;

		// change handler
		function changeIfDifferent() {
			var v = field.getValue();
			if(String(v) !== String(field.startValue)){
				field.fireEvent('change', this, v, field.startValue);
				field.startValue = v;
			}
		}
		// fire change if the field value actually has changed
		var delay = field.changeDelay || this.changeDelay;
		field.on("keyup", changeIfDifferent, field, {buffer:delay});
		
		// set our 'change' event to notify our 'owner'
		function onChange() {
			field.owner.onFieldChanged(this, field.getValue());
		}
		field.on("change", onChange, field);
		
		// if a combobox, hook up the 'select' event as well
		if (field instanceof Ext.form.ComboBox) {
			field.on("select", onChange, field);
		}

		if (field instanceof Ext.form.Checkbox) {
			field.on("check", onChange, field);
		}
		
	}
};
Ext.preg("dirtyfield", mapr.widgets.DirtyField);

//
//	DirtyButton (Button/Action plugin) 
//		Button who understands "formchanged" semantics to manage its own title/enabled
//
mapr.widgets.DirtyButton = {
	init : function(button) {
		Ext.applyIf(button, this.defaults);
		button.owner.on("formchanged", button.onFormChanged, button);
		
		// call onFormChanged immediate with valid, clean to set up initial title
		button.onFormChanged(button.owner);
	}, 
	
	defaults : {
		// title when form is NOT dirty
		title : undefined,	
		
		// title when form IS dirty
		dirtyTitle : undefined,
		
		// disable button when clean?
		disableWhenClean : undefined,
		
		// disable button when dirty?
		disableWhenDirty : undefined,
		
		// disable button when saving the form?
		disableWhenSaving : undefined,

		// called when form field has changed
		//	<form> = dirtyForm (also .owner)
		onFormChanged : function(form) {
			var title = this.getTitle(form),
				disabled = this.getDisabled(form)
			;
			this.setText(title);
			this.setDisabled(disabled);
		},
		
		// return the dynamic button text according to valid, dirty, etc
		//	form is the dirtyForm
		getTitle : function(form) {
			return (form.dirty ? (this.dirtyTitle || this.title) : this.title);
		},
		
		// return the dynamic button disabled state, according to valid, dirty, etc
		//	form is the dirtyForm
		getDisabled : function(form) {
			var disabled = 	(form.dirty && this.disableWhenDirty)
						||  (!form.dirty && this.disableWhenClean)
						||  (form.saving && this.disableWhenSaving)
					;
			return disabled;
		}
	}
}
Ext.preg("dirtybutton", mapr.widgets.DirtyButton);




})();			// end hidden from global scope
