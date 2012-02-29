Class.include("ProtoWidget ClickMask");

/**
 *	Class Menu
 *
 *	A menu is defined as having one or more of the following three parts:
 *		a $button, which is used to show/hide the button (and may show state)
 *		a $popup, which is a frame that is displayed to select something (e.g. on hover or on click)
 *		a $label, which is essentially static text
 *
 *	
 *
 *
 *	To make the menu appear when hovering over the button, set  menu.displayOn="hover"  ,
 *			in which case the menu will auto-hide when the cursor goes outside the menu for a short while.
 *  To make the menu appear when mouse goes down in the button, set  menu.displayOn="down"  ,
 *			in which case the menu will stay down as long as the mouse stays down
 *	To make the menu appear when the mouse is clicked in the button, set  menu.displayOn="up"  or  menu.displayOn="click"  ,
 *			in which case the user will have to click on a menu item, the menu button, or an automatically-shown
 *			click mask to hide the menu.
 *
 *	To make the button or a menu item activate:
 *		- on mouse down, set  menu.activateOn = "down"
 *		- when the mouse is clicked, set  menu.activateOn = "up"  or  menu.activateOn = "click"
 *
 *	By default, the menu will display below and left of the button.  
 *	To change this orientation, set  menu.displayLocation  to:
 *			- some sensical cobination of ("N","S","E","W") of the menu button
 *			- "mouse" to display where the current mouse cursor is located, or
 *		E.g. "upper right" would cause the bottom of the menu to appear above the button, with its right edge aligned with the button
 *	In any case, we will ensure that the menu does not go outside of the viewport as best we can, so the above
 *		 might not be fully respected if the menu is on the edge of the screen.
 **/

// TODO
//		- convert items to instance of some sort of 'Selector' class
//			- onActivate ?
//			- understands that it might have an actionParent or something like that?
//		- action semantics  -- TEST
//			- check for item action
//			- check for item URL (and target)
//			- check for menu action
//		- when/how to use click mask -- avoid flashing, can still click button/menubar?
//		- popup menus have different action semantics
//			- hint change for popup menu on selection
//		- have a 'menubar' concept?
//		- multiple columns with different headers?
//			- split at separators or labels?
//		- if URL and target, write into HREF directly?
//		- another widget as menu 'popup'?
//		- use a specific widget for button
//		- submenus
//		- context menus
//
// BUGS
//		- displayLocation with scrolling

