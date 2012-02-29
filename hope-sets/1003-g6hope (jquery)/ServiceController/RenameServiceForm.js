//
//	"add servers" form for a MemcacheServiceView.
// 

(function($) {	// begin hidden from global scope

new $.Form.subclass({
	reference	: "ServiceController.RenameServiceForm",

	prototype : {
		template   : "template:RenameServiceForm",
		
		controlSelectors : {
			error : ".errorMessage",
			name : ".serviceName"
		},
		
		onDrawn : function() {
			this.$controls.name.val($.Form.validate.identifier(this.service.name));
			this.updateElements();
		},
		
		updateElements : function(error) {
			var controls = this.$controls;
			// handle the error if supplied
			if (error) {
				controls.error.html(error).show();
				controls.form.attr("error", true);
			} else {
				controls.error.hide().html("");
				controls.form.attr("error", false);
			}
			this.selectControl("name");
		},
		
		onBlurName : function(element) {
			var value = element.value;
			element.value = $.Form.validate.identifier(value);
			return false;
		},
		
		// save the form
		save : function() {
			var service = this.service,
				controls = this.$controls
			;

			// validate the name field
			var newName = controls.name.val();
			if (newName) {
				newName = $.Form.validate.identifier(newName);
				controls.name.val(newName);
			} else {
				this.updateElements($.message("api.renameService.error-required"));
				return false;
			}
			var data = this.data = {
				oldName : this.service.name,
				newName : newName
			}

			request = this.lastRequest = new ServiceController.RenameServiceRequest({
				data	  : data,
				onSuccess : $.bind(this.onSaveSuccess, this),
				onError	  : $.bind(this.onSaveError, this)			
			});

			request.execute();
			return false;
		},
	
		onSaveSuccess : function(data) {
			this.as(ServiceController.RenameServiceRequest, "onSuccess", arguments);
			this.serviceView.closeDrawer();
		},
	
		onSaveError : function(errors) {
			$.Notifier.hide();
			this.updateElements(errors);
		},
		
		// cancel the form
		cancel : function() {
			this.serviceView.closeDrawer();
			return false;
		}
		
	}// end prototype
}); // AddServiceForm


})(jQuery);	// end hidden from global scope
