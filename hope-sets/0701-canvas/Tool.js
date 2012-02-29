//	
//	Tool -- classes that act upon other classes 
//
//	Tools are selectable, and 
//
//	In general, our scheme is that there is a "controller" who catches events and gives them to the
//		selected tool.  A tool can "push" other tools to temporarily act on their behalf 
//		(see "MouseInteraction" below).
//
//	This is fairly tuned to our situation where we have a "controller" with an "interactor"
//	  	and children/"layers" which can be "focused" or "selected".  
//			Tried to keep shape semantics out of it, not entirely successfully...  see  ENCAPSULATION below
//
dnb.createClass("Tool", {
	icon 				: null,		// for toolbars, etc
	title				: null,		// title for tooltips, etc
	description			: null,		// more verbose description
	
	defaultCursor		: null,		// default cursor (which we set to when we don't have another)

	ignoreRightClick	: true,		// if true, the contoller won't pass right-click mouse events to us


	//	
	//	called when the tool is selected
	//
	// NOTE: possible that event is null?
	onSelect : function(event, controller) {
		// TODO: only one we **need** to set is controller, the rest are just conveniences 
		//			if speed is a problem, push the others into specific subclasses
		this.controller = controller;
		this.interactor = controller.interactor;
		this.focusedLayer = controller.focusedChild();
//		this.selectedLayers = controller.selectedChildren();
		this.startPoint = (event ? this.getMousePoint(event) : null);
		if (this.defaultCursor) this.controller.setCursor(this.defaultCursor);
	},

	//
	//	called when the tool is deselected, do any cleanup necessary
	//
	onDeselect : function() {
		if (this.defaultCursor) this.controller.resetCursor();
	},


	// another tool got pushed -- but we're still in the stack
	//	we'll get an "onResume" later if we're re-activated
	//	NAME:  onFocus ?
	onSuspend : function(event, nextTool) {
		if (this.defaultCursor) this.controller.resetCursor();	
	},
	
	// the other tool just got dumped, back to us
	onResume : function(event, lastTool) {
		if (this.defaultCursor) this.controller.setCursor(this.defaultCursor);	
	},

	
	//
	//	convenience methods -- try to use these to keep the code cleaner
	//
	
	getMousePoint : function(event) {
		return this.focusedLayer.getMousePoint(event);
	},

	getEventPoint : function(event) {
		return this.focusedLayer.getMousePoint(event);	
	},

	getMouseTarget : function(event, point, getAll) {
		return this.focusedLayer.getMouseTarget(point, getAll);	// NOTE: extend here to handle looking in multiple layers
	},

	// return the items that is 'focused'
	getFocusedTarget : function() {
		var layer = this.controller.focusedChild();
		if (layer) return layer.focusedChild();
	},

	// return all items that are selected
	getSelectedTargets : function() {
		var layers = this.controller.selectedChildren(),
			targets = []
		;
		for (var i = 0, layer; layer = layers[i++]; ) {
			targets = targets.concat(layer.selectedChildren());
		}
		if (targets.length == 0) {
			targets = this.interactor.selectedChildren();
		}
		return targets;
	},

	eventIsInsideFocusedTarget : function(event) {
		var point = this.getMousePoint(event),
			focused = this.getFocusedTarget()
		;
		return (focused && focused.isInsideEdge(point));
	},


	deselectAll : function() {
		this.focusedLayer.deselectChildren();
	},


	// indicate which edge the pointer is near (if any) by changing the cursor
	indicateEdgeWithCursor : function(event, target) {
		if (target == null) target = this.getMouseTarget(event);
		var status = "",
			cursor = "default",
			point = this.getMousePoint(event)
		;
		if (target != null) {
			// always check as if the handles were showing
			var edge = target.isInsideEdge(point, true, target.$showPoints, target.$showControlPoints);
			if (edge) {
				if ((target.$showPoints || target.$showControlPoints)
				 && (typeof edge == "number" || edge.constructor == Array)) {
					status = "Click to move the point";
					cursor = "pointer";
				} else if (target.$showHandles) {
					if (edge == "c") {
						status = "Click to move the entire shape, double-click to edit";
						cursor = "move";
					} else if (edge.length == 1) {
						status = "Click to resize from this edge, double-click to edit";
						if (dnb.browser == "moz" || dnb.browser == "ie") {
							cursor = (edge == "n" || edge == "s" ? "row" : "col")+"-resize";
						} else {
							cursor = edge+"-resize";
						}
						
					} else {
						status = "Click to resize from this corner, double-click to edit";
						cursor = edge+"-resize";
					}
				} else {
					status = "Click to select -- double-click to edit";
					cursor = "pointer";
				}
			}
		}
		this.controller.showStatus(status);
		this.controller.setCursor(cursor);
	}
});


//
//	MouseInteraction -- used for decomposing tools into discrete pieces that can be re-used
//
//	When a tool has to do some mouse-intensive thing (like paint, draw an item, resize something, etc)
//		it will create a new instance of a MouseInteraction and makes that the current tool, 
//		passing whatever properties it likes in to the interaction:
//		
//			originalTool.mouseDown : function(event) {
//				...
//				var props = {	...	  };		// properties to pass to the interaction
//				var interaction = new dnb.MouseInteractionSubclass(props);
//				this.controller.pushTool(event, interaction);
//				...	
//			}
//
//	When the interaction is done (generally when the mouse goes up), it notifies the controller
//		by calling popTool() and control goes back to the original tool's onResume handler,
//		which can look in hte interaction to get any values it needs to from the interaction:
//
//			interaction.onSomeEvent : function(event) {
//				...
//				this.someWellKnownProperty = someValue;
//				this.controller.popTool(event, this);
//				...
//			}
//			...
//			originalTool.onResume(event, lastTool) {
//				...
//				if (lastTool.someWellKnownProperty) {
//					... do something with the value ...
//				}
//				...
//			}
//		
//
dnb.Tool.createSubclass("MouseInteraction", {
	minWidth 		: 10,		// minimum below which we won't draw anything
	minHeight 		: 10,		// useful so we don't draw when the mouse is just clicked
								// TODO: move these down?
	
	onSelect : function() {
		this.inherit("onSelect", arguments);
		
		if (this.target && this.target.$toolbarShowing) {
			this.toolbarWasShowing = true;
			this.target.hideEditToolbar();
		}
	},
	
	onDeselect : function() {
		this.inherit("onDeselect", arguments);

		if (this.target && this.toolbarWasShowing) {
			this.target.showEditToolbar();
			delete this.toolbarWasShowing;
		}
	},


	// FIXME:  this gets wonky around the start point when you go backwards
	getStartToEndRect : function (startPoint, endPoint, drawFromCenter, constrain) {
		var smallX = Math.min(startPoint.x, endPoint.x),
			bigX   = Math.max(startPoint.x, endPoint.x),
			smallY = Math.min(startPoint.y, endPoint.y),
			bigY   = Math.max(startPoint.y, endPoint.y),
			width  = Math.max(bigX - smallX, this.minWidth),
			height = Math.max(bigY - smallY, this.minHeight)
		;
		//console.debug(smallX,  bigX, smallY, bigY, width, height);

		if (constrain) {
			width = height = Math.min(width, height);
		}

		if (drawFromCenter) {
			return {	left	: smallX - width, 
						top 	: smallY - width,
						width	: width * 2,
						height	: height * 2
					}
		} else {
			return {	left	: smallX, 
						top 	: smallY,
						width	: width,
						height	: height
					}		
		}
	}
});


