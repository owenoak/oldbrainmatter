Gear6.User.password = new PopupForm({
    saveMode                : "all",
    confirmSave             : true,
	saveOperation			: "Gear6.User.savePassword",
	
	saveSucceededMessage	: "Password saved.",
    saveConfirmationMessage : "Are you sure you want to change the password?",	
	newTitle				: "Change Password",
	editTitle				: "Change Password",
    matchErrorMessage       : "Password and confirmation must match.",
	
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
		return true;
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
                password = user.get("newpassword"),
                confirm  = user.get("confirm"),
                rc = false;

            if (password == confirm) {
                rc = true;
            } else {
                // XXX TODO make this use a proper message display.
                this.flashMessage(this.matchErrorMessage);
            }
            return rc;
    },

	// override getValuesToSave to iterate through the _serverFieldMap to get all of the
	//	values that the server needs (and omit the ones it doesn't want to see)
	getValuesToSave : function() {
		var masterSet = this._serverFieldMap,
			user = this.value,
			output = {}
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
		}

		// enable the below to see the fields as they will be sent to the server
		// console.group("output == ");
		// console.dir(output);
		// console.groupEnd();
		return output;
	},
		
	controls : [
		new RestrictedField({
			id		 	: "userPassword_id",
			reference 	: "id",
			label		: "User Name",
			style		: "width:90%",
			enableIf	: function(form, formValue) {	return form.mode == "new";	},
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
                        if (!user.anonymous && user.id == newValue) {
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

        new PasswordField({
			id : "userPassword_password",
			reference : "newpassword",
			label : "Password",
            minLength: 1,
			tabIndex: 2,
			info : "Password for account.",
			attributes:"autocomplete='off'"		// tell browser to NOT remember password
		}),
		
        new PasswordField({
			id : "userPassword_confirm",
			reference : "confirm",
			label : "Confirm",
            minLength: 1,
			tabIndex: 3,
			info : "Confirm password.",
			attributes:"autocomplete='off'"		// tell browser to NOT remember password
		}),

		new Button({
			id		 	: "userPassword_resetButton",
			value		: "Reset",
			style 		: "width:6em;",
//			enableIf	: function(form, formValue) {	return form.getDeltas() != undefined	},
			tabIndex	: 21,
			onActivate		: function(event, element) {
				this.controller.reset();
			}
		}),

 		new Button({
			id		 	: "userPassword_okButton",
			value		: "OK",
			style 		: "width:6em;",
			tabIndex	: 22,
			onActivate		: function(event, element) {
				this.controller.save();
			}
		}),

		new Button({
			id		 	: "userPassword_cancelButton",
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
					<td class='LabelTd SectionTop SectionBottom' round='largeL'>\
						<span id='userPassword_id_label'></span>\
					</td>\
					<td class='FieldTd SectionTop SectionBottom' round='largeR'>\
						<span id='userPassword_id'></span>\
					</td>\
				</tr>\
<!-- Separator -->\
				<tr>\
					<td class='Separator' colspan='2'><div></div></td>\
				</tr>\
<!-- Password block -->\
				<tr>\
					<td class='LabelTd SectionTop' round='largeTL'>\
						<span id='userPassword_password_label'></span>\
					</td>\
					<td class='FieldTd SectionTop' round='largeTR'>\
						<span id='userPassword_password'></span>\
					</td>\
				</tr>\
\
<!-- Confirm block -->\
				<tr>\
					<td class='LabelTd SectionBottom' round='largeBL'>\
						<span id='userPassword_confirm_label'></span>\
					</td>\
					<td class='FieldTd SectionBottom' round='largeBR'>\
						<span id='userPassword_confirm'></span>\
					</td>\
				</tr>\
<!-- bottom buttons -->\
\
			<table class='BottomButtons' cellspacing=0 cellpadding=0><tr>\
				<td><span id='userPassword_resetButton'></span></td>\
				<td style='width:100%'><div></div></td>\
				<td><span id='userPassword_okButton'></span></td>\
				<td><span id='userPassword_cancelButton'></span></td>\
			</tr></table>\
		</div>\
		"
	),


	
	// map of our field names to server field names 
	//	(including all the extra parameters we need to send to the server to save)
	_serverFieldMap : {
		"*" : {
			serverFields : {
				'action10' : 'password',
				"apply" : "SET+PASSWORD"
			}
		},
		
		"id" : {
			serverFieldName : "account",
			serverFields : {
				"d_account" : "User Name", // display name
                "v_account" : "*",          // value
                "f_account" : "*",         // user generated value
				"t_account" : "string",    // type
				"c_account" : "string",
				"e_account" : "true"
			}
        },
        "newpassword" : {
			serverFieldName : "password",
			serverFields : {
				"d_password" : "Password",
				"f_password" : "*",
				"t_password" : "string",
				"c_password" : "string",
				"e_password" : "true"
			}
        },
        "confirm" : {
			serverFieldName : "confirm",
			serverFields : {
				"d_confirm" : "Confirm",
				"f_confirm" : "*",
				"t_confirm" : "string",
				"c_confirm" : "string",
				"e_confirm" : "true"
			}
        }
	}
});
