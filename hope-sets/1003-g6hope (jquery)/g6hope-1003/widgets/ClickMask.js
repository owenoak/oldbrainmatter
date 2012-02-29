(function($) {	// begin hidden from global scope

//
//	ClickMask	- singleton
//
jQuery.extend({
	ClickMask : {
		draw : function() {
			$("body").append($.ClickMask.template);
			this.isDrawn = true;
			return this;
		},
	
		onClick : undefined,
		
		show : function(onClick) {
			if (!this.isDrawn) this.draw();
			this.onClick = onClick;
			$("#ClickMask").moveToTop().show()
		},
		
		hide : function() {
			$("#ClickMask").hide();
		},
		
		click : function() {
			this.hide();
			if (this.onClick) this.onClick();
		},
		
		template : "<div id='ClickMask' onclick='if (window.$ && $.ClickMask) $.ClickMask.click()'></div>"
	}
});


})(jQuery);	// end hidden from global scope
