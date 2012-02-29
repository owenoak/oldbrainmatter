new $.ScrollContainer.subclass({
	reference 	: "$.Menu",
	collector	: "$.Menus",		//REFACTOR: do activeMenu as Menu.selectedMenu via collector
	
	Class : {
		// only one menu is active at a time
		activeMenu		: undefined,

		// hide the active menu
		hide : function() {
			if ($.Menu.activeMenu) $.Menu.activeMenu.hide();
			delete $.Menu.activeMenu;
		}
	},

	prototype : {
		// REQUIRED
		id				: undefined,	// html id for the menu

		// OPTIONAL
		_cssClass		: "Menu",
		orientation		: "vertical",
		
		animationStyle	: "fade",
		eventHandlers	: ["click"],
		$parent			: "body",
		
		selectable		: false,		// if true, we maintain a (single) selection
		displaySelector	: undefined,	// global css selector for element(s) which show the menu's value

		_alwaysRedraw		: true,		// redraw every time we show() (necessitated by a jQuery bug)

		itemClass		: "$.MenuItem",
		labelClass		: "$.MenuLabel",
		separatorClass	: "$.MenuSeparator",

		// return the html to display in our displaySelectors
		getDisplayHtml		: function(item, title){	return title; },

	
		//
		// special setters
		//
		
		// special createItem so we can create menus with simple strings
		createItem : function(value) {
			var options = (typeof value !== "object" ? { value: value } : value);

			if (typeof value === "string") {
				if (value === "-") return $.createClass(this.separatorClass, options);
				if (value.charAt(0) === "-") {
					options.value = value.substr(1);
					return $.createClass(this.labelClass, options);
				}
			}
			var item = $.createClass(this.itemClass, options);
			return item;
		},
		
		onClick : function() {
			this.hide();
		},
		
		onSelectedItem : function(item) {
			this.updateDisplay();
		},
		
		// item.value -> title transformer (function or object)
		getItemTitle : function(value){
			return value
		},

		getItemValue : function(item) {
			return item.value;
		},
		
		onItemClick : function(item) {
			this.hide();
			var value = this.getItemValue(item);
			
			if (this.selectable) this.select(value);
			
			if (item.onSelect) {
				item.onSelect(value, item);
			} else if (this.onSelect) {
				this.onSelect(value, item);
			}
		},

		show : function show() {
			// hide any other menu that is currently visible
			$.Menu.hide();
			// remember that we're showing			
			$.Menu.activeMenu = this;
	
			// show the clickMask
			$.ClickMask.show($.Menu.hide);

			this.as($.Container, "show", arguments);
			this.highlightSelection();
			this.$element.moveToTop();
		},

		hide : function hideMenu() {
			this.as($.Container, "hide");
			$.ClickMask.hide()
			delete $.Menu.activeMenu;
		},

		// update the 'item' of the menu
		updateDisplay : function() {
			if (!this.displaySelector) return;
			
			var displays = $(this.displaySelector);
			if (!displays.length) return;
			var item = this.selection,
				title = (this.getItemTitle ? this.getItemTitle(item) : item)
			;
			var html = this.getDisplayHtml(item, title);
			displays.html(html);
		}
	}
});

new $.Container.subclass({
	reference : "$.MenuGroup",
	prototype : {
		_cssClass		: "MenuGroup"
	}
});

new $.Drawable.subclass({
	reference : "$.MenuItem",
	prototype : {
		_cssClass		: "Item MenuItem",
		value			: undefined,
		getTitle		: function() {return this.container.getItemTitle(this.value) },

		template 		: "<li class='#{className} #{_cssClass}' #{getAttributes()}>#{getTitle()}</li>",
		eventHandlers 	: "click",
		onClick : function() {
			this.container.onItemClick(this);
		}
	}
});

new $.Drawable.subclass({
	reference : "$.MenuLabel",
	prototype : {
		_cssClass		: "MenuLabel",
		value			: undefined,
		getTitle		: function() {	return this.container.getItemTitle(this.value) },

 #{_cssClass}' #{getAttributes()}
		template : "<li class='#{className} MenuLabel'>#{getTitle()}</li>"
	}
});

new $.Drawable.subclass({
	reference : "$.MenuSeparator",
	prototype : {
		template : "<hr class='Separator'>"
	}
});
