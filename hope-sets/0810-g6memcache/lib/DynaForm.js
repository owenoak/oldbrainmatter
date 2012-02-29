/*
	DynaForm -- manages a bunch of Controls ala a form.
	
	Note that we assume that there is a FormTemplate which lays out all the pieces
	and that the controls will draw into this automatically by dint of 
	setting parentId in the controls when created.

	When creating a form, set 'form.controls' to a set of instantiated Control subclasses
	with parentId set to the appropriate parentId in the form output.
	
	TODO:		- trace and document the interactions with:
						- initial data setting
						- setting values in the form manually
						- user manipulating values and onChange
				- work with a simple object rather than requiring a DataObject
				- review interaction of "id", "name" and "reference" properties of controls
				- setElementValue() signature is wierd, as are calls to onChange()
	
*/

var DynaForm = Class.create(ProtoWidget, {
	klass 		: "DynaForm",

	mode		: "new",				// "new" or "edit"
	saveMode	: "deltas",				// "deltas" or "all"  see  form.getValuesToSave();
	confirmSave : false,				// <false> means never conform.  <true> means always confirm.
										// "new" means confirm on new only.  "edit" means confirm on edit only.
	cloneValue	: true,					// if true, we make a clone of the value (setValue)
										// so we can make changes to it without changing the original
	

	controls 	: undefined,			// array of controls we manage
	value 		: undefined,			// value of the form -- generally an object

//	saveOperation : undefined,			// TODO:  name of the page operation we will use to save

	saveURL		: undefined,			// url for saving
	saveMethod	: "POST",				// http method to use for saving:  GET or POST
	
	FormTemplate: undefined,			// template to use to draw the form


	nothingToSaveMessage 	: "Nothing to save",			// set to a string to show this when there are no changes to save
	saveConfirmationMessage : "Really save changes?",		// confirmation message shown if form.confirmSave is true
	saveSucceededMessage 	: undefined,					// message to show when save succeeded
	

	initialize : function($super, arg1, arg2, arg3) {
		$super(arg1, arg2, arg3);
		this.controlNameMap = {};

		// initialize the structures that hold special controls
		this._showIfs = [];					// [ ({element: <element>, method: <function>} || control), ...]
		this._enableIfs = [];				// [control, ...]
		this.complexControls = [];			// [control, ...]
		this.simpleControls = {};			// { <ref>: [control,...], <ref>:...}
	},
	
	
	//
	// drawing
	//

	onDraw : function(parent) {
		this.$main = Element.htmlToElements(this.getHTML())[0];
		parent.appendChild(this.$main);
	},
	
	getHTML : function($super) {
		return this.FormTemplate.evaluate(this);
	},
	
	onAfterDraw : function() {
		this.initControls();
		this.updateAllControls();
		this.$errorDisplay = this.$main.select(".ErrorDisplay")[0];
		this.onResize();
	},

	// don't actually redraw, we'll update the controls in onAfterDraw
	onRedraw : function() {},		
	
	onAfterRedraw : function() {
		this.updateAllControls();
		this.onResize();
	},
	
	// our onResize method just resizes all of our controls
	//	this will cause dynamically-sized items to resize to their parents
	onResize : function() {
		this.controls.invoke("onResize");
	},

	//
	//	opening and closing the form
	//

	// 'open' the form
	open : function(value, mode) {
		if (window.page && page.setUpdateCondition) page.setUpdateCondition("formIsVisible", true);
		if (mode) this.mode = mode;
		if (value) this.setValue(value);
		if (!this._drawn) this.draw();
		this.onFormReady();
	},
	
	
	// 'close' the form (i.e. we're all done with it)
	close : function() {
		if (window.page && page.setUpdateCondition) page.setUpdateCondition("formIsVisible", false);
	},


	reset : function() {
		if (this.cloneValue == true) {
			this.setValue(this.originalValue);
		} else {
			console.warn("Don't know how to reset a non-cloned form");
		}
	},


	// fired when the form is ready -- diplayed and visible and all
	//	default behavior is to focus in the first available element in the form
	onFormReady : function(){
		if (!this.$form) {
			this.$form = (this.$main.tagName.toLowerCase() == "form" 
							? this.$main
							: this.$main.select("FORM")[0]
						);
		}
		if (this.$form) this.$form.focusFirstElement();
	},


	//
	//	saving
	//
    validate : function() {
       // override to implement pre-save validation more complex than simple
       // control-based validation.
       return true;
    },

	save : function(confirmed) {
		var saveValues = this.getValuesToSave();
		if (saveValues == null) {
			return this.nothingToSave();
		}
		if (!this.validate()) {
            return;
        }
		if (confirmed != true) {
			var keepGoing = this.showSaveConfirmation();
			if (!keepGoing) return;
		}
		
		// if our value has its own save method, call that
		if (this.value.save) {
			return this.value.save(saveValues);
		}
		
		var params = {
			parameters		: saveValues,
			method 			: (this.saveMethod = this.saveMethod.toUpperCase()),
			asynchronous	: true,
			onSuccess		: this.onSaveSuccess.bind(this),
			onFailure		: this.onSaveFailure.bind(this),
			onException		: this.onSaveException.bind(this)
		}
		if (this.saveOperation && window.page) {
			// if we've got a saveOperation and there's a window.page to execute it
			//	let it do the hard work
			page.beginOperation(this.saveOperation, params);
		
		} else {
			// manually call the server to save
			var encodedValues = Ajax.encodeUriParameters(saveValues),
				url = this.saveUrl
			;
			if (this.saveMethod == "POST") {
				params.postBody = encodedValues;
				params.requestHeaders = {
					'Content-type' : 'application/x-www-form-urlencoded',
					'Content-length' : params.postBody.length,
					'Connection': 'close'
				}
			} else {
				url += (url.indexOf("?") > -1 ? "&" : "?") + encodedValues;
			}
			new Ajax.Request(url, params);
		}
	},


	
	cancel : function() {
		if (this.mode == "new") {
			if (this.value.cancel) this.value.cancel();
			// nothing else to do (I hope)
		} else {
			if (this.cloneValue) {
				// nothing to do since the clone will just be thrown away
			} else {
				throw "DynaForm.cancel() not supported on forms with cloneValue == false";
			}
		}
		this.close();
	},

	
	// saving to the server succeeded
	onSaveSuccess : function() {
		if (this.saveSucceededMessage) {
			this.flashMessage(this.saveSucceededMessage, this.saveAndClose.bind(this));
		} else {
			this.saveAndClose();
		}
	},
	
	saveAndClose : function() {
		this.applyDeltas();
		this.close();
	},
	
	// saving to the server failed
	onSaveFailure : function() {
		if (this.saveFailedMessage) {
			this.flashMessage(this.saveFailedMessage);
        } else {
            this.flashMessage("save failed");
        }

	},
	
	onSaveException : function(exception) {
		this.flashMessage(exception.exception.message);
	},
	
	// show a save confirmation message if appropriate
	//	if this returns true, the save opereation will continue
	showSaveConfirmation : function() {
		if (this.confirmSave == false) return true;
		if (typeof this.confirmSave == "string" && this.confirmSave != this.mode) return true;
		
		if (!this.saveConfirmationMessage) {
			console.info("You must set a 'saveConfirmationMesage' to confirm save.");
			return true;
		}

		// TODO: 
		//		- use a g6Confirm
		//		- return false and have   save(true)  as the callback from the confirm
		return confirm(this.saveConfirmationMessage);
	},
	
	// nothing was changed, so no need to save
	//	show the user the nothingToSave message (if set) then signal save succeeded
	nothingToSave : function() {
		// TODO: use a g6Confirm
		if (this.nothingToSaveMessage) alert(this.nothingToSaveMessage)
		this.close();
	},
	

	//
	//	form 'value' -- the object we're pointing to
	//

	// override this to do anything special when one or more values are changed in the form
	//	such as hide some controls, etc
	onControlChanged : function(control) {
		// toggle visibility of elements with with showIf parameters
		this._showIfs.forEach(function(showControl) {
			var visible = showControl.showIf(this, this.value);
			if (showControl.setVisible) return showControl.setVisible(visible);
			if (visible) 	showControl.$element.show();
			else			showControl.$element.hide();
		}, this);

		// toggle enable of elements with enableIf parameters
		this._enableIfs.forEach(function(enableControl) {
			var enabled = enableControl.enableIf(this, this.value);
			enableControl.setEnabled(enabled);
		}, this);
		
		// if control is defined and it has a simple reference, 
		//	see if there are any other fields dependent on the value and update them as well
		if (control) {
			// first see if there are any other controls with simple references dependent on this control's ref
			var simples = this.simpleControls[control.reference];
			if (simples) {
				simples.forEach(function(simple) {
					if (simple == control) return;
					simple.update();
				}, this);
			}
			
			// now tell all the complex controls to redraw
			//	(they may not all need to, but we can't easily be sure)
			this.complexControls.forEach(function(complex) {
				if (complex == control) return;
				complex.update();
			}, this);
		}
	},

	setValue : function(value) {
		if (this.cloneValue) {
			this.originalValue = value;
			value = (value.clone ? value.clone() : Object.clone(value));
		} else {
			delete this.originalValue;
		}
		this.value = value;
		if (this._drawn) this.updateAllControls();
		
		// TODO: validate fields?
		this.clearErrors();
	},
	
	
	// return the differences between our value and its prototype
	//	if cloneValues is true, this will be all the things that changed
	//	while we were editing
	getDeltas : function() {
		var changed = this.value,
			original = (this.cloneValue ? this.originalValue : this.value.constructor.prototype)
		;
		if (original.getDeltas) return original.getDeltas(changed);
		
		return Object.getDifferences(original, changed);
	},
	
	// apply deltas to the original object
	applyDeltas : function() {
		if (this.cloneValue) {
			var deltas = this.getDeltas();
			if (!deltas) return;
			
			if (this.original.setData) return this.original.setData(deltas);

			var	original = this.originalValue;
			for (var key in deltas) {
				original[key] = deltas[key];
			}
		} else {
			// otherwise nothing to do 'cause they were editing the object directly
		}	
	},
	
	// return the values to be saved
	//	this depends on the value of form.saveMode:
	//		if it is "deltas" then we only save the differences between the form and its prototype
	//		if it is "all" then we save all properties which are not functions and whose keys don't begin with "_"
	getValuesToSave : function() {
		var values;
		if (this.saveMode == "deltas") {
			return this.getDeltas();
		}

		if (this.value.getData) {
            return this.value.getData();
        }
		
		toSave = {};
		var iterator = this.originalValue || this.value,
			found = false
		;
		for (var key in iterator) {
			var value = this.value[key];
			if (typeof value == "function" || key.charAt(0) == "_") continue;
			toSave[key] = value;
			found = true;
		}
		if (found) return toSave;
	},
	

	//
	//	form 'controls' -- the widgets that we manage
	//
	
	registerControl : function(id, control) {
		this.controlNameMap[id] = control;

		var ref = control.reference;

		// put controls either into this.simpleControls or this.complexControls
		if (control.hasSimpleReference()) {
			if (!this.simpleControls[ref]) this.simpleControls[ref] = [];
			this.simpleControls[ref].push(control);
		} else {
			this.complexControls.push(control);
		}
		
		// note the controls with showIf or enableIf values so we can process them quickly
		if (control.showIf) 	this._showIfs.push(control);
		if (control.enableIf) 	this._enableIfs.push(control);
	},
	
	getControl : function(id) {
		if (typeof id == "string") return this.controlNameMap[id];
		return id;
	},
	
	initControls : function() {
		// set up all non-control elements with a 'showif'
		//	(controls with showIf will be set up in registerControl())
		var showIfs = this.$main.select("[showif]");
		showIfs.forEach(function(element) {
			this._showIfs.push({
				$element : element,
				showIf	 : new Function("form,formValue", element.getAttribute("showIf"))
			});
		}, this);

		this.controls = this.controls.compact()
		// initialize the controls to point back to us and have them draw
		this.controls.forEach(function(control) {
            if (control.setController != undefined) {
    			control.setController(this);
                control.draw();
            }
		}, this);
	},
	
	updateAllControls : function() {
		this.controls.invoke("update",true);
		this.onControlChanged();
	},
	
	getControlValues : undefined,
	

	// given a control.reference, return the value currently associated with it
	getControlValue : function(controlId) {
		var control = this.getControl(controlId);
		if (control == null) {
			console.error(this,".getControlValue(",controlId,"): control not found");
			return null;
		}

		if (!control.reference) return null;
		var value = this.value;
		try {
			if (typeof control.reference == "string") {
				value = this.value.get(control.reference);

			} else if (typeof control.reference == "function") {
				value = control.reference(this, value);
			}
            //                XXXXXXXXXXXXXX
			if (value == null || value == "" && control.value != null) value = control.value;
		} catch (e) {
			console.error("getControlValue(",control,"): error ",e.message, e);
			value = null;
		}
		return value;
	},
	
	// set (save) the value referred to by a control.reference
	setControlValue : function(controlId, newValue) {
		var value = this.value;
		var control = this.getControl(controlId);
		if (control == null) {
			console.error(this,".setControlValue(",controlId,",",newValue,"): control not found");
			return false;
		}
		
		if (control.save) {
			try {
				newValue = control.save(newValue, this, value);
			} catch (e) {
				console.error(this,".setControlValue(",control,"): error in control.save() : ",e);
				return false;
			}
		} else if (control.reference) {
			if (typeof control.reference == "string") {
				try {
					this.value.set(control.reference, newValue);
				} catch (e) {
					console.error(this,".setControlValue(",control,"): error : ",e);
					return false;
				}
			}
		} else {
			console.error(this,".onControlChanged(",control,"): you must provide a 'control.save()' to save the value");
			return false;
		}
		this.onControlChanged(control);
		return newValue;
	},
	

	// set (save) the value for a control and update the form
	set : function(controlId, newValue) {
		var control = this.getControl(controlId);
		if (control == null) {
			console.error(this,".setControlValue(",controlId,",",newValue,"): control not found");
			return false;
		}
		newValue = this.setControlValue(control, newValue);
		control.setValue(newValue, true);
	},
	
	//
	//	error handling
	//
	flashMessage : function(message, callback) {
// TODO: there will probably be a page notifier...
		if (!this.notifier) {
			this.notifier = new Notifier({
				autoDraw				: false,
				fadeInInterval			: .1,			// # of seconds for fade-in animations
				fadeOutInterval			: .2,			// # of seconds for fade-out animations
				flashMessageInterval 	: 1				// # of seconds to show a 'flash' message
			});
			// draw the notifier as a child of our main element
			this.notifier.draw(this.$main);
		}
		// show the notifier for a 10th of a second per word
		var wordCount = message.split(" ").length;
		this.notifier.flashMessageInterval = Math.max(wordCount * .2, 1.5);
		this.notifier.flash(message, callback);
	},
	
	
	
	// Errors will be a series of ValidationErrors or ValidationWarnings 
	//	with 'control' set to what the SERVER thinks the name of the field should be.
	showErrors : function(errors) {
		this._errors = errors;	
		if (!this.$errorDisplay) return;
		
		// clear out the error display
		this.$errorDisplay.innerHTML = "";
		
		if (errors) {
			errors.forEach(function(error) {
				this.addError(error, false);
			}, this);
			this.$errorDisplay.style.display = "block";
		} else {
			this.clearErrors();
		}
	},
	
	clearErrors : function() {
		delete this._errors;
		if (this.$errorDisplay) this.$errorDisplay.hide();
	},
	
	// add a single error to the error display
	addError : function(error, autoShow) {
		if (!this.$errorDisplay) return;

		var errorMessage = Element.htmlToElements(this.ErrorItemTemplate.evaluate(error))[0];
		this.$errorDisplay.appendChild(errorMessage);

		// todo: animate open?
		if (autoShow != false) this.$errorDisplay.style.display = "block";
	},
	
	// remove a single error from the error display
	removeError : function(error) {},

	
	ErrorItemTemplate : new Template(
		"<span class='#{level}' round='large'>#{message}</span>"
	)
});



//
//	Errors -- when fields are invalid, they should throw 
//		either a ValidationError or a ValidationWarning.
//

// error flags
DynaForm.OK 		= undefined;
DynaForm.WARNING 	= "Warning";
DynaForm.ERROR 		= "Error";


// exception to throw if there is a validation error
function ValidationError(control, message, newValue) {
	this.level = DynaForm.ERROR;
	this.control = control;
	this.message = message;
	this.newValue = newValue;
}

// exception to throw if there is a validation error
function ValidationWarning(control, message, newValue) {
	this.level = DynaForm.WARNING;
	this.control = control;
	this.message = message;
	this.newValue = newValue;
}