//
//	Tool to interactively draw a new item.
//
//	onSelect, pass:		- "itemConstructor"		-- name or constructor of new item to create
//						- "itemProperties"		-- (optional) properties for new item
//						- "useGlobalProps"		-- true if you want to use the global paint properties when creating
//													ENCAPSULATION -- this is specific to shapes, pass an array of itemProperties?
//
//	when completed, 	- "this.newItem" 		== the new item created, if any
//
dnb.MouseInteraction.createSubclass("CreateItemInteraction",
{
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.hasMoved 		= false;
	},

	onMouseMove : function(event) {
		var	mousePoint	= this.getMousePoint(event),
			rect		= this.getStartToEndRect(this.startPoint, mousePoint, event.altKey, event.shiftKey)
		;
		// if we've never moved more than a tiny bit, forget it
		this.hasMoved = this.hasMoved || rect.width > this.minWidth || rect.height > this.minHeight;
		if (!this.hasMoved) return;
		
		if (!this.newItem) {
			this.newItem = this.makeItem(rect);
			this.interactor.addChild(this.newItem);
		} else {
			this.newItem.resizeTo(rect);
			this.interactor.redraw();
		}
	},

	
	onMouseUp : function(event) {
		if (this.newItem) {
			// clear the item out of the interactor, 
			//	up to our caller to do something with the item
			this.interactor.removeChild(this.newItem);
			this.interactor.redraw();
			if (!this.hasMoved) delete this.newItem;
		}
		this.controller.popTool(event, this);
	},


	makeItem : function(rect) {
		var item = dnb.createInstance(this.itemConstructor,
					(this.useGlobalProps ? this.controller.globalPaintProps : null), 
							// ENCAPSULATION -- specific to shapes
					this.itemProperties,
					{	left	: rect.left, 
						top		: rect.top, 
						width	: rect.width, 
						height	: rect.height
					}
				);
		return item;
	}
});



//
//	Tool to interactively resize or a single item according to the start "edge".
//
//	onSelect, pass:		- "target" 			-- target item to resize
//						- "edge"			-- "edge" to resize/move by
//
dnb.MouseInteraction.createSubclass("ResizeItemInteraction",
{
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.offset	= this.target.getPointOffset(this.startPoint);
	},

	onMouseMove : function(event) {
		var point = this.getMousePoint(event),
			edge  = this.edge,
			offset = this.offset
		;

			 if (typeof edge == "number") 		this.moveTargetPoint(event, edge, point, offset);
		else if (edge.constructor == Array) 	this.moveTargetControlPoint(event, edge, point, offset);
		else									this.moveTargetEdge(event, edge, point, offset);
	},

	onMouseUp : function(event) {
		this.controller.popTool(event, this);
	},

	
	// move a single vertex of the target
	moveTargetPoint : function(event, edge, point, offset) {
		this.target.movePointTo(edge, point.x, point.y, offset);		
		this.target.tellParentToRedraw();
	},
	
	// move a single control point of the target (for bezier or quadratic)
	moveTargetControlPoint : function(event, edge, point, offset) {
		this.target.moveControlPointTo(edge[0], edge[1], point.x, point.y, offset);
		this.target.tellParentToRedraw();
	},
	
	// move the target according to the "edge"
	moveTargetEdge : function(event, edge, point, offset) {
		this.target.moveEdgeTo(edge, point.x, point.y, offset);	
		this.target.tellParentToRedraw();
	}
});


//
//	Tool to interactively move one or more items
//
//	onSelect, pass:		- "target" 			-- target item to resize
//
dnb.MouseInteraction.createSubclass("MoveItemInteraction",
{
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.offset	= this.target.getPointOffset(this.startPoint);
	},

	onMouseMove : function(event) {
		this.moveTarget(event, this.getMousePoint(event), this.offset);
	},

	onMouseUp : function(event) {
		this.controller.popTool(event, this);
	},
	
	// move the entire target
	//	separated because this often has different semantics
	moveTarget : function(event, point, offset) {
		this.target.moveTo(point.x + offset.x, point.y + offset.y);	
		this.target.tellParentToRedraw();
	}
	
});



