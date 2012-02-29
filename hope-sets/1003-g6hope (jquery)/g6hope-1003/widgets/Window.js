
//
// Window is an abstract class for managing "Windows" which can:
//		- expand/collapse
//		- have 'drawers' which open and close
//
new $.Container.subclass({
	reference : "$.Window",
	prototype : {
		_cssClass : "Window",
		
		// on draw, collapse the window according to a preference
		onDrawn : function() {
			this._collapsed = (this.getPreference("collapsed") == true);
			this.$element.attr("collapsed", this._collapsed);
			if (this._collapsed) this.$element.find(".Body").hide();
		},

		// toggle the collapse state of the window
		toggleCollapse : function() {
			var collapsed = this._collapsed = !this._collapsed;
			this.setPreference("collapsed", this._collapsed);

			this.$element.attr("collapsed", collapsed);
			if (collapsed) {
				this.$element.find(".Body").slideUp("fast");
			} else {
				this.$element.find(".Body").slideDown("fast");
			}
			return false;
		},



		// toggle a window 'drawer' open/closed
		toggleDrawer : function(drawerName) {
			var element = this.$element;
			var openDrawer = element.attr("drawer");
			if (openDrawer != "closed") element.find("."+openDrawer).hide();
			
			if (openDrawer == drawerName) {
				this.closeDrawer();
			} else {
				this.openDrawer(drawerName);
			}
			return false;
		},

		// open a particular drawer
		openDrawer : function(drawerName) {
			var element = this.$element;
			
            var currentDrawer = element.attr("drawer");
            if (currentDrawer == "closed") currentDrawer = null;
            
            // if a drawer of another service is already open, close it
            if (app.openWindow && app.openWindow != this) {
            	app.openWindow.closeDrawer();
            }

            // move the window above other things on the page
            element.moveToTop();
            
            // if a different drawer is already open,
            //  slide the drawers past each other
            if (currentDrawer) {
                element.find("."+drawerName).slideDown("fast");
                element.find("."+currentDrawer).moveToTop().show().slideUp("fast");
            
            } else {
                element.find("."+drawerName).show();
                element.find(".Drawer").slideDown("fast");
            }

            // set the top-level 'drawer' flag which may show or hide some elements
            element.attr("drawer", drawerName);
            
            // select the correct bottom tab (deslecting all of the others first)
            element.find(".BottomTab").removeClass("HIGHLIGHT");
            element.find("."+drawerName+"Tab").addClass("HIGHLIGHT");
    
            // set up a keypress handler to close the drawer on escape
            $("body").bind("keypress", this.onWindowKeyPress);
    
            // remember that this service is open
            app.openWindow = this;
            
            // and stop polling so we don't get updates while the drawer is open
            app.stopRefreshTimer();
            
            return false;
		},
		
		// close a particular drawer
		closeDrawer : function(drawerName) {
			var element = this.$element;
			if (element.attr("drawer") == "closed") return;

            // stop the keypress handler looking for the escape key
            $("body").unbind("keypress", this.onWindowKeyPress);

            // deselect all of the bottom tabs
            element.find(".BottomTab").removeClass("HIGHLIGHT");
    
            // hide the current form
            var currentDrawer = element.attr("drawer");
            if (currentDrawer != "closed") element.find("."+currentDrawer).hide();

            // close the drawer
            element.attr("drawer", "closed");
            element.find(".Drawer").slideUp("fast");
            
            // re-start polling
            app.startRefreshTimer();
            
            delete app.openWindow;
            return false;
		},

		// hide the open drawer when they press the 'esc' key
		onWindowKeyPress : function(event) {
            if (event.keyCode == 27 && app.openWindow) app.openWindow.closeDrawer();
		},
		
		
		template : "<div id='#{id}' class='#{className} #{_cssClass}' #{getAttributes()}>"
				 + "	<div class='Header NOSELECT'>#{getTitle()}</div>"
				 + "	<div class='Body Container'></div>"
				 + "</div>"

		
	}	// end prototype
});


