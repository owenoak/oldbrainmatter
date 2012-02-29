//
// abstract service class
//

(function($) {	// begin hidden from global scope

window.Service = new $.Class({
	reference 	: "gear6.Service",
	collector	: "gear6.Services",
	
	prototype : {
		getIdentifier : function() {
			return $.string.toLegalId(this.name);
		},
		
		//REFACTOR:  implement changeIdentifier
	}
});


//debugging
window.Services = gear6.Services;


})(jQuery);	// end hidden from global scope
