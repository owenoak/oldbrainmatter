/*
	Dialog class, encapsulates loadable 'dialog'.

	Individual pages we can show are actually created in the file "pages.js", 
	which is loaded after this file.
	
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function() {	// begin hidden from global scope


mapr.Dialog = Ext.extend(mapr.Page, {
	type : "dialog",
	section : "hidden",	// not shown in the pageSelector by default


	// window title
	windowTitle : "UNTITLED DIALOG",
	
	// window width
	windowWidth : 500,
	
	// "Parts" of the page
	// 	partName -> cfg object(s) for the pieces that make up the page.
	//
	//	Use page.getPart(partName) or page.getParts(partName) to instantiate the parts.
	//	After that, the part(s) will be available as page[partName].
	//
	//	To inherit part config from a superclass, initialize your parts with:
	//	
	//		parts : {
	//			...
	//			somePart : util.mergeDefaults(superclass.prototype.parts.somePart, {...})
	//			...
	//		}
	//
	parts : {
		
		// ui defaults
		ui : {
			xtype : "panel",
			padding : 10
		},

	
		// defaults for outer component for window-type pages
		container : {
			xtype : "window",
			modal : true,
			resizable : true,
			autoScroll : true,
			closable : true,
			closeAction : "hide"
		},
		
		// set up pointers and events for window-type page outer components
		containerDefaults : function() {
			var buttons = this.getParts("buttons");
			return {
				page:this,
				width : this.windowWidth,
				title : this.windowTitle,
				fbar: {
					buttonAlign : "left",
					items : buttons
				},
				listeners : {
					"hide" : this.onContainerDeactivated,
					scope : this
				}
			};
		},

		// push buttons over
		buttons : [
			"->",
			"@okButton",
			"@cancelButton"
		]
		
	},
	
	getContainer : function() {
		return this.getPart("container");
	},
	
	// activate our outer component
	activateContainer : function() {
		this.getContainer().show().center();
	},
	

	// deactivate our outer container
	deactivate : function() {
		this.getContainer().hide();
	},
	
	
	// don't save state of dialogs
	saveState : function() {},
	

	//onSave : function(closeOnSuccess) {},
	
	onCancel : function() {
		this.deactivate();
	}

});


// Dialog which encapsulates a form.
mapr.FormDialog = Ext.extend(mapr.Dialog, {
	// dirtyForms -- make sure to include this if you add other plugins
	plugins : "dirtyform",

	parts : {
		ui : {
			xtype : "form",
			padding : 10
		}
	},
	
	// update the form to show the values, from formDialog.getFormValues()
	showState : function() {
		this.setValues(this.getFormInputs());
	},
	
	// get the inputs for the form when initially shown (generally based on page.state)
	getFormInputs : function() {	return {}	},

	// clear state when we're hidden, in case the form is shown again
	onContainerDeactivated : function() {
		delete this.state;
	}
});



// special class for editing configuration data (we have a lot of these)
mapr.ConfigForm = Ext.extend(mapr.FormDialog, {
	keys : undefined,

	saveDeltas : true,
	ignoreDisabledFields : false,
	
	saveApi : api.config.save,
	savingMsg : $tx("Saving configuration..."),
	savedMsg  : $tx("Configuration saved"),

	// show manually after load
	showState : function(state) {},

	refresh : function() {
//TODO: redo as an api.config.on("change")
		api.config.load.execute({
			params: { keys:this.keys },
			onSuccess : function() {
				this.values = this.getFormInputs();
				this.setValues(this.values);
			},
			scope : this
		});
	},

//TODO: this shouldn't be here
//			fix it so form starts with deltas if this.saveDeltas is true
	getSaveParams : function(values) {
		return {values:this.deltas};
	},

	
	getFormInputs : function() {
		// clone mapr.config as our values
		var values = Ext.apply({}, mapr.config);
		return values;
	},
	
	parts : {
		okButton : {
			inherit : true,
			title : $tx("Save")
		}
	}// end .parts
	
});	// end ConfigForm



})();			// end hidden from global scope