//
//	special case of ResizeItemInteraction where we're actually moving the bits from the client
//
//	TODO: this currently only works on a square, if we had canvas.getBitmapFromShape() 
//			we could do any shape (or set of shapes!)
//
//	NOTE: this only works for a single focusedLayer -- could easily extend to 
//			multiple layers by pulling bitmaps for each and 
//
dnb.MoveItemInteraction.createSubclass("MoveContentBitsInteraction", {
	onSelect : function(event, controller) {
		this.inherit("onSelect", arguments);
		var target 			= this.target;
		this.left			= target.getLeft();
		this.top			= target.getTop();
		this.width			= target.getWidth();
		this.height			= target.getHeight();

		// pull the existing bits out of the focusedLayer's contents
		var clearContents = event.altKey != true;
		this.bitmap 	= this.focusedLayer.getBitmapFromRect(this.left, this.top, this.width, this.height, clearContents, "contents");

		// put them into the interactor so we can move them around
		this.interactor.addChild(this.bitmap).redraw();
	},	

	onDeselect : function() {
		this.inherit("onDeselect", arguments);

		var target = this.target;
		// put the bits back into the focusedLayer...
		this.focusedLayer.setImageAtRect(target.getLeft(), target.getTop(), this.width, this.height, this.bitmap.getImageBits(), "contents");
		this.focusedLayer.redraw();

		// ... and pull them out of the interactor
		this.interactor.removeChild(this.bitmap);
		this.interactor.redraw();
	},


	moveTarget : function(event, point, offset) {
		// move the bitmap as well as the target item (inherited function will redraw interactor)
		this.bitmap.moveTo(point.x + offset.x, point.y + offset.y);
		this.inherit("moveTarget", arguments);
	}

});



//
//	Tool to interactively create a new item.
//
//	Set:		"itemConstructor" 	-- to the type of the item to create (constructor or string name)
//				"itemProperties"	-- (optional) to properties of the new item
//				"useGlobalProps"	-- true if you want to use the global paint properties when creating
//													ENCAPSULATION -- this is specific to shapes, pass an array of itemProperties?
//
dnb.Tool.createSubclass("NewItemTool", {
	defaultCursor		: "crosshair",
	itemConstructor 	: dnb.Circle,
//	itemProperties 		: null,
	useGlobalProps		: true,
	chooserCommand		: "ShapeChooser",

	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.layerToAddTo = this.focusedLayer;
	},

	onResume : function(event, lastTool) {
		var newItem = lastTool.newItem;
		if (newItem) {
			this.layerToAddTo.addChild(newItem)
								.selectChild(newItem)
									.redraw();
		}
		this.inherit("onResume", arguments);
	},

	onMouseDown : function(event) {
		var point = this.getMousePoint(event),
			focused = this.getFocusedTarget()
		;
		if (focused) {
			var edge = focused.isInsideEdge(point);
			if (edge == "c") {
				return this.startMovingItem(event, point, focused);			
			} else if (edge != null) {
				return this.startResizingItem(event, point, edge, focused);
			}
		}
		this.deselectAll();
		this.startCreatingItem(event, point);
	},

	onMouseMove : function(event) {
		if (this.eventIsInsideFocusedTarget(event)) {
			this.indicateEdgeWithCursor(event, this.getFocusedTarget());
		} else {
			this.interactor.setCursor(this.defaultCursor);
		}
	},
	
	onDoubleClick : function(event) {
		if (this.eventIsInsideFocusedTarget(event)) {
			this.getFocusedTarget().toggleEditing(event);
		}		
	},
	
	
	startMovingItem : function(event, point, item) {
		var props = {
			startPoint		: point,
			target			: item
		}
		this.controller.pushTool(event, new dnb.MoveItemInteraction(props));		
	},
	
	startResizingItem : function(event, point, edge, item) {
		var props = {
			startPoint			: point,
			edge 				: edge,
			target				: item
		}
		this.controller.pushTool(event, new dnb.ResizeItemInteraction(props));	
	},
	
	startCreatingItem : function(event, point) {
		var props = {
			itemConstructor		: this.itemConstructor,
			itemProperties		: this.itemProperties,
			useGlobalProps		: this.useGlobalProps
		}
		this.controller.pushTool(event, new dnb.CreateItemInteraction(props));	
	}
});


//
//	New Bitmap tool : currently defaults to the mojo image only  (have some placeholder?)
//
dnb.NewItemTool.createSubclass("NewBitmapTool", {
	title 				: "Load image",
	icon 				: "images/icons/image.gif",
	itemConstructor		: dnb.Bitmap,
	itemProperties 	: {fill:null, stroke:null, $showHandles:true, url:"images/frame.png"}
});



//
//	New Iframe Text Box Tool:  currently defaults some text, then when done drawing asks
//								them what they want it to say and updates 
//								or (removes if they cancel)
//
dnb.NewItemTool.createSubclass("NewIframeTextBoxTool", {
	title 				: "Put in some text using an IframeTextBox",
	icon 				: "images/icons/text.png",
	itemConstructor		: dnb.IframeTextBox,
	useGlobalProperties	: false,
	
	
	// resume is called when the item is done being drawn...
	//	??? also called when resized?
	onResume : function(event, lastTool) {
		this.inherit("onResume", arguments);
		
		// pop up a confirm asking them what they want to say and set the item to it
		//	if they cancel, remove the item

		if (lastTool.newItem) {
			var item = lastTool.newItem,
				layerToAddTo = this.layerToAddTo
			;
			setTimeout(
				function(){ 
					if (item.startEditing()) {
						layerToAddTo.redraw()
					} else {
						layerToAddTo.destroyChild(item).redraw();
					}
				}, 
			0);
		}
	}
});



//
//	New Bitmap Text Box Tool:  same semantics as NewIframeTextBoxTool
//
dnb.NewIframeTextBoxTool.createSubclass("NewBitmapTextTool", {
	title 			: "Put in some text using a BitmapTextBox",
	icon	 		: "images/icons/text.png",
	itemConstructor	: dnb.BitmapTextBox
});






//
//	New selection tool -- slightly different semantics since the items it draws
//		only end up in the interactor and moving a marquee actually moves the bits
//
dnb.NewItemTool.createSubclass("SelectBitsTool", {
	title				: "Select a portion of a bitmap image",
	icon				: "images/icons/marquee.png",
	itemConstructor		: dnb.Marquee,
	itemProperties 		: {fill:null, stroke:null, $showHandles:true},
	useGlobalProps		: false,
	
	
	// we actually add to the interactor, not the focused layer
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.layerToAddTo = this.interactor;
		this.deselectAll();
	},

	startCreatingItem : function(event, point) {
		this.interactor.destroyChildren();
		this.inherit("startCreatingItem", arguments);
	},

	getFocusedTarget : function() {
		return this.interactor.focusedChild();
	},

	// different move semantics:   move == move actual bits of selection
	startMovingItem : function(event, point, item) {
		var props = {
			startPoint		: point,
			target			: item
		}
		this.controller.pushTool(event, new dnb.MoveContentBitsInteraction(props));	
	}
});




