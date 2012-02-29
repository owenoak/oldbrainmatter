
///////////////
//
//	Shape object -- abstracts details about paths, allowing them to be re-used, etc
//
//		sub-class for interesting classes: 	rectangle, roundRect, circle, star, whatever
//
//
//	If your shape has a "stateStyles" property, the shape will redraw automatically when:
//			-- enable/disable
//			-- (custom state)
//			-- focus/defocus	(mouse or keyboard focus, equivalent generally to 'over')
//			-- select/deselect
//		-- the state displayed will be in the order above 
//			(eg: disabled trumps custom state which trumps focused which trumps...)
//
///////////////

/*
	todo: 	
		* switch to SVG syntax for specifying paths
		* switch to style-like/class syntax for specifying colors/etc
		* parser for "sss" stylesheets
		* make sure quadratics work for resize
		* make caching more aggressive -- assume that if there is a cahce and we haven't redrawn, everything is still the same (?)
			- make items clear cache?

*/



dnb.createClass("Shape", {

	left : 0,					// if left and/or top is not == 0, we translate by that amount before drawing
	top : 0,
	width : 100,
	height : 100,

	angle : null,				// degrees, 0 = 3 o'clock, null = ignore
	centerPoint : "c",			// center point around which we rotate, eg:  "c" or "ne" or {x:#, y:#}
	scale : null,				// either "float" (for scale x = y) or "[floatX, floatY]", null = ignore

	crispLines	: false,			// if true, when drawing we offset bu .5 pixels so horizontals and verticals are crisp

	minWidth 	: 10,			// useful for scaling, must be at least 1
	minHeight 	: 10,

	isEditable : true,			// if true, we automatically change our edit state when select()ed
	mouseHitStyle : "rect",		//	"rect" or "path" or "none" (to avoid mouse hits entirely)
								// controls how we tell if the mouse is inside us
								//	("path" is currently flaky)
	redrawDelay : 100,			// amount of time before we try to redraw again
	lineJoin : "miter",

	//
	//	showing 'handles'
	//
	$showHandles : false,
	handleStyle : "corner",		// "corner" or "box"
	handleColor : "green",
	handleSize  : 6,
	handleAlpha : .5,

	//
	//	showing vertices (of polygons) and control points of curves
	//
	$showPoints: false,				// if true, show control points for bezier and quadratic curves
	$showControlPoints: false,		// if true, show control lines for bezier and quadratic curves
	
	pointSize : 6,					// size of the vertex point handles
	pointStyle : "blue",			// color of the vertex point handles
	controlPointSize : 6,			// color of the control point handles
	controlPoint1Style : "green",		// color of the first control point handle
	controlPoint2Style : "red",	// color of the second control point handle
	controlLineStyle : "#999999",	// color of the control point lines

	edgeSlop : 5,					// radius in which we consider you to be "within" an edge
	pointSlop : 5,					// radius in which we consider you to be "within" a point
	centerSlop: 10,					// radius in which we consider you to be "within" the center

	$showCenter : false,
	$showCenterPoint : false,
	
// TODO: enumerate values as comments	

//	drawMode : "source-over",		// maps to context.globalDrawMode
								// 	source-over, destination-over,
								//	source-in, destination-in,
								//	source-out, destination-out,
								//	source-atop, destination-atop
								//	lighter, darker (not FF)
								//	xor, copy (not FF)
								

	restoreContext : true,		// if true, we save/restore the context draw properties when drawing
								//	else drawing will actually change the context properties as a side effect


	// tools that apply to all shapes
	//	each class can implement their own and they get added to this set (overriding if key is the same)
	//	if key:null in your subclass that will eliminate the menu
	tools : {
		editStroke	: "LineChooser",
		editFill	: "FillChooser",
		rotate		: "RotateTool",
		pickup 		: "PickUpShapeCommand",
		erase 		: "ClearShapeCommand",
		deleter 	: "DeleteCommand"
	},

	toolbarDefaults 	: {
		type			: "Toolbar",
		columns 		: 1,
		defaultOpacity	: .5,
		style			: {position:"absolute"},
		fade			: false,
		buttonClass		: "Circle"
	},


	//
	//	methods
	//


	skipProperties : {	},


	// serialize the element itself
	//	note: if there is bitmap data associated with the object, we output that in serializeContents
	serialize : function(fileName) {
		var props 	= this.getInstanceProperties(this.skipProperties, "$"),
			output 	= ['constructor:"'+ this.constructor.type + '"']
		;
		
		for (var prop in props) {
			var it = props[prop];
			if (typeof it == "string") it = '"'+ encodeURIComponent(it) +'"';
			output.push(["'", prop, "':", it].join(""));
		}
		return "{"+output.join(", ")+" }";
	},

	// if we need to output data that goes in a separate file (like bitmap data) do it here
	serializeContents : function(fileName) {	
		return null;
	},


	//
	// standard property accessors for *all* subclasses
	//	TODO: rather than have them all here, 
	//			have all subclasses apply them to Shape when defined if doesn't exist already?
	//
	getFill : function(canvas) {
		return dnb.StyleFactory.getStyle(this.fill);
	},
	getStroke : function(canvas) {
		return dnb.StyleFactory.getStyle(this.stroke);
	},
	getClip : function (canvas) {
		return this.clip == true || (this.clip = (this.clip == "true"));
	},
	getOpacity : function(canvas) {
		return this.opacity;
	},
	getDrawMode : function(canvas) {
		return this.drawMode;
	},
	getLineWidth : function(canvas) {
		return this.lineWidth;
	},
	getLineCap : function(canvas) {
		return this.lineCap;
	},
	getLineJoin : function(canvas) {
		return this.lineJoin;
	},
	getMiterLimit : function(canvas) {
		return this.miterLimit;
	},
	getTopLeftColors : function(canvas) {
		return this.topLeftColors;
	},
	getBottomRightColors : function(canvas) {
		return this.bottomRightColors;
	},
	getFillColors : function(canvas) {
		return this.getFillColors();
	},
	getLeft : function(canvas) {
		if (typeof this.left == "number") return this.left;
		if (this.left.indexOf("%") > -1) return this.getPercentage(this.left, canvas.getWidth());
	},
	getTop : function(canvas) {
		if (typeof this.top == "number") return this.top;
		if (this.top.indexOf("%") > -1) return this.getPercentage(this.top, canvas.getHeight());
	},
	getWidth : function(canvas) {
		if (typeof this.width == "number") return this.width;
console.warn("GETTING DYNAMIC WIDTH OF: ", this, this.width);
		if (this.width.indexOf("%") > -1) return this.getPercentage(this.width, canvas.getWidth());
	},
	getHeight : function(canvas) {
		if (typeof this.height == "number") return this.height;
		if (this.height.indexOf("%") > -1) return this.getPercentage(this.height, canvas.getHeight());
	},
	getRight : function(canvas) {
		return this.getLeft(canvas) + this.getWidth(canvas);
	},
	getBottom : function(canvas) {
		return this.getTop(canvas) + this.getHeight(canvas);
	},

	getRect : function(canvas) {
		return	{
					left:this.getLeft(canvas), top:this.getTop(canvas),
					width:this.getWidth(canvas), height:this.getHeight(canvas)
				};
	},
	getPercentage : function(val, percentVal) {
		return Math.round((parseInt(val) /100) * percentVal);
	},

	logError : function(methodName, message, error, data) {
		console.error(this,".",methodName,"(): Error ", message);
		if (data) console.error("--> ", data);
		throw (error);
	},

	//
	//	drawing semantics
	//


	getRenderProps : function(canvas) {
		// standard props for all shapes
		with (this) {
			var props = {
				canvas : canvas,
				left : getLeft(canvas),
				top : getTop(canvas)
			}
			
			if (this.width) {
				// TODO: handle setting right and not width...
				props.width = getWidth(canvas);
				props.right = getRight(canvas);
			} else {
				props.width = 1;
				props.right = props.left + 1;
			}
			
			if (this.height) {
				// TODO: handle setting bottom and not height
				props.height = getHeight(canvas);
				props.bottom = getBottom(canvas);
			} else {
				props.height = 1;
				props.bottom = props.height + 1;
			}
			
			// global context properties
			if (this.clip) props.clip = getClip(canvas);
			if (this.stroke) props.stroke = getStroke(canvas);
			if (this.fill) props.fill = getFill(canvas);
	
			if (this.drawMode) props.drawMode = getDrawMode(canvas);
			if (this.opacity) props.opacity = getOpacity(canvas, props);
	
			// set stroke context properties
			if (props.clip || props.stroke) {
				if (this.lineWidth) props.lineWidth = getLineWidth(canvas, props);
				if (this.lineCap) props.lineCap = getLineCap(canvas, props);
				if (this.lineJoin) props.lineJoin = getLineJoin(canvas, props);
				if (this.miterLimit) props.miterLimit = getMiterLimit(canvas, props);
			}
			
			props.$showHandles = this.$showHandles;
			props.$showPoints = this.$showPoints;
			props.$showControlPoints = this.$showControlPoints;
		}		
		return props;
	},

	getEdgeLocation : function(edge, w, h) {
		switch (edge) {
			case "c"	: 	return {x:w/2, y:h/2};
			case "n"	: 	return {x:w/2, y:0  };
			case "s"	: 	return {x:w/2, y:h  };
			case "e"	: 	return {x:w  , y:h/2};
			case "w"	: 	return {x:0  , y:h/2};
			case "nw"	: 	return {x:0  , y:0  };
			case "ne"	: 	return {x:w  , y:0  };
			case "sw"	: 	return {x:0  , y:h  };
			case "se"	: 	return {x:w  , y:h  };
		}
		return null;
	},

	getAbsoluteCenterPoint : function() {
		return this.getCenterPoint(null, true);
	},

	getCenterPoint : function(centerPoint, absolute) {
		if (centerPoint == null) centerPoint = this.centerPoint;
		if (typeof centerPoint == "string") centerPoint = this.getEdgeLocation(centerPoint, this.width, this.height);
		if (centerPoint && centerPoint.x != null && absolute) {
			centerPoint.x += this.left || 0;
			centerPoint.y += this.top  || 0;
		}
		return centerPoint;
	},


	translate : function(canvas) {
		var left = this.left,
			top = this.top
		;
		canvas.translate(left, top);
	},

	rotate : function(canvas, angle, centerPoint) {
		if (canvas == null) canvas = this.$cache.canvas;
		if (angle == 0) return this;
		if (centerPoint) {
			centerPoint = this.getCenterPoint(centerPoint);
		}
		canvas.rotate(angle, centerPoint);
		return this;
	},

	setScale : function(canvas, scale) {
		canvas.scale(scale);
		return this;
	},

	prepareToDraw : function(canvas) {
		// return false for items (like Images) that can't draw until a certain condition is true
		return true;
	},


	// TODO: 	* when calling draw() for hit detection, don't re-render the props
	draw : function(canvas, newProps) {
		if (newProps) {
			this.setProperties(newProps);
		}
		
		if (!this.prepareToDraw(canvas)) {
			return this.scheduleRedraw(canvas);
		}
		
		var props = this.getRenderProps(canvas);
		if (this.restoreContext) canvas.context.save();
	
		this._applyGlobalRenderProps(canvas, props);

		// call beforeRender to apply any decorators such as handles, control points, etc
		this.beforeRender(canvas, props);

		// now actually draw and render
		if (this.crispLines) canvas.context.translate(.5,.5);
		this.drawPath(canvas, props);
		if (this.crispLines) canvas.context.translate(-.5,-.5);

		this.render(canvas, props);
		
		// save the props for redrawing later (only used when doing hit detection)
		this.$cache = props;

		// call afterRender to apply any decorators such as handles, control points, etc
		this.afterRender(canvas, props);		

		if (this.restoreContext) canvas.context.restore();

		this.$hasBeenDrawn = true;
		return this;
	},
	
	// apply any global properties (drawMode, opacity, etc)
	_applyGlobalRenderProps : function(canvas, props) {
		var context = canvas.context;
		try {
			// apply universal context properties
//console.info(this, "translate", props.left, props.top);
			if (props.left != 0 || props.top != 0) 	this.translate(canvas);
			if (props.drawMode) 	 	context.globalCompositeOperation = props.drawMode;
			if (props.opacity != null) 	context.globalAlpha = props.opacity;
			if (this.angle != null) 	this.rotate(canvas, this.angle, this.centerPoint);
			if (this.scale != null) 	this.setScale(canvas, this.scale);
		} catch (e) {
			this.logError("_applyGlobalRenderProps","applying global render props", e, props);
		}	
	},

	drawForHitDetection : function(canvas, props) {
		if (props == null) props = this.getRenderProps(canvas);
		canvas.context.save();
		this._applyGlobalRenderProps(canvas, props);
		this.drawPath(canvas, props);		
		canvas.context.restore();
	},

	
	beforeRender : function(canvas, props) {},

	afterRender : function(canvas, props) {
		if (props.$showHandles) this.drawHandles(canvas, props);	
		if (this.$showCenter) this.drawCenter(canvas, props);
		if (this.$showCenterPoint) this.drawCenterPoint(canvas, props);
	},


	redraw : function(newProps) {
		if (!this.$hasBeenDrawn) return;
		if (this.$cache.canvas) return this.draw(this.$cache.canvas, newProps);
		console.debug(this,".redraw() called without valid canvas");
		return this;
	},
	
	tellParentToRedraw : function(newProps) {
		if (newProps) this.setProperties(newProps);
		if (this.$cache.canvas) this.$cache.canvas.redraw();
		return this;	
	},

	tellParentToScheduleRedraw : function(newProps) {
		if (newProps) this.setProperties(newProps);
		if (this.$cache.canvas) this.$cache.canvas.scheduleRedraw();
		return this;		
	},

	// tell the cache'd canvas (if any) to redraw, eventually
	//	use this when redrawing the element itself may not work properly immediately
	//
	// TODO: check canvas.checkReadyStateBeforeDrawing and have the canvas redraw if set?
	scheduleRedraw : function(canvas, delay) {
		if (this._redrawTimer != null) return this;

		// if we don't have a canvas to draw in, forget it (for now)
		if (canvas == null) canvas = this.$cache.canvas;
		if (canvas == null) return this;

//		console.debug("delaying draw of " + this);
		if (delay == null) delay = this.redrawDelay;
		var shape = this;
		this.$cache.canvas = canvas;

		this._redrawTimer = setTimeout(
				function(){
					delete shape._redrawTimer;
					return shape.redraw();
				}, delay);
		
		return this;
	},
	
	
	drawPath : function(canvas, props) {		// default implementation of drawPath doesn't do anything
		return this;
	},

	render : function(canvas, props) {
		// the operations below may actually need to modify the object when drawing 
		//	(eg: when doing nested strokes, etc), in which case they will return
		//	on a clone of this object that has the proper dimensions for the next call
		var renderShape = this;

		// NOTE on order: because stroke is on path center, fill first or the fill will eat half the stroke
		try {
			// apply context stroke properties
			if (this.clip || this.stroke) {
				if (props.lineWidth) canvas.context.lineWidth = props.lineWidth;
				if (props.lineCap) canvas.context.lineCap = props.lineCap;
				if (props.lineJoin) canvas.context.lineJoin = props.lineJoin;
				if (props.miterLimit) canvas.context.miterLimit = props.miterLimit;
			}
		} catch (e) {
			this.logError("render","setting context properties", e, props);
		}

		if (props.clip) renderShape = renderShape.renderClip(canvas, props);
		if (props.fill) renderShape = renderShape.renderFill(canvas, props);
		if (props.stroke) renderShape = renderShape.renderStroke(canvas, props);

		return renderShape;
	},
	
	renderClip : function(canvas, props) {
		canvas.context.clip();
		return this;
	},
	
	renderFill : function(canvas, props) {
		if (props.fill) this.setContextStyle(canvas, "fillStyle", props.fill, props);
		this.onFill(canvas.context, props);
		return this;
	},

	// put in its own function so an individual shape can do something fancy
	onFill : function(context, props) {
		context.fill();
		return this;
	},

	renderStroke : function(canvas, props) {
		var context = canvas.context,
			stroke = props.stroke
		;
		if (stroke && stroke.constructor == Array)	{
			return this.renderMultiStroke(canvas, props);			
		}
		
		if (stroke) this.setContextStyle(canvas, "strokeStyle", stroke, props);
		return this.onStroke(canvas.context, props);
	},
	
	
	// put in its own function so an individual shape can do something fancy
	onStroke : function(context, props) {
		context.stroke();
		return this;
	},


	// do in a separate function for try/catch semantics and to dereference the function as necessary
	setContextStyle : function(canvas, contextProp, style, props) {
		try {
			if (typeof style == "function") {
				style = style.apply(this, [canvas, props]);
			}
			canvas.context[contextProp] = style;
		} catch (e) {
			console.warn(this, ".setContextProperty(): error setting ", contextProp," to: ", (typeof style == "function" ? "\n"+style : style));
			console.warn(e);
			console.debug(props);
		}
		return this;
	},

	// TODO: move into canvas ?
	drawHandles : function(canvas, props) {
		var handleColor = this.handleColor,
			handleSize = this.handleSize,
			context = canvas.context,
			height = props.height,
			width = props.width
		;
		context.save();
		context.strokeStyle = handleColor;
		context.globalAlpha = this.handleAlpha;

		if (this.handleStyle == "corner") {
			var handleDelta = 3;
			context.beginPath();

			//	TL
			context.moveTo(-handleDelta, handleSize);
			context.lineTo(-handleDelta, -handleDelta);
			context.lineTo(handleSize, -handleDelta);
			
			//	BL
			context.moveTo(-handleDelta, height-handleSize);
			context.lineTo(-handleDelta, height+handleDelta+1);
			context.lineTo(handleSize, height+handleDelta+1);

			//	TR
			context.moveTo(width-handleSize, -handleDelta);
			context.lineTo(width+handleDelta+1, -handleDelta);
			context.lineTo(width+handleDelta+1, handleSize);

			//	BR
			context.moveTo(width+handleDelta+1, height-handleSize);
			context.lineTo(width+handleDelta+1, height+handleDelta+1);
			context.lineTo(width-handleSize+1, height+handleDelta+1);

			context.lineWidth = 2;
			context.stroke();

			// line around the inside
			context.globalAlpha = .2;
			context.lineWidth = 1;
			context.strokeRect(-1.5, -1.5, width+4, height+4, handleColor);


		} else { //if (this.handleStyle == "square") {
			// SLIGHTLY faster to draw square handles than the corners
			var handleDelta = handleSize + 2;
			canvas.drawHandle(0, 0, handleSize, handleColor);
			canvas.drawHandle(width, 0, handleSize, handleColor);
			canvas.drawHandle(0, height, handleSize, handleColor);
			canvas.drawHandle(width, height, handleSize, handleColor);
		}

		context.restore();
	},

	drawCenter: function(canvas, props) {
		canvas.drawCenterPoint(props.width/2, props.height/2, this.handleColor, this.handleAlpha );
	},

	drawCenterPoint: function(canvas, props) {
		var cp = this.getCenterPoint();
		canvas.drawCenterPoint(cp.x,  cp.y, "red");
	},
	
	//
	//	coordinate methods
	//


	moveTo : function(x, y) {
		if (x != null) this.left = x;
		if (y != null) this.top = y;
		this.onMove(this.left, this.top);
		return this;
	},

	// NOTE: only works if left and top are integers...
	moveBy : function(x, y) {
		if (x != null) this.left += x;
		if (y != null) this.top += y;
		this.onMove(this.left, this.top);
		return this;
	},
	
	onMove : function(left, top) {
		if (this.$toolbarShowing) this.showEditToolbar();
	},
	
	
	
	// NOTE: assumes these are in rational order (eg: w and h are > 0)
	resizeTo : function(left, top, width, height) {
		if (arguments.length == 1) {
			var rect = left;
			left = rect.left;
			top = rect.top;
			width = rect.width;
			height = rect.height;
		}
		if (left != null) this.left = left;
		if (top != null) this.top = top;
		if (width != null) this.width = Math.max(width, this.minWidth);
		if (height != null) this.height = Math.max(height, this.minHeight);

		this.onResize(this.left, this.top, this.width, this.height);
		return this;
	},
	
	
	onResize : function(left, top, width, height) {
		
	},

	resizeByPoints : function(point1, point2) {
		var left = (point1.x < point2.x ? point1.x : point2.x),
			right = (point1.x < point2.x ? point2.x : point1.x),	
			top = (point1.y < point2.y ? point1.y : point2.y),
			bottom = (point1.y < point2.y ? point2.y : point1.y),
			width = (right - left),
			height = (bottom - top)
		;
		return this.resizeTo(left, top, width, height);
	},
	
	moveEdgeTo : function(edge, x, y, offset) {
		if (edge == "c") {
			if (offset) {
				x += offset.x;
				y += offset.y;
			}
			this.moveTo(x, y);

		} else {
			var left = null,
				top  = null,
				width = null,
				height = null
			;
			
			if (edge.indexOf("w") > -1) {
				var deltaX = x - this.left;
				left	= x;
				width	= this.width - deltaX;
			} else if (edge.indexOf("e") > -1) {
				width	= x - this.left;
			}

			if (edge.indexOf("n") > -1) {
				var deltaY = y - this.top;
				top		= y;
				height	= this.height - deltaY;
			} else if (edge.indexOf("s") > -1) {
				height = y - this.top;
			}
		
			this.resizeTo(left, top, width, height);
		}
		return this;
	},	


	getPointOffset : function(point) {
		return {x: this.left - point.x, y : this.top - point.y};
	},
	
	containsPoint : function(point) {
		if (this.mouseHitStyle == "none") return false;
		var props = this.$cache;
		if (this.mouseHitStyle == "rect") {
			return this.isWithinSloppyRect(point, props.left, props.top, props.width, props.height, this.edgeSlop);
		}
		return props.canvas.isPointInPath(this, point);
	},

	// TODO: think about creating a function to cache this via points...
	isInsideEdge : function(point, checkHandles) {
		var edge = "";
		if (checkHandles || this.$showHandles) {
			var cache = this.$cache;
			var left = cache.left,
				top = cache.top,
				width = cache.width,
				height = cache.height,
				centerX = left + (width/2),
				centerY = top + (height/2),
				edgeSlop = this.edgeSlop
			;
//			if 		(this.isWithinSloppyRect(point, centerX, centerY, 1, 1, this.centerSlop)) return "c";

			if 		(this.isWithinSloppyRect(point, left, top, 			width, 1, edgeSlop)) edge += "n";
			else if (this.isWithinSloppyRect(point, left, top + height, width, 1, edgeSlop)) edge += "s";

			if 		(this.isWithinSloppyRect(point, left, 		  top, 1, height, edgeSlop)) edge += "w";
			else if (this.isWithinSloppyRect(point, left + width, top, 1, height, edgeSlop)) edge += "e";

//			return edge;
		}
		return (edge ? edge : this.containsPoint(point) ? "c" : null);
	},

	isWithinRect : function(point, left, top, width, height) {
			return left <= point.x && point.x <= left + width
			&& top <= point.y && point.y <= top + height;		
	},

	isWithinSloppyRect : function(point, left, top, width, height, slop) {
		return (left - slop) <= point.x && point.x <= (left + width + slop) 
			&& (top  - slop) <= point.y && point.y <= (top + height + slop);
				
	},
	
	
	//
	//	selection semantics
	//

	// select basically means show handles and redraw
	select : function(skipRedraw) {
		this.$selected = true;
		if (this.isEditable) {
			this.$showHandles = this.$showCenter = true;
			this.scheduleRedraw();
			this.showEditToolbar();
		}
		return this.updateState();
	},
	
	// hide handles and control points
	deselect : function(skipRedraw) {
		this.$selected = false;
		if (this.isEditable) {
			this.$showHandles = this.$showPoints = this.$showControlPoints = this.$showCenter = false;
			this.hideEditToolbar();
		}
		return this.updateState();
	},
	
	toggleSelect : function(skipRedraw) {
		if (this.$selected) return this.deselect(skipRedraw);
		return this.select(skipRedraw)
	},



	//
	//	enable/disable/state semantics
	//
	enable : function(skipRedraw) {
		this.$disabled = false;
		return this.updateState(skipRedraw);
	},
	
	disable : function(skipRedraw) {
		this.$disabled = true;
		return this.updateState(skipRedraw);
	},
	
	focus : function(skipRedraw) {
		this.$focused = true;
		return this.updateState(skipRedraw);
	},
	
	defocus : function(skipRedraw) {
		this.$focused = false;	
		return this.updateState(skipRedraw);
	},

	setState : function(state, skipRedraw) {
		this.$state = state;
		return this.updateState(skipRedraw);
	},

	clearState : function(state, skipRedraw) {
		delete this.$state;
		return this.updateState(skipRedraw);
	},
	
	updateState : function(skipRedraw) {
		if (!this.stateStyles) return;
		
		// so we take states in this order:
		//	$disabled
		//	  (custom $state)
		//	    $focused
		//	      $selected
		var state = "normal";
		if (this.$disabled)  {
			state = "disabled";
		} else if (this.$state) {
			state = this.$state;
		} else if (this.$focused) {
			state = "focused";
		} else if (this.$selected) {
			state = "selected"
		}
		if (this.stateStyles[state]) this.setProperties(this.stateStyles[state]);

		if (this.$hasBeenDrawn && skipRedraw != true) this.redraw();	
		return this;
	},




	//
	//	editing semantics
	//
	// show control points and redraw
	startEditing : function(skipRedraw) {
		if (!this.isEditable) return this;
		this.$isEditing = true;
		
		this.$showPoints = this.$showControlPoints = true;
		this.$showHandles = false;

		this.hideEditToolbar();

		if (skipRedraw != true) this.tellParentToRedraw();
		return this;
	},
	
	doneEditing : function(skipRedraw) {
		if (!this.isEditable) return this;
		this.$isEditing = false;
		
		this.$showPoints = this.$showControlPoints = false;
		this.$showHandles = true;
		if (skipRedraw != true) this.tellParentToRedraw();

		this.showEditToolbar();

		return this;		
	},
	
	toggleEditing : function(skipRedraw) {
		if (!this.isEditable) return this;
		if (this.$isEditing) this.doneEditing(skipRedraw);
		else this.startEditing(skipRedraw);
		return this;
	},

	// TODO: if we don't have tools per instance, we can cache this at the class level...
	// TODO: currently this will instantiate superclass tools over and over
	getTools : function() {
		// NOTE: if we create a subclass shape after this toolbar is created
		//			this toolbar might mask that one from being created
		//		create in the context of the controller?
		if (this.constructor._tools) return this.constructor._tools;
		return this.constructor._tools = this.getMergedCallChainProperty("tools");
	},

	getEditToolbar : function() {
		// NOTE: if we create a subclass shape after this toolbar is created
		//			this toolbar might mask that one from being created
		//		create in the context of the controller?
		if (this.constructor._toolbar) return this.constructor._toolbar;
		
		var toolsHash = dnb.getHashValues(this.getTools()),
			tools = toolsHash.map(function(it){return dnb.createInstance(it)}),
			toolbar = this.constructor._toolbar = new dnb[this.toolbarDefaults.type || "Toolbar"](
				this.toolbarDefaults, 
				{tools:tools}
			)
		;
		return toolbar;
	},


	showEditToolbar : function() {
		var toolbar = this.getEditToolbar();
		if (!toolbar) return;

		var cache = this.$cache;
		cache.canvas.controller.addOverlayTool(toolbar);
		toolbar.show();
		toolbar.moveTo(cache.left - toolbar.width - 2, cache.top + 30);
		this.$toolbarShowing = true;
	},
	
	hideEditToolbar : function() {
		this.getEditToolbar().hide();
		this.$toolbarShowing = false;
	},

	//	return a clone of this shape
	//	if propList is not defined, returns a new object of same constructor with only those properties set
	clone : function(propList) {		
		var clone;
		if (typeof propList == "undefined") {
			this._cloneFn.prototype = this;
			clone = new this._cloneFn();
		} else {
			clone = new this.constructor();
			if (propList) {
				for (var i = 0; i < propList.length; i++) {
					clone[propList[i]] = this[propList[i]];
				}
			}
		}
		return clone;
	},
	_cloneFn : function(){}
});



