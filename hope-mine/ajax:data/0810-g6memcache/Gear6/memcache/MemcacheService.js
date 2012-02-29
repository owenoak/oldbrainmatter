// -*- Mode: javascript; javascript-indent-level: 4; indent-tabs-mode: t -*-
Object.extend(Gear6.MemcacheService.prototype, {
	highlightDifferences : false,
	
	parentId : "memcacheServers",			// id of parent element to draw the services in

	deferDrawInterval : 0,					// pause a second before drawing to remove initial flash
	autoDraw : true,						// by default we draw automatically after creation

	bodyClassName : "MemcacheServiceDetails",
	flashMessageInterval : 1,				// number of seconds to show a temporary message

//FIXME:  move these into a messages.blah (yes) and move into the generic service object (maybe?)
	//
	// messages to show to the user in the below
	//
	noInstancesMessage : "No instances have been defined for "
		 + "this service.",
	stopReplicationTitle : "Stop Mirroring",
	startReplicationTitle : "Mirror Data",


	saveInstanceTitle : "Add instance",
	saveInstanceMessage : "Are you sure you want to add an "
		+"instance address? This will "
		+" cause a reconfiguration which may lose some cached data.",
	saveInstanceSucceded : "Successfully added instance.",

	serviceEnableSucceeded : "Service enabled",
	serviceDisableSucceeded : "Service disabled",

	disableServiceTitle : "Disable Service",
	disableServiceMessage : "Are you sure you want to disable "
		+ "service <i>#{id}</i>?"
		+ " Caching will be terminated and all content lost.",

	deleteServiceTitle : "Delete Service",
	deleteServiceMessage : "Are you sure you wish to "
		+"<b>delete</b> service <i>#{id}</i>?<br>"
		+ "All cached content will be lost and this service "
		+ "will be terminated",
	deleteServiceSucceeded : "Service deleted",

	deleteInstanceTitle : "Delete Instance",
	deleteInstanceMessage : "Are you sure you wish to <b>delete</b> instance <i>#{data.ip}</i> "
			+ "from service <i>#{service.id}</i>?",
	deleteInstanceSucceeded : "Instance deleted",

	wrongNumToReplicateMessage : "Are you sure you wish to enable mirroring for"
		+ " service <i>#{service.id}</i>?  Mirroring will be suspended since "
		+ "there are not two instances.",

	addMoreToReplicateMessage : "You must have exactly 2 instances to enable mirroring.  <br>"
			+ "Please create instances by pressing the 'Add Instance' button and try again.",

	removeSomeToReplicateMessage : "You must have exactly 2 instances to enable "
		+ "mirroring.  <br>"
		+ "Please remove instance(s) by pressing the 'Remove' button to the "
		+ "right of the instance and press 'Mirror Data' again.",

	enableReplicationTitle : "Enable Mirroring",
	enableReplicationMessage : "Are you sure you want to turn mirroring <b>on</b>"
		+ " for service <i>#{id}</i>?",
	enableReplicationSucceeded : "Mirroring enabled",

	disableReplicationTitle : "Disable Mirroring",
	disableReplicationMessage : "Are you sure you want to turn mirroring <b>off</b>"
		+ " for service <i>#{id}</i>?",
	disableReplicationSucceeded : "Mirroring disabled",
    serviceDisabledWarning  : "WARNING: This service is <b>disabled</b>.",                      
	serviceSuspendedWarning : "WARNING: Mirroring on this service is <b>suspended</b>.",
	serviceSuspendedWarningNotEvenOdd : "WARNING: Mirroring on this service is <b>suspended</b>. "
			  + "All addresses are even or all are odd, so each "
			  + "instance will be placed on the same module. Replication cannot occur "
			  + "until placement changes.",
	serviceDisabledAndSuspendedWarningNotEvenOdd : "WARNING: This service is <b>disabled</b> and mirroring"
              + " is <b>suspended</b>. "
			  + "All addresses are even or all are odd, so each "
			  + "instance will be placed on the same module. Replication cannot occur "
			  + "until placement changes.",
	serviceSuspendedAndNotEnoughInstWarning : "WARNING: Mirroring on this service is "
		+ "<b>suspended</b> due to insufficient instances (need exactly 2).",
	serviceNotEnoughInstWarning : "WARNING: This service does not have enough instances "
		+ "for mirroring (need exactly 2).",
	serviceTooManyInstWarning : "WARNING: This service has too many instances "
		+ "for mirroring (need exactly 2).",
	dramOnlyWarning : "WARNING: #{dramOnlyCount} of #{instances.length} instances (#{dramOnlyInstances}) are in DRAM-only mode.",
	operationFailedMessage : "Operation failed",
	serviceReplicationUnlicensedWarning : "WARNING: Replication is configured for this service, but no active license for replication is installed.",

	yesTitle : "&nbsp;&nbsp;Yes&nbsp;&nbsp;",
	noTitle : "&nbsp;&nbsp;&nbsp;No&nbsp;&nbsp;&nbsp;",


	workingMessage : "Working...",

	// is this a 
	isGear6Package : function() {
        // Bug 4038 -- isGear6Package controls flash controls in service editor.  
        // only turn it on if we have 
        return ((this.data.packageName || "").indexOf("gear6") > -1);
    },
    isFlashEnabled : function() {
        return this.isGear6Package() && ((window.FlashMax || 0) > 0);
	},

	//
	// Show a message for the entire service
	//

	// show a message relative to the entire thing
	showMessage : function(message, autoHide, callback) {
		if (!this._drawn) return;

		var element = this.getServiceMessageElement();
		element.innerHTML = message;

		if (!this._messageIsVisible) {
			new Effect.Appear(element, {duration:.2});
		}
		if (this._currentFader) {
			this._currentFader.cancel();
		}
		// TODO: center this vertically
		this.$main.select(".MemcacheServiceMessageMask")[0].style.display = "block";
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

		this._currentFader = new Effect.Fade(this.getServiceMessageElement(),
			{
				duration:.5,
				afterFinish : function() {
					this.$main.select(".MemcacheServiceMessageMask")[0].style.display = "none";
					delete this._currentFader;
					if (callback) callback();
				}.bind(this)
			}
		);
	},

	getServiceMessageElement : function() {
		return this.$main.select(".MemcacheServiceMessage")[0];
	},


	//
	//	Show messages/errors for instances.
	//
	//	NOTE: these persist until you call clearInstanceMessage()
	//

	// show a message relevant to this an instance
	showInstanceMessage : function(message, classNames, interval) {
		if (message) {
			this._instanceMessage = message;
		}
		if (!this._drawn) return;

		if (classNames == null) classNames = "+ShowInstanceMessage -ShowInstanceError";
		var element = this.getInstanceMessageElement();
		if (message && element) 	element.innerHTML = message;

		this.$main.toggleClassNames(classNames);
// turning off highlight 'cause it's distracting
//		if (window.Effect) new Effect.Highlight(element,
//									{
//										restorecolor:"#d4d4d4",
//									 	duration:this.flashMessageInterval
//									 });
		return this;
	},

	// hide the currently displayed instance message
	clearInstanceMessage : function() {
		delete this._instanceError;
		this._instanceMessage = "";

		if (!this._drawn) return;
		this.getInstanceMessageElement().innerHTML = "&nbsp;";
		this.$main.toggleClassNames("-ShowInstanceMessage -ShowInstanceError");
		return this;
	},


	// show an erorr relevant to an instance
	// NOTE: this will automatically interpolate the message through us
	//		  to pick up any dynamic properties
	showInstanceError : function(message) {
		this._instanceError = true;
		message = message.interpolate(this);
		return this.showInstanceMessage(message, "+ShowInstanceMessage +ShowInstanceError");
	},

	// return the element we use to display instance messages
	getInstanceMessageElement : function() {
		return this.$main.select(".MemcacheInstanceMessage")[0];
	},

	// show a message if we're a gear6 package and things 
	// are not set right.
	showInstanceCountMessage : 	function() {
		if (!this.instances || !this.isGear6Package()) return;

		this.getDramOnlyInstances();
		var error;
		if (this.dramOnlyCount > 0 && this.data.enabled && this.isFlashEnabled()) {
			error = this.dramOnlyWarning;
		}
		else if (this.data.replicationMode == "mirror") {
			if (this.data.replicationLicensed == false) {
				error = this.serviceReplicationUnlicensedWarning;
			}
			else if (this.data.replicationState.toLowerCase() == "suspended" && this.instances.length < 2) {
				error = this.serviceSuspendedAndNotEnoughInstWarning;
			} 
			else if (this.data.replicationState.toLowerCase() == "suspended") {
				if (this.hasEvenAndOddInstances()) {
					// we do have evens and odd
                    if (this.data.enabled) {
                        error = this.serviceSuspendedWarning;
                    } else {
                        error = this.serviceDisabledWarning;
                    }
				} else {
                    if (this.data.enabled) {
                        error = this.serviceSuspendedWarningNotEvenOdd;
                    } else {
                        error = this.serviceDisabledAndSuspendedWarningNotEvenOdd;
                    }
				}
			}
			else if (this.instances.length < 2) {
				error = this.serviceNotEnoughInstWarning;
			}
			else if (this.instances.length > 2) {
				error = this.serviceTooManyInstWarning;
			}
		}
		if (error)  this.showInstanceError(error);
		else		this.clearInstanceMessage();
	},



	////////
	//
	// event handlers for buttons/links
	//	-- these handle the UI part -- showing the confirm dialogs, etc
	//
	//	-- The methods to actually affect the server are
	//		  in /js/page/MemcacheService.server.js
	//			so they can be messed with without affecting this file
	//
	////////

	// they clicked the 'Edit' link for this service
	onEditService : function() {
		MemcacheService.editor.open(this, "edit");
		return undefined;		// so anchor that calls this doesn't actually navigate
	},


	// they pressed the "Delete" link for this service
	onDeleteService :function() {
		g6Confirm(	this.deleteServiceTitle.interpolate(this),
					this.deleteServiceMessage.interpolate(this),
					this.yesTitle, this.noTitle,
					this.beginOperation.bind(this, "deleteService")
				);
		return undefined;		// so anchor that calls this doesn't actually navigate
	},

    // visually remove this service from the display
    // NOTE: we just set it to display:none in case callbacks are referencing it, etc
    remove : function() {
        // First, remove the instances from the BadVips object
        this.instances.forEach(function(instance) {
            BadVips.remove(instance.data.ip);
        });
        // and get rid of the service div
        if (window.Effect) {
            new Effect.Parallel(
               [
                new Effect.SlideUp(this.$main),
                new Effect.Fade(this.$main)
               ], {duration:.5});
        } else {
            this.$main.style.display = "none";
        }
		// Finally, change the ID in this object so that the id of the 
		// removed service might be reused.  The object will be reaped on a 
		// save changes or page navigation
		this.id = "__%%DELETED_SERVICE%%__";
    },
	

	// they clicked the 'Enable' or 'Disable' link for a service
	onToggleServiceEnable : function() {
		var enable = !this.data.enabled;

		if (enable == false) {
			g6Confirm(	this.disableServiceTitle.interpolate(this),
						this.disableServiceMessage.interpolate(this),
						this.yesTitle, this.noTitle,
						this.beginOperation.bind(this, "disable")
					);

		} else if (this.instances.length == 0) {
			g6Error("Cannot Enable Service",
					"Cannot enable service \""+this.data.id+"\": no instance addresses assigned", 
					"OK");
		} else {
			this.beginOperation("enable");
		}
		return undefined;		// so anchor that calls this doesn't actually navigate
	},


	// they clicked on the "Remove" button next to an instance
	onRemoveInstance : function(ip) {
		var instance = this.getInstance(ip);
		if (!instance) {
			this.warn("removeInstance(",ip,"): couldn't find instance");
			return undefined;
		}

		g6Confirm(	this.deleteInstanceTitle.interpolate(instance),
					this.deleteInstanceMessage.interpolate(instance),
					this.yesTitle, this.noTitle,
					this.beginOperation.bind(this, "deleteInstance", {instance:instance})
				);
		return undefined;		// so anchor that calls this doesn't actually navigate
	},


	// they pressed the 'Add' button in the new instance form
	onSubmitNewInstanceForm : function() {
		// if the form doesn't validate, forget it
		//	this will show an error message if necessary
		//
		// NOTE: validation routine called below is in /js/page/Memcache.server.js
		if (!this.validateNewInstanceForm()) return;

		var params = this._getFormInstanceParameters();

		// if the service is enabled with > 1 instance AND we're not mirroring,
		//  make sure they want to save (and hide the form if they say no)
		// (adding a second instance to a mirrored service is harmless 
		// to the data)
		if (this.instances.length > 0 && 
			this.data.enabled &&
			this.data.replicationMode == "none") 
		{
			g6Confirm(	this.saveInstanceTitle.interpolate(this),
						this.saveInstanceMessage.interpolate(this),
						this.yesTitle, this.noTitle,
						this.beginOperation.bind(this, "saveInstance", params),
						this.onCancelNewInstanceForm.bind(this)
					);
		} else {
			// otherwise just save immediately
			this.beginOperation("saveInstance", params);
		}

		return this;
	},


	onToggleReplication :function() {
		if (this.data.replicationMode == "none") {
			var message = (this.instances.length == 2 
							? this.enableReplicationMessage
							: this.wrongNumToReplicateMessage
						  );
			g6Confirm(	this.enableReplicationTitle.interpolate(this),
						message.interpolate(this),
						this.yesTitle, this.noTitle,
						this.beginOperation.bind(this, "enableReplication")
					);
		} else {
			g6Confirm(	this.disableReplicationTitle.interpolate(this),
						this.disableReplicationMessage.interpolate(this),
						this.yesTitle, this.noTitle,
						this.beginOperation.bind(this, "disableReplication")
					);
		}
		return undefined;		// so anchor that calls this doesn't actually navigate
	},

	// they clicked on the service title
	onServiceIdClick : function() {
		this.toggle();
	},



	//
	//	new instance form
	//
	//	TODO: allow them to add more than one instance at once?
	//	TODO: add two instances and replicate them?
	//

	showNewInstanceForm : function() {
		// stop auto-update while form is visible
		page.setUpdateCondition("formIsVisible", true);

		// set the field hint focus/blur handlers up
		Form.setUpFieldHints(this.$main);
		
		this.$main.addClassName("ShowForm");
		return this;
	},

	hideNewInstanceForm : function() {
		// restart auto-update if appropriate
		page.setUpdateCondition("formIsVisible", false);

		this.$main.removeClassName("ShowForm");
		return this;
	},


	onShowNewInstanceForm : function() {
		this.showNewInstanceForm();
		setTimeout(this.focusInField.bind(this, "hostname"),500);
	},

	// hide the new instance form
	onCancelNewInstanceForm : function() {
		this.hideNewInstanceForm();
		this.clearInstanceMessage();
	},


	// return the current parameters from the new instance form
	_getFormInstanceParameters : function() {
		var inputs = this.$main.select("INPUT"),
			params = {}
		;
		for (var i = 0; i < inputs.length; i++) {
			var input = inputs[i];
			if (input.getValue() == input.getHint()) continue;
			params[inputs[i].getAttribute("name")] = inputs[i].value;
		}
		return params;
	},

	focusInField : function(name) {
		var fields = this.$main.select("INPUT");
		if (name == null) {
			fields[0].activate();
		} else {
			for (var i = 0; i < fields.length; i++) {
				if (fields[i].getAttribute("name") == name) return fields[i].activate();
			}
		}
	},

	setFormFieldValue : function(name, value) {
		var fields = this.$main.select("INPUT");
		for (var i = 0; i < fields.length; i++) {
			if (fields[i].getAttribute("name") == name) fields[i].value = value;
		}
	},

	// NEW INSTANCE validation :
	//
	// We have three pieces of information when the user hits the "ADD"
	// button:
	//
	// 1) DNS name of VIP
	// 2) IP address of VIP
	// 3) Netmask of VIP
	//
	// The service is known by implication of which part of the GUI the form
	// is in.
	//
	// Two pieces are needed to submit the form:
	//
	// 1) IP address
	// 2) netmask
	//
	// When the user hits ADD, this will happen (DNS, IP, and MASK will refer
	// to the 3 pieces of info above.  "Reject with message" means decline to
	// submit form with appropriate warning message):
	//
	// 1) If BOTH DNS and IP are blank, reject with message
	//
	// 2) If BOTH DNS and IP have values, then
	// 2a) Resolve DNS name.  If fail or result != IP then reject with
	//	  message.
	// 2b) rDNS IP.  If fail or result != DNS then reject with message.
	// 2c) if mask empty, reject with message.
	// 2d) If resolved DSN == IP AND rDNS'd IP match, submit with "Are You
	//	 Sure" (AYS).
	//
	// 3) If IP is blank, and DNS has value, then
	// 3a) resolve DNS.  If fail, reject with message.
	// 3b) if mask empty, reject with message.
	// 3c) iDNS success and mask not empty, submit with AYS and  IP/DNS name in message
	//
	//
	// 4) If IP has value and DNS is blank, then
	// 4a) if mask empty, reject with message
	// 4b) rDNS IP.  If success, submit with AYS and IP/DNS name in message.
	//	 If not, submit with AYS and just IP in message.
	validateNewInstanceForm : function() {
		var params = this._getFormInstanceParameters(),
			dnsname = params.hostname,
			address = params.ip,
			masklenStr = params.mask,
			masklen = parseInt(params.mask),
			snapshot = this.snapshot
		;
        if (dnsname == "") dnsname = null;
        if (address == "") address = null; // for unit tests; sometimes they pass ""
        if (masklenStr = "") masklenStr = null;

		// CASE 1: no input at all?
		if ((dnsname == null) && (address == null)) {
			this.showInstanceError("No values!  Must specify AT LEAST ONE of name or address.");
			this.clearMessage();
			this.focusInField("hostname");
			return false;
		}
		// Get resolved DNS name, and rDNS of IP, if appropriate

		var name_of_address = null;

		if (dnsname != null) {
			ip_of_dnsname = MemcacheService.beginOperation("resolveDNSForHost",
                                                           {hostname:dnsname});
			if (!isIPAddr(ip_of_dnsname)) {
				this.showInstanceError('Cannot determine IP address of host "'+dnsname+'"');
				this.clearMessage();
				return false;
			}
		}

		if (address != null) {
			if (!isIPAddr(address)) {
				this.showInstanceError('IP address "'+address+'" is not a valid IPv4 dotted-decimal address (eg: "10.10.1.10") .');
				this.clearMessage();
				return false;
			 }

			name_of_address = MemcacheService.beginOperation("resolveDNSForAddress", {address:address});
			if (name_of_address == null) {
				this.showMessage("Cannot determine name for IP address \""+address+"\"");
				// this is technically OK
			}
		}


		// CASE 2: DNS *and* IP
		if ((dnsname != null) && (address != null)) {
			if (name_of_address == null) {
				this.showInstanceError("Name given ("+dnsname+") but rDNS of IP ("+address+") failed,  Correct and try again.");
				this.clearMessage();
				return false;

			}
			if (dnsname != name_of_address) {
				this.showInstanceError("Name given ("+dnsname+") does not match rDNS of IP ("+name_of_address+"),  Correct and try again.");
				this.clearMessage();
				return false;
			}
			if (address != ip_of_dnsname) {
				this.showInstanceError("Address given ("+address+") does not match IP of "+dnsname+
							" ("+ip_of_dnsname+"),  Correct and try again.");
				this.clearMessage();
				return false;
			}
			// We're OK
		}

		// CASE 3: IP blank, DNS has value
		if ((dnsname != null) && (address == null)) {
			// hard work done, just take our resolved IP and make it be
			// the address we submit.  We already rejected lookup failure above.
			address = ip_of_dnsname;
		}

		// CASE 4: IP has value, DNS blank
		if ((dnsname == null) && (address != null)) {
			// nothing much to do, we'll just use the IP.  Save the resolved
			// name, if any, for later messages
			dnsname = name_of_address;
		}

		// address is now either the valid IP the user typed in, or the rDNS from
		// their DNS name.  Check if it's a "badvip".
		if (this.accessList != "") {
			testAddr = address + "'" + this.accessList;
		} else {
			testAddr = address;
		}
		if (BadVips.isBad(testAddr)) {
			this.showInstanceError('The Memcache Instance address '
						+ address + ' is not acceptable; it cannot be the address of '
						+'another cluster member or a known instance, or a '
						+'broadcast or loopback address.');
			this.clearMessage();
			return false;
		}

		if (isNaN(masklen) || masklen == 0 || masklen > 31) {
			this.showInstanceError("Invalid netmask length (must be 1-31)");
			this.focusInField("mask");
			this.clearMessage();
			return false;
		}

		if (!StableNetworks.isOk(address, masklen, snapshot.ethernetInterface)) {
			this.showInstanceError("The Memcache Instance address "
					       + address + " is not on any connected network on interface "
					       + snapshot.ethernetInterface + ", which is not a recommended "
					       + "configuration.");
			this.clearMessage();
			return false;
		}

		// update the fields to show the correct values
		this.setFormFieldValue("hostname", dnsname);
		this.setFormFieldValue("ip", address);

		this.clearMessage();
		return true;
	},



	// massage data before drawing here
	prepareToDraw : function() {
		DataWidget.prototype.prepareToDraw.apply(this);
		var snapshot = this.snapshot;
		snapshot.mainClassName = this.getClassName();

		// TODO: messageize this
		snapshot.instanceCountHTML =
			"(" + this.instances.length
				+ (this.instances.length == 1 ? " instance" : " instances") 
			+ ")";

		if (this.data.enabled == true) {
			snapshot.toggleEnabledTitle = "Disable";		// TODO: messagize this
			snapshot.statusTitle 		= "Enabled";		// TODO: messagize this
		} else {
			snapshot.toggleEnabledTitle = "Enable";			// TODO: messagize this
			snapshot.statusTitle 		= "Disabled";		// TODO: messagize this
		}

		snapshot.replicationTitle = this.getReplicationTitle();

		snapshot.ethernetInterface = 	this.data.ethernetInterface
								|| (window.primaryInterface||"default")

		snapshot.ethernetInterfaceHTML = 	this.data.ethernetInterface
								|| "<span class='rollover' title='(default)'>"	// TODO: messagize this
										+(window.primaryInterface||"default")
									+ "</span>";

		snapshot.replicateActionTitle = (this.data.replicationMode == "mirror" ?
										  this.stopReplicationTitle :
										  this.startReplicationTitle);

		//
		//	memory usage
		//
		
	snapshot.service = {
	    dram : this.getServiceDramUsage(0),
	    flash : this.getServiceFlashUsage(0),
	    items : this.getServiceItemsUsage(0)
	}
	snapshot.service.dram.inUse = '---'; // we don't track DRAM *used* for G6 services
		
        snapshot.instance = {
            dram  : this.getInstanceDramUsage(0),
            flash : this.getInstanceFlashUsage(0),
            items : this.getInstanceItemsUsage(0)
        }

	if (this.isGear6Package()) {
	  // mark dram items that have been set automatically
	  if (this.data.flashBufferSizeAuto) {
	    if (snapshot.instance) {
	      snapshot.instance.dram.Total = this.titleize(snapshot.instance.dram.Total, "(automatically set)");
	    }
	    // snapshot.service.dram.Total  = this.titleize(snapshot.service.dram.Total, "(automatically set)");
	  }
	
	  // add 'items' to the end of the items labels
	  if (snapshot.instance) {
	    snapshot.instance.items.Total += " items";
	  }
	  snapshot.service.items.Total  += " items";
	  snapshot.service.items.Used   += " items";

	  // random text decoration
	  snapshot.service.flash.Percent = "("+snapshot.service.flash.Percent+")";
	  snapshot.service.items.Percent = "("+snapshot.service.items.Percent+")";
	  
	  // add a rollover hint for auto item count
	  if (this.data.itemCountAuto) {
	    var title = "Estimated item count based on average item size ("		// TODO: messagize this
	      + (this.data.itemSize||0) + " bytes)";
	    if (snapshot.instance) {
	      snapshot.instance.items.Total = this.titleize(snapshot.instance.items.Total, title);
	    }
	    snapshot.service.items.Total  = this.titleize(snapshot.service.items.Total, title);
	  }

			// memory usage table rows
			if (this.isFlashEnabled()) {
				snapshot.memoryUsageTableRowsHTML =  this.FlashUsageRowTemplate.evaluate(this)
											+ this.DramUsageRowTemplate.evaluate(this)
											+ this.ItemCountUsageRowTemplate.evaluate(this);
			} else {
				// memory usage table row
				snapshot.memoryUsageTableRowsHTML = this.DramUsageRowTemplate.evaluate(this)
											+ this.ItemCountUsageRowTemplate.evaluate(this);
			}

			// replication status
			snapshot.replicationStatusHTML = this.ReplicationStatusTemplate.evaluate(this);

			// details table (interface, ports, threads)
			snapshot.detailsTableHTML = this.Gear6ServiceDetailsTemplate.evaluate(this);
		} else {
			// NOT a gear-6 service
			snapshot.service.dram.inUse = this.aggregateInstanceProperty('ramUsed').toBytesString();
			
			// memory usage table row
			snapshot.memoryUsageTableRowsHTML = this.DramUsageRowTemplate.evaluate(this);

			// replication status is empty for non-gear6
			snapshot.replicationStatusHTML = "";

			// details table (interface, ports, threads)
			snapshot.detailsTableHTML = this.NonGear6ServiceDetailsTemplate.evaluate(this);

			// memory usage table rows
		}

		// memory usage table outer
		snapshot.memoryUsageTableHTML = this.MemoryUsageDetailsTemplate.evaluate(this);

		// new instance form
		snapshot.newInstanceFormHTML = this.NewInstanceFormTemplate.evaluate(this);

        // actions cell
        if (window.privileged != "0") {
            snapshot.actionsHTML = this.ActionsTemplate.evaluate(this);
        } else {
            snapshot.actionsHTML = this.ActionsTemplateUnpriv.evaluate(this);
        }
	// console.log("prepareToDraw for "+this.id+" snapshot = ", snapshot); //XXX
	},

	// Specal onAfterDraw to set '$mainElements' to the list of things we should
	//	update when updating the service.  This does NOT include the instance stuff.
	//	Necessary because otherwise the service was attempting to update the (nested)
	//	instance updateThis elements.
	onAfterDraw : function(parent) {
		this.$mainElements = this.$main.select("[update=service]");
	},

	titleize : function(value, title) {
		return "<span class='rollover' title='" + title + "'>"+ value + "</span>";
	},

	getClassName : function() {
		var className = "MemcacheService ";
		className += " MemcacheService"+this.instances.length+"Instances";
		if (this._instanceMessage) 	className += " ShowInstanceMessage";
		if (this._instanceError)	className += " ShowInstanceError";
		if (this.data.replicationMode == "mirror" && this.instances.length >= 2)
			className += " HideNewInstance";
		if (!this.isGear6Package()) className += " NonGear6Package";
		// add the replicationState to the service element so we can style inside with it
		className += " ReplicationState"+(this.data.replicationMode == "none"
						? "None" : (this.data.replicationState || "unknown").capitalize());
		return className;
	},

	getInstancesHTML : function() {
		//	if service.data.replicationState != "initializing"
		//		(draw each instance normally)
		//	else
		//		go through all instances,
		//			master instance 	= (instance.mirrorState == 'initializing-master')
		//			slave instance(s) 	= (instance.mirrorState == 'initializing-slave')
		//			(draw master row merged with slave row)
		//			(draw slave row as 'initializing')
		//			(draw all other instances normally)
		//
		//
		
		var rowsHTML;

		switch(this.data.replicationState.toLowerCase()) {
		case "suspended":
			rowsHTML = this.getSuspendedInstancesHTML();
			break;
		case "initializing":
			rowsHTML = this.getInitializingInstancesHTML();
			break;
		default:
			rowsHTML = this.getNormalInstancesHTML();
		}

		this.snapshot.instanceRowsHTML = rowsHTML;
        if (window.privileged != "0") {
            // we have permission to edit
            return this.InstancesOuterTemplate.evaluate(this);
        } else {
            return this.InstancesOuterTemplateUnpriv.evaluate(this);
        }
	},


	getNormalInstancesHTML: function() {
		this.snapshot.instanceRowSpan = this.instances.length + 1;		// 1 for new instance row
		var html = "";
		this.instances.forEach(function(instance) {
			html += instance.getNormalHTML();
		});
		return html;
	},

	getInitializingInstancesHTML : function() {
		var master = null,
			slaves = [],
			normal = []		// TODO: worry later about draw order changing?
		;
		
		// figure out which instances are in which mode
		this.instances.each(function(instance) {
			var mirrorState = instance.data.mirrorState.toLowerCase()
			if 		(mirrorState == "initializing-master") master = instance;
			else if (mirrorState == "initializing-slave") slaves.push(instance);
			else 	normal.push(instance);
		});

		// if we're in a wonky state (e.g. master and no slaves or vice versa)
		if (master == null || slaves.length == 0) {
			// just draw normally instead
			return this.getNormalInstancesHTML();
		}

		// how many rows total for the instances?
		this.snapshot.instanceRowSpan =	  1				// master
										+ slaves.length	// slaves
										+ 1				// progress row
										+ normal.length	// normal
										+ 1;			// new instance row

		var html = "";

		// draw the master row
		var masterRowSpan = 1 + slaves.length;
		html += master.getMasterHTML(masterRowSpan) + "\r\r";

		// draw the slave row(s)
		slaves.each(function(slave) {
			html += slave.getSlaveHTML() + "\r\r";
		});

		// draw the initializing row(s)
		slaves.each(function(slave) {
			html += slave.getProgressHTML() + "\r\r";
		});

		// draw all of the normal rows
		normal.each(function(instance) {
			html += instance.getNormalHTML() + "\r\r";
		});

		return html;
	},


	getSuspendedInstancesHTML : function() {
		// Only go through the instances if there ARE any
		if (this.instances.length == 0) return "";
		
		var html = "",
			// the first instance is the master here
			slaves = this.instances.clone(),
			master = slaves.shift()				// shift() removes the first one off the list
		;

		if (master == null) {
			console.info("GSI-HTML: WHOA! no master?!?! for ", this.id);
			return "";
		}
		// how many rows total for the instances?
		this.snapshot.instanceRowSpan =	  1				// master
										+ slaves.length	// slaves
										+ 1;			// new instance row

		// draw the master row
		var masterRowSpan = 1 + slaves.length;
		html += master.getMasterHTML(masterRowSpan) + "\r\r";

		// draw the slave row(s)
		slaves.each(function(slave) {
			html += slave.getSlaveHTML() + "\r\r";
		});

		return html;
	},

	//
	//	service templates
	//

	OuterTemplate : new Template(
		"<div updateThis='mainClassName:class' class='#{snapshot.mainClassName}'>\
			<table class='MemcacheServiceTable' cellspacing='0' cellpadding='0'>\
				<tr update='service' class='MemcacheServiceHeader'>\
					<td class='MemcacheServiceHeaderCell idCell'>\
						<a class='ExpanderAnchor' \
						   href='javascript:#{globalRef}.onServiceIdClick()'>\
							Service: #{id}</a>\
						<span class='instanceCount' updateThis='instanceCountHTML'>#{snapshot.instanceCountHTML}</span>\
					</td>\
					<td class='MemcacheServiceHeaderCell actionsCell'>Actions</td>\
				</tr>\
			\
				<tr update='service' class='MemcacheService'>\
					<td class='MemcacheServiceDetailsCell statusCell'>\
						<span class='status' updateThis='statusTitle'>#{snapshot.statusTitle}</span>\
						#{snapshot.replicationStatusHTML}\
						&nbsp;&nbsp;&bull;&nbsp;&nbsp;Package:&nbsp;#{snapshot.packageName}\
					</td>\
			\
                    #{snapshot.actionsHTML} \
				</tr>\
			\
				<tr>\
					<td colspan='2'>\
					  <div class='MemcacheServiceDetails'>\
						<table style='width:100%' cellspacing='0' cellpadding='0'>\
							<tr update='service'><td class='SecondaryTableTD'>\
									#{snapshot.memoryUsageTableHTML}\
								</td>\
								<td class='SecondaryTableTD' style='padding-left:0px;'>\
									#{snapshot.detailsTableHTML}\
								</td>\
							</tr>\
							<tr><td colspan=2>\
								<div class='MemcacheInstances'>\
									#{snapshot.instancesHTML}\
								</div>\
							</td></tr>\
						</table>\
					  </div>\
					</td>\
				</tr>\
			</table>\
			\
			\
			<div class='MemcacheServiceMessageMask roundALLmedium' style='display:none'></div>\
			<div class='MemcacheServiceMessage' style='display:none'>\
				#{message}\
			</div>\
		</div>"
	),

    ActionsTemplate : new Template(
     "<td class='MemcacheServiceDetailsCell serviceActionsCell'>\
       <a href='javascript:#{globalRef}.onEditService()'>Edit</a> &nbsp; \
	   <a updateThis='toggleEnabledTitle' \
		   href='javascript:#{globalRef}.onToggleServiceEnable()'>\
		   #{snapshot.toggleEnabledTitle}</a> &nbsp;\
       <a href='javascript:#{globalRef}.onDeleteService()'>Delete</a>\
      </td>"
    ),

    ActionsTemplateUnpriv : new Template(
     "<td class='MemcacheServiceDetailsCell serviceActionsCell'>\
      </td>"
    ),

	MemoryUsageDetailsTemplate : new Template(
		"<table class='SecondaryTable roundALLmedium' cellspacing='0' cellpadding='0'>\
			<tr>\
				<td class='header'>Memory Usage</td>\
				<td class='label topLabel instanceCell'>Per Instance</td>\
				<td class='label topLabel totalCell'>Total For Service</td>\
				<td class='label topLabel inUseCell'>Total In Use</td>\
			</tr>\
			#{snapshot.memoryUsageTableRowsHTML}\
		</table>"
	),

	FlashUsageRowTemplate : new Template(
		"<tr>\
			<td class='label leftLabel'>Flash</td>\
			<td class='value instanceCell' updateThis='instance.flash.Total'>#{snapshot.instance.flash.Total}</td>\
			<td class='value totalCell' updateThis='service.flash.Total'>#{snapshot.service.flash.Total}</td>\
			<td class='value inUseCell'>\
				 <span updateThis='service.flash.Used'>#{snapshot.service.flash.Used}</span> \
				 <span updateThis='service.flash.Percent'>#{snapshot.service.flash.Percent}</span> \
			</td>\
		</tr>"
	),

	DramUsageRowTemplate : new Template(
		"<tr>\
			<td class='label leftLabel'>DRAM</td>\
			<td class='value instanceCell' updateThis='instance.dram.Total'>#{snapshot.instance.dram.Total}</td>\
			<td class='value totalCell' updateThis='service.dram.Total'>#{snapshot.service.dram.Total}</td>\
			<td class='value inUseCell' updateThis='service.dram.inUse'>#{snapshot.service.dram.inUse}</td>\
		</tr>"
	),

	ItemCountUsageRowTemplate : new Template(
		"<tr>\
			<td class='label leftLabel'>Item Count</td>\
			<td class='value instanceCell' updateThis='instance.items.Total'>#{snapshot.instance.items.Total}</td>\
			<td class='value totalCell' updateThis='service.items.Total'>#{snapshot.service.items.Total}</td>\
			<td class='value inUseCell'>\
				<span updateThis='service.items.Used'>#{snapshot.service.items.Used}</span>\
				<span updateThis='service.items.Percent'>#{snapshot.service.items.Percent}</span>\
			</td>\
		</tr>"
	),


	Gear6ServiceDetailsTemplate : new Template(
		"<table class='SecondaryTable roundALLmedium' cellspacing='0' cellpadding='0'>\
			<tr>\
				<td class='label leftLabel threadsCell'>Threads</td>\
				<td class='value threadsCell' updateThis='threads'>#{snapshot.threads}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel interfaceCell'>Interface</td>\
				<td class='value interfaceCell' updateThis='ethernetInterfaceHTML'>#{snapshot.ethernetInterfaceHTML}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel tcpPortCell'>TCP Port</td>\
				<td class='value tcpPortCell' updateThis='tcpPort'>#{snapshot.tcpPort}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel udpPortCell'>UDP Port</td>\
				<td class='value udpPortCell' updateThis='udpPort'>#{snapshot.udpPort}</td>\
			</tr>\
		</table>"
	),

	NonGear6ServiceDetailsTemplate : new Template(
		"<table class='SecondaryTable roundALLmedium' cellspacing='0' cellpadding='0'>\
			<tr>\
				<td class='label leftLabel threadsCell'>Threads</td>\
				<td class='value threadsCell' updateThis='threads'>#{snapshot.threads}</td>\
				<td class='label leftLabel tcpPortCell'>TCP Port</td>\
				<td class='value tcpPortCell' updateThis='tcpPort'>#{snapshot.tcpPort}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel interfaceCell'>Interface</td>\
				<td class='value interfaceCell' updateThis='ethernetInterfaceHTML'>#{snapshot.ethernetInterfaceHTML}</td>\
				<td class='label leftLabel udpPortCell'>UDP Port</td>\
				<td class='value udpPortCell' updateThis='udpPort'>#{snapshot.udpPort}</td>\
			</tr>\
		</table>"
	),

	ReplicationStatusTemplate : new Template(
		"&nbsp;&nbsp;&bull;&nbsp;&nbsp;<span \
			class='replication ReplicationLabel' updateThis='replicationTitle'>#{snapshot.replicationTitle}</span>"
	),

	InstancesOuterTemplate : new Template(
		"<table class='MemcacheInstanceTable'  cellspacing='0' cellpadding='0'>\
			<tr class='MemcacheInstanceHeader'>\
				<td class='MemcacheInstanceHeaderCell instancesCell'>Instances</td>\
				<td class='MemcacheInstanceHeaderCell moduleCell'>Module</td>\
				<td class='MemcacheInstanceHeaderCell hostnameCell'>DNS Name</td>\
				<td class='MemcacheInstanceHeaderCell ipCell'>IP Address</td>\
				<td class='MemcacheInstanceHeaderCell maskCell'>Mask</td>\
				<td class='MemcacheInstanceHeaderCell usageGraphCell'>Memory Usage</td>\
				<td class='MemcacheInstanceHeaderCell usageCell'>&nbsp;</td>\
				<td class='MemcacheInstanceHeaderCell actionsCell'>Actions</td>\
			</tr>\
		\
			#{snapshot.newInstanceFormHTML}\
		\
			<tr>\
				<td class='MemcacheInstanceHeaderCell MemcacheInstanceButtonCell' \
					rowspan='#{snapshot.instanceRowSpan}'>\
					<button class='ReplicateButton' onclick='#{globalRef}.onToggleReplication()'\
						updateThis='replicateActionTitle'>\
						#{snapshot.replicateActionTitle}\
					</button>\
					<br>\
					<button class='AddInstanceButton' onclick='#{globalRef}.onShowNewInstanceForm()'>\
						Add Instance\
					</button>\
				</td>\
				<td class='MemcacheInstanceCell MemcacheInstanceMessageCell' colspan='7'>\
					<div class='MemcacheNoInstancesMessage'>\
						#{noInstancesMessage}\
					</div>\
					\
					<div class='MemcacheInstanceMessage'>\
						#{instanceMessage}\
					</div>\
				</td>\
			</tr>\
		\
			#{snapshot.instanceRowsHTML}\
		</table>"
   ),

	InstancesOuterTemplateUnpriv : new Template(
		"<table class='MemcacheInstanceTable'  cellspacing='0' cellpadding='0'>\
			<tr class='MemcacheInstanceHeader'>\
				<td class='MemcacheInstanceHeaderCell instancesCell'>Instances</td>\
				<td class='MemcacheInstanceHeaderCell moduleCell'>Module</td>\
				<td class='MemcacheInstanceHeaderCell hostnameCell'>DNS Name</td>\
				<td class='MemcacheInstanceHeaderCell ipCell'>IP Address</td>\
				<td class='MemcacheInstanceHeaderCell maskCell'>Mask</td>\
				<td class='MemcacheInstanceHeaderCell usageGraphCell'>Memory Usage</td>\
				<td class='MemcacheInstanceHeaderCell usageCell'>&nbsp;</td>\
				<td class='MemcacheInstanceHeaderCell actionsCell'>Actions</td>\
			</tr>\
		\
			#{snapshot.newInstanceFormHTML}\
		\
			<tr>\
				<td class='MemcacheInstanceHeaderCell MemcacheInstanceButtonCell' \
					rowspan='#{snapshot.instanceRowSpan}'>\
				</td>\
				<td class='MemcacheInstanceCell MemcacheInstanceMessageCell' colspan='7'>\
					<div class='MemcacheNoInstancesMessage'>\
						#{noInstancesMessage}\
					</div>\
					\
					<div class='MemcacheInstanceMessage'>\
						#{instanceMessage}\
					</div>\
				</td>\
			</tr>\
		\
			#{snapshot.instanceRowsHTML}\
		</table>"
	),

	NewInstanceFormTemplate : new Template(
		"<tr class='MemcacheNewInstanceForm'>\
			<td class='MemcacheInstanceHeaderCell moduleCell InlineFormFirstCell InlineFormLabel'>\
				<div class='InlineFormStart'>New Instance:</div>\
			</td>\
			<td class='MemcacheInstanceCell InlineFormCell'>\
				<div class='InlineFormMiddle'>&nbsp;</div>\
			</td>\
			<td class='MemcacheInstanceCell hostnameCell InlineFormCell'>\
				<div class='InlineFormMiddle'>\
					<input name='hostname' class='InlineFormInput HintField hostNameField' \
						hint='hostname'>\
						<span class='InlineFormHint'>or&nbsp;&nbsp;\
					</span>\
				</div>\
			</td>\
			<td class='MemcacheInstanceCell ipCell InlineFormCell'>\
				<div class='InlineFormMiddle'>\
					<input name='ip' class='InlineFormInput HintField ipField' hint='IP Address'>\
				</div>\
			</td>\
			<td class='MemcacheInstanceCell maskCell InlineFormCell'>\
				<div class='InlineFormMiddle'>\
					<input name='mask' class='InlineFormInput maskField' value='#{snapshot.defaultMaskLen}'>\
				</div>\
			</td>\
			<td class='MemcacheInstanceCell actionsCell InlineFormLastCell InlineFormButtonCell' colspan='3'>\
				<div class='InlineFormEnd'>\
					<button class='AddButton' onclick='#{globalRef}.onSubmitNewInstanceForm()'>Add</button>\
					&nbsp;\
					<button class='CancelButton' onclick='#{globalRef}.onCancelNewInstanceForm()'>Cancel</button>\
				</div>\
			</td>\
		</tr>"
	)

	// NOTE: templates for individual instances in /js/Gear6/memcache/MemcacheInstance.js
});
