//
// add view methods/properties to the Gear6.User class
//
Object.extend(Gear6.User.prototype, {
	updateDifferences 	: function(){ return !this.majorChange; },

	// set to false to disable highlight flash when values change
	highlightDifferences : false,

	//
	highlightParams : {
		statusLink : "skip"
	},

 // //////////////////// MESSAGES ////////////////////
	deleteUserTitle : "Delete User",
	deleteUserMessage : "Are you sure you wish to "
                      +"<b>delete</b> user <i>#{data.id}</i>?<br>",
	deleteUserSucceeded : "User deleted",
	yesTitle : "&nbsp;&nbsp;Yes&nbsp;&nbsp;",
	noTitle : "&nbsp;&nbsp;&nbsp;No&nbsp;&nbsp;&nbsp;",

    // status messages
    accountDisabled : "Account disabled",
    passwordSet     : "Password set",
    passwordDisabled: "Password login disabled",
    noPasswordSet   : "No password",


	scheduleRedraw : function() {
		if (!this.userTable) return;
		// console.warn(this,"deferring redraw to userTable");
		this.userTable.scheduleRedraw();
	},

	//
	// Show a message 
	//

	showMessage : function(message, autoHide, callback) {
		if (!this._drawn) return;

		var element = this.getUserMessageElement();
		element.innerHTML = message;

		if (!this._messageIsVisible) {
			new Effect.Appear(element, {duration:0.2});
		}
		if (this._currentFader) {
			this._currentFader.cancel();
		}
		// TODO: center this vertically
		this.userTable.$main.select(".UserTableMessageMask")[0].style.display = "block";
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

		this._currentFader = new Effect.Fade(this.getUserMessageElement(),
			{
				duration: 0.5,
				afterFinish : function() {
					this.userTable.$main.select(".UserTableMessageMask")[0].style.display = "none";
					delete this._currentFader;
					if (callback) callback();
				}.bind(this)
			}
		);
	},

	getUserMessageElement : function() {
        // use parent table's UserMessage element.
		return this.userTable.$main.select(".UserTableMessage")[0];
	},


 // //////////////////// ACTION HANDLERS ////////////////////
    onEditUser : function() {
        Gear6.User.editor.open(this, 'edit');
    },

    onPasswordUser : function() {
        Gear6.User.password.open(this, 'edit');
    },

    // they pressed the "Delete" link for this user
    onDeleteUser : function() {
		g6Confirm(	this.deleteUserTitle.interpolate(this),
					this.deleteUserMessage.interpolate(this),
					this.yesTitle, this.noTitle,
					this.beginOperation.bind(this, "deleteUser")
				);
		return undefined;		// so anchor that calls this doesn't actually navigate
    },

 // //////////////////// DRAWING SUPPORT ////////////////////
    isSystemUser : function() {
        var ret = false;
        switch(this.data.id) {
        case "admin":
        case "monitor":
            ret = true; break;
        default:
            ret = false; break;
        }
        return ret;
    },

    getMainElement : function() {
		var parent = this.userTable.$main;
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

        if (!data.enabled) {
            snapshot.status = this.accountDisabled;
        } else {
            if (data.password.length == 0) {
                snapshot.status = "<span class='NoPassword'>"
                    +this.noPasswordSet
                    +"</span>";
            } else if (data.password == "*" || data.password == "!!") {
                snapshot.status = this.passwordDisabled;
            } else {
                snapshot.status = this.passwordSet;
            }
        }
        if (window.privileged == "0") {
            // can only edit themselves
            if (window.username == data.id) {
                snapshot.actionsHTML = this.ActionsTemplate.evaluate(this);
            } else {
                snapshot.actionsHTML = "";
            }
        } else {
            if (this.isSystemUser()) {
                snapshot.actionsHTML = this.SystemUserActionsTemplate.evaluate(this);
            } else {
                snapshot.actionsHTML = this.ActionsTemplate.evaluate(this);
            }
        }
		// enumerate rows as even/odd for styling
		snapshot.evenOdd = evenodd;

        // this switch statement must track mdc_capability_gid_map in
        // tms/src/include/md_client.h and md_client.h graft point 2, if any.
        switch (data.gid) {
	        case '0':    snapshot.roleHTML = "admin";   break;
    	    case '1001': snapshot.roleHTML = "monitor"; break;
        	case '1002': snapshot.roleHTML = "unpriv";  break;
	        default:     snapshot.roleHTML = "unpriv";  break;
        }
        snapshot.innerHTML = this.OuterTemplate.evaluate(this);
    },	

 // //////////////////// HTML TEMPLATES ////////////////////

    // Template is for a row in the user table.  
	OuterTemplate : new Template(
         "<tr class='#{snapshot.evenOdd} #{snapshot.id}'>\
  			<td class='UserCell UserName'>#{snapshot.id}</td> \
			<td class='UserCell UserFirstName'>#{snapshot.firstName}</td>\
			<td class='UserCell UserLastName'>#{snapshot.lastName}</td>\
		 	<td class='UserCell UserRole'>#{snapshot.roleHTML}</td>\
			<td class='UserCell UserEmail'>#{snapshot.email}</td>\
            <td class='UserCell statusCell'>#{snapshot.status}</td>\
			<td class='UserCell UserActions'>#{snapshot.actionsHTML}</td>\
   		  </tr>"
         ),

    ActionsTemplate : new Template(
        "<a href='javascript:#{globalRef}.onEditUser()'>Edit</a> &nbsp;\
    	 <a href='javascript:#{globalRef}.onPasswordUser()'>Change Password</a>  &nbsp;\
		 <a href='javascript:#{globalRef}.onDeleteUser()'>Delete</a>"
		 
    ),
    SystemUserActionsTemplate : new Template(
        "<a href='javascript:#{globalRef}.onEditUser()'>Edit</a> &nbsp;\
		 <a href='javascript:#{globalRef}.onPasswordUser()'>Change Password</a>"
	) 

});