dnb.Shape.createSubclass("Line", {
	startPoint : {x:0, y:0},
	endPoint :  {x:10, y:10},
	
	init : function() {
		this.inherit("init", arguments);
		this.setPointsFromBounds();
	},
	
	setPointsFromBounds : function() {
		this.startPoint = {x:this.left, y:this.top};
		this.endPoint = {x:this.left+this.width, y:this.top+this.height}	
	},

	resizeTo : function() {
		this.inherit("resizeTo", arguments);
		this.setPointsFromBounds();
	},

	getRenderProps : function(canvas) {
		var props = this.inherit("getRenderProps", arguments);
		props.start = this.startPoint;
		props.end = this.endPoint;
		return props;
	},

	drawPath : function(canvas, props) {
		canvas.context.beginPath();
		canvas.context.moveTo(props.start.x, props.start.y);
		canvas.context.lineTo(props.end.x, props.end.y);
		return this;
	}

});




//
//	This implements a size-independent arbitrary path, specified by setting 
//		"this.points" to a string in the SVG path syntax:
//			http://www.w3.org/TR/SVGMobile12/paths.html#PathDataQuadraticBezierCommands
//
//	When we parse the points in getPointMatrix(), we note the "bounds" of the shape
//		(the minimum/maximum x and y values of all end points), 
//	 and figure out "width" and "height" of the path from that.  When you set the size of
//	 your instance, we apply the specified with/height as a scale factor to the path.
//
//	
//	By convention, we create instances/subclasses with a unit size of 100x100 (if it makes sense).
//
//	It is hella-optimized for redrawing frequently as fast as possible.
//
dnb.Shape.createSubclass("Path", {
	
	points 			: null,			// string points in SVG syntax, eg:  "M 0 0 L 10 10"...
	$matrix			: null,			// matrix of points in our syntax
									// you MUST have one or the other of the above!

	scaleToSize		: true,			// if true, we scale the points to the current width/height
	scalePosition	: false,		// if true, we always update the left/top of the shape to that of the bounds
	mouseHitStyle 	: "path",
	
	
	// override getInstanceProperties to make sure the points string agrees with the current matrix
	getInstanceProperties : function() {
		var props = this.inherit("getInstanceProperties", arguments);
		if (this.points == null && this.$matrix) props.points = this.points = this.getPointString();
		return props;
	},
	
	getRenderProps : function(canvas) {
		var props = this.inherit("getRenderProps", arguments);
		
		props.pointMatrix = this.getPointMatrix();

		props.$showPoints = this.$showPoints;
		props.$showControlPoints = this.$showControlPoints;
		
		//reset left and top, in case they were changed in calculating the matrix
		props.left = this.left;
		props.top  = this.top;
		
		return props;
	},

	addPoint : function(operator) {
		// THIS SHOULD BE MORE EFFICIENT
		var points = this.getPointString();			// INEFFICIENT
		points += " " + dnb.argumentsToArray(arguments).join(" ");
		this.setPoints(points);
//console.info(points);
//		this.redraw();
	},

	// doesn't work with relative points, for now
	setPoint : function(pointNum, operator) {
		var matrix = this.getPointMatrix(),
			segment = { operator:operator	}
		;
		switch(operator) {
			case "M":
			case "L":
			case "T":
			case "H":
			case "V":
				segment.end = {	x:arguments[2], y:arguments[3]	};
				break;

			case "C":
				segment.cp1 = {	x:arguments[2], y:arguments[3]	};
				segment.cp2 = {	x:arguments[4], y:arguments[5]	};
				segment.end = {	x:arguments[6], y:arguments[7]	};
				break;

			case "S":
				segment.cp2 = {	x:arguments[2], y:arguments[3]	};
				segment.end = {	x:arguments[4], y:arguments[5]	};
				break;
				
			case "Q":
				segment.cp1 = {	x:arguments[2], y:arguments[3]	};
				segment.end = {	x:arguments[4], y:arguments[5]	};

			case "Z":
				break;

		}
		matrix[pointNum] = segment;
		delete this.points;
		this.setPoints(this.getPointString(true));	// INEFFICIENT
	},

	setPoints : function(pointStr) {
		this.points = pointStr;
		delete this.$matrix;
		delete this.$bounds;
	},
	
	// convert the matrix back into a svg string describing the points
	getPointString : function(forceUpdate) {
		if (this.points && forceUpdate != true) return this.points;
		var matrix = this.$matrix;
		var output = [];
		for (var i = 0, it; it = matrix[i++];) {
			var op = it.operator;
			switch(op) {
				case "M":
				case "L":
				case "T":
					output.push(op, it.end.x, it.end.y);
					break;

				case "H":
					output.push(op, it.end.x);
					break;

				case "V":
					output.push(op, it.end.y);
					break;

				case "C":
					output.push(op, it.cp1.x, it.cp1.y, it.cp2.x, it.cp2.y, it.end.x, it.end.y);
					break;


				case "Q":
					output.push(op, it.cp1.x, it.cp1.y, it.end.x, it.end.y);
					break;

				case "S":
					output.push(op, it.cp2.x, it.cp2.y, it.end.x, it.end.y);
					break;

				case "Z":
					output.push(op);
					break;

			}
		}
		return (this.points = output.join(" "));
	},

	//  This monster goes through a "points" string in the SVG syntax:
	//		http://www.w3.org/TR/SVGMobile12/paths.html#PathDataQuadraticBezierCommands
	//	and makes an array of objects that is optimized for rendering super quickly
	//	
	//	After this is run, you can look at the pointMatrix.$bounds to see the 
	//		left, top, right, bottom, width, height
	//	that was calculated for the points (ie: left == smallest X coord, bottom = biggest Y, etc)
	//
	//	NOTE: you can operate on this structure directly (eg: this.moveControlPointBy)() )
	//			but you MUST call this.updateMatrixBounds() after you do to make
	//			sure that the matrix method will be recalculated.
	//		  HOWEVER: if you manipulate the path points, remember to manipulate them according
	//			to the current scale factor!
	//
	//	Note: you must use "setPoints" to change the points as a string or things won't get updated
	//
	//
	//	notes:  * all "relative" items (eg: "m") are converted into absolutes (eg: "M")
	//			* "H" and "V" and "S" and "T" items have all of their points expanded out
	//				(although they keep the same operator letters for outputting, etc)

	PATH_OPERATORS : "mMlLhHvVcCsSQqTtZz",
	PATH_SPLIT_REGEX : /([mMlLhHvVcCsSQqTtZz])|[\s,]/,
	getPointMatrix : function(forceUpdate) {
		// if we have a hard-coded matrix, return that
		if (this.$matrix && forceUpdate != true) return this.$matrix;
		
		if (!this.points) return null;
	
		//	console.time("makeMatrix");		
		// split the params into operators and values w/o spaces		
		var params 		= this.points.split(this.PATH_SPLIT_REGEX).join(" ").split(/\s+/);
//console.info(params);
		// construct the matrix as [[operation, p1, p2, p3, p4...],[operation,p1,...]]
		//	parsing floats for the values as we go
		//	NOTE: if there are any multiples (eg: "l 10 10 20 20") this will create separate entries for each
		var matrix 		= this.$matrix = [],
			paramCount 	= params.length,
			index 		= 0,
			currentSegment = -1,
			currentOp 	= "m"
		;
		
		while (index < paramCount) {
			var it = params[index++];
			if (it == "") continue;
			if (this.PATH_OPERATORS.indexOf(it) > -1) {
				matrix[++currentSegment] = [it];
				currentOp = it;
			} else {
				var len = matrix[currentSegment].length,
					startNew = false
				;
				if 		(len == 2 && ("hHvH".indexOf(currentOp) > -1))		startNew = true;
				else if (len == 3 && ("mMlLtT".indexOf(currentOp) > -1))	startNew = true;
				else if (len == 5 && ("sSqQ".indexOf(currentOp) > -1))		startNew = true;
				else if (len == 7 && ("cC".indexOf(currentOp) > -1))		startNew = true;
				if (startNew &&
					"sS".indexOf(currentOp) > -1 && 
					this.PATH_OPERATORS.indexOf(params[index+2] > -1)) {
						startNew = false;
				}

				if (startNew) {
					if      (currentOp == "m") currentOp = "l";
					else if (currentOp == "M") currentOp = "L";
					matrix[++currentSegment] = [currentOp, parseFloat(it)];
				} else {
					matrix[currentSegment].push(parseFloat(it));
				}
			}
		}
//console.dir(matrix);

		// now go through the list and:
		//		convert all relatives to absolutes
		var startX = 0,
			startY = 0,
			currentX = 0,
			currentY = 0
		;
		for (var i = 0, len = matrix.length; i < len; i++) {
			var m = matrix[i],
				operator = m[0],
				segment
			;

			// convert relative methods to absolute
			//	(also normalize values)
			switch (operator) {
				case "m":			// relative moveTo
					m[0] = "M";
					m[1] = currentX + m[1];
					m[2] = currentY + m[2];
					break;

				case "l":			// relative lineTo
					m[0] = "L";
					m[1] = currentX + m[1];
					m[2] = currentY + m[2];
					break;

				case "h":			// relative horizontal
					m[0] = "H";
					m[1] = currentX + m[1];
				case "H":			// absolute horizontal
					m[2] = currentY;
					break;

				case "v":			// relative vertical
					m[0] = "V";
					m[1] = currentY + m[1];
				case "V":			// absolute horizontal
					m[2] = m[1];
					m[1] = currentX;
					break;

				case "c":			// relative cubic bezier
					m[0] = "C";
					m[1] = currentX + m[1];
					m[2] = currentY + m[2];
					m[3] = currentX + m[3];
					m[4] = currentY + m[4];					
					m[5] = currentX + m[5];
					m[6] = currentY + m[6];
					break;

				case "s":			// relative smooth cubic bezier
					m[0] = "S";
					m[1] = currentX + m[1];
					m[2] = currentY + m[2];
					m[3] = currentX + m[3];
					m[4] = currentY + m[4];
					if (m.length == 7) {
						m[5] = currentX + m[5];
						m[6] = currentY + m[6];
					}
				case "S":			// absolute smooth cubic bezier
					if (m.length == 5) {
						m[6] = m[4];
						m[5] = m[3];
						m[4] = m[2];
						m[3] = m[1];

						var cp1X = currentX,
							cp1Y = currentY,
							last = matrix[i-1]
						;
						if (last && (last.operator == "S" || last.operator == "C")) {
							cp1X = cp1X + (last.end.x - last.cp2.x);	//??? watch out for sign errors?
							cp1Y = cp1Y + (last.end.y - last.cp2.y);
						}

						m[1] = cp1X;
						m[2] = cp1Y;
					}
					break;
					
				case "q":			// relative quadratic bezier
					m[0] = "Q";
					m[1] = currentX + m[1];
					m[2] = currentY + m[2];
					m[3] = currentX + m[3];
					m[4] = currentY + m[4];					
					break;

				case "t":			// relative smooth quadratic bezier
					m[0] = "T";
					m[1] = currentX + m[1];
					m[2] = currentY + m[2];
					if (m.length == 5) {
						m[3] = currentX + m[3];
						m[4] = currentY + m[4];			
					}
				case "T":			// absolute smooth quadratic bezier
					if (m.length == 3) {
						m[4] = m[2];
						m[3] = m[1];
						
						var cp1X = currentX,
							cp1Y = currentY,
							last = matrix[i-1]
						;
						if (last && (last.operator == "Q" || last.operator == "T")) {
							cp1X = cp1X - (last.end.x - last.cp1.x);	//??? watch out for sign errors?
							cp1Y = cp1Y - (last.end.y - last.cp1.y);
						}
						m[1] = cp1X;
						m[2] = cp1Y;
					}
					break;


				case "Z":			// close path
				case "z":			//	(same)
					m[0] = "Z";
					m[1] = startX;
					m[2] = startY;
			}

			// now that everything is normalized, create the segment object
			operator = m[0];
			switch (operator) {
				case "M":
					segment = {	operator : "M", 
								end 	 : { x : m[1], y : m[2]	} 
							};
					break;

				case "L":			// line
				case "H":			// horizontal
				case "V":			// vertical
				case "Z":			// close
					segment = {	operator : operator,
								end 	 : { x : m[1], y : m[2]	}
							};
					break;
			
				case "C":			// cubic bezier
				case "S":			// smooth cubic bezier
					segment = {	operator : operator,
								cp1 	 : { x : m[1], y : m[2] },
								cp2 	 : { x : m[3], y : m[4] },
								end 	 : { x : m[5], y : m[6] }
							};
					break;
				case "Q":			// quadratic bezier
				case "T":			// smooth quadratic bezier
					segment = {	operator : operator,
								cp1 	 : { x : m[1], y : m[2] },
								end 	 : { x : m[3], y : m[4] }
							};
					break;
			}
			
			matrix[i] = segment;

			// update the current point
			currentX = segment.end.x;
			currentY = segment.end.y;
			
			if (segment.operator == "M") {
				startX = currentX;
				startY = currentY;
			}
		}
//console.dir(matrix);
		this.updateMatrixBounds();
//console.timeEnd("makeMatrix");		
		return matrix;
	},

	updateMatrixBounds : function() {
		var matrix = this.getPointMatrix();
		var bounds = this.$bounds = 
					{	left	: 1000000,
						top 	: 1000000,
						right	: 0,
						bottom 	: 0
					}
			;
		for (var i = 0, len = matrix.length; i < len; i++) {
			var endPoint = matrix[i].end;
			
			// update the bounds according to each end point
			//	NOTE: we ignore the control points -- I think that's OK...
			if 		(endPoint.x < bounds.left) 	 bounds.left   = endPoint.x;
			else if (endPoint.x > bounds.right)  bounds.right  = endPoint.x;
			if 		(endPoint.y < bounds.top) 	 bounds.top    = endPoint.y;
			else if (endPoint.y > bounds.bottom) bounds.bottom = endPoint.y;
		}
	
		// make sure width and height are at least 1 so we don't divide by 0!
		bounds.width  = Math.max(1, (bounds.right - bounds.left));
		bounds.height = Math.max(1, (bounds.bottom - bounds.top));

		if (this.scaleToSize == false) {
			bounds.xScale = bounds.yScale = 1;
		}
		if (this.scalePosition) {
			var deltaX = bounds.left,
				deltaY = bounds.top
			;
			if (deltaX != 0 || deltaY != 0) {
				this.offsetPoints(matrix, -deltaX, -deltaY);
				this.left += deltaX;
				this.top += deltaY;
			}
			this.width = this.roundPoint(bounds.width);
			this.height = this.roundPoint(bounds.height);
		}
		return bounds;
	},

	getBounds : function() {
		var matrix = this.getPointMatrix();
		var bounds = this.$bounds || this.updateMatrixBounds();

		// always return the xScale and yScale relative to the current size!
		var width = this.getWidth(),		// todo: may be more efficient way to do this
			height = this.getHeight()
		;
		if (this.scaleToSize) {
			bounds.xScale = this.getWidth() / bounds.width;
			bounds.yScale = this.getHeight() / bounds.height;
		}
		return bounds;
	},

	roundPoint : function(value) {
		return Math.round(value * 100) / 100;
	},

	offsetPoints : function(matrix, deltaX, deltaY) {
		this.points = null;
		for (var i = 0, segment; segment = matrix[i++]; ) {
			if (segment.end) {
				segment.end.x = this.roundPoint(segment.end.x + deltaX);
				segment.end.y = this.roundPoint(segment.end.y + deltaY);
			}
			if (segment.cp1) {
				segment.cp1.x = this.roundPoint(segment.cp1.x + deltaX);
				segment.cp1.y = this.roundPoint(segment.cp1.y + deltaY);
			}
			if (segment.cp2) {
				segment.cp2.x = this.roundPoint(segment.cp2.x + deltaX);
				segment.cp2.y = this.roundPoint(segment.cp2.y + deltaY);
			}
		}
	},

	
	scaleMatrixToBounds : function(left, top, width, height) {
		var bounds 	= this.getBounds(),
			xScale 	= bounds.width / width,
			yScale	= bounds.height / height,
			scaledLeft = left * xScale,
			scaledTop  = top * yScale
			
		;
		this.offsetPoints(this.getMatrix(), -scaledLeft, -scaledTop);
	},

		
	drawPath : function(canvas, props) {
		var context = canvas.context,
			matrix 	= this.getPointMatrix(),
			bounds 	= this.getBounds(),
			xScale 	= bounds.xScale,
			yScale 	= bounds.yScale,
			methods = this.POINT_OUTPUT_METHODS
		;

		// make sure we've got all the variant types in the list
		//	(can't we do this somewhere else?)
		if (methods.H == null) {
			methods.H = methods.V = methods.L;
			methods.S = methods.C;
			methods.T = methods.Q;
		}
		
		context.beginPath();
		for (var i = 0, segment; segment = matrix[i++]; ) {
			methods[segment.operator](canvas.context, segment, xScale, yScale);
		}
		
		return this;
	},

	POINT_OUTPUT_METHODS : {
		M	: function(context, segment, xScale, yScale) {
					context.moveTo(segment.end.x * xScale, segment.end.y * yScale);
				},
		L	: function(context, segment, xScale, yScale) {
					context.lineTo(segment.end.x * xScale, segment.end.y * yScale);
				},
		C	: function(context, segment, xScale, yScale) {
					context.bezierCurveTo(
						segment.cp1.x * xScale, segment.cp1.y * yScale,
						segment.cp2.x * xScale, segment.cp2.y * yScale,
						segment.end.x * xScale, segment.end.y * yScale
					);
				},
		Q	: function(context, segment, xScale, yScale) {
					context.quadraticCurveTo(
						segment.cp1.x * xScale, segment.cp1.y * yScale,
						segment.end.x * xScale, segment.end.y * yScale
					);
				},
		Z	: function(context, segment, xScale, yScale) {
					context.closePath();
				}
	
	},

	
	afterRender : function(canvas, props) {
		this.inherit("afterRender", arguments);
		if (this.$showControlPoints) this.renderControlPoints(canvas, props);
		if (this.$showPoints) this.renderPoints(canvas, props);
		return this;
	},

	renderPoints : function(canvas, props) {
		canvas.context.save();
		var matrix = this.getPointMatrix(),
			bounds = this.getBounds(),
			xScale = bounds.xScale
			yScale = bounds.yScale
		;

		for (var i = 0, len = matrix.length; i < len; i++) {
			var it = matrix[i];
			if (it.operation == "M") continue;
			canvas.drawHandle(it.end.x * xScale, it.end.y * yScale, this.pointSize, this.pointStyle);
		}
		canvas.context.restore();
		return this;
	},
	
	renderControlPoints : function(canvas, props) {
		var matrix = this.getPointMatrix(),
			bounds = this.getBounds(),
			xScale = bounds.xScale,
			yScale = bounds.yScale,
			start  = matrix[0].end,					// first MUST be a move!
			context= canvas.context
		;

		canvas.context.save();

		context.lineWidth = 1;
		context.strokeStyle = this.controlLineStyle;

		for (var i = 0, len = matrix.length; i < len; i++) {
			var it = matrix[i],
				cp1 = it.cp1,
				cp2 = (it.cp2 ? it.cp2 : it.cp1),
				end = it.end
			;
			if ("CSQT".indexOf(it.operator) > -1) {
				context.beginPath();

				context.moveTo(start.x  * xScale, start.y * yScale);
				context.lineTo(cp1.x    * xScale, cp1.y   * yScale);

				context.moveTo(cp2.x * xScale, cp2.y * yScale);
				context.lineTo(end.x * xScale, end.y * yScale);

				context.stroke();

				canvas.drawHandle(it.cp1.x * xScale, it.cp1.y * yScale, this.controlPointSize, this.controlPoint1Style, true);

				if (it.cp2) {
					canvas.drawHandle(it.cp2.x * xScale, it.cp2.y * yScale, this.controlPointSize, this.controlPoint2Style, true);			
				}
			}
			start = end;
		}
		context.restore();
		return this;
	},

	isInsideEdge : function(point, checkHandles, checkPoints, checkControlPoints) {
		var cache = this.$cache;
//console.debug(point, this.$cache.left, this.$cache.top);
		
		if (checkPoints || cache.$showPoints || checkControlPoints || cache.$showControlPoints) {
			var matrix = this.getPointMatrix(),
				bounds = this.getBounds(),
				xScale = bounds.xScale,
				yScale = bounds.yScale,
				relativePoint = { x: point.x - cache.left, y: point.y - cache.top },
				pointSlop = this.pointSlop
			;
			if (checkPoints || cache.$showPoints) {
				for (var i = 0, len = matrix.length; i < len; i++) {
					var it = matrix[i];
					if (it.type == "move") continue;

					if (this.isWithinHandle(relativePoint, it.end.x*xScale, it.end.y*yScale, pointSlop)) {
						return i;
					}
				}
			}
			
			if (checkControlPoints || cache.$showControlPoints) {
				for (var i = 0, len = matrix.length; i < len; i++) {
					var it = matrix[i];
					if (it.cp1) {
						if (this.isWithinHandle(relativePoint, it.cp1.x*xScale, it.cp1.y*yScale, pointSlop)) {
							return [i,"cp1"];
						}			
					}
					if (it.cp2) {
						if (this.isWithinHandle(relativePoint, it.cp2.x*xScale, it.cp2.y*yScale, pointSlop)) {
							return [i,"cp2"];
						}					
					}
				}			
			}
		
		}

		return this.inherit("isInsideEdge", arguments);
	},



	isWithinHandle : function(point, left, top, slop) {
		return this.isWithinRect(point, left-slop, top-slop, slop*2, slop*2);
	},
	
	movePointTo : function(pointNum, x, y) {
		var matrix = this.getPointMatrix(),
			bounds = this.getBounds(),
			segment = matrix[pointNum]
		;
		this.points = null;						// clear out the points as a flag to update on serialize
		
		var scaledX = (x-this.left) / bounds.xScale,
			scaledY = (y-this.top) / bounds.yScale,
			deltaX = segment.end.x - scaledX,
			deltaY = segment.end.y - scaledY
		;

		if (pointNum + 1 == matrix.length) {
			var firstSegment = matrix[0];
			if (firstSegment.end.x == segment.end.x && 
				firstSegment.end.y == segment.end.y) 
			{
				firstSegment.end.x = scaledX;
				firstSegment.end.y = scaledY;						
			}
		}

		// move the end point, no matter what the type
		segment.end.x = scaledX;
		segment.end.y = scaledY;

		if (segment.operator == "C" || segment.operator == "S") {
			segment.cp2.x -= deltaX;
			segment.cp2.y -= deltaY;
			
			// you actually have to move the cp1 of the next segment
			if (++pointNum == matrix.length) pointNum = 1;	// skip the first "move" segment
			segment = matrix[pointNum];
			if (segment.operator == "C" || segment.operator == "S") {
				segment.cp1.x -= deltaX;
				segment.cp1.y -= deltaY;
			}
			
		} else if (segment.operator == "Q" || segment.operator == "T") {
			segment.cp1.x -= deltaX;
			segment.cp1.y -= deltaY;		
			// TODO: handle "smooth quadratics"... ???
		}

		var newBounds = this.updateMatrixBounds();
		if (newBounds.width  != bounds.width ) this.width  = (newBounds.width  * bounds.xScale);
		if (newBounds.height != bounds.height) this.height = (newBounds.height * bounds.yScale);
		return this;
	},


	moveControlPointTo : function(pointNum, controlPointName, x, y) {
		var matrix = this.getPointMatrix(),
			bounds = this.getBounds(),
			segment = matrix[pointNum]
		;
		this.points = null;						// clear out the points as a flag to update on serialize
		
		var scaledX = (x-this.left) / bounds.xScale,
			scaledY = (y-this.top) / bounds.yScale
		;

		if (segment.operator == "C" || segment.operator == "S") {
			if (controlPointName == "cp1") {
				segment.cp1.x = scaledX;
				segment.cp1.y = scaledY;

				// if this is a "smooth" bezier, 
				//		update the control point of the previous point as well
				if (segment.operator == "S") {
					if (--pointNum == 0) pointNum = matrix.length - 1;
					var prevPoint = matrix[pointNum];
					if (segment.operator == "C" || segment.operator == "S") {
						prevPoint.cp2.x = prevPoint.end.x + (prevPoint.end.x - segment.cp1.x);
						prevPoint.cp2.y = prevPoint.end.y + (prevPoint.end.y - segment.cp1.y);
					}
				}
			} else {
				segment.cp2.x = scaledX;
				segment.cp2.y = scaledY;
					
				// if this is a "smooth" bezier, 
				//		update the control point of the previous point as well
				if (segment.operator == "S") {
					if (++pointNum == matrix.length) pointNum = 1;
					var nextPoint = matrix[pointNum];
					if (nextPoint.operator == "C" || nextPoint.operator == "S") {
						nextPoint.cp1.x = segment.end.x + (segment.end.x - segment.cp2.x);
						nextPoint.cp1.y = segment.end.y + (segment.end.y - segment.cp2.y);
					}
				}
		
			}
		
		} else if (segment.operator == "Q" || segment.operator == "T") {
			segment.cp1.x = scaledX;
			segment.cp1.y = scaledY;		

			// TODO: handle "smooth quadratics"... ???
		}
		this.updateMatrixBounds();
		return this;
	}

});





