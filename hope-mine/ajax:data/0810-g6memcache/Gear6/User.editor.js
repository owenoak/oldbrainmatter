Gear6.User.editor = new PopupForm({
	
	saveOperation			: "Gear6.User.saveUser",
	
	saveSucceededMessage	: "User saved.",
	
	newTitle				: "Add New User",
	editTitle				: "Edit Existing User",
	
	confirmSave				: "edit",
	nothingToSaveMessage	: "No changes have been made.  <b>Save anyway?</b>",
    mustHaveGidMessage      : "Cannot save user until a <b>role</b> has been chosen.",

	// given a control.reference, return the value currently associated with it
	getControlValue : function(control) {
		if (!control.reference) return null;
		
		var value = this.value;
		try {
			if (typeof control.reference == "string") {
				value = this.value.get(control.reference);

			} else if (typeof control.reference == "function") {
				value = control.reference(this, value);
			}
// NEW: don't default to the control.value -- this was causing values from old instances of the form
//		 to be displayed if the field value for this user is empty
// TODO:  consider putting this change into DynaForm (although that will require testing
//			other forms pretty heavily).
//			if (value == null || value == "" && control.value != null) value = control.value;
		} catch (e) {
			console.error("getControlValue(",control,"): error ",e.message, e);
			value = null;
		}
		return value;
	},


	applyDeltas : function() {
		// don't actually save the deltas
		// we will force an update instead

		//	var deltas = this.getDeltas();
		//	this.originalValue.setProperties(deltas);
	},


	// show save confirmation if required
	//	this routine should return 'true' if save can continue, 
	//	or 'false' if save is being put off, either because the user doesn't want to save right now
	//	or because some other process (like a custom dialog) needs to be shown before we can save.
	//	 In the latter case, make sure you call   this.save(true)	when it's time to save.
	showSaveConfirmation : function() {
		if (this.mode == "new") return true;
		this._deltaDisplay = this.getDeltaDisplay();
		var message = (this._deltaDisplay ? this.saveConfirmationMessage
										 : this.nothingToSaveMessage);
		g6Confirm("Confirm save", message.interpolate(this), "OK", "Cancel", 
					this.save.bind(this, true));
		return false;
	},

	// get the differences between the current state and the original state
	//	in a way that we can show it to the user
	getDeltaDisplay : function() {
		if (this.mode == "new") return null;
		var deltas = this.getDeltas();
		if (!deltas) return null;
		
		var output = "";
		for (var propertyName in deltas) {
			// get the _serverFieldMap for this field
			var fieldInfo = this._serverFieldMap[propertyName];
			if (!fieldInfo || !fieldInfo.serverFields) {
				console.error("can't find fieldMap for ",propertyName);
				break;
			}

			// and set label to the "d_*" field
			var label;
			for (var serverKey in fieldInfo.serverFields) {
				if (serverKey.charAt(0) == "d") {
					label = fieldInfo.serverFields[serverKey];
					break;
				}
			}
			
			if (!label) {
				console.error("Can't find label for ",propertyName);
				label = "UNKNOWN";
			}
			
			var original = this.originalValue.get(propertyName);
			var newValue = deltas[propertyName];
			
			var control = this.getControl("editUser_"+propertyName);
			if (control && control.toDisplayValue) {
				original = control.toDisplayValue(original);
				newValue = control.toDisplayValue(newValue);
			}
			
			output += "<li>" + label + " : " + original + " &rarr; " + newValue + "</li>";
		}
		return output;
	},
	
	onSaveSuccess : function() {
		PopupForm.prototype.onSaveSuccess.apply(this);

		// force an update
		page.update();
	},

	onFailure : function() {
		PopupForm.prototype.onFailure.apply(this);

		// force an update
		page.update();
	},

    validate : function() {
            var user = this.value,
                role = user.get("role"),
                gid  = user.get("gid"),
                rc = false;
            
            if (gid == undefined) {
                this.flashMessage(this.mustHaveGidMessage);
            } else {
                // OK!
                rc = true;
            }
            return rc;
    },

	// override getValuesToSave to iterate through the _serverFieldMap to get all of the
	//	values that the server needs (and omit the ones it doesn't want to see)
	getValuesToSave : function() {
		var masterSet = this._serverFieldMap,
			user = this.value,
			output = {},
			fieldList = []
		;
		for (var fieldName in masterSet) {

			// NEW: skip fields whose value is empty
			var fieldValue = user.get(fieldName);
			if (fieldValue == "") {
				// console.log("skipping "+fieldName+" because it is blank");
				continue;
			}
			
			var params = masterSet[fieldName];
			if (params.condition && params.condition(user) == false) continue;
			
			for (var key in params.serverFields) {
				// var value = (params.serverFields[key] == "*" ? user.get(fieldName) : params.serverFields[key]);

                if (params.serverFields[key] == "*") {
                    value = fieldValue;
                } else {
                    value = params.serverFields[key];
                }
				output[key] = value;
			}
            // whatever is the value of f_list_index should not be added to the list.
            // hardcoded to "name" for expediency, sigh.
			if (params.serverFieldName != "name") fieldList.push(params.serverFieldName);
		}
		output.f_list_children = fieldList.join(",");

		// enable the below to see the fields as they will be sent to the server
		// console.group("output == ");
		// console.dir(output);
		// console.groupEnd();
		return output;
	},
	
	controls : [
		new RestrictedField({
			id		 	: "editUser_id",
			reference 	: "id",
			label		: "User Name",
			style		: "width:90%",
			enableIf	: function(form, formValue) { return form.mode == "new";},
			tabIndex	: 1,
			minLength	: 1,
			info		: "User name must be letters, numbers and/or underscores, hyphens or periods.",
			matchingIdError : "There cannot be two users with this name",
			validate	: function(newValue) {
				// catch the super validation first, so we can ensure that our check gets run as well
				var error;
				try {
					newValue = RestrictedField.prototype.validate.apply(this, arguments);
				} catch (e) {
					error = e;
					if (e.newValue) newValue = e.newValue;
				}
				var foundMatchingId;

                if (Gear6.User.Instances == undefined) {
                    foundMatchingId = false;
                } else {
                    foundMatchingId = Gear6.User.Instances.any(function(user) {
                        if (!user.anonymous && user.data.id == newValue) {
                            return true;
                        }
					});
                }
				if (foundMatchingId) {
					error = new ValidationError(this, this.matchingIdError, newValue);
				}
				if (error) throw error;
                return newValue;
			}
		}),

        new TextField({
            id : "editUser_firstname",
			reference : "firstName",
			label : "First Name",
			tabIndex: 3,
			info : "First Name of user (optional)"
        }),
		
        new TextField({
            id : "editUser_lastname",
				reference : "lastName",
				label : "Last Name",
				tabIndex: 4,
				info : "Last Name of user (optional)"
		}),

        new RestrictedField({
            id : "editUser_email",
				reference : "email",
				label : "Email Address",
				tabIndex: 5,
                info : "Preferred email address of user (optional)",
                trimWhitespace: true,
                restrictedChars : "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                        +"abcdefghijklmnopqrstuvwxyz"
                        +"1234567890" +"_.@+",
                replacementChar : " ",
                validate : function(newValue) {
                    // catch the super validation first, so we can ensure that our check gets run as well
                    var error;
                    try {
                        newValue = RestrictedField.prototype.validate.apply(this, arguments);
                    } catch (e) {
                        error = e;
                        if (e.newValue) newValue = e.newValue;
                    }
                    if (newValue.length > 0 && newValue.indexOf("@") == -1) {
                        error = new ValidationWarning(this, "email address must include an '@'", null);
                    }

                    if (error) throw error;
                    // strip all whitespace
                    return newValue.replace(/\s+/, '');
                }
		}),

		new Select({
			id		 	: "editUser_role",
			reference 	: "gid",
			label		: "User Role",
			options 	: {
					   "0":     "admin",
					   "1001":  "monitor",
					   "1002":  "unprivileged"
			},
			tabIndex	: 2,
            info		: "Role this user has.  (Determines permissions)",
            validate    : function(newValue) {
                    return newValue;
            }
		}),

		new Button({
			id		 	: "editUser_resetButton",
			value		: "Reset",
			style 		: "width:6em;",
//			enableIf	: function(form, formValue) {	return form.getDeltas() != undefined	},
			tabIndex	: 21,
			onActivate		: function(event, element) {
				this.controller.reset();
			}
		}),

 		new Button({
			id		 	: "editUser_okButton",
			value		: "OK",
			style 		: "width:6em;",
			tabIndex	: 22,
			onActivate		: function(event, element) {
				this.controller.save();
			}
		}),

		new Button({
			id		 	: "editUser_cancelButton",
			value		: "Cancel",
			style 		: "width:6em;",
			tabIndex	: 23,
			onActivate		: function(event, element) {
				this.controller.cancel();
			}
		})

	],
	
	FormTemplate : new Template(
		"<div class='DynaForm EditUser'>\
			<form onsubmit='return false'>\
\
			<div class='ErrorDisplay' round='huge' style='display:none'></div>\
\
			<table round='large' class='DynaFormTable EditUserTable' cellspacing=0 cellpadding=0>\
				<colgroup>\
					<col class='Label1'><col class='value1'>\
				</colgroup>\
\
<!-- User name block -->\
				<tr>\
					<td class='LabelTd' round='largeTL'>\
						<span id='editUser_id_label'></span>\
					</td>\
					<td class='FieldTd SectionTop' round='largeTR'>\
						<span id='editUser_id'></span>\
					</td>\
				</tr>\
\
<!-- role block -->\
				<tr>\
					<td class='LabelTd SectionBottom' round='largeBL'>\
						<span id='editUser_role_label'></span>\
					</td>\
					<td class='FieldTd SectionBottom' round='largeBR'>\
						<span id='editUser_role'></span>\
					</td>\
				</tr>\
<!-- Separator -->\
				<tr>\
					<td class='Separator' colspan='2'><div></div></td>\
				</tr>\
<!-- First name block -->\
				<tr>\
					<td class='LabelTd SectionTop' round='largeTL'>\
						<span id='editUser_firstname_label'></span>\
					</td>\
					<td class='FieldTd SectionTop' round='largeTR'>\
						<span id='editUser_firstname'></span>\
					</td>\
				</tr>\
\
<!-- Last name block -->\
				<tr>\
					<td class='LabelTd'>\
						<span id='editUser_lastname_label'></span>\
					</td>\
					<td class='FieldTd'>\
						<span id='editUser_lastname'></span>\
					</td>\
				</tr>\
\
<!-- Email block -->\
				<tr>\
					<td class='LabelTd SectionBottom' round='largeBL'>\
						<span id='editUser_email_label'></span>\
					</td>\
					<td class='FieldTd SectionBottom' round='largeBR'>\
						<span id='editUser_email'></span>\
					</td>\
				</tr>\
             </table>\
             </form>\
<!-- bottom buttons -->\
\
			<table class='BottomButtons' cellspacing=0 cellpadding=0><tr>\
				<td><span id='editUser_moreButton'></span></td>\
				<td><span id='editUser_resetButton'></span></td>\
				<td style='width:100%'><div></div></td>\
				<td><span id='editUser_okButton'></span></td>\
				<td><span id='editUser_cancelButton'></span></td>\
			</tr></table>\
		</div>\
		"
	),


	
	// map of our field names to server field names 
	//	(including all the extra parameters we need to send to the server to save)
	_serverFieldMap : {
		"*" : {
			serverFields : {
				'action10' : 'config-form-list',
				'f_list_root' : '/auth/passwd/user',
                'f_list_index' : 'name',
				"add" : "add"
			}
		},
		
		"id" : {
			serverFieldName : "name",
			serverFields : {
				"d_name" : "User Name", // display name
                "v_name" : "",          // value
                "f_name" : "*",         // user generated value
				"t_name" : "string",    // type
				"c_name" : "string",
				"e_name" : "true"
			}
        },
        "firstName" : {
			serverFieldName : "firstname",
			serverFields : {
				"d_firstname" : "First Name",
                "v_firstname" : "",
				"f_firstname" : "*",
				"t_firstname" : "string",
				"c_firstname" : "string",
				"e_firstname" : "true"
			}
        },
        "lastName" : {
			serverFieldName : "lastname",
			serverFields : {
				"d_lastname" : "Last Name",
                "v_lastname" : "",
				"f_lastname" : "*",
				"t_lastname" : "string",
				"c_lastname" : "string",
				"e_lastname" : "true"
			}
        },
        "gid" : {
			serverFieldName : "gid",
			serverFields : {
				"d_gid" : "User Role",
                "v_gid" : "",
				"f_gid" : "*",
				"t_gid" : "uint32",
				"c_gid" : "uint32",
				"e_gid" : "true"
			}
        },
        "email" : {
			serverFieldName : "email1",
			serverFields : {
				"d_email1" : "Email Address",
                "v_email1" : "",
				"f_email1" : "*",
				"t_email1" : "string",
				"c_email1" : "string",
				"e_email1" : "true"
			}
		}
	}
});
