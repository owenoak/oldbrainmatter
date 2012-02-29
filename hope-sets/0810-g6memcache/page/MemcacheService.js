// -*- Mode: javascript; javascript-indent-level: 8; indent-tabs-mode: t -*-


//Class.include("ProtoWidget ExpanderMixin");

//TODO:
//		- more IE testing
//		- move to single page-level message Notifier
//		- move to Dialog class
//		- safari round corners

//		? move message stuff to a mixin  (move 'ProtoWidget.warn()' to 'debugWarn'?)


// DEBUG:  alias "MS" for convenience while debugging

var MS = window.MemcacheService = 
   Class.create(ProtoWidget, ExpanderMixin, 
      {

	// debugging flags -- Turn on to show debug info in the console.
	//					  To turn on for all services, set in MS.prototype, 
	//						e.g.    MS.prototype.debugOperations = true
	debugOperations : false,
	debugDrawing : false,
	debugUpdating : false,
	
	deferDrawInterval : 0,					// pause a second before drawing to remove initial flash
	autoDraw : true,						// by default we draw automatically after creation

	parentId : "memcacheServers",			// id of parent element to draw the services in

	klass : "MemcacheService",
	bodyClassName : "MemcacheServiceDetails",
	flashMessageInterval : 1,				// number of seconds to show a temporary message
	
	// default properties
	showForm : false,
	message : "",
	id : "Untitled",
	enabled : false,
	tcpPort : 11211,
	udpPort : 11211,
	threads : 16,
	ethernetInterface : "",
    defaultMaskLen : 24, 
	packageName : "memcached-gear6",
	replicationMode : "none",
	replicationState : "none",
	
	itemSize : 200,
	itemCountAuto : 'true',			// Gear6 only
	flashBufferSizeAuto : 'true',
	
	instanceMemSizeMB : 64,			// MEMORY -- Gear6: flash, Standard: dram - USER SET
	instanceItemCount : 335544, 	// ESTIMATED # OF ITEMS
	instanceDramMB		: 1,		// NOTE: same as instanceMemSizeMB on non gear6
	
	serviceDramMB : 6.4,			// DRAM FOR SERVICE - Gear6 only - AUTO
	serviceTotalDramMB : 6.4,		// DRAM FOR SERVICE - Gear6 only - AUTO
	serviceItemCount : 209715200, 	// ESTIMATED # OF ITEMS - Gear6 only
	serviceItemsUsed : 123456, 		// ACTUAL ITEMS STORED IN SERVICE
	
	serviceMemSize : 4444,	// FLASH ALLOCATED - Gear6 only - AUTO

    numDramOnlyInstances : 0, // Gear6 Only
    dramOnlyInstances : "",   //Gear6 only
	//
	// messages to show to the user in the below
	//
	noInstancesMessage : "No instances have been defined for "
         + "this service.",
	progressPrefix : "Initializing Mirroring:",
	progressSuffix : "#{_progressPercent}% Complete",
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
	deleteInstanceMessage : "Are you sure you wish to <b>delete</b> instance <i>#{ip}</i> "
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
	
    serviceSuspendedWarning : "WARNING: Mirroring on this service is <b>suspended</b>.",
    serviceSuspendedWarningNotEvenOdd : "WARNING: Mirroring on this service is <b>suspended</b>. "
              + "All addresses are even or all are odd, so each "
              + "instance will be placed on the same module. Replication cannot occur "
              + "until placement changes.",
    serviceSuspendedAndNotEnoughInstWarning : "WARNING: Mirroring on this service is "
    	+ "<b>suspended</b> due to insufficient instances (need exactly 2).",
    serviceNotEnoughInstWarning : "WARNING: This service does not have enough instances "
    	+ "for mirroring (need exactly 2).",
    serviceTooManyInstWarning : "WARNING: This service has too many instances "
    	+ "for mirroring (need exactly 2).",
    dramOnlyWarning : "WARNING: #{numDramOnlyInstances} of #{instances.length} instances (#{dramOnlyInstances}) are in DRAM-only mode.",
	operationFailedMessage : "Operation failed",

	yesTitle : "&nbsp;&nbsp;Yes&nbsp;&nbsp;",
	noTitle : "&nbsp;&nbsp;&nbsp;No&nbsp;&nbsp;&nbsp;",
	
	
	workingMessage : "Working...",


	
	// for the usage graph, we color as "low", "medium" or "high" Œ(see /style/MemcacheService.css)
	//		if      (percentUsed < lowPercentUsed) 		-- use css class:  ".MemcacheInstance .low"
	//		else if (percentUsed < mediumPercentUsed) 	-- use css class:  ".MemcacheInstance .medium"
	//		else										-- use css class:  ".MemcacheInstance .high"
	//
	lowPercentUsed : 100,
	mediumPercentUsed : 100,
	
	
	initialize : function($super, p1, p2, p3) {
		$super(p1, p2, p3);
		if (!this.instances) this.instances = [];
	},
	
	// make sure we have at least an empty array of instances
	initializeProperties : function() {
		if (this.instances == null) this.instances = [];
		for (var i = 0; i < this.instances.length; i++) {
			var instance = this.instances[i];
			instance.service = this;
			instance.index = i;

			if (instance.constructor != MemcacheInstance) {
				this.instances[i] = new MemcacheInstance(instance);
			}
		};
		
		this.cookieId = "MemcacheService-"+this.id;

		ExpanderMixin.initializeProperties.apply(this, arguments);
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
			this.instanceMessage = message;
		}
		if (!this._drawn) return;

		if (classNames == null) classNames = "+ShowInstanceMessage -ShowInstanceError";
		var element = this.getInstanceMessageElement();
		if (message && element) 	element.innerHTML = message;

		this.$main.toggleClassNames(classNames);
		if (window.Effect) new Effect.Highlight(element, 
									{
										restorecolor:"#d4d4d4", 
									 	duration:this.flashMessageInterval
									 });
		return this;
	},
	
	// hide the currently displayed instance message
	clearInstanceMessage : function() {
		delete this._instanceError;
		this.instanceMessage = "";

		if (!this._drawn) return;
		this.getInstanceMessageElement().innerHTML = "&nbsp;";
		this.$main.toggleClassNames("-ShowInstanceMessage -ShowInstanceError");
		return this;
	},


	// show an erorr relevant to an instance
	showInstanceError : function(message) {
		this._instanceError = true;
		return this.showInstanceMessage(message, "+ShowInstanceMessage +ShowInstanceError");
	},
	
	// return the element we use to display instance messages
	getInstanceMessageElement : function() {
		return this.$main.select(".MemcacheInstanceMessage")[0];
	},

    evenAndOddInstanceAddresses : function() {
              var evens=0;
              var odds=0;

              for (var i = 0; i < this.instances.length; i++) {
                  var a = this.instances[i].ip.split(".");
                  if ((parseInt(a[3]) % 2) == 0) {
                      evens++;
                  } else {
                      odds++;
                  }
              }
              if (evens > 0 && odds > 0) {
                  return true;
              } else {
                  return false;
              }
    },

    calcNumInstancesAreDramOnly : function() {
              this.numDramOnlyInstances = 0;
              this.dramOnlyInstances = "";
              for (var i = 0; i < this.instances.length; i++) {
                  if (this.instances[i].devAllocated == 0) { 
                      this.numDramOnlyInstances++;
                      if (this.dramOnlyInstances == "") {
                          this.dramOnlyInstances = this.instances[i].ip;
                      } else {
                          this.dramOnlyInstances += ", "+this.instances[i].ip;
                      }
                  }
              }
          },

	// show a message if we're a gear6 package and things 
	// are not set right.
	showInstanceCountMessage : 	function() {
		if (!this.instances) return;
		
        if (this.isGear6Package()) {
            this.calcNumInstancesAreDramOnly();
            if (this.numDramOnlyInstances > 0) {
                var errstr = this.dramOnlyWarning.interpolate(this);
                this.showInstanceError(errstr);
            }
            else if (this.replicationMode == "mirror") {
                if      (this.replicationState.toLowerCase() == "suspended" && this.instances.length < 2) {
                    this.showInstanceError(this.serviceSuspendedAndNotEnoughInstWarning);
                } 
                else if (this.replicationState.toLowerCase() == "suspended") {
                    if (this.evenAndOddInstanceAddresses()) {
                        // we do have evens and odd
                        this.showInstanceError(this.serviceSuspendedWarning);
                    } else {
                        this.showInstanceError(this.serviceSuspendedWarningNotEvenOdd);
                    }
                }
                else if (this.instances.length < 2) {
                    this.showInstanceError(this.serviceNotEnoughInstWarning);
                }
                else if (this.instances.length > 2) {
                    this.showInstanceError(this.serviceTooManyInstWarning);
                }
                else this.clearInstanceMessage();
            }
        }
	},



	//
	//	manipulating the server or instances
	//


	// set properties of the service itself
	setProperties : function(props, skipRedraw) {
		// if we're changing package, that requires a full redraw
		var fullRedraw = (props.packageName && props.packageName != this.packageName);
		
		Object.extend(this, props);

		// things are not well defined if we try to change the id of an element
		//	since random data structures on the page may be out of date
		if (props.id && props.id != this.id) {
			this.warn("WARNING: changing the id of an existing service is not supported.");
		}
		if (props.message) this.showMessage(props.message);

		if (!this._drawn) return;
		
		if (fullRedraw) {
			// do a full redraw and then replace the outer node
			var realParent = this.$main.parentNode,
				oldMain = this.$main;
			var bogusParent = new Element("div");
			this._draw(bogusParent);
			var newMain = this.$main;
			realParent.replaceChild(newMain, oldMain);

		} else {
			this.scheduleRedraw();
		}
		return this;
	},

    // set properties of a particular instance
    setInstanceProperties : function(ip, props) {
        var instance = this.getInstance(ip);
        if (instance == null) {
            // add instance
            props.service = this;
            props.index = this.instances.length;
            if (!props.ip) props.ip = ip;

            var instance = new MemcacheInstance(props);
            this.instances.push(instance);
        } else {
            Object.extend(instance, props);
        }

        if (!this._drawn) return;
		this.scheduleRedraw();
        return this;
    },
	
	
	// return the instance object for a particular ip address
	getInstance : function(ip) {
		for (var i = 0; i < this.instances.length; i++) {
			if (this.instances[i].ip == ip) return this.instances[i];
		}
		return undefined;
	},
	
	// remove an instance from the display
	removeInstance : function(instance) {
		if (typeof instance == "string") instance = this.getInstance(instance);
		if (!instance) return this.warn("removeInstance(): instance not found");
		
		this.instances.splice(this.instances.indexOf(instance), 1);
		this.redrawInstances();
	},


	////////
	//
	// event handlers for buttons/links
	//	-- these handle the UI part -- showing the confirm dialogs, etc
	//
	//	-- The methods to actually affect the server are 
    //          in /js/page/MemcacheService.server.js 
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
					this.serverDeleteService.bind(this)
				);
		return undefined;		// so anchor that calls this doesn't actually navigate
	},
	

	// they clicked the 'Enable' or 'Disable' link for a service
	onToggleServiceEnable : function() {
		var enable = !this.enabled;
		
		if (enable == false) {
			g6Confirm(	this.disableServiceTitle.interpolate(this), 
						this.disableServiceMessage.interpolate(this), 
						this.yesTitle, this.noTitle,
						this.serverChangeEnable.bind(this, enable)
					);

		} else {
            if (this.instances.length == 0) {
                g6Error("Cannot Enable Service",
                       "Cannot enable service \""+this.id+"\": no instance addresses assigned", 
                       "OK");
            } else {
                this.serverChangeEnable(enable);
            }
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
					this.serverDeleteInstance.bind(this, instance)
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
            this.enabled &&
            this.replicationMode == "none") {
			g6Confirm(	this.saveInstanceTitle.interpolate(this), 
						this.saveInstanceMessage.interpolate(this), 
						this.yesTitle, this.noTitle,
						this.serverAddInstance.bind(this, params), null,
						this.onCancelNewInstanceForm.bind(this)
					);
		} else {
			// otherwise just save immediately
			this.serverAddInstance(params);
		}

		return this;
	},


	onToggleReplication :function() {
		if (this.replicationMode == "none") {
			if (this.instances.length == 2) {
				g6Confirm(	this.enableReplicationTitle.interpolate(this),
							this.enableReplicationMessage.interpolate(this),
							this.yesTitle, this.noTitle,
							this.serverEnableReplication.bind(this)
						);

			} else if (this.instances.length != 2) {
				g6Confirm(	this.enableReplicationTitle.interpolate(this),
							this.wrongNumToReplicateMessage.interpolate(this),
							this.yesTitle, this.noTitle,
							this.serverEnableReplication.bind(this)
						);
			}
		} else {
				g6Confirm(	this.disableReplicationTitle.interpolate(this),
							this.disableReplicationMessage.interpolate(this),
							this.yesTitle, this.noTitle,
							this.serverDisableReplication.bind(this)
						);

		}
		return undefined;		// so anchor that calls this doesn't actually navigate
	},

	// they clicked on the service title
	onServiceIdClick : function() {
		this.toggle();
	},
	
	
	
	//////////
	//
	//	service event UI callbacks
	//	(called from MS.operationCompleted() in /js/page/MemcacheService.server.js )
	//
	//////////
	

	//
	//	add instance
	//
	
	// callback when the add-instance call SUCCEEDS
	onUpdateSucceeded : function(operation) {
		// nothing to do, the display should take care of itself	
		this.showInstanceCountMessage();
	},
	
	// callback when the add-instance call FAILS
	onUpdateFailed : function(operation, message) {
		this.flashMessage(message);
	},


	//
	//	add instance
	//
	
	// callback when the add-instance call SUCCEEDS
	onAddInstanceSucceeded : function(operation) {
		this.hideNewInstanceForm();
        this.clearInstanceMessage();
		this.flashMessage(this.saveInstanceSucceded);
		
		this.dirtyInstances();
        this.serverGetStatus("add-instance");
	},
	
	// callback when the add-instance call FAILS
	onAddInstanceFailed : function(operation, message) {
		this.flashMessage(message);
	},

	//
	//	enable/disable service
	//

	// callback when the enable/disable call SUCCEEDS
	onChangeEnableSucceeded : function(operation) {
		var enable = (operation == "enable");
		this.flashMessage(enable ? this.serviceEnableSucceeded : this.serviceDisableSucceeded);

		this.setProperties({enabled:enable});
		this.scheduleRedraw();
	},
	
	// callback when the enable/disable call FAILS
	onChangeEnableFailed : function(operation, message) {
		this.flashMessage(message);
	},


	//
	//	delete service
	//

	// callback when the enable/disable call SUCCEEDS
	onDeleteServiceSucceeded : function(operation) {
		// the remove() call will be done when the message is hidden
		this.flashMessage(this.deleteServiceSucceeded, this.remove.bind(this));
	},
	
	// callback when the enable/disable call FAILS
	onDeleteServiceFailed : function(operation, message) {
		this.flashMessage(message);
	},


	//
	//	delete instance
	//

	// callback when the enable/disable call SUCCEEDS
	onDeleteInstanceSucceeded : function(operation) {
		this.flashMessage(this.deleteInstanceSucceeded);
        this.clearInstanceMessage();
		this.removeInstance(MemcacheService.activeInstance);
		this.redrawInstances();
	},
	
	// callback when the enable/disable call FAILS
	onDeleteInstanceFailed : function(operation, message) {
		this.flashMessage(message);
	},


	//
	//	enable/disable replication
	//


	// callback when the enable replication call SUCCEEDS
	onEnableReplicationSucceeded : function(operation) {
		this.flashMessage(this.enableReplicationSucceeded);

		this.dirtyInstances();
        this.serverGetStatus("enable-replication");
	},
	
	// callback when the enable replication call FAILS
	onEnableReplicationFailed : function(operation, message) {
		this.flashMessage(message);

		this.dirtyInstances();
        this.serverGetStatus("enable-replication");
	},

	// callback when the disable replication call SUCCEEDS
	onDisableReplicationSucceeded : function(operation) {
		this.flashMessage(this.disableReplicationSucceeded);

		this.dirtyInstances();
        this.serverGetStatus("disable-replication");
	},
	
	// callback when the disable replication call FAILS
	onDisableReplicationFailed : function(operation, message) {
		this.flashMessage(message);

		this.dirtyInstances();
        this.serverGetStatus("disable-replication");
	},



	//
	//	new instance form
	//
	//	TODO: allow them to add more than one instance at once?
	//	TODO: add two instances and replicate them?
	//
	
	showNewInstanceForm : function() {
		// stop auto-update while form is visible
		MemcacheService.autoUpdater.setCondition("formIsVisible", true);
		
		this.$main.addClassName("ShowForm");
		return this;	
	},

	hideNewInstanceForm : function() {
		// restart auto-update if appropriate
		MemcacheService.autoUpdater.setCondition("formIsVisible", false);

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


	//
	//	generic updating logic 
	//
	
	// Update pre-drawn HTML to reflect the current state of an object.
	// Loops through each property in props
	//		Tries to find one or more children of outerELement with className = "-"+prop.
	//		If found, updates and highlights if the HTML does not match current value in prop.
	// (this is kinda spammy but it should work)
	//	
	//	Note: if you need to massage values, do that BEFORE calling this routine
	//		and make sure your className is the name of the massaged value, not the source value.
	//
	updateAndHilightValues : function(props, outerElement, bgColor) {
		if (Object.isArray(outerElement)) {
			return outerElement.forEach(function(element) {
				this.updateAndHilightValues(props, element, bgColor);
			}, this)
		}
		
		if (bgColor == null) bgColor = "#ffffff";
		for (var prop in props) {
			var value = props[prop];
			// only update numbers and strings
			if (typeof value != "string" && typeof value != "number") continue;
			
			var elements = outerElement.select(".-"+prop),
				tempElement = document.createElement("div")
			;
			for (var i = 0; i < elements.length; i++) {
				var element = elements[i];
				tempElement.innerHTML = value;
				
				if (element.innerHTML != tempElement.innerHTML) {
					element.innerHTML = value;
					if (window.Effect) {
                        var elementBGColor;
                        if (elementBGColor = element.getStyle('background-color')) {
                            myColor = elementBGColor;
                        } else {
                            myColor = bgColor;
                        }
                        new Effect.Highlight(element, {
                            restorecolor: myColor, 
									 	duration:this.flashMessageInterval
									 });
					}
				}
			}
		}
		return this;
	},


	// visually remove this service from the display
	// NOTE: we just set it to display:none in case callbacks are referencing it, etc
	remove : function() {
		if (window.Effect) {
			new Effect.Parallel(
				[
					new Effect.SlideUp(this.$main),
					new Effect.Fade(this.$main)
				], {duration:.5});
		} else {
			this.$main.style.display = "none";
		}
	},


	//
	//	drawing
	//

	onDraw : function(parent) {
		this.$main = Element.htmlToElements(this.getHTML())[0];
		parent.insert(this.$main);
	},

	onAfterDraw : function(parent) {
		ExpanderMixin.onAfterDraw.apply(this, arguments);
		Form.setUpFieldHints(this.$main);
		this.showInstanceCountMessage();
	},

	onRedraw : function() {
		// (prepare to draw already called)
		
		// update the class name of the outer element
		this.$main.className = this._mainClassName;

		// hilight the changes and update the display
		this.updateAndHilightValues(this, this.$main.select(".MemcacheService")[0], "#E6E6E6");
		this.updateAndHilightValues(this, this.$main.select(".SecondaryTableTD"), "#ffffff");
		
		this.showInstanceCountMessage();
		
		// it's considered a major change if the # of instances changes
		if (this._instanceCount != this.instances.length) {
            this._majorChangeToInstances = true;
        }
		this._instanceCount = this.instances.length;

		// if the replicationState has changed, we need to redraw instances
		var newReplicationState = this.replicationState.toLowerCase();
		if (newReplicationState != this._oldReplicationState) {
			this._majorChangeToInstances = true;
		}
		this._oldReplicationState = newReplicationState;
		
		// now redraw the instances
		if (!this._majorChangeToInstances) {
			for (var i = 0; i < this.instances.length; i++) {
				var instance = this.instances[i],
					elements = instance.getElements()
				;
				if (!elements) {
					// if the elements don't match up, redraw all of the instances
					this._majorChangeToInstances = true;
					break;
				}
				for (var e = 0; e < elements.length; e++) {
                    instance.prepareToDraw();
					this.updateAndHilightValues(instance, elements[e], "#ffffff");
				}
/*				
				if (this.replicationState.toLowerCase() == "initializing") {
					return this.getInitializingInstancesHTML();
				} else {
					return this.getNormalInstancesHTML();
				}
*/
			}
		}


		// for some reason, there was a major change to the instances
		//	just redraw the whole thing and forego the hilighting
		if (this._majorChangeToInstances) {
			delete this._majorChangeToInstances;

			this.$main.select(".MemcacheInstances")[0].innerHTML = this.getInstancesHTML();
			Form.setUpFieldHints(this.$main);
		}
	},

	dirtyInstances : function() {
		this._majorChangeToInstances = true;
	},

	redrawInstances : function() {
		this._majorChangeToInstances = true;
		this.scheduleRedraw();
	},

	isGear6Package : function() {
		return (this.packageName && this.packageName.indexOf("gear6") > -1);
	},
	isFlashEnabled : function() {
		return isGear6Package() && ((window.FlashMax || 0) > 0);
	},
		
	// massage data before drawing here
	prepareToDraw : function() {
		this._mainClassName = this.getClassName();


		this._instanceCount = 
			"(" + this.instances.length 
				+ (this.instances.length == 1 ? " instance" : " instances") + ")";

		if (this.enabled != false) {
			this._toggleEnabledTitle = "Disable";		// TODO: from message
			this._statusTitle = "Enabled";				// TODO: from message
		} else {
			this._toggleEnabledTitle = "Enable";		// TODO: from message
			this._statusTitle = "Disabled";				// TODO: from message
		}
		
		if (this.replicationMode == "none") {
			this._replicationTitle = "Not mirroring";	// TODO: from message
		} else {
            this._replicationTitle = this.replicationState.capitalize();
		}

		this._ethernetInterface = 	this.ethernetInterface 
								|| "<span class='rollover' title='(default)'>"
										+(window.primaryInterface||"default") 
									+ "</span>";

		this._replicateActionTitle = (this.replicationMode == "mirror" ? 
                                          this.stopReplicationTitle : 
                                          this.startReplicationTitle);

		//
		//	memory usage
		//

		// dram row
		this._instanceDramMB 		 	 = (this.instanceDramMB     || 0).commaize() + " MB";
		this._serviceDramMB 		 	 = (this.serviceDramMB      || 0).commaize() + " MB";
		this._serviceTotalDramMB     	 = (this.serviceTotalDramMB || 0).commaize() + " MB";
		
		if (this.isGear6Package()) {
            // should we mark dram as auto?
			if (this.flashBufferSizeAuto) {
				this._instanceDramMB = this.titleize(this._instanceDramMB, "(automatically set)");
				this._serviceDramMB = this.titleize(this._serviceDramMB, "(automatically set)");
				this._serviceTotalDramMB = this.titleize(this._serviceTotalDramMB, "(automatically set)");
            }
			// flash row
			this._instanceMemSizeMB		    = (this.instanceMemSizeMB || 0).commaize() + " MB";
			this._serviceMemSize            = (this.serviceMemSize || 0).commaize() + " MB";
			this._sumInstanceRamUsed 	    = this.getInstanceRamUsed().commaize() + " MB";
			this._sumInstanceRamUsedPercent = "(" + Math.floor( 100 * (this.getInstanceRamUsed() / this.serviceTotalDramMB)) + "%)";
	
			// item count row
			this._instanceItemCount		  = (this.instanceItemCount || 0).commaize() + " items";
			this._serviceItemCount		  = (this.serviceItemCount  || 0).commaize() + " items";
			this._serviceItemsUsed		  = (this.serviceItemsUsed  || 0).commaize() + " items";
			this._serviceItemsUsedPercent = "(" + Math.floor(100 * (this.serviceItemsUsed / this.serviceItemCount)) + "%)";
			if (this.itemCountAuto) {
				var title = "Estimated item count based on average item size (" 
							+ (this.itemSize||0) + " bytes)";
				this._instanceItemCount	 = this.titleize(this._instanceItemCount, title);
				this._serviceItemCount	 = this.titleize(this._serviceItemCount, title);
			}

			// memory usage table rows
			this._memoryUsageTableRowsHTML =  this.FlashUsageRowTemplate.evaluate(this)
											+ this.DramUsageRowTemplate.evaluate(this)
											+ this.ItemCountUsageRowTemplate.evaluate(this);


			// replication status
			this._replicationStatusHTML = this.ReplicationStatusTemplate.evaluate(this);
			
			// details table (interface, ports, threads)
			this._detailsTableHTML = this.Gear6ServiceDetailsTemplate.evaluate(this);
			
		} else {
			// memory usage table row
			this._memoryUsageTableRowsHTML = this.DramUsageRowTemplate.evaluate(this);
			
			// replication status
			this._replicationStatusHTML = "";

			// details table (interface, ports, threads)
			this._detailsTableHTML = this.NonGear6ServiceDetailsTemplate.evaluate(this);
			
			// memory usage table rows
		}
		
		// memory usage table outer
		this._memoryUsageTableHTML = this.MemoryUsageDetailsTemplate.evaluate(this);

		// new instance form
		this._newInstanceFormHTML = this.NewInstanceFormTemplate.evaluate(this);
	},
	
	titleize : function(value, title) {
		return "<span class='rollover' title='" + title + "'>"+ value + "</span>";
	},
	
	// returns value in MB
	getInstanceRamUsed : function() {
		var total = 0;
		this.instances.forEach(function(instance) {
			if (instance.ramUsed) total += instance.ramUsed;
		})
		return Math.round(total / (1024*1024));
	},
	
	getClassName : function() {
		var className = "MemcacheService " + this.getExpandClassName();
		className += " MemcacheService"+this.instances.length+"Instances";
		if (this.instanceMessage) 	className += " ShowInstanceMessage";
		if (this._instanceError)	className += " ShowInstanceError";
		if (this.showForm) 	className += " ShowForm";
		if (this.replicationMode == "mirror" && this.instances.length >= 2) 
			className += " HideNewInstance";
		if (!this.isGear6Package()) className += " NonGear6Package";
		// add the replicationState to the service element so we can style inside with it
		className += " ReplicationState"+(this.replicationMode == "none" 
						? "None" : (this.replicationState || "unknown").capitalize());
		return className;
	},

	getHTML : function() {
		this._instancesHTML = this.getInstancesHTML();
		return this.OuterTemplate.evaluate(this);
	},
	
	getInstancesHTML : function() {
		//	if service.replicationState != "initializing"
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
        switch(this.replicationState.toLowerCase()) {
        case "suspended":
            return this.getSuspendedInstancesHTML();
            break;
        case "initializing":
            return this.getInitializingInstancesHTML();
            break;
        default:
			return this.getNormalInstancesHTML();
		}

        //		if (this.replicationState.toLowerCase() == "initializing") {
        //			return this.getInitializingInstancesHTML();
        //		} else {
        //			return this.getNormalInstancesHTML();
        //		}
	},
	
	
	getNormalInstancesHTML: function() {
		this._instanceRowSpan = this.instances.length + 1;		// 1 for new instance row

		var service = this;
		this._instancesHTML = "";
		this.instances.each(function(instance) {
			service._instancesHTML += instance.getHTML();
		});
		return this.InstancesOuterTemplate.evaluate(this);
	},
	
	getInitializingInstancesHTML : function() {
		this._instancesHTML = "";
		var service = this,
			master = null,
			slaves = [],
			normal = []		// TODO: worry later about draw order changing?
		;
		this.instances.each(function(instance) {
			var mirrorState = instance.mirrorState.toLowerCase()
			if 		(mirrorState == "initializing-master") master = instance;
			else if (mirrorState == "initializing-slave") slaves.push(instance);
			else 	normal.push(instance);
		});
		
		// if we're in a wonky state (e.g. master and no slaves or vice versa)
		if (master == null || slaves.length == 0) {
			// just bail and draw normally
			return this.getNormalInstancesHTML();
		}

		// how many rows total for the instances?
		this._instanceRowSpan =     1				// master
								  + slaves.length	// slaves
								  + 1				// progress row
								  + normal.length	// normal
								  + 1;				// new instance row

		// draw the master row
		master._masterRowSpan = 1 + slaves.length;
		this._instancesHTML += master.getMasterHTML() + "\r\r";
		
		// draw the slave row(s)
		slaves.each(function(slave) {
			service._instancesHTML += slave.getSlaveHTML() + "\r\r";
		});
		
		
		// draw the initializing row(s)
		slaves.each(function(slave) {
			service._instancesHTML += slave.getProgressHTML() + "\r\r";
		});


		// draw all of the normal rows
		normal.each(function(instance) {
			service._instancesHTML += instance.getHTML() + "\r\r";
		});

		return this.InstancesOuterTemplate.evaluate(this);
    },

	
	getSuspendedInstancesHTML : function() {
		this._instancesHTML = "";
		var service = this,
			master = null,
			slaves = []
		;
        if (this.instances.length > 0) {
            // Only go through the instances if there ARE any

			this.instances.each(function(instance) {
				var mirrorState = instance.mirrorState.toLowerCase();
				if   (master == null) master = instance;
				else                  slaves.push(instance);
			});
	
			if (master == null) {
					console.log("GSI-HTML: WHOA! no master?!?! for ", this.id);
				return "";
			}
			// how many rows total for the instances?
			this._instanceRowSpan =     1				// master
									  + slaves.length	// slaves
									  + 1;				// new instance row
	
			// draw the master row
			master._masterRowSpan = 1 + slaves.length;
			this._instancesHTML += master.getMasterHTML() + "\r\r";
			
			// draw the slave row(s)
			slaves.each(function(slave) {
				service._instancesHTML += slave.getSlaveHTML() + "\r\r";
			});
        }		
		return this.InstancesOuterTemplate.evaluate(this);
    },

	//
	//	service templates
	//

	OuterTemplate : new Template(
		"<div class='#{_mainClassName}'>\
			<table class='MemcacheServiceTable' cellspacing='0' cellpadding='0'>\
				<tr class='MemcacheServiceHeader'>\
					<td class='MemcacheServiceHeaderCell idCell'>\
						<a class='ExpanderAnchor' \
						   href='javascript:#{globalRef}.onServiceIdClick()'>\
							Service: #{id}</a>\
						<span class='instanceCount -_instanceCount'>#{_instanceCount}</span>\
					</td>\
					<td class='MemcacheServiceHeaderCell actionsCell'>Actions</td>\
				</tr>\
			\
				<tr class='MemcacheService'>\
					<td class='MemcacheServiceDetailsCell statusCell'>\
						<span class='status -_statusTitle'>#{_statusTitle}</span>\
						#{_replicationStatusHTML}\
						&nbsp;&nbsp;&bull;&nbsp;&nbsp;Package:&nbsp;#{packageName}\
					</td>\
			\
					<td class='MemcacheServiceDetailsCell serviceActionsCell'>\
						<a href='javascript:#{globalRef}.onEditService()'>Edit</a> &nbsp;\
						<a class='-_toggleEnabledTitle' \
						   href='javascript:#{globalRef}.onToggleServiceEnable()'>\
							#{_toggleEnabledTitle}</a> &nbsp;\
						<a href='javascript:#{globalRef}.onDeleteService()'>Delete</a>\
					</td>\
				</tr>\
			\
				<tr>\
					<td colspan='2'>\
					  <div class='MemcacheServiceDetails'>\
						<table style='width:100%' cellspacing='0' cellpadding='0'>\
							<tr><td class='SecondaryTableTD'>\
									#{_memoryUsageTableHTML}\
								</td>\
								<td class='SecondaryTableTD' style='padding-left:0px;'>\
									#{_detailsTableHTML}\
								</td>\
							</tr>\
							<tr><td colspan=2>\
								<div class='MemcacheInstances'>\
									#{_instancesHTML}\
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
	
	MemoryUsageDetailsTemplate : new Template(
		"<table class='SecondaryTable roundALLmedium' cellspacing='0' cellpadding='0'>\
			<tr>\
				<td class='header'>Memory Usage</td>\
				<td class='label topLabel instanceCell'>Per Instance</td>\
				<td class='label topLabel totalCell'>Total For Service</td>\
				<td class='label topLabel inUseCell'>Total In Use</td>\
			</tr>\
			#{_memoryUsageTableRowsHTML}\
		</table>"
	),
	
	FlashUsageRowTemplate : new Template(
		"<tr>\
			<td class='label leftLabel'>Flash</td>\
			<td class='value instanceCell -_instanceMemSizeMB'>#{_instanceMemSizeMB}</td>\
			<td class='value totalCell -_serviceMemSize'>#{_serviceMemSize}</td>\
			<td class='value inUseCell'>\
                 <span class=-_sumInstanceRamUsed'>#{_sumInstanceRamUsed}</span> \
                 <span class=-_sumInstanceRamUsedPercent'>#{_sumInstanceRamUsedPercent}</span> \
            </td>\
		</tr>"
	),

	DramUsageRowTemplate : new Template(
		"<tr>\
			<td class='label leftLabel'>DRAM</td>\
			<td class='value instanceCell -_instanceDramMB'>#{_instanceDramMB}</td>\
			<td class='value totalCell -_serviceTotalDramMB'>#{_serviceTotalDramMB}</td>\
			<td class='value inUseCell'>---</td>\
		</tr>"
	),

	ItemCountUsageRowTemplate : new Template(
		"<tr>\
			<td class='label leftLabel'>Item Count</td>\
			<td class='value instanceCell -_instanceItemCount'>#{_instanceItemCount}</td>\
			<td class='value totalCell -_serviceItemCount'>#{_serviceItemCount}</td>\
			<td class='value inUseCell'>\
                <span class='-_serviceItemsUsed'>#{_serviceItemsUsed}</span>    \
                <span class='-_serviceItemsUsedPercent'>#{_serviceItemsUsedPercent}</span>    \
            </td> \
		</tr>"
	),
	
	
	Gear6ServiceDetailsTemplate : new Template(
		"<table class='SecondaryTable roundALLmedium' cellspacing='0' cellpadding='0'>\
			<tr>\
				<td class='label leftLabel threadsCell'>Threads</td>\
				<td class='value threadsCell -threads'>#{threads}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel interfaceCell'>Interface</td>\
				<td class='value interfaceCell -_ethernetInterface'>#{_ethernetInterface}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel tcpPortCell'>TCP Port</td>\
				<td class='value tcpPortCell -tcpPort'>#{tcpPort}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel udpPortCell'>UDP Port</td>\
				<td class='value udpPortCell -udpPort'>#{udpPort}</td>\
			</tr>\
		</table>"
	),
	
	NonGear6ServiceDetailsTemplate : new Template(
		"<table class='SecondaryTable roundALLmedium' cellspacing='0' cellpadding='0'>\
			<tr>\
				<td class='label leftLabel threadsCell'>Threads</td>\
				<td class='value threadsCell -threads'>#{threads}</td>\
				<td class='label leftLabel tcpPortCell'>TCP Port</td>\
				<td class='value tcpPortCell -tcpPort'>#{tcpPort}</td>\
			</tr>\
			<tr>\
				<td class='label leftLabel interfaceCell'>Interface</td>\
				<td class='value interfaceCell -_ethernetInterface'>#{_ethernetInterface}</td>\
				<td class='label leftLabel udpPortCell'>UDP Port</td>\
				<td class='value udpPortCell -udpPort'>#{udpPort}</td>\
			</tr>\
		</table>"
	),

	ReplicationStatusTemplate : new Template(
		"&nbsp;&nbsp;&bull;&nbsp;&nbsp;<span \
			class='replication ReplicationLabel -_replicationTitle'>#{_replicationTitle}</span>"
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
			#{_newInstanceFormHTML}\
		\
			<tr>\
				<td class='MemcacheInstanceHeaderCell MemcacheInstanceButtonCell' \
				    rowspan='#{_instanceRowSpan}'>\
					<button class='ReplicateButton' onclick='#{globalRef}.onToggleReplication()'>\
						#{_replicateActionTitle}\
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
			#{_instancesHTML}\
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
					<input name='mask' class='InlineFormInput maskField' value='#{defaultMaskLen}'>\
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
	
	// NOTE: other templates for individual instances in MemcacheInstance, below
});



var MemcacheInstance = Class.create(ProtoWidget, {
	klass : "MemcacheInstance",
	
	service 			: undefined,
	
	// default properties
	module 				: 1,
	hostname 			: "",
	ip 					: undefined,
	mask 				: 22,
	ramUsed				: 0,
	mirrorState			: "none",
	flashUsed			: 0,
	remoteUpdate 		: 0,
	remoteDelete		: 0,
	syncItemsInitial	: 0,
	syncItemsAdded		: 0,
	syncItemsProcessed	: 0,
	showProgress		: false,
    devAllocated        : 0,
	getElements : function() {
		if (!this.service._drawn) return [];
		var parent = this.service.$main;
		return parent.select(".MemcacheInstance"+this.index);
	},
	
	initializeProperties : function() {
		this.id = this.ip;
	},
	
	
	prepareToDraw : function(mode) {
		// mode is one of "master", "slave", "progress" or (null == "normal")
		if (mode == null) mode = "normal";
		
		this._className = "MemcacheInstance"+this.index;
        if (this.module == 0) {
            this._moduleTitle = "m--";
        } else {
            this._moduleTitle = "m0"+this.module;
        }


		this._actionsHTML = this.ActionsTemplate.evaluate(this);

		var ramUsed = this.ramUsed || 0,
			total = this.service.memory || 0
		;
			
        this._mbytesUsed = Math.round((ramUsed / (1024*1024))).commaize() + " MB";
	
		if (this.service.isGear6Package()) {
			total += this.flashBufferSize;
            this._percentUsedNumber = Math.min(100, (total == 0 ? 0 : Math.round(ramUsed * 100 / total)));
			this._percentUsedGraph = Math.min(100, (total == 0 ? 0 : Math.round(ramUsed * 100 / total)));

            if (this.service.enabled) {
                // make IPs be links to MCR/Statsproxy  IF enabled
                this._ip       = this.IPTemplateG6.evaluate(this);
                this._hostname = this.HostNameTemplateG6.evaluate(this);
            } else {
                this._ip = this.IPTemplate.evaluate(this);
                this._hostname = this.HostNameTemplate.evaluate(this);
            }
        } else {
            total += this.ramAllocated;
            this._percentUsedNumber = Math.min(100, (total == 0 ? 0 : Math.round(ramUsed * 100 / total)));
            this._ip = this.IPTemplate.evaluate(this);
            this._hostname = this.HostNameTemplate.evaluate(this);
            this._percentUsedGraph = this._percentUsedNumber;
		}
	
        this._percentUsedCategory = (this._percentUsedGraph <= this.service.lowPercentUsed 
       			? "low" 
                : (this._percentUsedGraph <= this.service.mediumPercentUsed ? "medium" : "high"));
        
        this._usageGraphHTML = this.UsageGraphTemplate.evaluate(this);
        this._usageHTML = this.UsageTemplate.evaluate(this);
		
        this._progressPercent = 
        	Math.min(100, 
            		(this.syncItemsInitial ? 
                    	Math.floor(this.syncItemsProcessed * 100 / this.syncItemsInitial) : 0));
        this._progressPrefix = this.service.progressPrefix.interpolate(this);
        this._progressSuffix = this.service.progressSuffix.interpolate(this);
        this._progressGraphHTML = this.ProgressGraphTemplate.evaluate(this);
        this._progressRowHTML = this.ProgressTemplate.evaluate(this);
        return this;
    },
	
	// return the HTML for a row in 'normal' mode
	getHTML : function() {
		this.prepareToDraw();
		return this.NormalTemplate.evaluate(this);
	},
	
	
	// return the HTML for a row in 'initializing-master' mode
	getMasterHTML : function() {
		this.prepareToDraw("master");
		return this.MasterTemplate.evaluate(this);
	},
	
	// return the HTML for a row in 'initializing-slave' mode
	getSlaveHTML : function() {
		this.prepareToDraw("slave");
		return this.SlaveTemplate.evaluate(this);
	},
	
	// return the progress graph HTML for a row in 'initializing-slave' mode
	getProgressHTML : function() {
		this.prepareToDraw("progress");
		return this.ProgressTemplate.evaluate(this);
	},

	//
	//	instance templates
	//
	NormalTemplate : new Template(
			"<tr class='MemcacheInstance MemcacheInstanceNormal #{_className}'>\
				<td class='MemcacheInstanceCell moduleCell -_moduleTitle'>#{_moduleTitle}</td>\
				<td class='MemcacheInstanceCell hostnameCell -_hostname'>#{_hostname}</td>\
				<td class='MemcacheInstanceCell ipCell -_ip'>#{_ip}</td>\
				<td class='MemcacheInstanceCell maskCell -mask'>#{mask}</td>\
				<td class='MemcacheInstanceCell usageGraphCell -_usageGraphHTML'>#{_usageGraphHTML}</td>\
				<td class='MemcacheInstanceCell usageCell -_usageHTML'>#{_usageHTML}</td>\
				<td class='MemcacheInstanceCell actionsCell'>#{_actionsHTML}</td>\
			</tr>"
	),

	MasterTemplate : new Template(
			"<tr class='MemcacheInstance MemcacheInstanceMaster #{_className}'>\
				<td class='MemcacheInstanceCell moduleCell -_moduleTitle' \
					rowspan='#{_masterRowSpan}'>#{_moduleTitle}</td>\
				<td class='MemcacheInstanceCell hostnameCell -_hostname'>#{_hostname}</td>\
				<td class='MemcacheInstanceCell ipCell -_ip'>#{_ip}</td>\
				<td class='MemcacheInstanceCell maskCell -mask'>#{mask}</td>\
				<td class='MemcacheInstanceCell usageGraphCell -_usageGraphHTML'\
					rowspan='#{_masterRowSpan}'>#{_usageGraphHTML}</td>\
				<td class='MemcacheInstanceCell usageCell -_usageHTML'\
					rowspan='#{_masterRowSpan}'>#{_usageHTML}</td>\
				<td class='MemcacheInstanceCell actionsCell'>#{_actionsHTML}</td>\
			</tr>"
	),

	SlaveTemplate : new Template(
			"<tr class='MemcacheInstance MemcacheInstanceSlave #{_className}'>\
				<td class='MemcacheInstanceCell hostnameCell -_hostname'>#{_hostname}</td>\
				<td class='MemcacheInstanceCell ipCell -_ip'>#{_ip}</td>\
				<td class='MemcacheInstanceCell maskCell -mask'>#{mask}</td>\
				<td class='MemcacheInstanceCell actionsCell'>#{_actionsHTML}</td>\
			</tr>"
	),

	ProgressTemplate : new Template(
		"<tr class='MemcacheInstanceProgress #{_className}'>\
			<td class='MemcacheInstanceCell moduleCell -_moduleTitle'>#{_moduleTitle}</td>\
			<td class='MemcacheInstanceCell progressCell -_progressGraphHTML' colspan='6'>\
				#{_progressGraphHTML}\
			</td> \
		</tr>"
	),
	
	ProgressGraphTemplate : new Template(
		"<div class='inline_block ProgressDisplay'>\
			#{_progressPrefix}\
			<div class='inline_block ProgressGraph'>\
				<div class='ProgressGraphUsed' style='width:#{_progressPercent}%'></div>\
			</div>\
			#{_progressSuffix}\
		</div>"
	),
	
	UsageGraphTemplate : new Template(
		"<div class='MemcacheUsageGraph'\
			><div class='MemcacheUsageGraphUsed #{_percentUsedCategory}' \
				style='width:#{_percentUsedGraph}%;'></div\
		></div>"
	),

	UsageTemplate : new Template(
		"#{_percentUsedNumber}% #{_mbytesUsed}"
	),

	
	ActionsTemplate : new Template(
		"<a href='javascript:#{service.globalRef}.onRemoveInstance(\"#{ip}\")'>Remove</a>"
    ),

// XXX the 8080 should come from the config
	IPTemplateG6 : new Template(
		"<a href='http://#{ip}:8080' target='_blank'>#{ip}</a>"
    ),

	IPTemplate : new Template(
		"#{ip}"
    ),

	HostNameTemplateG6 : new Template(
		"<a href='http://#{ip}:8080' target='_blank'>#{hostname}</a>"
    ),

	HostNameTemplate : new Template(
		"#{hostname}"
	)


});


// Bring up the editor with a 'new' item
// NOTE: We re-use the same anonymous service each time they ask to do a new edit.
//		 This avoids creating lots of spurious services, and also makes it so the
//		 second new instance they edit will come pre-seeded with the same values they
//		 gave to the first new instance.
MemcacheService.editNewItem = function() {
	if (MemcacheService._newItem == null) {
		MemcacheService._newItemSequence = 1;
		MemcacheService._newItem = new MemcacheService({
			anonymous   : true,			// don't add to MS.Instances list
			autoDraw	: false			// and don't draw automatically
		});
	}
	
	// give the instance a unique id
	MemcacheService._newItem.id = "service_"+MemcacheService._newItemSequence++;
	
	MemcacheService.editor.open(MemcacheService._newItem, 'new')
}



/* TODO: move this to a page object */


var BadVips = badvips.split(" ");		// split returns an array
Object.extend(BadVips, {
	isBad : function(ip) {
		return this.indexOf(ip) != -1;
	},
	
	add : function(ip) {
		if (this.indexOf(ip) == -1) this.push(ip);
	},
	
	remove : function(ip) {
		var i = this.indexOf(ip);
		if (i != -1) this.splice(i, 1);
	}	
});

//
// The stable networks for all interfaces
//
var StableNetworks = stable_networks;

var IPv4Masks = [
	'0.0.0.0',
	'128.0.0.0',	   '192.0.0.0',	      '224.0.0.0',	 '240.0.0.0',
	'248.0.0.0',	   '252.0.0.0',	      '254.0.0.0',	 '255.0.0.0',
	'255.128.0.0',	   '255.192.0.0',     '255.224.0.0',	 '255.240.0.0',
	'255.248.0.0',	   '255.252.0.0',     '255.254.0.0',	 '255.255.0.0',
	'255.255.128.0',   '255.255.192.0',   '255.255.224.0',   '255.255.240.0',
	'255.255.248.0',   '255.255.252.0',   '255.255.254.0',   '255.255.255.0',
	'255.255.255.128', '255.255.255.192', '255.255.255.224', '255.255.255.240',
	'255.255.255.248', '255.255.255.252', '255.255.255.254', '255.255.255.255'
];

Object.extend(StableNetworks, {
	isOk : function(ip, plen, ifname) {
		// Turn the dotted-decimal address string into a number.
		//
		var octets = ip.split(/\./g);
		var address = (parseInt(octets[0]) << 24) |
			(parseInt(octets[1]) << 16) |
			(parseInt(octets[2]) << 8) |
			parseInt(octets[3]);

		// Turn the masklen into a dotted-decimal address string,
		// then turn that into a number.
		//
		var maskstr = IPv4Masks[plen];
		octets = maskstr.split(/\./g);
		var mask = (parseInt(octets[0]) << 24) |
			(parseInt(octets[1]) << 16) |
			(parseInt(octets[2]) << 8) |
			parseInt(octets[3]);

		// Calculate the network and return if it the network
		// is in the stable network list for the interface.
		//
		var network = address & mask;
		return this[ifname].indexOf(network) != -1;
	}
});