//
//	Select item tool	-- allows you to select and/or resize items
//
dnb.Tool.createSubclass("SelectItemTool", {
	title				: "Select/Edit/Move/Resize items",
	icon				: "images/icons/move.png",
	defaultCursor		: "default",

	onMouseMove : function(event) {
		if (this.eventIsInsideFocusedTarget(event)) {
			this.indicateEdgeWithCursor(event, this.getFocusedTarget());
		} else {
			var point			= this.getMousePoint(event),
				mouseMoveTarget = this.getMouseTarget(event, point)	// NOTE: extend here to handle looking in multiple layers
			;
			if (mouseMoveTarget) {
				this.interactor.setCursor("pointer");
				this.interactor.showStatus("Click to select -- double-click to edit");			
			} else {
				this.interactor.setCursor(this.defaultCursor);
			}
		}
	},
	
	
	onMouseDown : function(event) {
		var point 			= this.getMousePoint(event),
			target = this.getMouseTarget(event, point),
			focused 		= this.getFocusedTarget()
		;

		if (target) {
			if (target != this.getFocusedTarget()) {
				this.focusedLayer.selectChild(target);
			}
			var edge = target.isInsideEdge(point);

		} else {
			var edge = focused ? focused.isInsideEdge(point) : null;
			if (edge == null) return this.deselectAll();
			target = focused;
		}

		if (edge == "c") {
			this.startMovingItem(event, point, target);			
		} else {
			this.startResizingItem(event, point, edge, target);
		}
	},

	onDoubleClick : function(event) {
		if (this.eventIsInsideFocusedTarget(event)) {
			this.getFocusedTarget().toggleEditing(event);
		}		
	},

	startMovingItem : function(event, point, item) {
		var props = {
			startPoint		: point,
			target			: item
		}
		this.controller.pushTool(event, new dnb.MoveItemInteraction(props));		
	},
	
	startResizingItem : function(event, point, edge, item) {
		var props = {
			startPoint			: point,
			edge 				: edge,
			target				: item
		}
		this.controller.pushTool(event, new dnb.ResizeItemInteraction(props));	
	}
});






////////////////
//
//	RotateTool:  rotate shapes (and eventually other stuff)
//
//	TODO:		* when rotating a shape, move the actual numbers
//				* make this work from the shape toolbar (how?)
//
////////////////

dnb.Tool.createSubclass("RotateTool", {
	title				: "Rotate",
	icon				: "images/icons/redo.gif",

	defaultCursor		: "crosshair",
	
	onMouseDown : function(event) {
		var focused = this.getFocusedTarget();	// TODO: do for all selected items!
		if (focused == null) return;		
		
		var props = {
			target 				: focused,
			centerPoint			: focused.getAbsoluteCenterPoint(),
			startAngle 			: focused.angle
		};
		this.controller.pushTool(event, new dnb.RotateInteraction(props));
	},
	
	onResume : function(event, lastTool) {
		this.inherit("onResume", arguments);
		if (lastTool.endAngle) {
			//...
		}
	}

})	// end ShapeTool


dnb.MouseInteraction.createSubclass("RotateInteraction", {
	onMouseMove : function(event) {
		var	endPoint = this.getMousePoint(event);

		// draw the angle in the interactor
		this.interactor.clear();
		var angle = this.endAngle = this.interactor.drawAngleFromPoints(this.centerPoint, this.startPoint, endPoint);

		// rotate the focused shape and redraw
//TODO: shape.setAngle()...
		this.target.angle = angle;
		this.target.tellParentToRedraw();
	},
	
	onMouseUp : function(event) {
		console.info(this.endAngle);

		this.interactor.clear();
		this.controller.popTool(event, this);
	}

});






////////////////
//
//	PaintInteraction -- generic interaction for following the mouse while painting
//
//	onSelect, pass:		- "drawContext" 	-- context to paint into (temporary or permanent, up to you)
//						- "closePath"		-- (optional) if true, we close the path at the end
//						- "smoothePath"		-- (optional) if true, we construct the path as quadratics rather than lines
//						- "onStroke"		-- (optional) custom onStroke operation for fancy effects
//
//	when completed, 	- "this.newItem" 		== the new Path item created
//
////////////////
dnb.MouseInteraction.createSubclass("PaintInteraction", {
	
	onSelect : function() {
		this.inherit("onSelect", arguments);
		if (this.matrix == null) this.matrix = [{operator:"M", end:this.startPoint}];
		this.lastPoint = this.startPoint;
	},
	
	onDeselect : function() {
		this.inherit("onDeselect", arguments);
		
		if (this.matrix.length == 1) {
			this.matrix.push(
				{	
					operator:"L", 
					end		:	{
									x:this.matrix[0].end.x, 
									y:this.matrix[0].end.y+.0001 
								}
				});
		}

		if (this.closePath) {
			this.matrix.push(
				{	
					operator:"Z", 
					end		:	{
									x:this.matrix[0].end.x, 
									y:this.matrix[0].end.y 
								}
				});
		}


		var width 	 = this.interactor.getWidth(),
			height 	 = this.interactor.getHeight()
		;
		
		var path = this.newItem = dnb.createInstance(this.shapeType, {
			$matrix 	: this.matrix
		});
		// update the bounds and the width/height of the path
		var bounds 	= path.updateMatrixBounds();
		path.scaleMatrixToBounds(bounds.left, bounds.top, bounds.width, bounds.height);

		dnb.copyPropertySet(bounds, path, "left,top,width,height");
	},
	
	onMouseMove : function(event) {
		var point = this.getMousePoint(event);

		var context = this.drawContext;
		context.beginPath();
		context.moveTo(this.lastPoint.x, this.lastPoint.y);
		context.lineTo(point.x, point.y);

		this.onStroke(context);

		var added = false;
		if (this.smoothePath) {
			var it = this.matrix[this.matrix.length-1];
			if (it.operator == "L") {
				it.operator = "T";
				it.cp1 = it.end;
				it.end = point;
				added = true;
			}
		}
		if (!added) {
			this.matrix.push({operator:"L", end:point});		
		}
		this.lastPoint = point;
	},


	onMouseUp : function(event) {
		this.controller.popTool(event, this);
	},
	
	onStroke : function(context) {
		context.stroke();			
	}
});


