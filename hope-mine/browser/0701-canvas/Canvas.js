/*

	THOUGHTS:
		* position:absolute as a default
		* change "style" to "css"
	
		* shapes live along side of the image layers
			- if they marquee part of a shape, do an intersection (????) and split it?  resize the shape?
		* all shapes in one layer

		* have a processor that turns white in a greyscale image into transparency 
			(eg: render something on white, takes white out?  use brightness? saturation?)



*/




///////////////
//
//	Canvas class -- abstracts details about drawing canvases
//
///////////////
dnb.createClass("Canvas", {
	//
	//	instance defaults
	//

	defaultCursor : "default",	// default cursor when no tool is selected

	$hasBeenDrawn: false,		// set to true in draw()
	
	id 			: null,			// id of element, default is auto-assigned by Canvas.getNewId()
	className	: "dnbCanvas",	// class name of element, null == ignore
	
	autoDraw 	: false,		// if true, we instantiate a CANVAS tag on creation
								//		use canvas.draw() to do it later
	fade		: false,		// if true, we fade in/out when showing/hiding
		
	parent		: null,			// DOM element as parent, default is document.body

	hasContents	: null,			// true if we have "contents" (a main image)
	contentsUrl	: null,			// url of the "contents" image
	contents 	: null,			// actual bitmap of our contents (CANVAS tag sized and all)
	
	left		: 0,
	top			: 0,
	zIndex		: 0,
	zoom		: 1,			// magnification -- higher numbers are bigger, best to do integers

	title		: "",			// title (for displaying in a set)
	isVisible 	: true,			// set when we are show/hidden

	statusElement : null,		// canvas where we should show messages..., pass id or dom node ref
	
	checkReadyStateBeforeDrawing : false,	
								// if true, we check the "prepareToDraw()" method
								// of all children in drawChildren() and defer
								// the draw until all return true, telling us they are ready.
								// Rurning this off may give a small speed increase
								// if you don't mind things redrawing out of order.
	redrawDelay : 0,			// normal delay before redrawing, set to 0 so it executes as soon as
								// the current script finishes executing
	unreadyRedrawDelay : 100,	// delay before we try redrawing again if some children are not ready
	opacity		: null,			// if null, picked up from CSS
	maxOpacity : 1,				// maximum opacity for the canvas (not contents)
	
	width		: null,			// width of outer canvas, overridden by CSS, percentage width not well defined
	height		: null,			// height of outer canvas, overrideen by CSS, percentage height not well defined
	gravity		: "c",			// gravity for resizing (n, ne, c, etc)
	stayOnScreen:false,			// if true, we don't let moveTo move us off the screen
	
	contextMenu : "SUPPRESS",	// set to a Canvas instance to show as context menu, "SUPPRESS" to hide
	
	sizeToParent: true,			// if true, we size to our parent's dimensions (less our width and height)
	
	element		: null,			// DOM element of canvas, set in new Canvas()
	context		: null,			// drawing context of DOM element, set in new Canvas()
	
	
	globalPaintProps : {
		stroke:"blue",
		fill:"lightBlue",
		lineWidth:2
	},
	
	
	//
	//	instance methods
	//

	init : function() {
		this.initChildren();
		this.inherit("init", arguments);
	},
	
	// called to permanently delete a layer
	//	we just get rid of the element
	destroy : function() {
		if (this.element) {
			this.element.outerHTML = "";
		}
		this.$hasBeenDrawn = false;
	},
	
	
	serialize : function() {
		var output = [],
			kids = this.children()
		;
		if (kids.length) {
			for (var i = 0, kid; kid = kids[i++];) {
				output.push(kid.serialize());
			}
			output = ["\n\t\t\t\t'childrenToBe'\t\t: [\n\t\t\t\t\t", output.join(",\n\t\t\t\t\t"), "\n\t\t\t\t],"];
		}
		var contents = this.element.toDataURL();
		// convert to modified base64 for URL so we survive encodings
		contents = contents.split("+").join("*").split("/").join("-");
		output.push(
			"\n\t\t\t\t'id'			: \"", this.getId(), "\",",
			"\n\t\t\t\t'contentsUrl'	: \"{userDir}{fileName}.",this.getId(),".png\""	// TODO: some identifier here...
		);		
		return "\n\t\t{" + output.join("") + "\n\t\t}";
	},
	
	serializeContents : function() {
		var contents = this.getContents()
		if (contents) contents = contents.toDataURL();
		// convert to modified base64 for URL so we survive encodings
		contents = contents.split("+").join("*").split("/").join("-");
		return this.getId() + ":" + contents;
	},
	

	draw : function(newProps) {
		this.clearCache();

		if (newProps) {
			this.setProperties(newProps);
		}
	//XXX may not want to redraw all the time...
		if (this.$hasBeenDrawn) return this.redraw();

		var size = this.calculateSize();

		// call the makeChildren method
		//	this is responsible for initializing any declarative children, etc
		this.makeChildren();		

		// create the actual element
		this._createElement(size.width, size.height);

		this.drawChildren()
		this.captureEvents();
		this.resetCursor();
		
		this.$hasBeenDrawn = true;
		
		return this;
	},

	_createElement : function(width, height) {
		// get the parent to assign to -- default is the body
		var parent = this.getParent();

		var element = this.element = dnb.createElement(
			{
				tag : "canvas",
				id : this.getId(),
				className : this.className,
				// THIS IS CONFUSING, PICK "style" or "styles" -- watch for "styles" in toolbars etc
				style : this.style,
				parent : parent
			}
		);
		if (this.zIndex != null) element.style.zIndex = this.zIndex;

		// apply the size everywhere as appropriate
		element.style.width = element.width = this.width = width;
		element.style.height = element.height = this.height = height;

		if (this.left) element.style.left = this.left;
		if (this.top) element.style.top = this.top;

		this.context = element.context = element.getContext("2d");

		return element;
	},

	redraw : function() {
		if (this._redrawTimer) {
			clearTimeout(this._redrawTimer);
			delete this._redrawTimer;
		}
		if (!this.$hasBeenDrawn) return this.draw();

		this.clear();
		this.drawChildren();
		return this;
	},
	
	scheduleRedraw : function(delay) {
		if (this._redrawTimer == null) {
			if (delay == null) delay = this.redrawDelay;
			var canvas = this;
			this._redrawTimer = setTimeout(
				function(){
					delete canvas._redrawTimer;
					canvas.redraw();
				}, 
				delay
			);
		}
		return this;
	},

	contentsLoading : function() {
		return this._contentsUrlHandle && this._contentsUrlHandle.isLoading;
	},

//	hasContents	: null,			// true if we have "contents" (a main image)
//	contentsUrl	: null,			// url of the "contents" image
//	contents 	: null,			// actual bitmap of our contents (CANVAS tag sized and all)

	getContents : function() {
		if (!this.hasContents) return;

		if (!this.contents) {
			this.contents = dnb.Canvas.createCanvasElement(this.getWidth(), this.getHeight());
		}
		if (this.contentsUrl && !this._contentsUrlHandle) {
			var canvas = this,
				callback = function(handle) {	canvas._contentImageLoaded(handle);	},
				errback  = function(handle) {	canvas._contentImageError(handle);	},
				handle = dnb.Bitmap.getImageHandle(this.contentsUrl, null, callback, errback)
			;
			this._contentsUrlHandle = handle;
			if (handle) {
				if (handle.isLoaded) {
					this._contentImageLoaded(handle);
					
				} else if (handle.loadError) {
					this._contentImageError(handle);
					
				}
			}
		}
		return this.contents;
	},

	_contentImageLoaded : function(handle) {
		this.contents.context.drawImage(handle.bitmap,0,0);
		if (this.$hasBeenDrawn) this.redraw();
	},
	
	_contentImageError	: function(handle) {
		this.controller.showNotice("Error loading image ", handle.url);
	},

	loadUrl : function(url, keepCurrentContents) {
		this.hasContents = true;
		this.contentsUrl = url;
		delete this._contentsUrlHandle;
		if (keepCurrentContents != true) delete this.contents;
		this.getContents();
	},


	makeChildren : function() {
		this.getContents();
		var children = this.childrenToBe;
		if (children) {
			if (children.length) {
				for (var i = 0; i < children.length; i++) {
					var item = children[i];
					this.addChild(dnb.createInstance(item));
				}
			} else {
				for (var name in children) {
					var item = children[name];
					item = this[name] = dnb.createInstance(item);
					this.addChild(item);
				}			
			}
		}
	},


	onChildrenChanged : function(what, who) {
//		console.debug(":::onListChanged",what,who);
		this.scheduleRedraw();
	},
	
	onChildSelectionChanged: function(what, who) {
//		console.debug(":::onSelectionChanged",what,who);
		this.scheduleRedraw();
	},



	getParent : function() {
		if (!this.parent || typeof this.parent == "string") {
			if (this.parent) 	this.parent = dnb.byId(this.parent);
			if (!this.parent) 	this.parent = dnb.getBody();
		}
		return this.parent;
	},

	
	getParentSize : function() {
		return dojo.html.getContentBox(this.getParent());
	},

	setZIndex : function(zIndex) {
		this.zIndex = zIndex;
		if (this.element) this.element.style.zIndex = this.zIndex;
	},
	
	setElementOpacity : function(opacity) {
		if (this.$hasBeenDrawn) this.element.style.opacity = opacity;
	},
	
	calculateSize : function() {
		var width, height;
		if (this.width && this.height) {
			width = this.width;
			height = this.height;
			
		} else if (this.sizeToParent) {
			var parentSize = this.getParentSize();
			width = parentSize.width;
			height = parentSize.height;
			
		} else if (this.element) {
			// if not explicitly specified, set the pixel width/height to the same as the css width/height
			var box = dojo.html.getContentBox(this.element);
			width = (this.width ? this.width : box.width);
			height = (this.height ? this.height : box.height);
			
		} else {
			width = height = 150;
		}
		return {width: width, height:height};
	},
	
	show : function(event) {
		if (!this.$hasBeenDrawn) this.draw();
		if (this.fade) dnb.fadeIn(this.element, null, this.maxOpacity);
		else this.element.style.display = "block";
		if (event) this.moveElementToMouse(event);
		this.isVisible = true;
		return this;
	},
	
	hide : function(event) {
		if (!this.$hasBeenDrawn) return this;
		if (this.fade) dnb.fadeOut(this.element, null, this.maxOpacity);
		else this.element.style.display = "none";
		this.isVisible = false;
		return this;
	},
	
	resizeTo : function(width, height, gravity) {
// TODO: if left and top are passed in, clip!
		if (width) this.width = width;
		if (height) this.height = height;
		if (gravity) this.gravity = gravity;

		if (this.$hasBeenDrawn) {
			// re-create our main element
			this.element.style.display = "none";
			this.element.parentNode.removeChild(this.element);

			this._createElement(width, height);
			// update the contents, if any
			var contents = this.getContents();
			if (contents) {
				this.contents = dnb.Canvas.createCanvasElement(width, height);
				this.setTo(contents, "contents");
			}
			this.redraw();
		}
		return this;
	},

	moveTo : function(left, top, gravity, size) {
		if (typeof gravity == "string") {
			if (size == null) {
				size = (  this.$hasBeenDrawn ?
							dojo.html.getBorderBox(this.element)
						  :
							{
								width: (this.width || 1), 
								height: (this.height || 1) 
							}
					);
			}
			
			gravity = gravity.toLowerCase();
			if 		(gravity.indexOf("w") > -1) {}
			else if (gravity.indexOf("e") > -1) {	left -= size.width;	}
			else								{	left -= Math.floor(size.width/2)	}

			if 		(gravity.indexOf("n") > -1) {}
			else if (gravity.indexOf("s") > -1) {	top -= size.height;	}
			else								{	top -= Math.floor(size.height/2)	}
		}
		if (typeof left != "undefined") this.left = left;
		if (typeof top != "undefined") this.top = top;
	
		if (this.stayOnScreen) {
			var parentSize = this.getParentSize();
			if (this.left + this.width > parentSize.width) this.left = parentSize.width - this.width;
			if (this.top + this.height > parentSize.height) this.top = parentSize.height - this.height;
			if (this.left < 0) this.left = 0;
			if (this.top < 0) this.top = 0;
		}
	
		if (this.$hasBeenDrawn) {
			this.element.style.left = this.left + "px";
			this.element.style.top = this.top + "px";
		}
	},

	moveElementToMouse : function(event) {
		this.moveTo(event.clientX, event.clientY, this.gravity);
		return this;
	},
	
	
	translateForRotation : function(degrees, centerPoint) {
		// note: this assumes we've already translated to origin to 0,0
		// NOTE: 360-degrees is to compensate for the angle actually going the other way
		//			in relation to the center point	
		var translationAngle = 360-degrees,
			sin = Math.sinDegrees(translationAngle),
			cos = Math.cosDegrees(translationAngle),
			translatedX =  - centerPoint.x * cos - centerPoint.y * sin + centerPoint.x,
			translatedY =    centerPoint.x * sin - centerPoint.y * cos + centerPoint.y
		;

		this.translate(translatedX, translatedY);
	},	

	rotate : function(degrees, centerPoint) {
		// degrees or "degrees" in degrees, 0 == 3 o'clock
		degrees = parseFloat(degrees);
		if (isNaN(degrees)) return new TypeError();

		if (centerPoint) {
			this.translateForRotation(degrees, centerPoint);
		}
		this.context.rotate(Math.toRadians(degrees));
	},

	scale : function(scale) {
		// float or [float,float] or "float" or "[float,float]"
		if (typeof scale == "string") {
			scale = this.parsePoint(scale);
			if (!scale) return;	//TOTHROW
		}
		if (typeof scale == "number") scale = [scale, scale];
		this.context.scale(scale[0], scale[1]);
	},

	translate : function(x, y) {
		if (typeof x == "object" && x.x) {
			y = x.y;
			x = x.x;
		}
		this.context.translate(x, y);
	},


	magnify : function(zoom) {
		this.zoom = zoom;
		if (!this.$hasBeenDrawn) return;
		this.element.style.width = (zoom * this.width);
		this.element.style.height = (zoom * this.height);
	},


	parsePoint : function(str) {
		var it = str.match(/\[(.*?),(.*?)\]/);
		if (it) return [it[1], it[2]];
		return parseFloat(str);
	},


	getDrawMode : function() {
		return this.context.globalCompositeOperation;
	},

	setDrawMode : function(mode) {
		this.context.globalCompositeOperation = mode;
	},

	// TODO:  change this to "alpha"
	getOpacity : function() {
		return this.context.globalAlpha;
	},

	setOpacity : function(value) {
		this.context.globalAlpha = value;
	},
	
	drawSinglePixelBox : function(x, y, width, height, style) {
		var context = this.context;
		context.save();
		context.fillStyle = style;
		context.fillRect(x, y, width-1, 1);					// top
		context.fillRect(x+1, y+height-1, width-2, 1);		// bottom
		context.fillRect(x, y+1, 1, height-1);				// left
		context.fillRect(x+width-1, y, 1, height);			// right
		context.restore();
	},

	drawSinglePixelLine : function(x1, y1, x2, y2, style) {
		var context = this.context;
		context.save();

		if (x1 == x2 || y1 == y2) {
			context.fillStyle = style;
			context.fillRect(x1, y1, (x1 == x2 ? 1 : x2-x1), (y1 == y2 ? 1 : y2-y1));
		} else {
			context.strokeStyle = style;
			context.beginPath();
			context.moveTo(x1, y1);
			context.lineTo(x2, y2);
			context.stroke();
		}
		context.restore();
	},
	
	// draw a handle
	drawHandle : function(x, y, size, style, round) {
		var context = this.context;
		context.save();
		context.fillStyle = style;
		if (round) {
			context.beginPath();
			context.arc(x, y, size/2, 0, (Math.PI)*2, true);
			context.lineWidth = 2;
			context.strokeStyle = context.fillStyle = "white";
			context.stroke();
			context.fill();
			context.lineWidth = 1;
			context.strokeStyle = style;
			context.stroke();
		} else{
			context.fillStyle = style;
			context.fillRect(x-(size/2), y-(size/2), size, size);
		}
		context.restore();
	},



	// draw a center point bulls-eye-ey thinger
	drawCenterPoint : function(x, y, color, alpha) {
		if (isNaN(x) || isNaN(y)) return;
		
		var size = 8;

		x = Math.round(x);
		y = Math.round(y);
		
		if (color == null) color = "black";
		if (alpha == null) ;
		alpha = 1;
		var context = this.context;
		context.save();
		context.globalAlpha = alpha;
		context.translate(x,y);

		context.fillStyle = context.strokeStyle = color;
		context.fillRect(-size, 0, size/2,  1);
		context.fillRect(size/2, 0, 1+size/2,  1);
		context.fillRect(0, -size, 1, size/2);
		context.fillRect(0, 1+size/2, 1, size/2);
		
		context.beginPath()
		context.arc(.5, .5, size/2, 0, Math.PI*2, false);
		context.strokeStyle = color;
		context.lineWidth = 1;
		context.stroke();

		context.restore();
	},
	
	drawPoint : function(x, y, color, size, alpha) {
		if (size == null) size = 5;
		if (color == null) color = "black";
		if (alpha == null) alpha = 1;
		
		var context = this.context;
		context.save();
		context.globalAlpha = alpha;
		context.translate(x,y);
		context.fillStyle = color;
		context.fillRect(-size, 0, size*2, 1);
		context.fillRect(0, -size, 1, size*2);
		context.restore();	
	},
	
	drawAngleFromAngles  : function(angle, offsetAngle, centerPoint, radius, startColor, endColor, angleColor, alpha) {
		if (radius == null)		radius		= 100;
		if (startColor == null) startColor  = "green";
		if (endColor == null) 	endColor	= "red";
		if (angleColor == null)	angleColor	= "blue";
		if (alpha == null) 		alpha 		= 1;

		var totalAngle	= angle + offsetAngle,
			endX		= radius * Math.cosDegrees(offsetAngle),
			endY		= radius * Math.sinDegrees(offsetAngle),
			angleEndX 	= radius * Math.cosDegrees(totalAngle),
			angleEndY 	= radius * Math.sinDegrees(totalAngle)
		;

		var context = this.context;
		context.save();
		context.globalAlpha = alpha;
		context.translate(centerPoint.x, centerPoint.y);
		
		this.drawSinglePixelLine(0, 0, endX, endY, startColor);
		this.drawSinglePixelLine(0, 0, angleEndX, angleEndY, endColor);

		context.strokeStyle = angleColor;
		context.beginPath();
		context.arc(0, 0, 20, Math.toRadians(offsetAngle), Math.toRadians(offsetAngle + angle), false);
		context.stroke();

		context.restore();
		
		return angle;
	},

	drawAngleFromPoints : function(centerPoint, startPoint, endPoint, startColor, endColor, angleColor, alpha) {
		var offsetAngle	= Math.angleFrom2Points(centerPoint, startPoint),
			endAngle	= Math.angleFrom2Points(centerPoint, endPoint),
			radius 		= Math.sqrt(Math.pow(startPoint.x - centerPoint.x, 2), Math.pow(startPoint.y - centerPoint.y, 2))
		;
		this.drawAngleFromAngles(endAngle, offsetAngle, centerPoint, radius, startColor, endColor, angleColor, alpha);
		return endAngle;
	},


	// set the entire canvas to another Canvas
	setTo : function(toWhat, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		this.clear(canvas);
		canvas.getContext("2d").drawImage(toWhat.element || toWhat, 0, 0);
		return this;
	},

	// clear the entire canvas
	clear : function(canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		canvas.getContext("2d").clearRect(0, 0, this.width, this.height);
		return this;
	},

	// fill the entire canvas
	fill : function(fillStyle, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		canvas.getContext("2d").fillStyle = fillStyle;
		canvas.getContext("2d").fillRect(0, 0, this.width, this.height);
		return this;
	},


	// TODO: pass a rectangle
	fillRect : function(x, y, w, h, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		return canvas.getContext("2d").fillRect(x,y,w,h);
	},
	
	strokeRect : function(x, y, w, h, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		return canvas.getContext("2d").strokeRect(x, y, w, h);
	},
	
	clearRect : function(x, y, w, h, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		return canvas.getContext("2d").clearRect(x,y,w,h);
	},

	getImage : function(canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		var tempCanvas = dnb.Canvas.createCanvasElement(this.getWidth(), this.getHeight());
		tempCanvas.getContext("2d").drawImage(canvas, 0, 0);
		return tempCanvas;
	},
	
	getImageAtRect : function(x, y, w, h, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		var tempCanvas = dnb.Canvas.createCanvasElement(w, h);
		tempCanvas.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h );
		return tempCanvas;
	},
	
	setImageAtRect : function(x, y, w, h, fromCanvas, toCanvas) {
		if (toCanvas == "contents") toCanvas = this.getContents();
		if (toCanvas == null) toCanvas = this.element;

		toCanvas.getContext("2d").drawImage(fromCanvas, 0, 0, w, h,	x, y, w, h );
		this.redraw();
		return toCanvas;
	},
	
	getContentsImageAtRect : function(x, y, w, h) {
		return this.getImageAtRect(x, y, w, h, "canvas");
	},
	
	
/* THIS WORKS, BUT CLIP SEEMS TO EAT A TINY BIT OF THE LINE AROUND THE SHAPE
	getBitsFromShape : function(shape, margin, clear, props, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		if (props == null) props = shape.getRenderProps(this);

		var bits = dnb.Canvas.createCanvasElement(this.getWidth(), this.getHeight());
		bits.context.translate(props.left, props.top);
		//XXX angle?  opacity?
		shape.drawPath(bits, props);		
		bits.context.clip();
		bits.context.translate(-props.left, -props.top);
		bits.context.drawImage(canvas, 0, 0);
		if (clear) this.clearBitsFromShape(shape, props, canvas);
		return bits;
	},
*/

	getBitsFromShape : function(shape, clear, props, canvas) {
//XXX: this won't work for element, only contents!
		if (canvas == "contents" || canvas == null) canvas = this.getContents();

		
		if (props == null) props = shape.getRenderProps(this);

		var width = this.getWidth(),
			height = this.getHeight(),
			bits = dnb.Canvas.createCanvasElement(width, height)
		;

		// draw the shape
		bits.context.save();
		
		bits.context.drawImage(canvas, 0, 0);
		
		// render the path
		bits.context.translate(props.left, props.top);		//XXX angle?  opacity?		
		shape.drawPath(bits, props);
		bits.context.translate(-props.left, -props.top);	//XXX angle?  opacity?		

		// first we stroke with black to make sure we pick up bits at all the edges
		bits.context.globalCompositeOperation = "destination-in";
		bits.context.lineWidth = 2;
		bits.context.stroke();
		
		// now clip and draw again to pick up the middle
		bits.context.clip();
		bits.context.globalCompositeOperation = "source-over";
		bits.context.drawImage(canvas, 0, 0);

		bits.context.restore();

		return bits;
	},

	getBitmapFromShape : function(shape, clear, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;
		var props 		= shape.getRenderProps(this),
			margin 		= 10,		// ??? to ensure we pick things up that are "outside the lines"?
			width		= props.width + (margin*2),
			height		= props.height + (margin*2)
		;

		var bits = this.getBitsFromShape(shape, clear, props, canvas),
			translatedBits = dnb.Canvas.createCanvasElement(width, height)
		;
//this.setTo(bits, "contents");
//this.redraw();

		translatedBits.context.drawImage(bits, props.left - margin, props.top - margin, width, height,
												0, 0, width, height
										);
		
		var bitmap = new dnb.Bitmap({
			left 		: props.left - margin,
			top			: props.top - margin,
			width		: width,
			height		: height
		});
		bitmap.setImageHandleTo(translatedBits);

		if (clear) this.clearBitsFromShape(shape, props, canvas);
		return bitmap;		
	},
	
	
	clearBitsFromShape : function(shape, props, canvas) {
		if (canvas == "contents") canvas = this.getContents();
		if (canvas == null) canvas = this.element;

		if (props == null) props = shape.getRenderProps(this);

		canvas.context.save()
		//XXX angle?  opacity?
		canvas.context.translate(props.left, props.top);
		shape.drawPath(canvas, props);		
		canvas.context.globalCompositeOperation = "destination-out";
		canvas.context.fillStyle = "black";
		canvas.context.fill();
		canvas.context.restore();
		this.redraw();
	},
	
	
	// defaults to the contents canvas!
	getBitmapFromRect	: function(x, y, w, h, clear, canvas) {
		if (canvas == "contents") 	canvas = this.getContents();
		else if (!canvas) 			canvas = this.element;

		var bits = this.getImageAtRect(x, y, w, h, canvas);
		var bitmap = new dnb.Bitmap({
			left 		: x,
			top			: y,
			width		: w,
			height		: h
		});
		bitmap.setImageHandleTo(bits);
		if (clear == true) {
			this.clearRect(x, y, w, h, canvas);
			this.redraw();
		}
		return bitmap;
	},
	
	createLinearGradient : function (left, top, right, bottom) {
		return this.context.createLinearGradient.apply(this.context, arguments);
	},
	
	createRadialGradient : function (left, top, radius1, right, bottom, radius2) {
		return this.context.createRadialGradient.apply(this.context, arguments);		
	},
	
	getImageData : function(x, y, w, height) {
		return this.context.getImageData(x, y, w, height);
	},

	// takes "#,#" or "{x:#, y:#}"
	getColorAtPoint : function(x, y) {
		if (arguments.length == 1) {
			y = x.y;
			x = x.x;
		}
		x = Math.min(x, this.width-1);
		y = Math.min(y, this.height-1);
		var data = this.context.getImageData(x, y, 1, 1).data;
		return "rgb(" +  [data[0], data[1], data[2]].join() + ")";
	},
	
	


	// children
	
	drawChildren : function(clear) {
		if (clear == true) this.clear();

		if (this.hasContents) {
			if (this.contentsLoading()){
				return this.scheduleRedraw(this.unreadyRedrawDelay);			
			}
			var contents = this.getContents();
			this.context.drawImage(contents, 0, 0);
		}

		if (!this.hasChildren()) return;
		
		// set checkReadyStateBeforeDrawing before drawing to true
		//	to ensure that we don't draw until all children are ready
		//	NOTE: this can cause an endless loop
		//			if you specify, for example, an image that can't be found
		if (this.checkReadyStateBeforeDrawing) {
			if (!this.everyChild("prepareToDraw", [this])) {
				return this.scheduleRedraw(this.unreadyRedrawDelay);
			}
		}
		
		this.forEachChild("draw", [this]);
	},
	
	drawComponent : function(component) {
		if (component.draw) component.draw(this);
	},
	
	
	
	// generic utility stuff
	// TODO: make a "drawable"

	showStatus : function() {
		if (this.controller) {
			return this.controller.showStatus.apply(this.controller, arguments);
		}
	},
	clearStatus : function() {
		if (this.controller) {
			return this.controller.clearStatus.apply(this.controller, arguments);
		}
	},




	// get the current drawing style, as represented by the properties of the context
	setStyle : function(style) {
		if (style == null) return;
		
		if (typeof style == "string") {
			// treat as "key:value;key:value;"
			style = style.split(";");
			for (var i = 0; i < style.length; i++) {
				if (!style[i]) continue;

				var item = (""+style[i]).split(":");
				this.context[item[0]] = item[1];
			}
			
		} else {
			for (var prop in style) {
				this.context[prop] = style[prop];
			}
		}
	},

	setColor : function(property, color) {
		this.globalPaintProps[property] = color;
		if (!this.anyChildrenAreSelected()) return;
		this.selectedChildren().forEach(
			function(it) {
				it[property] = color;	
			}		
		);
	},

	// get the current ["fill"|"stroke"] color
	getColor : function(colorProperty) {
		var it = this.selectedChildren(0);
		if (!it) it = this.globalPaintProps;	// CONTROLLER?
		return it[colorProperty];
	},


	// stack of tools, so we can switch into a non-persistent tool and get back
	
	setTool : function(tool) {
		this.tool = tool;
	},
	clearTool : function() {
		delete this.tool;
	},

	setCursor : function(cursor) {
		this.element.style.cursor = cursor;
	},

	resetCursor : function(cursor) {
		this.setCursor(this.defaultCursor);
	},

	
	//
	//	event handling
	//
	
	captureEvents : function() {
		// hook up any events
		var canvas = this;
		if (this.onMouseOver) 		this.element.onmouseover 	= function(event) {	return canvas.onMouseOver(event);		};
		if (this.onMouseOut) 		this.element.onmouseout 	= function(event) {	return canvas.onMouseOut(event);		};
		if (this.onMouseDown) 		this.element.onmousedown 	= function(event) {	return canvas.onMouseDown(event);		};
		if (this.onMouseUp) 		this.element.onmouseup 		= function(event) {	return canvas.onMouseUp(event);			};
		if (this.onMouseMove) 		this.element.onmousemove 	= function(event) {	return canvas.onMouseMove(event);		};	
		if (this.onDoubleClick) 	this.element.ondblclick 	= function(event) {	return canvas.onDoubleClick(event);		};	
		if (this.onContextMenu) 	this.element.oncontextmenu 	= function(event) {	return canvas.onContextMenu(event);		};
		else this.setContextMenu();
	},
	setContextMenu : function(menu) {
		if (menu) this.contextMenu = menu;
		if (this.contextMenu)	{
			var canvas = this;
			if (this.contextMenu == "SUPPRESS") {
				this.element.oncontextmenu	= function(event) {	return false;};
			} else {
				this.element.oncontextmenu	= function(event) {	
						if (canvas.contextMenu) canvas.contextMenu.showAsMenu(event);	
						return false;
				};
				if (this.controller) {
					this.contextMenu.controller = this.controller;
					this.contextMenu.parent = this.controller.toolContainer
				} else {
					this.contextMenu.controller = this;
				}
			}
		}
	},
	
	// return the x/y of the mouse AS IT RELATES TO THIS CANVAS
	getMousePoint : function(event) {
		var absPosition = dojo.html.getAbsolutePosition(this.element);
		var x = (event.clientX - absPosition.left) / this.zoom,
			y = (event.clientY - absPosition.top) / this.zoom
		;
//console.log(this.element.scrollLeft, this.element.top );
		return {x:x, y:y};
	},
	
	getMouseTargetFromEvent : function(event, getAll) {
		return this.getMouseTarget(this.getMousePoint(event), getAll);
	},
	
	getMouseTarget : function(point, getAll) {
		if (!this.hasChildren()) return null;
		var list = [];
		var children = this.children();
		for (var i = children.length - 1; i >= 0 ; i--) {
			var component = children[i],
				inside = component.containsPoint(point)
			;
			if (!inside) continue;
			if (getAll) list.push(component);
			else return component;

		}
		return null;
	},	
	
	// TODO: 	* optimize this at load time
	//			* handle shapes that haven't been drawn yet
	isPointInPath : function (shape, point) {
		var props = shape.$cache;
		if (this.context.isPointInPath) {
			shape.drawForHitDetection(props.canvas, props);
			return this.context.isPointInPath(point.x, point.y);
		} else {
			// ENCAPSULATION
			return shape.isWithinSloppyRect(point, props.left, props.top, props.width, props.height, shape.edgeSlop);
		}
	},


	// TODO: should this return a full Canvas object, or just a CANVAS element as it is now?
	getScratchCanvas : function(clear) {
		var element = this._scratchCanvasElement;
		if (!element) {
//console.debug("creating scratch canvas");
			element = this._scratchCanvasElement = dnb.createElement(
				{
					tag : "canvas",
					id : this.getId() + "_scratchCanvasElement",
					className : this.className,
					style : this.style,
					parent : this.getParent(),
					attributes : {width:this.width, height:this.height}
				}
			);
			element.style.display = "none";
			element.context = element.getContext("2d");			
		} else {
			if (clear) element.context.clearRect(0, 0, this.width, this.height);
		}
		return element;
	},

	// EXPERIMENTAL: FF2 ONLY -- get the contents of a browser window (including presumably an iframe)
	//	NOTE: shows a scary privilege dialog each time it's called
	// IF you want to do any scaling, etc, do those before calling this
	drawWindowContents : function(wd, left, top, width, height, color) {
		if (wd.tagName == "IFRAME") wd = wd.contentWindow;
		
		if (left == null) left = 0;
		if (top == null) top = 0;
		if (width == null) width = wd.innerWidth;
		if (height == null) height = wd.innerHeight;
		if (color == null) color = "rgba(0,0,0,0)";

		// this is the scary part
	    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
	    
	    // this does the work
	    this.context.save();
//console.debug(wd, left, top, width, height, color);
		this.context.drawWindow(wd, left, top, width, height, color);
		this.context.restore();
    },

	// EXPERIMENTAL: FF2 ONLY -- draw an arbitrary chunk of HTML
	//	NOTE: shows a scary privilege dialog each time it's called
	// TODO: can we get rid of height?
	// TODO: currently two calls to this will clobber each other...
	// TODO: this won't get any page styles, copy page stylesheets into the iframe before drawing?
	// TODO: better way to put content in page rather than document.write()
	drawHtml : function(html, width, height) {
		var iframe = this._scratchIframe;
		if (iframe == null) {
			iframe = this._scratchIframe = dnb.createElement({
				tag:"IFRAME",
				parent:"body",
				style : {
					left:-100000,
					top:-100000,
					width:width,
					height:height,
					border:"0px"
				}
			});
		} else {
			iframe.style.width = iframe.width = width;
			iframe.style.height = iframe.height = height;
		}
		var doc = iframe.contentWindow.document;
		doc.write(html);
		doc.close();
		
		var canvas = this;
		setTimeout(function(){canvas.drawWindowContents(iframe)},0);
	},

	
	//
	//	generic stuff
	//
	
	getWidth : function() {
		return this.width;
	},
	
	getHeight : function() {
		return this.height;	
	},
	
});

