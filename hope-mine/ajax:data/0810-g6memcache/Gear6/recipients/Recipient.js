//
// add view methods/properties to the Gear6.Recipient class
//
Object.extend(Gear6.Recipient.prototype, {
	updateDifferences 	: function(){ return !this.majorChange; },

	// set to false to disable highlight flash when values change
	highlightDifferences : false,

	//
	highlightParams : {
		statusLink : "skip"
	},

 // //////////////////// MESSAGES ////////////////////
	deleteRecipientTitle : "Delete Recipient",
	deleteRecipientMessage : "Are you sure you wish to "
                      +"<b>delete</b> recipient <i>#{data.name}</i>?<br>",
	deleteRecipientSucceeded : "Recipient deleted",
	yesTitle : "&nbsp;&nbsp;Yes&nbsp;&nbsp;",
	noTitle : "&nbsp;&nbsp;&nbsp;No&nbsp;&nbsp;&nbsp;",

	scheduleRedraw : function() {
		if (!this.recipientTable) return;
		// console.warn(this,"deferring redraw to recipientTable");
		this.recipientTable.scheduleRedraw();
	},

	//
	// Show a message 
	//

	showMessage : function(message, autoHide, callback) {
		if (!this._drawn) return;

		var element = this.getRecipientMessageElement();
		element.innerHTML = message;

		if (!this._messageIsVisible) {
			new Effect.Appear(element, {duration:0.2});
		}
		if (this._currentFader) {
			this._currentFader.cancel();
		}
		// TODO: center this vertically
		this.recipientTable.$main.select(".RecipientTableMessageMask")[0].style.display = "block";
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

		this._currentFader = new Effect.Fade(this.getRecipientMessageElement(),
			{
				duration: 0.5,
				afterFinish : function() {
					this.recipientTable.$main.select(".RecipientTableMessageMask")[0].style.display = "none";
					delete this._currentFader;
					if (callback) callback();
				}.bind(this)
			}
		);
	},

	getRecipientMessageElement : function() {
        // use parent table's RecipientMessage element.
		return this.recipientTable.$main.select(".RecipientTableMessage")[0];
	},


 // //////////////////// ACTION HANDLERS ////////////////////
    onEditRecipient : function() {
        Gear6.Recipient.editor.open(this, 'edit');
    },

    // they pressed the "Delete" link for this recipient
    onDeleteRecipient : function() {
        var xml = this.deleteXMLPostTemplate.evaluate(this);
        this.operations["Gear6.Recipient.deleteRecipient"].parameters = xml;
		g6Confirm(	this.deleteRecipientTitle.interpolate(this),
					this.deleteRecipientMessage.interpolate(this),
					this.yesTitle, this.noTitle,
					this.beginOperation.bind(this, "deleteRecipient")
				);
		return undefined;		// so anchor that calls this doesn't actually navigate
    },

 // //////////////////// DRAWING SUPPORT ////////////////////

    getMainElement : function() {
		var parent = this.recipientTable.$main;
		if (!parent) return null;
		this.$main = parent.select("."+this.data.id)[0];
		return this.$main;
	},
	
	prepareToDraw : function(evenodd) {
        // this.snapshot filled in by base DataWidget code
		DataWidget.prototype.prepareToDraw.apply(this, arguments);
		var snapshot = this.snapshot,
			data = this.data
		;

        if (window.privileged == "0") {
                snapshot.actionsHTML = "";
        } else {
            snapshot.actionsHTML = this.ActionsTemplate.evaluate(this);
        }
        snapshot.get_detailHTML   = snapshot.get_detail=="true"  ?"True":"-";
        snapshot.get_infosHTML    = snapshot.get_infos=="true"   ?"True":"-";
        snapshot.get_failuresHTML = snapshot.get_failures=="true"?"True":"-";
		// enumerate rows as even/odd for styling
		snapshot.evenOdd = evenodd;

        snapshot.innerHTML = this.OuterTemplate.evaluate(this);
    },	

 // //////////////////// HTML TEMPLATES ////////////////////

    // Template is for a row in the recipient table.  
	OuterTemplate : new Template(
         "<tr class='#{snapshot.evenOdd} #{snapshot.id}'>\
  			<td class='RecipientCell RecipientName'>#{snapshot.name}</td> \
			<td class='RecipientCell RecipientFirstName'>#{snapshot.get_detailHTML}</td>\
			<td class='RecipientCell RecipientLastName'>#{snapshot.get_infosHTML}</td>\
		 	<td class='RecipientCell RecipientRole'>#{snapshot.get_failuresHTML}</td>\
			<td class='RecipientCell RecipientActions'>#{snapshot.actionsHTML}</td>\
   		  </tr>"
         ),

    ActionsTemplate : new Template(
        "<a href='javascript:#{globalRef}.onEditRecipient()'>Edit</a> &nbsp;\
		 <a href='javascript:#{globalRef}.onDeleteRecipient()'>Delete</a>"
		 
    )

});