////////////////
//
//	Paint Tool:  follow the cursor and paint along the canvas
//
////////////////
dnb.Tool.createSubclass("PaintTool", {
	title				: "Paint",
	icon				: "images/icons/brush.png",
		
	stroke				: null,				// null = pick up from global paint props
	brushSize			: 5,
	lineJoin			: "round",
	lineCap				: "round",
	closePath			: false,
	smoothePath			: false,			// if true, we create the path as quadratic curves rather than lines
											//	implies that redrawPathWhenDone = true
	drawMode			: null,
	
	shapeType			: "Path",			//  type of shape to create when done drawing

	interactionConstructor		: "PaintInteraction",

	layerToDrawIn 		: "interactor",		//	set to "focused" or "interactor" -- focused draws directly in the bits
	
	redrawPathWhenDone	: true,				// if true, we restore the original bits and redraw the entire path
	addAsShapeWhenDone	: false,			// if true, we add the new path to the "addTo" layer
	layerToAddTo		: "focused",		//	for addAsShapeWhenDone: set to "focused" or "interactor"
	
	onStroke			: null,			// override this to do something fancy
	
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.brushSize = this.controller.globalPaintProps.brushSize;
	},
	
	onMouseDown : function(event) {	
		if (this.layerToDrawIn == "focused") 	this.layerToDrawIn = this.focusedLayer;
		if (this.layerToDrawIn == "interactor")	this.layerToDrawIn = this.interactor;

		var point 				= this.getMousePoint(event),
			context 			= this.layerToDrawIn.context
		;
		this.drawContext = context;
		this.originalBits = this.focusedLayer.getImage("contents");
		
		this.putContentsBitsIntoInteractor();

		this.setUpContext(this.drawContext);

		var props = {};
		dnb.copyPropertySetIfNotNull(this, props,
			"drawContext,shapeType,closePath,smoothePath,onStroke"
		);
		
		this.controller.pushTool(event, dnb.createInstance(this.interactionConstructor, props));
	},
	
	onResume : function(event, lastTool) {
		this.inherit("onResume", arguments);
		this.restoreContext(this.drawContext);

		var path = this.newItem = lastTool.newItem;
		if (!path) return;
		
		this.setUpNewPath(path);
		
		if (this.addAsShapeWhenDone) {
//console.log("adding as path");
			this.restoreOriginalBits();

			if (this.layerToAddTo == "focused") 	this.layerToAddTo = this.focusedLayer;
			if (this.layerToAddTo == "interactor")	this.layerToAddTo = this.interactor;

			this.layerToAddTo.addChild(path);
//			
//			this.layerToAddTo.redraw();
			
			var tool = this;
			setTimeout(function(){tool.layerToAddTo.selectChild(path);},0);
			
		} else if (this.redrawPathWhenDone) {
//console.log("replacing");
			this.replaceContentsAndDrawPath();

		
		} else {
//console.log("copying bits");
			this.putInteractorBitsIntoContents();
		}
	},
	
	setUpNewPath : function(path) {
		dnb.copyPropertySetIfNotNull(this, path,
			"stroke,lineJoin,lineCap,drawMode,onStroke"
		);
		path.lineWidth = this.brushSize;
	},
	
	setUpContext : function(context) {
		context.save();
		context.strokeStyle = (this.stroke ? this.stroke : this.controller.globalPaintProps.stroke);
		context.lineJoin	= this.lineJoin;
		context.lineCap		= this.lineCap;
		context.lineWidth	= this.brushSize;
		if (this.drawMode != null) context.globalCompositeOperation = this.drawMode;	
	},
	
	restoreContext : function(context) {
		context.restore();	
	},
	
	putContentsBitsIntoInteractor : function() {
		this.interactor.context.drawImage(this.originalBits, 0, 0);
		this.focusedLayer.clear("contents").redraw();
	},
	
	putInteractorBitsIntoContents : function() {
		this.focusedLayer.setTo(this.interactor, "contents").redraw();
		this.interactor.clear();
	},

	restoreOriginalBits : function() {
		this.focusedLayer.setTo(this.originalBits, "contents");
		this.interactor.clear();
	},

	replaceContentsAndDrawPath : function() {
		var path = this.newItem;

		this.interactor.setTo(this.originalBits);
		
		this.setUpContext(this.drawContext);
		this.drawContext.translate(path.left, path.top);
		path.drawPath(this.interactor);
		if (this.onStroke) {
			this.onStroke(this.drawContext);
		} else {
			dnb.Shape.prototype.onStroke.apply(this, [this.drawContext]);
		}
		this.restoreContext(this.drawContext);

		this.focusedLayer.setTo(this.interactor, "contents").redraw();
		this.interactor.clear();
	}

});


dnb.PaintTool.createSubclass("PencilTool", {
	title				: "Pencil",
	icon				: "images/icons/pencil.png",
	chooserCommand		: "BrushChooser"
});

dnb.PaintTool.createSubclass("BrushTool", {
	title				: "Paint Brush",
	icon				: "images/icons/brush.png",
	brushSize			: 10,
	redrawPathWhenDone	: true,
	chooserCommand		: "BrushChooser",
	
	onStroke	: function(context) {
		var originalSize = context.lineWidth,
			originalCap	 = context.lineCap
		;
		context.globalAlpha = .5;
		context.stroke();
		context.lineWidth -= 2;
		context.globalAlpha = .75;
		context.stroke();
		context.lineWidth -= 2;
		context.globalAlpha = 1;
		context.stroke();
		context.lineWidth = originalSize;
	}
});



dnb.PaintTool.createSubclass("EraserTool", {
	title				: "Erase",
	icon				: "images/icons/eraser.png",
	brushSize			: 10,
	chooserCommand		: "EraserChooser",
		
	drawMode			: "destination-out",
	
	onDoubleClick		: function(event) {
		if (confirm("Erase entire image")) {
			this.focusedLayer.clear("contents").redraw();
		}
	}
});




dnb.BrushTool.createSubclass("FreeformPenTool", {
	title				: "Freeform pen tool",
	icon				: "images/icons/freeformPen.png",
	smoothePath			: true
});




