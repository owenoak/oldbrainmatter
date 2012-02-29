//
//	VERY basic Form class
//
new $.Container.subclass({
	reference : "$.Form",
	prototype : {
		className : "Form",

		// map of name->selector for html controls of the form we will be managing
		controlSelectors : undefined,

//REFACTOR:  have a 'focusField' ?
		
		onDrawn : function() {
			// find all the controls specified in form.controlSelectors
			var mainElement = this.$element;
			this.$controls = {};
			this.$controls.form = mainElement.find("form") || mainElement;
			if (this.controlSelectors) {
				for (var key in this.controlSelectors) {
					this.$controls[key] = mainElement.find(this.controlSelectors[key]);
				}
			}
		},

		// focus in a particular named control
		focusControl : function(controlName) {
			var control = this.$controls[controlName];
			if (!control) return;
			setTimeout(function(){control.focus()}, 250);
		},
		
		// focus in a particular named control
		selectControl : function(controlName) {
			var control = this.$controls[controlName];
			if (!control) return;
			setTimeout(function(){control.select()}, 250);
		}
		

	},	// end prototype
	
	
	Class : {
		//
		// static validators:
		//		- if the value is completely invalid, throw a TypeError
		//		- if the value can reasonably be coerced to a valid value, returns coerced value
		//	
		validate : {
			positiveInteger : function(string) {
				var num = parseInt(string);
				if (isNaN(num) || num < 0) throw new TypeError();
				return num;
			},
			
			// TODO: transform the string...
			ipAddresses : function(string) {
				string = $.trim(string);
				if (/^(\d+\.\d+\.\d+\.\d+)([ ,;]+\d+\.\d+\.\d+\.\d+)*[ ,;]*$/.test(string) == false) {
					throw new TypeError();
				};

				// normalize to comma-separated with no spaces
				list = string.split(/[ ,;]+/);
				for (var i = list.length; i >= 0; i--) {
					if (list[i] == "") list.splice(i,1);

// TODO: make sure IPs are 0...255
				}
				return list.join(",");
			},
			
			identifier : function(string) {
				string = $.trim(string);
				string = string.replace(/[^_a-zA-Z0-9]/g, "_");
				return string;
			}
		},
	
		filter : {

			/** Only allow numbers */
			positiveInteger : function(event) {
				event = $.event.fix(event);
				if (event.charCode == 0) return true;
				var theChar = String.fromCharCode(event.charCode);
				return (/[0-9]/.test(theChar));
			},

			/** Only allow alpha-numeric + "_" + "-" keys to pass an onKeyPress event */
			identifier : function(event) {
				event = $.event.fix(event);
				if (event.charCode == 0) return true;
				var theChar = String.fromCharCode(event.charCode);
				return (/[-_a-zA-Z0-9]/.test(theChar));
			},
			
			/** Only allow numbers, periods, commas and spaces */
			ipAddresses: function(event) {
				if (event.charCode == 0) return true;
				var theChar = String.fromCharCode(event.charCode);
				return (/[., ;0-9]/.test(theChar));
			}
		}	
	
	}	// end Class
});


