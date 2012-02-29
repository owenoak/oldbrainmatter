//TODO: 	* do the defaultOpacity stuff with css classes?
//			* handle three types of tool sets:
//					[a,b,c]
//					[[a,b],[c,d]]
//					{a:a:, b:b}


dnb.Canvas.createSubclass("Toolbar", {
	defaultCursor 	: "pointer", 
	
	tools			: null,
	controller	 	: null,
	sizeToParent	: false,
	autoHide 		: false,
	
	gravity 		: "n",	// gravity for showing, "n", "se", "c"(enter)
	stayOnScreen	: true,

	defaultStyles 	: [
		dnb.StyleFactory.getStyle("gradient:n,[0.2,green],[1,lightGreen]","Toolbar-button-selected"),
		dnb.StyleFactory.getStyle("gradient:n,[0.2,green],[1,lightGreen]","Toolbar-button-down"),
		dnb.StyleFactory.getStyle("gradient:n,[0.2,lightBlue],[1,blue]","Toolbar-button-normal"),
		dnb.StyleFactory.getStyle("gradient:n,[0.2,yellow],[1,brown]","Toolbar-button-focused"),
		dnb.StyleFactory.getStyle("gradient:n,[0.2,#eeeeee],[1,#cccccc]","Toolbar-button-disabled"),
		dnb.StyleFactory.getStyle("gradient:n,[0.2,#aaaaaa],[1,#000000]","Toolbar-button-outline")
	],
	
	columns 		: 2,
	
	defaultOpacity 	: 1,

	childProperties : {
		onChildrenChanged : function(what, who, where) {},
		onSelectionChanged : function(what, who) {},
	},
	
	buttonClass		: "Rect",
	buttonProps 	: {
		width : 32,
		height : 32,
		margin:2,
		stroke : "Toolbar-button-outline",
		lineWidth:2,
		isEditable : false,

		stateStyles : {
			normal : {
				fill : "Toolbar-button-normal"	
			},
	
			focused : {
				fill : "Toolbar-button-focused"	
			},
	
			down : {
				fill : "Toolbar-button-down"
			},
	
			selected : {
				fill : "Toolbar-button-selected"
			},
			
			disabled : {
				fill : "Toolbar-button-disabled"		
			}
		}
	},
	
	iconWidth : 20,
	iconHeight : 20,
	iconProps : {},


	calculateSize : function() {
		// if width and height have been specified, use those
		if (this.width != null && this.height != null) return this.inherit("calculateSize",arguments);
		
		// otherwise calculate by the number of tools & buttons
		var buttonProps = this.buttonProps,
			padding = buttonProps.padding,
			margin = buttonProps.margin,
			itemWidth = buttonProps.width,
			itemHeight = buttonProps.height,
			width = (itemWidth + margin) * Math.min(this.columns, this.tools.length),
			height = (itemHeight + margin) * Math.ceil(this.tools.length / this.columns) + 1
		;
		return {width: width, height:height};
	},
	
	makeChildren : function() {
		this.inherit("makeChildren", arguments);
		if (this.tools) this.makeTools();
	},

	makeTools : function() {
		var tools = this.tools,
			buttonProps = this.buttonProps,
			margin = buttonProps.margin,
			location = {top : margin, left:margin},
			col = 0,
			children = []
		;
		
		if (tools && tools.length == null) tools = dnb.getHashValues(tools);
		
		for (var i = 0; i < tools.length; i++) {
			var tool = tools[i];
			if (tool == null) continue;
			
			var button = this.makeToolButton(tool, location);
			if (button) {
				children.push(button);
				if (tool.icon) children.push(this.initToolIcon(tool, button));

				if (++col >= this.columns) {
					col = 0;
					location.top += buttonProps.height + margin;
					location.left = margin;

				} else {
					location.left += buttonProps.width;// + margin;		// have edges overlap		
				}
			}
		}	
		// add all the buttons at once at the end (more efficient)
		this.addChildren(children);	
	},
	
	makeToolButton : function(tool, location) {
			var buttonClass = (this.buttonProps.buttonClass || this.buttonClass),
				button = new dnb[buttonClass](
								this.buttonProps, 
								location,
								{	
									updateState : function(skipRedraw) {
										this.inherit("updateState", arguments);
										if (this.icon) this.icon.redraw();
									}
								}

							);

			if (tool.disabled)	button.disable();
			else				button.updateState();		// sets to "normal" state
			
			button.tool = tool;
			return button;
	},
	
	initToolIcon : function(tool, button, location) {
		if (typeof tool.icon == "string") tool.icon = new dnb.Bitmap({url:tool.icon});
		if (!(tool.icon instanceof dnb.Shape)) {
			console.debug("makeToolIcon(",tool,"): tool.icon must be a Shape: ", tool.icon);
			return (tool.icon = null);
		}

		var icon = tool.icon, 
			left = location ? location.left : button.left + (button.width / 2) - (this.iconWidth / 2),
			top  = location ? location.top  : button.top  + (button.height / 2) - (this.iconHeight / 2)
		;
		icon.setProperties(
			this.iconProps,
			{
				left 			: left + icon.left,
				top  			: top + icon.top,
				mouseHitStyle	:"none",
				width			: icon.width || this.iconWidth,
				height			: icon.height || this.iconHeight,
				opacity			: (tool.disabled ? .3 : 1)
			}
		);

		button.icon = icon;
		return icon;
	},
	
	show : function() {
// TODO: put up a global mouse handler/hider (can pass through event, though)

		dnb.Canvas.prototype.show.apply(this, arguments);
		if (this.autoHide) {
			this.justShownAndNoCommandTaken = true;
			var toolbar = this;
			setTimeout(function(){ delete toolbar.justShownAndNoCommandTaken}, 500);
		}
		if (this.defaultOpacity != 1) {
			this.setElementOpacity(this.defaultOpacity);
		}
		return this;
	},

	showAsMenu : function(event) {
		this.show.apply(this, arguments);

		if (!this._onDoneShowing) {
			var toolbar = this;
			this._onDoneShowing = function(event) {
				if (toolbar._justShown) {
					delete toolbar._justShown;
					return;
				}
				toolbar.hide();
				dnb.removeGlobalEvent("mouseup", toolbar._onDoneShowing, true);
			}
		}

		this._justShown = (event.type == "contextmenu" || event.type == "mousedown");
		dnb.addGlobalEvent("mouseup", this._onDoneShowing, true);
	},

	onMouseOver : function(event) {
		if (this.defaultOpacity != 1) {
			this.setElementOpacity(1);
		}	
	},

	onMouseDown : function(event) {
		if (this.focusButton) this.setStateOfChild("down", this.focusButton);
		event.stopPropagation();
	},
	
	onMouseMove : function(event) {
		var point = this.getMousePoint(event),
			target = this.getMouseTarget(point),
			isEnabled = target && target.tool.disabled != true
		;

		if (target == this.focusButton) return;

		if (isEnabled && this.focusButton != target) {
			this.focusButton = target;
			this.focusChild(this.focusButton);
//controller.showNotice(target.tool.title);
			this.showStatus(target.tool.title);
		
		} else {
			this.defocusChild();
			delete this.focusButton;
			this.clearStatus();
		}

		event.stopPropagation();
	},

	onMouseOut : function(event) {
		this.defocusChild();
		if (this.defaultOpacity != 1) {
			this.setElementOpacity(this.defaultOpacity);
		}
		event.stopPropagation();
	},
	
	onMouseUp: function(event) {
		var button = this.focusButton;
		if (button) this.clearStateOfChild("down", button);
		if (button 
			&& !button.disabled
			&& !this.childIsSelected(button)) 
		{
			var tool = button.tool;
			
			if (tool instanceof dnb.Command) {
				this.controller.performCommand(event, tool);
			} else{
				this.selectChild(button);
				this.controller.selectTool(event, tool);
			}
		}
		this.defocusChild();
		event.stopPropagation();
	}
});