dnb.PaintTool.createSubclass("LassooTool", {
	title				: "Lassoo bits!",
	icon				: "images/icons/lassoo.png",
	
	closePath			: true,
	brushSize			: 1,
	layerToDrawIn		: "interactor",
	addAsShapeWhenDone	: true,
	smoothePath			: true,
	
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.brushSize = 1;
	}

});





////////////////
//
//	Magnify Tool:  magnify the canvas
//
////////////////

dnb.Tool.createSubclass("MagnifyTool", {
	title				: "Magnify",
	icon				: "images/icons/ZoomIn.png",

	defaultCursor		: "-moz-zoom-in",
	
	onSelect : function() {
		this.inherit("onSelect", arguments);
		delete this.dragZoomed;
	},
	
	onResume : function(event, lastTool) {
		this.inherit("onResume", arguments);
		var rect = lastTool.newItem;
		if (rect) {
			this.controller.magnifyToRect(rect.left, rect.top, rect.width, rect.height);
			// remember that we zoomed so that we don't zoom again on click
			this.dragZoomed = true;
		}
	},
	
	setCursor : function(event) {
		this.controller.setCursor(event.altKey ? "-moz-zoom-out" : "-moz-zoom-in");	
	},
	
	onKeyDown : function(event) {
		this.setCursor(event);	
	},
	
	onKeyUp : function(event) {
		this.setCursor(event);	
	},
	
	onMouseMove : function(event) {
		this.setCursor(event);
	},
	
	onMouseDown : function(event) {
		var point = this.getMousePoint(event);
		var props = {
			itemConstructor		: "Rect",
			itemProperties		: {stroke:"black"}
		}
		this.controller.pushTool(event, new dnb.CreateItemInteraction(props));	
	},
	
	onClick : function(event) {
		if (!this.dragZoomed) {
			if (event.altKey) 	this.controller.zoomOut();
			else				this.controller.zoomIn();
		}
		delete this.dragZoomed;
		this.setCursor(event);
	}

})	// end MagnifyTool




////////////////
//
//	EyeDropper Tool:  pick up the color at the mouse point
//
//	NOTE: this really wants to be more of a command or a push/pop thing...
//
////////////////

dnb.Tool.createSubclass("EyeDropperTool", {
		title 			: "Pick up color",
		icon 			: "images/icons/dropper.png",
		defaultCursor	: "crosshair",
		
		onMouseUp : function(event) {
			var color = this.focusedLayer.getColorAtPoint(this.getMousePoint(event));
			console.info(color);
			this.controller.globalPaintProps.stroke 
				= this.controller.globalPaintProps.stroke 
					= color;
		}
});



////////////////
//
//	Scroll Tool:  scroll the canvas
//
////////////////

dnb.Tool.createSubclass("ScrollTool", {
		title 			: "Scroll the drawing",
		icon 			: "images/icons/hand.png",
		defaultCursor	: "-moz-grab",
		
		onMouseDown : function(event) {
			var point = this.getMousePoint(event);
			var props = {
				itemConstructor		: "Rect",
				itemProperties		: {stroke:"black"}
			}
			this.controller.pushTool(event, new dnb.ScrollInteraction(props));	
		}
});


dnb.MouseInteraction.createSubclass("ScrollInteraction", {
	defaultCursor : "-moz-grabbing",
	
	onMouseMove : function(event) {
		var point = this.getMousePoint(event),
			deltaX = this.startPoint.x - point.x,
			deltaY = this.startPoint.y - point.y
		;
		this.controller.scrollBy(deltaX, deltaY);
		this.startPoint = point;
	},
	
	onMouseUp : function(event) {
		this.controller.popTool(event, this);
	}

});




/*
	UNIMPLEMENTED TOOLS

*/



dnb.NewItemTool.createSubclass("MeasureTool", {
			title 		: "Measure tool",
			icon 		: "images/icons/measure.png",
			disabled	: true
});


dnb.NewItemTool.createSubclass("StampTool", {
			title 		: "Rubber stamp",
			icon 		: "images/icons/stamp.png",
			disabled	: true
});



dnb.NewItemTool.createSubclass("HistoryBushTool", {
			title 		: "History brush",
			icon 		: "images/icons/history.png",
			disabled	: true
});


dnb.NewItemTool.createSubclass("GradientTool", {
			title 		: "Gradient",
			icon 		: "images/icons/gradient.png",
			disabled	: true
});

dnb.NewItemTool.createSubclass("MaskTool", {
			title 		: "Mask Image",
			icon 		: "images/icons/mask.png",
			disabled	: true
});




// undo/redo
dnb.Tool.createSubclass("UndoTool", {
			title 		: "Undo",
			icon 		: "images/icons/undo.gif",
			disabled	: true
});

dnb.Tool.createSubclass("RedoTool", {
			title 		: "Redo",
			icon 		: "images/icons/redo.gif",
			disabled	: true
});



// open/close/save
dnb.Tool.createSubclass("SaveAsTool", {
			title 		: "Save as...",
			icon 		: "images/icons/save.gif",
			disabled	: true
});

dnb.Tool.createSubclass("CloseTool", {
			title 		: "Close",
			icon 		: "images/icons/close.gif",
			disabled	: true
});


// selection stuff
dnb.Tool.createSubclass("SliceTool", {
			title 		: "Slice image...",
			icon 		: "images/icons/slice.png",
			disabled	: true
});

dnb.Tool.createSubclass("TransformSelectionTool", {
			title 		: "Transform selection...",
			icon 		: "images/icons/marquee.png",
			disabled	: true
});


dnb.Tool.createSubclass("ApplyPaintTool", {
			title 		: "Apply fill/stroke...",
			icon 		: "images/icons/bucket.png",
			disabled	: true
});



// misc
dnb.Tool.createSubclass("HelpTool", {
			title 		: "Help!",
			icon 		: "images/icons/help.gif",
			disabled	: true
});










dnb.Tool.createSubclass("WandTool", {
	title 		: "Magic wand -- pick up colors",
	icon 		: new dnb.Bitmap({url:"images/icons/wizard.gif", width:16, height:16}),
	disabled	: true,
	onSelect 	: function() {
		this.inherit("onSelect", arguments);
		console.time("get all data by rows");
		var layer = this.focusedLayer,
			context = layer.getContents().context,
			x = 0
		;
		for (var y = 0; y < layer.height; y++) {
			var it = context.getImageData(x, y, layer.width, 1).data;
//			for (var x = 0; x < layer.width-100; x+=100) {
//			}
		}
		console.timeEnd("get all data by rows");
	}
});


