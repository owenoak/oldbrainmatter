Object.extend(Gear6.RecipientTable.prototype, 
              {
	highlightDifferences : false,
	updateDifferences : false,
	
	parentId : "recipientList",			// id of parent element to draw the services in

	deferDrawInterval : 0,					// pause a second before drawing to remove initial flash
	autoDraw : true,						// by default we draw automatically after creation

	bodyClassName : "RecipientTableDetails",
	flashMessageInterval : 1,				// number of seconds to show a temporary message

	// messages to show to the recipient in the below
    //
    passwordChangedMessage : "Password changed.",

	workingMessage : "Working...",

    getClassName : function() {
       var className = "RecipientTable";

       return className;
    },
            
    prepareToDraw : function() {
		DataWidget.prototype.prepareToDraw.apply(this);
		var snapshot = this.snapshot;
		snapshot.mainClassName = this.getClassName();
        snapshot.recipientRowsHTML = this.getRecipientsHTML();
        if (window.privileged == "0") {
            snapshot.newRecipientButtonHTML = "";
        } else {
            snapshot.newRecipientButtonHTML = this.NewRecipientButtonTemplate.evaluate(this);
        }
    },


	// show a message relative to the entire thing
	showMessage : function(message, autoHide, callback) {
		if (!this._drawn) return;

		var element = this.getRecipientTableMessageElement();
		element.innerHTML = message;

        if (!this._messageIsVisible) {
			new Effect.Appear(element, {duration: 0.2});
        }
		if (this._currentFader) {
			this._currentFader.cancel();
		}
		// TODO: center this vertically
		this.$main.select(".RecipientTableMessageMask")[0].style.display = "block";
		if (autoHide) {
			var me = this;
			function clear() {
				me.clearMessage(callback);
			}
			setTimeout(clear, this.flashMessageInterval*1000);
		}
		this._messageIsVisible = true;
	},

	flashMessage : function(message, callback) {
		this.showMessage(message, true, callback);
	},

	clearMessage : function(callback) {
		if (!this._drawn) return;
		this._messageIsVisible = false;

		this._currentFader = new Effect.Fade(this.getRecipientTableMessageElement(),
			{
				duration: 0.5,
				afterFinish : function() {
					this.$main.select(".RecipientTableMessageMask")[0].style.display = "none";
					delete this._currentFader;
					if (callback) callback();
				}.bind(this)
			}
		);
	},

    getRecipientsHTML : function() {
        var html = "";

        // we decide even/oddness here instead of using the index
        // property in Recipient.prepareToDraw, because the recipient array can
        // have "holes" if recipients have been deleted, and element with
        // index "8" might wind up on row "7".  The "Even" and "Odd" 
        // strings are CSS Class names that trigger the zebra striping
        // in the table.
        var counter = 1;
        this.recipients.forEach(function(recipient){
            recipient.prepareToDraw(counter % 2 == 0 ? "Even" : "Odd");
            html += recipient.snapshot.innerHTML;
            counter++;
        });
        return html;
    },

    getRecipientTableMessageElement : function() {
        var e = this.$main.select(".RecipientTableMessage")[0];
        return e;
        // return this.$main.select(".RecipientTableMessage")[0];
	},

    editNewItem : function() {
		if (Gear6.Recipient._newItem == null) {
			Gear6.Recipient._newItemSequence = 1;
			Gear6.Recipient._newItem = new Gear6.Recipient({
				autoDraw	: false			// don't draw automatically
			});
		}
	
		// give the instance a unique id
		Gear6.Recipient._newItem.id = "recipient_"+Gear6.Recipient._newItemSequence++;
	
		Gear6.Recipient.editor.open(Gear6.Recipient._newItem, 'new');
    }, 

    NewRecipientButtonTemplate : new Template(
        "<div class='button'  \
    	    onclick='#{globalRef}.editNewItem()'> \
		 <div class='buttonTitle'>Add New Recipient</div> \
	     </div>"
    ),

	OuterTemplate : new Template(
		"<div class='SectionBody roundBOTTOMmedium'>\
			<table class='RecipientTableOuterTable' width='100%' cellspacing='0' cellpadding='0'>\
            <tr class='RecipientHeader'> \
              <td class='RecipientHeaderCell idCell'>E-Mail Address</td> \
              <td class='RecipientHeaderCell'>Receive Details?</td> \
              <td class='RecipientHeaderCell'>Receive Infos?</td> \
              <td class='RecipientHeaderCell'>Receive Failures?</td> \
              <td class='RecipientHeaderCell actionsCell'>Actions</td> \
             </tr> \
             #{snapshot.recipientRowsHTML} \
           </table>\
           #{snapshot.newRecipientButtonHTML}\
          <div class='RecipientTableMessageMask roundALLmedium' style='display:none'></div>\
	      <div class='RecipientTableMessage' style='display:none'>\
		    #{message}\
          </div> \
	   </div>")

});
