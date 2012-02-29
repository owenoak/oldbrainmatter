Gear6.Recipient.editor = new PopupForm({
	
	saveOperation			: "Gear6.Recipient.saveRecipient",
    saveMethod              : "post-noencode",
	saveSucceededMessage	: "Recipient saved.",
	
	newTitle				: "Add New Recipient",
	editTitle				: "Edit Existing Recipient",
	
	confirmSave				: "edit",
	nothingToSaveMessage	: "No changes have been made.  <b>Save anyway?</b>",
    saveConfirmationMessage : "Are you sure you want to change the following recipient parameters?"
                                    + "<blockquote>#{_deltaDisplay}</blockquote>",

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
//		 to be displayed if the field value for this recipient is empty
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
	//	or 'false' if save is being put off, either because the recipient doesn't want to save right now
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
	//	in a way that we can show it to the recipient
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
			
			var control = this.getControl("editRecipient_"+propertyName);
			if (control && control.toDisplayValue) {
				original = control.toDisplayValue(original);
				newValue = control.toDisplayValue(newValue);
			}
			
			output += "<li>" + label + " : " + original + " &rarr; " + newValue + "</li>";
		}
		return output;
	},
	
    onSaveSuccess : function(transaction, request) {
        var xmlResponse = request.responseXML;

//  Response XML is like this
//  <?xml version="1.0" encoding="UTF-8"?>
//  <xg-response>
//    <set-response>
//      <return-status>
//        <return-code>1</return-code>
//        <return-msg>Bad email address: asd
//      </return-msg>
//    </return-status>
//    <db-revision-id>171</db-revision-id>
//  </set-response>
//  </xg-response>

        var rcNodes = xmlResponse.getElementsByTagName("return-code");

        // if the XG can't make heads or tails out of the message we sent, we 
        // will get something with no return code, but a status-code instead.
        // trigger a failure if no return code
        if (rcNodes.length == 0) {
            this.onFailure(transaction, request);
        }
        // there is a return code, get the value
        var returnCode = rcNodes[0].firstChild.nodeValue;
        if (returnCode == "0") {
            PopupForm.prototype.onSaveSuccess.apply(this);
            // force an update
            page.update();
        } else {
            // return code non-zero is also an error, but a "I can't
            // do that" instead of "I don't understand you"
            this.onFailure(transaction, request);
        }
	},

    onFailure : function(transaction,  request) {
        //  extract return message from XML
        var xmlResponse = request.responseXML;
        this.saveFailedMessage = xmlResponse.getElementsByTagName("return-msg")[0].firstChild.nodeValue;
		PopupForm.prototype.onSaveFailure.apply(this);

		// force an update
		page.update();
	},

    validate : function() {
            var recipient = this.value,
                rc = true
                ;

            return rc;
    },

            
    // override getValuesToSave so as to fill in the XML template
    getValuesToSave : function() {
            // generate XML POST body here
            var values = this.setXMLPostTemplate.evaluate(this.value);
            return values;
        },

	
	controls : [
		new RestrictedField({
			id		 	: "editRecipient_name",
			reference 	: "name",
			label		: "Recipient E-Mail Address",
			style		: "width:90%",
            attributes  : "size='20'",
			enableIf	: function(form, formValue) { return form.mode == "new";},
			tabIndex	: 1,
			minLength	: 1,
            restrictedChars : "@.<>+:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890_",
            info		: "Recipient E-Mail address must be legal RFC2822 address specification.",
			matchingIdError : "There cannot be two recipients with this name",
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

                if (Gear6.Recipient.Instances == undefined) {
                    foundMatchingId = false;
                } else {
                    foundMatchingId = Gear6.Recipient.Instances.any(function(recipient) {
                        if (!recipient.anonymous && recipient.data.name == newValue) {
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

        new Checkbox({
            id : "editRecipient_get_detail",
			reference : "get_detail",
			label : "Get Details?",
			tabIndex: 2,
            // override values since TMS/XML gives us string versions.
            trueValue		: "true",
	        falseValue		: "false",
			info : "Should this recipient receive detailed messages (true, checked) or summaries (false)?"
        }),
		
        new Checkbox({
            id : "editRecipient_get_infos",
			reference : "get_infos",
			label : "Get Infos?",
			tabIndex: 3,
            // override values since TMS/XML gives us string versions.
            trueValue		: "true",
	        falseValue		: "false",
			info : "Should this recipient receive info-level alerts?"
        }),
        new Checkbox({
            id : "editRecipient_get_failures",
			reference : "get_failures",
			label : "Get failures?",
			tabIndex: 4,
            // override values since TMS/XML gives us string versions.
            trueValue		: "true",
	        falseValue		: "false",
			info : "Should this recipient receive failure-level alerts?"
        }),



		new Button({
			id		 	: "editRecipient_resetButton",
			value		: "Reset",
			style 		: "width:6em;",
//			enableIf	: function(form, formValue) {	return form.getDeltas() != undefined	},
			tabIndex	: 21,
			onActivate		: function(event, element) {
				this.controller.reset();
			}
		}),

 		new Button({
			id		 	: "editRecipient_okButton",
			value		: "OK",
			style 		: "width:6em;",
			tabIndex	: 22,
			onActivate		: function(event, element) {
				this.controller.save();
			}
		}),

		new Button({
			id		 	: "editRecipient_cancelButton",
			value		: "Cancel",
			style 		: "width:6em;",
			tabIndex	: 23,
			onActivate		: function(event, element) {
				this.controller.cancel();
			}
		})

	],
	
    setXMLPostTemplate : new Template(
        "<xg-request> \
          <set-request> \
           <nodes> \
            <node> \
                <name>/email/notify/recipients/#{data.name}</name> \
                <type>string</type> \
                <value>#{data.name}</value> \
            </node> \
            <node> \
                <name>/email/notify/recipients/#{data.name}/get_detail</name> \
                <type>bool</type> \
                <value>#{data.get_detail}</value> \
            </node> \
            <node> \
                <name>/email/notify/recipients/#{data.name}/get_infos</name> \
                <type>bool</type> \
                <value>#{data.get_infos}</value> \
            </node> \
            <node> \
                <name>/email/notify/recipients/#{data.name}/get_failures</name> \
                <type>bool</type> \
                <value>#{data.get_failures}</value> \
            </node> \
           </nodes> \
          </set-request> \
        </xg-request> \
    "),

	FormTemplate : new Template(
		"<div class='DynaForm EditRecipient'>\
			<form onsubmit='return false'>\
\
			<div class='ErrorDisplay' round='huge' style='display:none'></div>\
\
			<table round='large' class='DynaFormTable EditRecipientTable' cellspacing=0 cellpadding=0>\
				<colgroup>\
					<col class='Label1'><col class='value1'>\
				</colgroup>\
\
<!-- Recipient name block -->\
				<tr>\
					<td class='LabelTd' round='largeTL'>\
						<span id='editRecipient_name_label'></span>\
					</td>\
					<td class='FieldTd SectionTop' round='largeTR'>\
						<span id='editRecipient_name'></span>\
					</td>\
				</tr>\
\
<!-- Separator -->\
				<tr>\
					<td class='Separator' colspan='2'><div></div></td>\
				</tr>\
<!-- Get_details block -->\
				<tr>\
					<td class='LabelTd SectionTop' round='largeTL'>\
						<span id='editRecipient_get_detail_label'></span>\
					</td>\
					<td class='FieldTd SectionTop' round='largeTR'>\
						<span id='editRecipient_get_detail'></span>\
					</td>\
				</tr>\
<!-- Get_infos block -->\
				<tr>\
					<td class='LabelTd SectionTop' >\
						<span id='editRecipient_get_infos_label'></span>\
					</td>\
					<td class='FieldTd SectionTop'>\
						<span id='editRecipient_get_infos'></span>\
					</td>\
				</tr>\
<!-- Get_failures block -->\
				<tr>\
					<td class='LabelTd SectionTop' round='largeBL'>\
						<span id='editRecipient_get_failures_label'></span>\
					</td>\
					<td class='FieldTd SectionTop' round='largeBR'>\
						<span id='editRecipient_get_failures'></span>\
					</td>\
				</tr>\
\
             </table>\
             </form>\
<!-- bottom buttons -->\
\
			<table class='BottomButtons' cellspacing=0 cellpadding=0><tr>\
				<td><span id='editRecipient_moreButton'></span></td>\
				<td><span id='editRecipient_resetButton'></span></td>\
				<td style='width:100%'><div></div></td>\
				<td><span id='editRecipient_okButton'></span></td>\
				<td><span id='editRecipient_cancelButton'></span></td>\
			</tr></table>\
		</div>\
		"
	),


	
	// map of our field names to server field names 
	//	// with XML_GW only need display names XXX simplify later
	_serverFieldMap : {
		"name" : {
			serverFieldName : "name",
			serverFields : {
				"d_name" : "Recipient E-Mail" // display name
			}
        },
        "get_detail" : {
			serverFieldName : "get_details",
			serverFields : {
				"d_get_detail" : "Detailed messages?"
			}
        },
        "get_infos" : {
			serverFieldName : "get_infos",
			serverFields : {
				"d_get_infos" : "Info messages"
			}
        },
        "get_failures" : {
			serverFieldName : "get_failures",
			serverFields : {
				"d_get_failures" : "Failure messages"
			}
        }
     }
});
