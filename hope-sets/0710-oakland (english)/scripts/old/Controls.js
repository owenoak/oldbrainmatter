


/* CONVERTED INTO controls.classes 

//
//	Panel -- a panel that shows some HTML or other content
//
//	TODO: 	Error look for the panel itself?
//			How to update the loading message
//			setFlag is not working
//			better styling on messages -- put them in a "Notice" ?
//
function Panel(props1, props2, etc) {
	Control.apply(this, arguments);
}
Control.createSubclass(Panel, {
		template 			: "controls#Panel",
		border				: "Panel",

		src 				: 	"",				// url to load
		content				: 	"",				// content to show initially

		loadingMessage 		: 'Loading ${url}...',
		loadingIcon			: 'loadingDots',
		
		errorMessage 		: 'Error loading ${url}',
		errorIcon			: '',
		
		cancelledMessage 	: 'Loading stopped.',
		cancelledIcon		: '',
		
		cancelButtonTitle 	: 'Cancel',
		tryAgainButtonTitle	: 'Try Again',

		afterDraw : function afterDraw() {
			this.load();
		},

		setSrc : function setSrc(src) {
			if (src) this.src = src;
			this.load();
		},
		
		load : function load() {
			if (this._isLoading || !this.domNode) return;
			if (this.src) {
				this.setFlag("loading", true, Control.SKIP_UPDATE);
				this.setFlag("cancelled", false, Control.SKIP_UPDATE);
				this.setFlag("error", false);
				this.showLoadIcon(this.loadingIcon);

				var self = this;
				this._xhr = hope.loadUrl(this.src, null, function(text){self.onLoaded(text)}, function(message){self.onLoadError(message)});
			} else {
//				this.setContents("");
			}	
		},

		onLoaded : function onLoaded(text) {
			this.setFlag("_isLoading", false);
			this.hidePart("loadIcon");
//			this.setContents(text);
		},
		
		onLoadError : function onLoadError(message) {
			if (this._xhr) this._xhr.abort();
			this.setFlag("_loadError", true);
			this.setFlag("_isLoading", false);
			this.showLoadIcon(this.errorIcon);
//			this.setContents(message);
		},
		
		onCancel : function onCancel() {
			this.setFlag("_wasCancelled", true);
			this.onLoadError();
			this.showLoadIcon(this.cancelledIcon);
		},
		
		showLoadIcon : function showLoadIcon(iconName) {
			if (iconName) {
				this.setPartClass("loadIcon", "loadIcon " + iconName);
				this.showPart("loadIcon");
			}
		},
		
		hideLoadIcon : function hideLoadIcon() {
			this.hidePart("loadIcon");
		}		
});
*/


/* CONVERTED INTO controls.classes 
//
//	class Button
//		Normal button with stretchy images
// 
function Button(props1, props2, etc) {
	Control.apply(this, arguments);
}
Control.createSubclass(Button, {
	template		: "controls#Button",
	border			: "Button",

	canSelectText	: false,
	handleEvents	: true,
	
	title 			: "",
	icon 			: "",
	
	beforeDraw : function (element, template) {
		if (element) this.title = this.title + element.innerHTML;
		this.setIcon();
		this.setTitle();
	},

	setIcon : function(icon) {
		if (typeof icon != "undefined") {
			this.icon = icon;
		}
		this.setFlag("hasIcon", Boolean(this.icon));
		this.setPartClass("icon", this.icon);
	},
	
	setTitle : function(title) {
		if (typeof title != "undefined") {
			this.title = title;
		}
		this.setFlag("hasTitle", Boolean(this.title));
		this.setPart("title", this.title);
	}
});

*/


/* CONVERTED INTO controls.classes 
//
//	class Icon
//		 Button that is just a single icon that can change
//
function Icon(props1, props2, etc) {
	Button.apply(this, arguments);
}
Button.createSubclass(Icon, {
	template		: "controls#Icon",
	border			: null,
	icon	 		: "smallButton"
});

*/