dnb.Path.createSubclass("Rect", {
	points : "M 0 0 L 100 0 L 100 100 L 0 100 Z"	
});




dnb.Path.createSubclass("Ellipse", {
//	controlPointDelta : .224,		// I HAVE NO IDEA WHY THIS IS THE RIGHT NUMBER, BUT IT SEEMS TO WORK...	
	points:"M 0 50 S 0 22.4 22.4 0 50 0 S 100 22.4 100 50 S 77.6 100  50 100 S 0 77.6 0 50"
});

// create Circle as another name for Ellipse
dnb.Path.createSubclass("Circle", {
	points : dnb.Ellipse.prototype.points
});



dnb.Path.createSubclass("RoundRect", {
	// TODO: how to do this dynamically so the whole thing resizes and the corners stay the same size?
	radius: 10,					// CORNER radius
	
	points : "M 0 90 Q 0 100 10 100 L 90 100 Q 100 100 100 90 L 100 10 Q 100 0 90 0 L 10 0 Q 0 0 0 10 Z",

	getRadius : function(canvas) {
		return this.radius;
	}
});




dnb.Path.createSubclass("Cross", {
	width : 10,
	height : 10,
	points : "M -10 0 L 10 0 M 0 -10 L 0 10"
});



dnb.Shape.createSubclass("Arc", {
	startAngle : 0,				// 0 = 3'clock  DEGREES!
	endAngle : 270,
	direction : "clockwise",	//	"clockwise", "anticlockwise"
	
	getRenderProps : function(canvas) {
		var props = this.inherit("getRenderProps", arguments);
		
		props.radius = props.width / 2;
		props.startAngle = this.getStartAngle(canvas);
		props.endAngle = this.getEndAngle(canvas);
		props.direction = this.getDirection(canvas);
		
		return props;
	},

	drawPath : function(canvas, props) {
		var context = canvas.context;
		context.beginPath();
		context.arc(props.radius, props.radius, props.radius, Math.toRadians(props.startAngle), Math.toRadians(props.endAngle), props.direction);
		return this;
	},

	getStartAngle : function(canvas) {		// NOTE: degrees!  0 = 3 o'clock
		return this.startAngle;
	},
	
	getEndAngle : function(canvas) {		// NOTE: degrees!  0 = 3 o'clock
		return this.endAngle;
	},

	getDirection : function(canvas) {
		return this.direction != "clockwise";
	}
});



