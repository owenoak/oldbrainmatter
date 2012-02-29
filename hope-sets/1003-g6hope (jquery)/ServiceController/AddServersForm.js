//
//	"add servers" form for a MemcacheServiceView.
// 

(function($) {	// begin hidden from global scope

new $.Form.subclass({
	reference		: "ServiceController.AddServersForm",

	prototype : {
		template   : "template:AddServersForm",
		
		controlSelectors : {
			error : ".errorMessage",
			create : "[type=radio][value=create]",
			count : ".serverCount",
			machineType : ".machineType",
			attach : "[type=radio][value=attach]",
			ips : ".ips",
			name : ".name"
		},
		
		onDrawn : function() {
			this.as($.Form, "onDrawn", arguments);
			
			var focusControl;
			if (this.service._unnamed) {
				// put the identifier name in the "name" field
				this.$controls.name.val($.Form.validate.identifier(this.service.name));
	
				// and focus in the name field
				focusControl = "name";
			}
			this.updateElements(null, null, focusControl);
		},
		
		updateElements : function(mode, error, focusControl) {
			var controls = this.$controls;
	
			if (mode == null) {
				if (ServiceController.config.role != "super") {
					mode = "attach";
				} else {
					mode = controls.form.attr("mode") || "attach";
				}
			}
	
			var attaching = (mode == "attach");
	
			// set the mode on the form
			controls.form.attr("mode", mode);
			
			// handle the error if supplied
			if (error) {
				controls.error.html(error).show();
				controls.form.attr("error", true);
			} else {
				controls.form.attr("error", false);
				controls.error.hide();
			}
			
			// set the radio buttons and field enabled based on the createMode
			controls.attach.attr("checked", attaching);
			controls.create.attr("checked", !attaching);
	
			controls.count.attr("disabled", attaching);
			controls.machineType.attr("disabled", attaching);
			controls.ips.attr("disabled", !attaching);
			
			// focus in the correct field
			if (focusControl == null) focusControl = (mode == "attach" ? "ips" : "count");
			this.selectControl(focusControl);
		},
		
		onBlurName : function(element) {
			var value = element.value;
			element.value = $.Form.validate.identifier(value);
			return false;
		},
		
		onRadioClick : function(element) {
			var mode = element.getAttribute("value");
			this.updateElements(this.serviceView, mode);
			return true;
		},
		
		// save the form
		save : function() {
			var service = this.service,
				controls = this.$controls,
				mode = controls.form.attr("mode"),
				count = parseInt(controls.count.val()),
				ips = $.trim(controls.ips.val()),
				errors = [],
				focusControl,
				mustRename = service._unnamed
			;
	
			// do simple field validation
			if (mode == "create") {
				try {
					count = $.Form.validate.positiveInteger(count);
				} catch (e) {
					errors.push($.message("api.createServers.error-invalid-count"));
					focusControl = "count";
				}
			} else {
				try {
					ips = $.Form.validate.ipAddresses(ips);
				} catch (e) {
					errors.push($.message("api.createServers.error-invalid-ips"));
					focusControl = "ips";
				}
			}
			
			// if we're renaming, make sure that they specified an identifier
			// NOTE: the validate.identifier call may transform the value
			//          but it will never error
			if (mustRename) {
				var newName = controls.name.val();
				newName = $.Form.validate.identifier(newName);
				controls.name.val(newName);
			}
	
			var errorMessage = errors.join("<br>");
			// if there was an error message, show it and exit.
			this.updateElements(this.serviceView, null, errorMessage);
			if (errorMessage) return false;
	
			// set up the data for the call
			this.data = {
				service : (mustRename ? newName : service.name)
			};
			var request,
				data = {
						service : (mustRename ? newName : service.name)
				}
			;
			
			// call the appropriate server operation based on the mode
			if (mode == "create") {
				data.count		= count;
				data.vendorType	= controls.machineType.val();
				data.imageId	= service.servers[0].imageId;
	
				request = new ServiceController.CreateServiceRequest({
					data	  : data,
					onSuccess : $.bind(this.onCreateSuccess, this),
					onError	  : $.bind(this.onCreateError, this)
				});
			} else {
			
				// if the mustRename flag is on, 
				//  add the IP of the first (only) instance of the service
				//  to the list of ips.  A bit wacky, I know.
				if (mustRename) {
					var instanceIp = service.servers[0].ip;
					ips = instanceIp + "," + ips;
				}
				data.ips = ips;
	
				request = new ServiceController.AttachIpsRequest({
					data	  : data,
					onSuccess : $.bind(this.onAttachSuccess, this),
					onError	  : $.bind(this.onAttachError, this)
				});
			}
			request.execute();
	
			this.data = data;
			this.lastRequest = request;		//DEBUG
			
			return false;
		},
	
		onCreateSuccess : function(data) {
			this.as(ServiceController.CreateServiceRequest, "onSuccess", arguments);
			this.serviceView.closeDrawer();
		},
	
		onCreateError : function(errors) {
			$.Notifier.hide();
			this.updateElements(null, errors);
		},
	
		onAttachSuccess : function(data) {
			this.as(ServiceController.AttachIpsRequest, "onSuccess", arguments);
			this.serviceView.closeDrawer();
		},
	
		onAttachError : function(errors) {
			$.Notifier.hide();
			this.updateElements(null, errors);
		},

		// cancel the form
		cancel : function() {
			this.serviceView.closeDrawer();
			return false;
		}
		
	}// end prototype
}); // AddServiceForm


})(jQuery);	// end hidden from global scope
