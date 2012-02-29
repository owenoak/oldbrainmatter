

dnb.Toolbar.createSubclass("PieMenu", {
	autoHide : true,
	
	gravity : "c",
	maxOpacity : .9,

	styles : [
		dnb.StyleFactory.getStyle("#666666", "PieMenu-button-outline"),
		dnb.StyleFactory.getStyle("circle:[0,lightBlue],[.9,blue]", "PieMenu-button-normal"),
		dnb.StyleFactory.getStyle("circle:[0.1,yellow],[0.9,brown]", "PieMenu-button-focused"),
		dnb.StyleFactory.getStyle("circle:[0.1,green],[0.9,lightGreen]", "PieMenu-button-down"),
		dnb.StyleFactory.getStyle("circle:[0.1,lightGreen],[0.9,green]", "PieMenu-button-selected"),
		dnb.StyleFactory.getStyle("lightBlue", "PieMenu-button-disabled")
	],

	controller : null,


	buttonProps : {
		stroke : "PieMenu-button-outline",
		lineWidth:2,
		isEditable : false,

		stateStyles : {
			normal : {
				fill : "PieMenu-button-normal"	
			},
	
			focused : {
				fill : "PieMenu-button-focused"	
			},
	
			down : {
				fill : "PieMenu-button-down"
			},
	
			selected : {
				fill : "PieMenu-button-selected"
			},
			
			disabled : {
				fill : "PieMenu-button-disabled",
				opacity: 1
			}
		}
	},
	

// TODO:  get images from slices in a single icon image

	tools : null,	// NOTE: tools for this menu should be an array of arrays
					//	each array is a different ring (starting in the center)
	
	// NOTE: must be one more of these than the number of tool sets!
	radii : [0, 30, 80, 130],
	startAngles : [270, 270, 270, 270, 270],

	// slop around the outside for lines, etc
	margin : 5,		
	
	calculateSize : function() {
		var toolSetCount = this.tools.length,
			width = (this.radii[toolSetCount] * 2) + this.margin
		;
		return {width: width, height:width};
	},
	
	
	makeTools : function() {
		if (typeof this.tools[0].length == "undefined") this.tools = [this.tools];
		var toolSets = this.tools,
			setCount = toolSets.length,
			width = (this.radii[setCount] * 2) + this.margin,
			height = width,
			left = width/2,
			top = height/2,
			location = {left:left, top:top},
			iconWidth = this.iconWidth,
			iconHeight = this.iconHeight,
			children = []
		;		
		this.width = width*2;
		this.height = height*2;

		// now add a ring for each toolSet
		for (var s = 0; s < setCount; s++) {
			if (!toolSets[s]) continue;
			var tools = toolSets[s],
				toolCount = tools.length,
				degreesPerTool = 360 / toolCount,
				currentAngle = Math.floor(this.startAngles[s+1] - (degreesPerTool/2)),
				innerRadius = this.radii[s],
				outerRadius = this.radii[s+1],
				iconRadius = innerRadius + ((outerRadius - innerRadius) / 2)
			;
			for (var i = 0; i < toolCount; i++) {
				var tool = tools[i],
					button = new dnb.PieMenuWedge(
					this.buttonProps,
					{
						innerRadius	: innerRadius,
						outerRadius	: outerRadius,
						startAngle	: currentAngle,
						endAngle	: (currentAngle + degreesPerTool),
						updateState : function(skipRedraw) {
							this.inherit("updateState", arguments);
							if (this.icon) this.icon.redraw();
						}
					},
					location
				);

				if (tool.disabled)	button.disable();
				else				button.updateState();		// sets to "normal" state

				button.tool = tool;
				tool.button = button;
				children.push(button);
				var iconAngle = currentAngle + (degreesPerTool/2),
					iconLocation = {
						left : left - (iconWidth  / 2) + (toolCount == 1 ? 0 : (iconRadius * Math.cosDegrees(iconAngle))),
						top	 : top  - (iconHeight / 2) + (toolCount == 1 ? 0 : (iconRadius * Math.sinDegrees(iconAngle)))
					}
				;
				if (tool.icon) children.push(this.initToolIcon(tool, button, iconLocation));

				currentAngle += degreesPerTool;
				if (currentAngle > 360) currentAngle = currentAngle % 360;
			}
		}
		this.addChildren(children);
	},

	show : function() {
		dnb.Toolbar.prototype.show.apply(this, arguments);
		
		this.focusButton = this.tools[0][0].button;
		this.focusChild(this.focusButton);
	}
});



dnb.Shape.createSubclass("PieMenuWedge", {
	startAngle : 0,			// MUST override
	endAngle : 45,			// MUST override
	innerRadius : 50,		// MUST override
	outerRadius : 100,		// MUST override
	stroke: "black",
	mouseHitStyle:"path",

	drawPath : function(canvas, props) {
		var context = canvas.context;
		context.beginPath();
		context.arc(0, 0, this.innerRadius, Math.toRadians(this.startAngle), Math.toRadians(this.endAngle), false);
		context.arc(0, 0, this.outerRadius, Math.toRadians(this.endAngle), Math.toRadians(this.startAngle), true);
		context.closePath();
	}
	
});