dnb.Canvas.mixInClass(dnb.ChildCollection);



//
// class methods
//
dnb.Canvas.addToClass({
	createCanvasElement : function(width, height) {
		var canvas = dnb.createElement({
				tag:"CANVAS", attributes:{width:width, height:height}
			});
		canvas.context = canvas.getContext("2d");
		return canvas;
	},
	
	DRAW_MODES : [
		"copy",				//	Replace destination completely with source
		"darker",			//	Sum source and destination, color goes to black
		"destination-atop",	//	Display destination wherever both images are opaque. Display source wherever source is opaque but destination is transparent.
		"destination-in",	//	Display destination wherever both destination and source are opaque. Display transparency elsewhere.
		"destination-out",	//	Display destination wherever destination is opaque and source is transparent. Display transparency elsewhere.
		"destination-over",	//	Display destination wherever destination is opaque. Display source elsewhere.
		"lighter",			//	Display the sum of source and destination, with color values approaching 1 as a limit.
		"source-atop",		//	Display source wherever both images are opaque. Display destination wherever destination is opaque but source is transparent. Display transparency elsewhere.
		"source-in",		//	Display source wherever both source and destination are opaque. Display transparency elsewhere.
		"source-out",		//	Display source wherever source is opaque and destination is transparent. Display transparency elsewhere.
		"source-over",		//	Display source wherever source is opaque. Display destination elsewhere.
		"xor"				//	Exclusive OR of the source and destinations. Works only with black and white images and is not recommended for color images.
	]
});