/* CONVERTED INTO controls.classes 

//
//	class Checkbox
//		 Button with an on and off state
//
function Checkbox(props1, props2, etc) {
	Button.apply(this, arguments);
}
Button.createSubclass(Checkbox, {
	template		: "controls#Checkbox",
	border			: null,
	icon	 		: "Check",
	
	checked			: false,
	
	init 			: function() {
		this.setFlag("checked", this.checked);
		Control.prototype.init.apply(this,arguments);
	},
	onclick			: function(event, target) {
		this.setFlag("checked", this.checked = !this.checked);
	}
});
*/





/*	Menu
		 Select from a set of choices.  Used by MenuButton and Select.
		 
		 TODO:	- semantics for radio buttons menu items?  	radioGroup='name' ?
		 		- rename item.onclick => item.action ?  
		 		- 
*/
function Menu(props1, props2, etc) {
	Control.apply(this, arguments);
}
Control.createSubclass(Menu, {
	template 		: "controls#Menu",
	border			: "Menu",
	
	handleEvents	: true,
	
	rowClass		: "MenuItem",
	_currentTarget	: null,


	beforeDraw : function() {
		// figure out if any of our menuItems have icons, checks or submenus
		var showIcon = false,
			showCheck = false,
			showSubmenu = false
		;
		for (var i = 0, kid; kid = this.children[i]; i++) {
			kid.id = this.id + "_MenuItem_" + i;
			kid.index = i;
			showIcon = showIcon || kid.icon;
			showCheck = showCheck || kid.checkable || kid.radio;	// TODO: radio?
			showSubmenu = showSubmenu || kid.submenu;
		}
		this.setFlag("showIcon", showIcon);
		this.setFlag("showChecks", showCheck);
		this.setFlag("showSubmenu", showSubmenu);
	},

	/* event handling */
	onitemclick : function(item, domEvent, domTarget) {
		if (item.onclick) {
			if (typeof item.onclick == "string") {
				item.onclick = hope.makeFunction(item.onclick);
			}
			item.onclick(this);
		}
	},


	// given a domEvent, figure out which piece of us they clicked on
	getDomTarget : function(domEvent) {
		var domTarget = domEvent.target;
		while (domTarget) {
			if (domTarget == this.domNode) return null;
			if (domTarget.className == this.rowClass) break;
			domTarget = domTarget.parentNode;
		}
		return domTarget;
	},

	onmouseover : function(target, domEvent) {
		var target = this.getDomTarget(domEvent);
		if (!target) return false;
		if (this._currentTarget == target) return false;
		if (this._currentTarget) hope.removeClass(this._currentTarget, "hover");
		hope.addClass(target, "hover");
		this._currentTarget = target;
		
		// TODO: show submenu here if present, creating it if necessary
	},

	onmouseout : function(target, domEvent) {
		hope.removeClass(this._currentTarget, "hover");
		this._currentTarget = null;
		return false;
	},
	
	onmousedown : function(target, domEvent) {
		if (this._currentTarget) hope.addClass(this._currentTarget, "down");
	},

	onmouseup : function(target, domEvent) {
		if (this._currentTarget) hope.removeClass(this._currentTarget, "down");
	},
	
	onclick : function(target, domEvent) {
		if (this._currentTarget) {
			this._selectedIndex = parseInt(this._currentTarget.getAttribute("index"));
			this._selectedItem = this.children[this._selectedIndex];
			this.onitemclick(this._selectedItem, domEvent, this._currentTarget);
		}
	}

});




/*  MenuItem
		One item in a menu, based on Button
*/
function MenuItem(props1, prop2, etc) {
	Button.apply(this, arguments);
}
Button.createSubclass(MenuItem, {
	template		: "controls#MenuItem",
	border			: null,
	handleEvents	: true
});