// Replace a single color with another color, no matter where it appears
//	Note: this grabs rows at a time, which seems to be fairly efficient
dnb.Tool.createSubclass("ReplaceColor", {
	title 		: "Replace a single color with another color, no matter where it appears",
	icon 		: new dnb.Bitmap({url:"images/icons/bucket.png", width:20, height:20}),

	getColor : function(x, y, context) {
		return context.getImageData(x, y, 1, 1).data;
	},
	
	onMouseDown : function(event) {
		var point = this.getEventPoint(event),
			layer = this.focusedLayer,
			contents = layer.getContents(),
			context = contents.context,
			color = this.getColor(point.x, point.y, context),
			out = []
		;
		context.fillStyle=this.controller.globalPaintProps.fill;
		this.controller.showNotice("Replacing color");
		console.time("replace color");
		var startY = 0,	//Math.max(0, point.y - 10),
			endY = layer.height//Math.min(point.y+10, layer.height)
		;
		for (var y = startY; y < endY; y++) {
			var dataRow = context.getImageData(0, y, layer.width, 1),
				data    = dataRow.data,
				startX  = null 
			;
			for (var x = 0, len = data.length; x < len; x+= 4) {
				var colorMatches =     color[0] == data[x] 
									&& color[1] == data[x+1]
									&& color[2] == data[x+2] 
//									&& color[3] == data[x+3]	// IGNORE ALPHA ???
				;
				if (colorMatches) {
					if (startX == null) startX = x/4;
				} else {
					if (startX != null) {
						context.fillRect(startX, y, ((x/4) - startX), 1);
						startX = null;				
					}
				}
			}
			if (startX != null) {
				context.fillRect(startX, y, ((x/4) - startX), 1);
			}
		}
		console.timeEnd("replace color");
		layer.redraw();
	},
	
	
});


dnb.Tool.createSubclass("PaintBucketTool", {
	title 		: "Paint Bucket -- fill with color",
	icon 		: new dnb.Bitmap({url:"images/icons/bucket.png", width:20, height:20}),

	getColor : function(x, y, context) {
		return context.getImageData(x, y, 1, 1).data;
	},
	
	onMouseDown : function(event) {
		var point = this.getEventPoint(event),
			layer = this.focusedLayer,
			contents = layer.getContents(),
			context = contents.context,
			newColor = this.controller.globalPaintProps.fill
		;
		this.controller.showNoticeImmediately("Filling...");
		var tool = this;
		// do on a timer so we can show our notice
		function fillIt() {
			tool.floodFillPoints(contents, point.x, point.y, newColor);
//			if (event.button == 0)	tool.floodFillPoints(contents, point.x, point.y, newColor);
//			else					tool.floodFillLines(contents, point.x, point.y, newColor);
			layer.redraw();
			tool.controller.clearNotice();
		}
		setTimeout(fillIt, 100);
	},
	
	

	// this implementation works checks individual points
	//	which is probably faster if we're dealing with small areas
	//	Also, we only get the value of each point once, which makes it about twice as fast
	floodFillPoints : function (canvas, x, y, newColor) {
		console.time("fill all rows by points");
		var context = canvas.context,
			width = canvas.width,
			height = canvas.height,
			stack = [],
			colorMatrix = [],
			x1, rowStartX,
			spanTop, spanBottom
		;
	
		
		context.fillStyle = newColor;		
		oldColor = context.getImageData(x, y, 1, 1).data;
		
		var colorCache = [];
		function matchesOldColor(x, y) {
			if (!colorCache[y]) colorCache[y] = [];
			if (colorCache[y][x] != undefined) return colorCache[y][x];
			var data = context.getImageData(x, y, 1, 1).data;
			var matches =    oldColor[0] == data[0] 
						  && oldColor[1] == data[1]
						  && oldColor[2] == data[2];
			
			return (colorCache[y][x] = matches);		
		}
	
		stack.push([x, y]);
		while(it = stack.pop()) {	
			x = it[0], y = it[1];
			x1 = x;
			while(x1 >= 0 && x1 < width && matchesOldColor(x1, y)) x1--;
			x1++;
			rowStartX = x1;
			spanTop = spanBottom = false;
			while(x1 < width && matchesOldColor(x1, y)) {
				if(!spanTop && y > 0 && matchesOldColor(x1, y - 1)) {
					stack.push([x1, y - 1]);
					spanTop = true;
				} else if(spanTop && y > 0 && !matchesOldColor(x1,y - 1)) {
					spanTop = false;
				}
				if(!spanBottom && y < height - 1 && matchesOldColor(x1,y + 1)) {
					stack.push([x1, y + 1]);
					spanBottom = true;
				} else if (spanBottom && y < height - 1 && !matchesOldColor(x1, y + 1)) {
					spanBottom = false;
				}
				x1++;
			}
			context.fillRect(rowStartX, y, x1 - rowStartX, 1);	// TODO: do a start/end instead so we can do a single fill per continuous line			
			// note that the color of the filled cells is no longer the same as the original color
			for (var i = rowStartX, end = x1; i < end; i++) {
				colorCache[y][i] = false;
			}
		}

		console.timeEnd("fill all rows by points");
	},
		
	
	// this implementation grabs (3) entire lines of the data at once
	//	which is probably faster if we're dealing with REALLY BIG contiguous areas
	//	but is MUCH slower with small areas
	floodFillLines : function (canvas, x, y, newColor) {
		console.time("fill all rows by lines");
		var context = canvas.context,
			width = canvas.width,
			height = canvas.height,
			stack = [],
			colorMatrix = [],
			x1, rowStartX,
			spanTop, spanBottom
		;
	
		stack.push([x, y]);
		
		context.fillStyle = newColor;		
		oldColor = context.getImageData(x, y, 1, 1).data;
		
		function matchesOldColor(rowData, x) {
			x = x * 4;
			return 	   oldColor[0] == rowData[x] 
					&& oldColor[1] == rowData[x+1]
					&& oldColor[2] == rowData[x+2]
		}
	
		while(it = stack.pop()) {	
			x = it[0], y = it[1];
			var thisRow = context.getImageData(0, y, width, 1).data,
				lastRow = (y > 0 		   ? context.getImageData(0, y-1, width, 1).data : null),
				nextRow = (y < height - 1  ? context.getImageData(0, y+1, width, 1).data : null),
				x1 = x
			;
			while(x1 >= 0 && x1 < width && matchesOldColor(thisRow, x1)) x1--;
			x1++;
			rowStartX = x1;
			spanTop = spanBottom = false;
			while(x1 < width && matchesOldColor(thisRow, x1)) {
				if(!spanTop && lastRow && matchesOldColor(lastRow, x1)) {
					stack.push([x1, y - 1]);
					spanTop = true;
				} else if(spanTop && lastRow && !matchesOldColor(lastRow, x1)) {
					spanTop = false;
				}
				if(!spanBottom && nextRow && matchesOldColor(nextRow, x1)) {
					stack.push([x1, y + 1]);
					spanBottom = true;
				} else if (spanBottom && nextRow && !matchesOldColor(nextRow, x1)) {
					spanBottom = false;
				}
				x1++;
			}
			context.fillRect(rowStartX, y, x1 - rowStartX, 1);	// TODO: do a start/end instead so we can do a single fill per continuous line			
		}
		console.timeEnd("fill all rows by lines");
	}

	
});