dnb.Shape.createSubclass("Grid", {
	left : 0,
	top : 0,
	width:"100%",
	height:"100%",
	
	gridSize : 10,
	gridMajorUnits : 100,
	
	stroke : "#E7ECFE",
	majorStroke : "#D7DFFE",
	
	getRenderProps : function(canvas) {
		var props = this.inherit("getRenderProps", arguments);
		props.gridSize = this.getGridSize(canvas);
		return props;
	},
	
	// special hack to onStroke to draw in a more efficient way
	onStroke : function(context, props) {
		var width = props.width,
			height = props.height,
			gridSize = props.gridSize
		;
		for (var x = 0; x <= width; x+= gridSize) {
			if (x % this.gridMajorUnits == 0) {
				context.fillStyle = this.majorStroke;
			} else {
				context.fillStyle = this.stroke;					
			}
			context.fillRect(x, 0, 1, height);
		}
		for (var y = 0; y <= height; y+= gridSize) {
			if (y % this.gridMajorUnits == 0) {
				context.fillStyle = this.majorStroke;
			} else {
				context.fillStyle = this.stroke;					
			}
			context.fillRect(0, y, width, 1);
		}
		return this;
	},

	getGridSize : function(canvas) {
		return this.gridSize;
	}
});



dnb.Shape.createSubclass("RoundStar", {
	innerRadius 	: 200,
	spikeHeight		: 20,
	spikeCount 		: 20,
	
	stroke			: "black",
	linWidth		: 1,

	mouseHitStyle:"path",

	getHeight : function() {
		return this.getWidth.apply(this, arguments);
	},

	// angle in degrees
	unitPointFromAngle	 : function(angle, radius) {
		return {
				x : radius * Math.cosDegrees(angle),
				y : radius * Math.sinDegrees(angle)
			};
	},
	
	
	drawPath : function(canvas, props) {
		var context = canvas.context,
			width = this.width,
			spikeHeight = this.spikeHeight,
			innerRadius = Math.floor((width - (spikeHeight*2)) / 2),
			outerRadius = innerRadius + spikeHeight,
			// TODO: how to make sure this divides cleanly?
			spikeCount = this.spikeCount,
			degreesPerSpike = 360 / spikeCount,
			degreesPerHalfSpike = degreesPerSpike / 2
		;
		context.save();
		context.beginPath();
		// translate to the center
		canvas.translate(outerRadius, outerRadius);
		
		// move the cursor to start at the first point
		var start = this.unitPointFromAngle(0, innerRadius);
		
		// TODO: make sure this divides cleanly!
		var degreesPerSpike = (360 / spikeCount),
			degreesPerHalfSpike = degreesPerSpike / 2
		;
		
		context.moveTo(start.x, start.y);
		for (var angle = 0; angle < 360; angle+= degreesPerSpike) {
			var spikeTop = this.unitPointFromAngle(angle + degreesPerHalfSpike, outerRadius),
				nextSpike = this.unitPointFromAngle(angle + degreesPerSpike, innerRadius)
			;
			context.lineTo(spikeTop.x, spikeTop.y);
			context.lineTo(nextSpike.x, nextSpike.y);
		}
		context.restore();
		return this;
	}	
});