var Menu = Class.create(ProtoWidget, {
	klass : "Menu",
	
	style	: "",					// style attributes to apply to outer Menu element
	className : "",					// class name to apply (with "Menu") to the $main element
	labelClassName : "",			// class name to apply (with "MenuLabel") to the $label element
	buttonClassName : "",			// class name to apply (with "MenuButton") to the $button element
	popupClassName : "",			// class name to apply (with "MenuPopup") to the $popup element
	itemClassName : "",				// class name to apply (with "MenuItem") to each normal item in the menu
	headerItemClassName : "",		// class name to apply (with "MenuHeaderItem") to each label menu item
	labelItemClassName : "",		// class name to apply (with "MenuLabelItem") to each label menu item
	separatorItemClassName : "",	// class name to apply (with "MenuSeparatorItem") to each separator menu item
	
	showButton : true,				// if true, we will output a button
	label : "",						// if not empty, we will output a label
		
	displayOn : "hover",			// "hover" or "down" or "up" or "click"  ("up" and "click" are effectively the same)
	displayLocation : "SW",			// "mouse" or (some sensical combination of "N","S","E","W")
		
	activateOn : "click",			// "down" or "up" or "click"  ("up" and "click" are effectively the same)
	hideOnActivate : true,			// true or false
	
	showClickMask : false,			// TODO
	
	maxPopupHeight : 300,				// maximum height of the popup
									// if not undefined, we'll split the menu items up into columns
									//	trying to make them no taller than this
	
	menuShowInterval : .1,			// # of SECONDS before we will automaticaly show a 'displayOn:hover' menu
	menuHideInterval : .1,			// # of SECONDS before we will automaticaly hide a 'displayOn:hover' menu 
									//	if we're not in the another part of the menu


	_menuVisible : false,			// transient property: is the menu currently visible?
	_autoHide : false,				// transient property: if true, we hide the menu on mouse out after a short delay
	_showingMask : false,			// transient property: are we showing the click mask?

	onDraw : function(parent) {
		var element = this.$main = Element.htmlToElements(this.getHTML())[0];
		parent.insert(element);
		this.hookupEvents();
	},

	// make sure that the popup is smaller than the maxPopupHeight (if defined)
	onAfterDraw : function() {
		if (this.maxPopupHeight == undefined || !this.$popup) return;
		var totalHeight = this.$popup.getHeight();
		if (totalHeight > this.maxPopupHeight) this.divideItemsIntoColumns(totalHeight);
	},
	
	divideItemsIntoColumns : function(totalHeight) {
		// HACK: make the menu display off-screen so we can get the heights of the kids
		this.$popup.setStyle({
			position:"absolute",
			left:-10000,
			display:"block"
		});
		
		var elements = this.$popup.childElements();
		var	heights = elements.invoke("getHeight");

		this.$popup.style.display = "";

		// figure out roughly how many columns we'll need
		var colEstimate = Math.ceil(totalHeight / this.maxPopupHeight);
		// adjust our target max height to spread the items out evenly
		var maxHeight = Math.ceil(totalHeight / colEstimate) + 20;

		// divide the elements up into columns
		var columns = [[]];
		for (var i = 0, bottom = 0, col = 0; i < elements.length; i++) {
			var element = elements[i],
				height = heights[i]
			;
			if (bottom + height > maxHeight && columns[col].length > 0) {
				bottom = 0;
				col++;
				columns[col] = [];
			}
			columns[col].push(element);
			bottom += height;
		}

		// create a table to hold the columns
		var props = {
				menu		: this,
				itemsHTML 	: ""
			}
		;
		for (var i = 0; i < columns.length; i++) {
			props.index = i;
			props.itemsHTML += this.itemColumnTemplate.evaluate(props);
		}
		var tableHTML = this.itemTableTemplate.evaluate(props);
		var table = Element.htmlToElements(tableHTML)[0];

		for (var i = 0; i < columns.length; i++) {
			var cell = table.select(".column"+i)[0],
				column = columns[i],
				length = column.length
			;
			if (!cell) continue; 	//TOTHROW
			for (var e = 0; e < length; e++) {
				var element = column[e];
				cell.appendChild(element);
			}
		}
		
		this.$popup.insert(table);	
	},
	
	itemTableTemplate : new Template(
			"<table class='MenuItemTable' cellspacing=0 cellpadding=0><tr>#{itemsHTML}</tr></table>"
	),
	itemColumnTemplate : new Template(
			"<td class='MenuItemColumn column#{index}'></td>"
	),


	// TODO: use prototype's made up events somehow?
	// override this:  called BEFORE the menu is shown
	onShowMenu : function() {},
	
	// override this: called AFTER the menu is hidden
	onHideMenu : function() {},

	onItemActivate : function(item) {
		this.warn("item activated:",item);
	},

	onButtonActivate : function() {
		this.warn("button activated:",item);
	},

	
	// note: this only works if you define a button at draw() time (i.e. menu.showButton == true)
	setButtonTitle : function(html) {
		if (!this.$button) this.warn("setButtonTitle(\""+html+"\"): button not found");
		$button.innerHTML = html;
	},
	
	// note: this only works if menu.label is not empty at draw() time
	setLabel : function(html) {
		if (!this.$label) this.warn("setButtonTitle(\""+html+"\"): label not found");
		$label.innerHTML = html;
	},
	
	
	// don't override this -- use "onShowMenu" instead
	// NOTE:  this._mouseDownPoint is (in theory) the point where the mouse went down
	showMenu : function() {
		this.clearDelay("visibilityTimer");
		// TODO: bring to top and align with MenuButton or (mouse if displayLocation == "mouse")
		// TODO: click mask thinger
		// TODO: add scripty effects if scripty is defined
		this.onShowMenu();
		this.$main.addClassName("MenuVisible");
		this._menuVisible = true;

		if (this.showClickMask) {
			if (!this.clickMask) {
				var menu = this;
				this.clickMask = new ClickMask({
					callback : function(event) {
						menu.hideMenu(event);
					}
				});
			}
			this.clickMask.show();
		}
		
		this.$popup.absolutize();
		this.$popup.bringToFront();
		this.$popup.locateNear(this.$button, this.displayLocation);
	},

	// don't override this -- use "onHideMenu" instead
	hideMenu : function() {
		this.clearDelay("visibilityTimer");
		// TODO: hide click mask thinger
		// TODO: add scripty effects if scripty is defined
		this.$main.removeClassName("MenuVisible");	
		this.onHideMenu();
		delete this._autoHide;
		this._menuVisible = false;
		if (this.clickMask) this.clickMask.hide();
	},
	
	// don't override this -- use "onItemActivate" instead
	activateItem : function(event, element, item) {
		this.clearDelay("visibilityTimer");
		if (item) {
			if (item.onActivate) {
				item.onActivate(event, element);
			} else if (item.href) {
				this.activateHREF(item.href, item.target || this.target);
			} else {
				this.onItemActivate(item);
			}
		}
		if (this.hideOnActivate) this.hideMenu();
	},

	activateButton : function(event, element) {
		this.clearDelay("visibilityTimer");
		if (this.$button && typeof this.$button.onActivate == "function") {
			this.$button.onActivate(event, element);
		} else if (this.href) {
			this.activateHREF(this.href, this.target);
		} else {
			this.onButtonActivate();
		}
		if (this.hideOnActivate) this.hideMenu();
	},

	activateHREF : function(href, target) {
		if (target == null) {
			window.location = href;
		} else if (target.startsWith("#")) {
			// load the content into the item with this id
			new Ajax.updater(target.substring(1), href);
		} else {
			// load into the frame specified by target
			var windowRef = window.open(href, target);
		}
	},

	/**
	 *	MenuButton Handlers
	 * 	Only override these if you're doing a non-standard interaction pattern, in which case you're on your own.
	 *
	 *	Override "menu.onShowMenu()" and "menu.onHideMenu()" to do interesting things when the menu is shown/hidden.
	 **/
	_onButtonOver : function(event, element) {
		if (this.displayOn == "hover" && this.$popup) this.delay(this._showIfStillInside, this.menuShowInterval, "visibilityTimer");
	},

	_onButtonOut : function(event, element) {
		// TODO: timer to hide
		if (this.displayOn == "hover" && this.$popup) this.delay(this._hideIfNotInside, this.menuHideInterval, "visibilityTimer");
	},
	
	_onButtonDown : function(event, element) {
		if (this.activateOn == "down") {
			this.activateButton(event, element);
		} else if ((this.displayOn == "down" || this.displayOn == "hover")  && this.$popup) {
			this.showMenu(event);
		// if they click in a hovered menu, don't hide until they do another click
		} else if (this.displayOn == "hover" && this.$popup) {
			this._autoHide = true;
		}
	},

	_onButtonUp : function(event, element) {
		if (this.activateOn == "up" || this.activateOn == "click") {
			if (this.href || this.buttonAction) {
				this.activateButton(event, element);
			}
		} else if (this.displayOn == "up" || this.displayOn == "click") {
			this.showMenu(event);
		}
	},
	
	/**
	 *	Menu Item handlers 
	 *	Only override these if you're doing a non-standard interaction pattern, in which case you're on your own.
	 *
	 *	Override "menu.onItemActivate(item)" to do something special when a particular menu item is activated.
	 *	Override "menu.onButtonActivate()" to do something special when the button is pressed
	 **/
	_onItemOver : function(event, element, item) {
		// TODO: submenu stuff here
	},

	_onItemOut : function(event, element, item) {
		if (this.displayOn == "hover") this.delay(this._hideIfNotInside, this.menuHideInterval, "visibilityTimer");
	},

	_onItemDown : function(event, element, item) {
		if (this.activateOn == "down") this.activateItem(event, element, item);
	},
	
	_onItemUp : function(event, element, item) {
		if (this.activateOn == "up" || this.activateOn == "click") this.activateItem(event, element, item);
	},



	// show the menu if we've hovered for a little bit
	_showIfStillInside : function(event) {
		if (this._activePartId != null) {
			this.showMenu();
			this._autoHide = true;
		}
	},

	// hide the menu if we waited a little bit and we're not inside a piece of the menu
	_hideIfNotInside : function(event) {
		if (this._autoHide && this._activePartId == null) {
			this.hideMenu();
		}
	},

	// hookup events after draw
	hookupEvents : function() {
		// bind the generic callback handlers once to this object,
		//	so we don't waste time doing it over and over during events
		this._eventDispatcher = this._eventDispatcher.bind(this);
		this._hideIfNotInside = this._hideIfNotInside.bind(this);
		this._showIfStillInside = this._showIfStillInside.bind(this);


		// get the button element and set up its event handlers to point back to us
		this.$button = this.$main.select(this.buttonClassName ? "."+this.buttonClassName : ".MenuButton")[0];
		if (this.$button) {
			for (var event in this.buttonEventHandlerMap) {
				this.$button.observe(event, this._eventDispatcher);
			}
		}
		
		// get the menu popup and and set up its event handlers to point back to us
		this.$popup = this.$main.select(this.popupClassName ? "."+this.popupClassName : ".MenuPopup")[0];
		if (this.$popup) {
			for (var event in this.itemEventHandlerMap) {
				this.$popup.observe(event, this._eventDispatcher);
			}
		}
		
		// get the label element and set up its event handlers to point back to us
		this.$label = this.$main.select(this.labelClassName ? "."+this.labelClassName : ".MenuLabel");		
	},
	buttonEventHandlerMap : {mouseover:"_onButtonOver", mouseout:"_onButtonOut", mousedown:"_onButtonDown", mouseup:"_onButtonUp"},
	itemEventHandlerMap : {mouseover:"_onItemOver", mouseout:"_onItemOut", mousedown:"_onItemDown", mouseup:"_onItemUp"},


	// generic event dispatcher
	_eventDispatcher : function(event) {
		var part = this.getPartForEvent(event),
			element = (part ? part.element : undefined),
			partId = (part ? part.partId : undefined)
		;

		// remember which item is currently active
		if (event.type == "mouseout") 	delete this._activePartId;
		else 							this._activePartId = partId;

		if (event.type == "mousedown") 	this._mouseDownPoint = {x:event.pointerX(), y:event.pointerY()};

		if (partId != null) {
			var item;
			if (this.items) item = this.items[parseInt(partId)];
			
			if (partId == "button") methodName = this.buttonEventHandlerMap[event.type];
			else					methodName = this.itemEventHandlerMap[event.type];
			
			var method = (item ? item[methodName] : null) || this[methodName];

			if (typeof method == "function") {
				method.call(this, event, element, item);
				event.stop();			// XXX always stop?  delegate to event handlers?
			}
		}
		// don't event.stop() if event was not handled
	},
	


	/**
	 *	Return HTML for the various bits of the menu
	 **/
	getHTML : function() {
		this.buttonHTML = this.getButtonHTML();
		this.labelHTML = this.getLabelHTML();
		this.popupHTML = this.getPopupHTML();
		return this.MainTemplate.evaluate(this);
	},
	
	getButtonHTML : function() {
		if (this.showButton) return this.ButtonTemplate.evaluate(this);
	},
	
	getLabelHTML : function() {
		if (this.label) return this.LabelTemplate.evaluate(this);
	},
	
	getPopupHTML : function() {
		if (!this.items) return;
		
		this.popupItemsHTML = "";
		for (var i = 0; i < this.items.length; i++) {
			var item = this.item = this.items[i];
			item.index = i;
			if (item.isSeparator) {
				this.popupItemsHTML += this.SeparatorItemTemplate.evaluate(this);						
			} else if (item.isHeader) {
				this.popupItemsHTML += this.HeaderItemTemplate.evaluate(this);
			} else if (item.isLabel) {
				this.popupItemsHTML += this.LabelItemTemplate.evaluate(this);
			} else {
				this.popupItemsHTML += this.ItemTemplate.evaluate(this);
			}
		}
		return this.PopupTemplate.evaluate(this);
	},
	
	MainTemplate : new Template(
					"<div class='Menu #{className}' style='#{style}'>\
						#{labelHTML}\
						#{buttonHTML}\
						#{popupHTML}\
					<\/div>"),
	ButtonTemplate : new Template(
					"<a partId='button' class='MenuButton #{buttonClassName}'\
						href='#'\
					 >\
						#{title}\
					 <\/a>"),
	LabelTemplate : new Template(
					"<span class='MenuLabel #{labelClassName}'>#{label}</span>"),
	PopupTemplate : new Template(
					"<div class='MenuPopup #{popupClassName}' partId='-1'>\
						#{popupItemsHTML}\
					<\/div>"),

	ItemTemplate : new Template(
					"<a partId='#{item.index}' class='MenuItem #{itemClassName} #{item.className}' href='#'>\
						#{item.title}\
					<\/a>"),
	LabelItemTemplate : new Template(
					"<span partId='#{item.index}' class='MenuLabelItem #{labelItemClassName} #{item.className}'>\
						#{item.title}\
					<\/span>"),
	HeaderItemTemplate : new Template(
					"<span partId='#{item.index}' class='MenuHeaderItem #{headerItemClassName} #{item.className}'>\
						#{item.title}\
					<\/span>"),
	SeparatorItemTemplate : new Template(
					"<hr partId='#{item.index}' class='MenuSeparatorItem #{separatorItemClassName} #{item.className}'/>")


});



var PopupMenu = Class.create(Menu, {
	klass : "PopupMenu",
	className : "PopupMenu"
});