/*  Select
		Button that displays the value of a set of options
		
		TODO:	* get auto-sizing to options working
				* different HTML w/o table?
*/
function Select(props1, props2, etc) {
	Button.apply(this, arguments);
}
Button.createSubclass(Select, {
	border			: "SelectBorder",

	options			: null,				// options for the select, same semantics as HTML Select

	value			: null,
	_selectedIndex	: -1,
	_selectedItem	: null,
	
	hint			: "Ima Hint",

	canSelectText	: false,
	_trackHover		: true,
	_trackDown		: true,
	
	
	selectOption : function(item) {
		if (typeof item == "number") item = this.options[item];
		this._selectedIndex = item.index;
		this._selectedItem = item;
		if (this._menu) this._menu.hide();
		this.setTitle(item.title);
	},
	
	beforeDraw : function(domNode, template) {
		Button.prototype.beforeDraw.apply(this, arguments);
		if (domNode && this.options == null) {
			var options = domNode.options;
			if (!options) throw Error(this._error(arguments, "No options defined for select!"));
			this.options = [];
			for (var i = 0; i < options.length; i++) {
				var domOption = options[i];
				var option = hope.getAttributes(options[i]);
				this.options.push(option);
				option.index = i;
				option.title = domOption.innerHTML;
				if (option.value == null) option.value = option.title;
				if (typeof option.selected != "undefined") {
					option.selected = true;
					this.selectOption(i);
				}
			}
		}
		// make a menu out of the options
		var select = this,
			menu = this._menu = new Menu(
				{
					border		: "SelectMenu",
					onitemclick : function(item, domEvent, domTarget) {
						select.selectOption(item.index);
					}
				}
			)
		;
		
		var options = this.options;
		for (var i = 0, option; option = this.options[i++];) {
			menu.addChild(option.isAMenuItem ? option : new MenuItem(option));
		}
	},
	
	onclick : function(target, domEvent) {
		this._menu.show();
	},
	
	
	getTitle : function() {
		if (this._selectedIndex) return this.options[this._selectedIndex].title;
		return "<span class='hint'>"+this.hint+"</span>";
	},
	
	getValue : function() {
		if (this._selectedIndex) return this.options[this._selectedIndex].value;
		return null;
	}
});




