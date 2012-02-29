
// Utility functions added to all elements.

(function($) {	// begin hidden from global scope
var fn = $.fn;

var maxZIndex = 10000;
$.extend(fn, {

	// Move a set of elements to an ever-increasing z-index to show them above other things.
	//	Note: due to HTML limitations, this only works for elements within the same parent.
	moveToTop : function() {
		this.css("zIndex", maxZIndex++);
		return this;
	},
	

	// Show the selected elements near another element, centered on the mouseX.
	positionNear : function(target, centerX) {
		target = $(target);
		var offset = target.offset(),
			targetTop = offset.top,
			targetHeight = target.height(),
			myWidth = this.width()
			myHeight = this.height(),
			bodyWidth = $("body").width(),
			bodyHeight = $("body").height()
		;
		// if mouseX was not provided, center on the target
		if (centerX == null) centerX = offset.left + (target.width() / 2);
		
		if ( (centerX + (myWidth / 2)) > bodyWidth ) {
			left = bodyWidth - (myWidth + 20);
		} else {
			left = Math.max(0, centerX - (myWidth / 2));
		}
	
		var top = targetTop + targetHeight + 5;
		if (top + myHeight > $("body").height()) {
			top = targetTop - myHeight;
		}
		top = Math.max(10, top);
		
		this.css({top: top, left:left});
		return this;
	},
	
	
	// Scroll the page so the element(s) are in view.
	scrollIntoView : function() {
		var page = $('html'),
			pageHeight = page.height(),
			pageVisibleTop = page[0].scrollTop,
			pageVisibleBottom = pageVisibleTop + pageHeight,
			
			myTop = Math.floor(this.offset().top)
		;
	
		if (myTop < pageVisibleTop) {
			pageVisibleTop = myTop;
			
		} else if (myTop > pageVisibleBottom) {
			pageVisibleTop = myTop - 40;	// 40 is a hack...
		} else {
			// we're within the visible region, forget it
			return;
		}
		
		$('html,body').animate( { scrollTop:pageVisibleTop }, 250);
	},
	
	
	// Toggle a bunch of classes on/off, changing the DOM node only once.
	toggleClasses : function(parameters) {
		for (var i = 0, element; element = this[i++];) {
			var classes = element.className.split(/\s+/);
			for (var name in parameters) {
				var index = classes.indexOf(name),
					present = index != -1,
					shouldBePresent = parameters[name]
				;
				if (present) {
					if (shouldBePresent == false) classes.splice(index, 1);
				} else {
					if (shouldBePresent == true)  classes.push(name);
				}
			}
			element.className = classes.join(" ");
		}
		return this;
	}
});

})(jQuery);	// end hidden from global scope