dnb.RoundStar.createSubclass("SpiroGear", {
	innerRadius 	: 200,
	spikeWidth		: 10,
	spikeHeight		: 10,
	pointStartAngle	: 0,
	
	stroke			: "black",
	linWidth		: 1,

	mouseHitStyle:"path",

	
	drawPath : function(canvas, props) {
		var context = canvas.context,
			width = this.width,
			spikeWidth = this.spikeWidth,
			spikeHeight = this.spikeHeight,
			innerRadius = Math.floor((width - (spikeHeight*2)) / 2),
			outerRadius = innerRadius + spikeHeight,
			circumference = innerRadius * 2 * Math.PI,
			// TODO: how to make sure this divides cleanly?
			spikeCount = Math.floor(circumference/spikeWidth);
			degreesPerSpike = 360 / spikeCount,
			degreesPerHalfSpike = degreesPerSpike / 2
		;
		context.save();
		context.beginPath();
		// translate to the center
		canvas.translate(outerRadius, outerRadius);
		
		// move the cursor to start at the first point
		var angle = this.pointStartAngle,
			endAngle = (360+angle),
			start = this.unitPointFromAngle(angle, innerRadius)
		;
		context.moveTo(start.x, start.y);
		for (; angle < endAngle; angle+= degreesPerSpike) {
			var pointTop = this.unitPointFromAngle(angle + degreesPerHalfSpike, outerRadius),
				nextSpike = this.unitPointFromAngle(angle + degreesPerSpike, innerRadius)
			;
			context.lineTo(pointTop.x, pointTop.y);
			context.lineTo(nextSpike.x, nextSpike.y);
		}
		context.closePath();
		context.restore();
		return this;
	}	
});






dnb.Rect.createSubclass("Marquee", {
	tools: {
		editStroke	: null,
		editFill	: null,
		deleter		: null//,
//		crop		: "CropCommand"
	}
});





// triangle shape, indicating that clicking will bring up a menu
dnb.Shape.createSubclass("MenuIcon", {
	width		: 20,
	height		: 20,
	fill		: "#333333",
	drawPath	: function(canvas, props) {
		var context = canvas.context;
		context.beginPath();
		context.moveTo(5, 5);
		context.lineTo(15, 10);
		context.lineTo(5, 15);
		context.closePath();
	}
});