/*	ItemViewer
		Control that manages a set of "items".

		As opposed to Menu, which has real Control sub-items, 
		the ItemViewer manages its sub-items as a top-level control.

		This is more efficient for dealing with a large set of items
		or a set of items that can change frequently.
		
		Default implementation handles an array of "items",
		but subclasses could do a multi-column list, a tree, etc
*/
function ItemViewer(props1, props2, etc) {
	this.items = [];
	Control.apply(this, arguments);
}
Control.createSubclass(ItemViewer, {
	template 		: "controls#ItemViewer",		// template for the outer list itself
	itemtemplate	: "controls#ItemViewerItem",	// template for each row in the list
	
	multiselect		: false,						// if true, we allow for multiple selection
	
	handleEvents	: true,	
	_itemIdPrefix	: "item_",						// the id of each item will be:  
													//		this.id + "_" + this._itemIdPrefx + item.id


	// override the following methods if you have a non-array set of items
	itemById : function(id) {
		return this.items[id];
	},

	getItemId : function(item) {
		return (item.id || this.items.indexOf(item));
	},

	itemFromNode : function(node) {
		var id = node.id;
		id = id.substring((this.id + "_" + this._itemIdPrefix).length);
		return this.itemById(id);
	},


	// this should be generic
	
	// returns true if the domNode in question is one of our item nodes
	isItemNode : function(domNode) {
		return (""+domNode.id).indexOf(this.id + "_" + this._itemIdPrefix) == 0;
	},

	_getItemIdStr : function(item) {
		return this.id + "_" + this._itemIdPrefix + this.getItemId(item);
	},


	getItemNode : function(item) {
		return this.getPart(this._itemIdPrefix+this.getItemID(item));
	},
	


	/* event handling for items of the item */
	onitemclick : function(item, itemNode, domEvent) {
		this.selectItem(item, itemNode, domEvent);
	},

	onitemover : function(item, itemNode, domEvent) {
		hope.addClass(itemNode, "hover");
	},
	
	onitemout : function(item, itemNode, domEvent) {
		hope.removeClass(itemNode, "hover");
	},

	onitemdown : function(item, itemNode, domEvent) {
		hope.addClass(itemNode, "down");
	},
	
	onitemup : function(item, itemNode, domEvent) {
		hope.removeClass(itemNode, "down");
	},
	
	
	onselectitem : function(item, itemNode, domEvent) {
		hope.addClass(itemNode, "selected");	
	},
	
	ondeselectitem : function(item, itemNode, domEvent) {
		hope.removeClass(itemNode, "selected");	
	},
	

	

	// given a domEvent, figure out which piece of us they clicked on
	getDomTarget : function(domEvent) {
		var domTarget = domEvent.target;
		while (domTarget) {
			if (domTarget == this.domNode) return null;
			if (this.isItemNode(domTarget)) return domTarget;
			domTarget = domTarget.parentNode;
		}
		return null;
	},


	// handlers for the main (outer) element delegate to the item under the mouse
	//	NOTE: they will delegate to the "onitem<event>" method of this object
	//	Also, if the item has an "on<event>" handler, that will be called AFTER the "onitem" method above.
	//
	// TODO: double click?
	onmouseover : function(target, domEvent) {
		var target = this.getDomTarget(domEvent);
		if (!target) return false;
		if (this._currentTargetNode == target) return false;
		if (this._currentTarget) {
			this.onitemout(this._currentTarget, this._currentTargetNode, domEvent);
			this.handlePartEvent("mouseover", this._currentTarget, this._currentTargetNode, domEvent);
		}
		this.setCurrent(null, target);
		this.onitemover(this._currentTarget, this._currentTargetNode, domEvent);
	},

	onmouseout : function(target, domEvent) {
		if (this._currentTarget) {
			this.onitemout(this._currentTarget, this._currentTargetNode, domEvent);
			this.handlePartEvent("mouseout", this._currentTarget, this._currentTargetNode, domEvent);
			this.setCurrent();
		}
		return false;
	},
	
	onmousedown : function(target, domEvent) {
		if (this._currentTarget) {
			this.onitemdown(this._currentTarget, this._currentTargetNode, domEvent);
			this.handlePartEvent("mousedown", this._currentTarget, this._currentTargetNode, domEvent);
		}
		return false;
	},

	onmouseup : function(target, domEvent) {
		if (this._currentTarget) {
			this.onitemup(this._currentTarget, this._currentTargetNode, domEvent);
			this.handlePartEvent("mouseup", this._currentTarget, this._currentTargetNode, domEvent);
		}
		return false;
	},
	
	onclick : function(target, domEvent) {
		if (this._currentTarget) {
			this.onitemclick(this._selectedItem, domEvent, this._currentTarget);
			this.handlePartEvent("click", this._currentTarget, this._currentTargetNode, domEvent);
		}
		return false;
	},
	
	// you can call this with either item or itemNode, or null for both to clear
	setCurrent : function(item, itemNode) {
		if (item && !itemNode) {
			itemNode = this.getItemNode(item);
		} else if (!item && itemNode) {
			item = this.itemFromNode(itemNode);
		}
		this._currentTarget = item;
		this._currentTargetNode = itemNode;
	},
	
	// call this when it's time for an item to be selected via the mouse
	// the actual change in the selected state might depend on:
	//		- the current selected state
	//		- any key modifiers in the domEvent (if passed)
	//		- if this item has multiselect
	selectItem : function(item, itemNode, domEvent) {
		if (this.multiselect) {
			var shiftDown = (domEvent ? domEvent.shiftKey : false),
				altDown = (domEvent ? domEvent.altKey : false),
				ctrlDown = (domEvent ? domEvent.ctrlKey : false),
				cmdDown = (domEvent ? domEvent.metaKey : false)
			;
			// TODO!!!
		
		} else {
			if (this._selectedItem) {
				this.ondeselectitem(this._selectedItem, this._selectedNode, domEvent);
			}
			this._selectedItem = item;
			this._selectedNode = itemNode;
			this.onselectitem(item, itemNode, domEvent);
		}
	}

});