//
//	Tool to interactively create a new path.
//
//	Set:		"itemConstructor" 	-- to the type of the item to create (constructor or string name)
//				"itemProperties"	-- (optional) to properties of the new item
//
dnb.Tool.createSubclass("PenTool", {
	title 				: "New pen shape",
	icon 				: "images/icons/pen.png",

	itemProperties 		: {	scaleToSize:false, scalePosition:true,
							stroke:"black", lineWidth:2, 
						   },
	itemCreationProperties: {
							$showControlPoints:true, $showPoints:true, $showHandles:true
						   },
	itemConstructor		: dnb.Path,
//	useGlobalProps		: true,
//	chooserCommand		: "ShapeChooser",

	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.layerToAddTo = this.interactor;
		this.newItem = null;
	},

	onDeselect : function() {
		this.inherit("onDeselect", arguments);
	},

	onResume : function(event, lastTool) {
		if (this.newItem) this.layerToAddTo.redraw();
		this.inherit("onResume", arguments);
	},
	
	onMouseMove : function(event) {
		if (this.newItem) {
			var point = this.getMousePoint(event);
			var edge = this.newItem.isInsideEdge(point);
			if (edge != null && (typeof edge == "number" || edge.constructor == Array)) {
				this.interactor.setCursor("pointer");
			} else {
				this.interactor.setCursor(this.defaultCursor);
			}
		}
	},

	onMouseDown : function(event) {
		var point = this.getMousePoint(event);
		if (this.newItem) {
			var edge = this.newItem.isInsideEdge(point);
			if (edge != null && (typeof edge == "number" || edge.constructor == Array)) {
				if (edge == 0) {
					return this.closeShape();
				} else {
					return this.startMovingPoint(event, point, edge);
				}
			} else {
				return this.startMakingPoint(event, point);
			}
		} else {
			this.startCreatingItem(event, point);		
		}
	},

	onDoubleClick : function(event) {
		this.closeShape();
	},
	
	closeShape : function(event) {
		if (this.newItem) {
			this.newItem.addPoint("Z");
		}
		this.finishShape();	
	},
	
	finishShape : function(event) {
		this.focusedLayer.addChild(new dnb.Path(this.itemProperties, 
												{	points:this.newItem.getPointString(),
													left: this.newItem.left, top:this.newItem.top,
													width:this.newItem.width, height:this.newItem.height
												}));
		this.layerToAddTo.destroyChild(this.newItem);
		this.layerToAddTo.redraw();
		this.focusedLayer.redraw();
		delete this.newItem;
	},

	startCreatingItem : function(event, point) {
		this.newItem = new dnb.Path(	this.itemProperties, 
										this.itemCreationProperties, 
										{points:"M 0 0", left:point.x, top:point.y}
									);
		this.layerToAddTo.addChild(this.newItem);
		this.startMakingPoint(event, point);
	},
	
	startMovingPoint : function(event, point, edge) {
		var props = {
			startPoint			: point,
			edge 				: edge,
			target				: this.newItem
		}
		this.controller.pushTool(event, new dnb.ResizeItemInteraction(props));		
	},
	
	startMakingPoint : function(event, point) {
		var props = {
			item				: this.newItem,
			layerToAddTo		: this.layerToAddTo
		}
		this.controller.pushTool(event, new dnb.PenNewPointInteraction(props));	
	}

});


//
//	Interactor for pen drawing.
//
//	onSelect, pass:		- "itemConstructor"		-- name or constructor of new item to create
//						- "itemProperties"		-- (optional) properties for new item
//						- "useGlobalProps"		-- true if you want to use the global paint properties when creating
//													ENCAPSULATION -- this is specific to shapes, pass an array of itemProperties?
//
//	when completed, 	- "this.newItem" 		== the new item created, if any
//
dnb.MouseInteraction.createSubclass("PenNewPointInteraction",
{
	onSelect : function() {
		this.inherit("onSelect", arguments);
		this.pointAdded = false;
		var matrix = this.item.getPointMatrix();
		this.pointNum = matrix.length;
		this.item.addPoint("L", this.startPoint.x - this.item.left, this.startPoint.y - this.item.top);
		this.layerToAddTo.redraw();
	},


	onMouseMove : function(event) {
		var	point	= this.getMousePoint(event),
			rect	= this.getStartToEndRect(this.startPoint, point, event.altKey, event.shiftKey)
		;
		// if we've never moved more than a tiny bit, forget it
		this.hasMoved = this.hasMoved || rect.width > this.minWidth || rect.height > this.minHeight;
		if (!this.hasMoved) return;
		this.item.setPoint(	this.pointNum, "S", 
							point.x - this.item.left, point.y - this.item.top,
							this.startPoint.x - this.item.left, this.startPoint.y - this.item.top
						);
		this.layerToAddTo.redraw();
	},

	
	onMouseUp : function(event) {
		this.controller.popTool(event, this);		
	}

});