//
//	TabPanel a container that manages an array of Panel objects,
//	 with buttons at the top or bottom that mean that one panel can be
//	 seen at a time.
//
//	TODO:
//			- tabButtonProperties
//			- panelProperties
//
function TabPanel(props1, props2, etc) {
	Control.apply(this, arguments);
}
Control.createSubclass(TabPanel, {
	border			: "Panel",
	buttonsOn		: "top",		// "top" or "bottom" (unsupported)

						// READ-ONLY: use tabPanel.select() to set these!
	selected 			: null,			// pointer to the selected panel
	_selectedIndex 		: -1,			// number of the selected panel

	// private properties
	template			: "controls#TabPanel",


	init : function() {
		this.initPanels();
		Control.prototype.init.apply(this,arguments);
	},
	
	initPanels : function() {
		var panels = hope.unemptyArray(this.panels || []);
		this.panels = [];	
		for (var i = 0; i < panels.length; i++) {
			this.addPanel(this._makePanel(panels[i]));
		}
	},
	
	forEachPanel : function(method, arg1, arg2, etc) {
		var args = hope.sliceArgs(arguments);
		args.unshift(this.panels);
		return this.forEach.apply(this, args);
	},

	select : function(panelId) {
		var panel = this._selectedItem = this.getPanel(panelId);
		this._selectedIndex = this.panels.indexOf(panel);
		for (var i = 0; i < this.panels.length; i++) {
			this.panels[i]._panelButton.setFlag("selected", i == this._selectedIndex);
		}
		// TODO: switch the displayed template
	},
	
	getPanel : function(panelId) {
		if (!panelId || panelId._isAPanel) return panelId;
		return hope.fromArrayWhere(this.panels, "id", panelId);
	},

	addPanel : function(panel) {
		this.panels.push(panel);
		this._makeTabButton(panel);
	},
	
	removePanel : function(panelId) {
	
	},
	
	_panelProps : {style:"display:none;"},
	_makePanel : function(props) {
		if (props && props._isAPanel) return props;
		var panel = new Panel(props, this._panelProps);
		this.addChild(panel);
// TODO: draw this in the correct place, rather than depending on the template
		return panel;
	},
	_getPanelParentElement : function() {
		return hope.byId(this.id + "_panelContainer");
	},
	

	// properties of the panel that we apply to the panelButton
	_tabButtonProps : ["title", "hasCloseButton", "state"],
	_makeTabButton : function(panel) {
		if (panel._panelButton) return;
		var props = hope.getNamedProps(panel, this._tabButtonProps);
		props.direction = (this.buttonsOn == "top" ? "up" : "down");
		panel._panelButton = new TabButton(props,{_panel:panel});
		this.addChild(panel._panelButton);
// TODO: draw this in the correct place, rather than depending on the template
	},
	_getTabButtonParentElement : function() {
		return hope.byId(this.id + "_TabBar");
	},
	
	_removeTabButton : function(panel) {
		if (!panel._panelButton) return;

		// TODO: remove the panel button from the dom		
		
		delete panel._panelButton;
	}
});




function TabButton(props1, props2, etc) {
	Button.apply(this, arguments);
}
Button.createSubclass(TabButton, {
	template			: "controls#TabButton",
	border				: "Tab",
	
	closeable  	: false,
	

	beforeDraw : function(domNode, template) {
		this._makeCloseButton();
		Button.prototype.beforeDraw.apply(this, arguments);
	},

	// properties to assign to all close buttons
	_closeButtonProperties : {
		icon:"close"
	},
	_makeCloseButton : function() {
		if (this.closeable && !this._closeButton) {
			this.addChild(this._closeButton = new Icon(this._closeButtonProperties));
		}	
//console.dir(this._closeButton);
	},
	
	// handle close button click and click on the tab itself
	onclick : function(target, domEvent) {
		if (target == this._closeButton) {
			this.disable();
		} else {
			this.parent.select(this._panel);
		}
	}
});


	