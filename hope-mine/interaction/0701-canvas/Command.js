

//
//	Commands are a subclass of tools, the difference is that Commands don't stay selected
//		the same way tools do -- they do their thing and then are done
//	  That thing might involve showing a dialog or menu, and that's OK
//

dnb.Tool.createSubclass("Command", {
	defaultCursor : null,
	
	getCommandTarget : function() {
		var target  = this.interactor.focusedChild();
		if (!target) target = this.getFocusedTarget();
		return target;
	}
	
});




////////////////
//
//	DeleteCommand:  delete the selected shape(s)
//
////////////////


dnb.Command.createSubclass("DeleteCommand", {
	title			: "Delete this item",
	icon			: "images/icons/delete.gif",

	onSelect		: function(event){
		this.inherit("onSelect", arguments);
		var selected = this.controller.selectedChildren();
		for (var i = 0, it; it = selected[i++]; ) {
			it.destroyChildren(it.selectedChildren());
		}
	}
});





////////////////
//
//	CropCommand:  crop everything outside of the selected shape
//
////////////////


dnb.Command.createSubclass("CropCommand", {
	title			: "Crop everything else out of the image",
	icon			: "images/icons/crop.png",
	disabled		: true,

	onSelect		: function(event){
		this.inherit("onSelect", arguments);

		var target = this.getCommandTarget();
		if (!target) 	return;
		
		var left		= target.getLeft(),
			top			= target.getTop(),
			width		= target.getWidth(),
			height		= target.getHeight(),
			selected 	= this.controller.selectedChildren()
		;
		for (var i = 0,layer; layer = selected[i++]; ) {
			var bits = layer.getImageAtRect(left, top, width, height, "contents");
			layer.clear("contents");
			layer.setImageAtRect(left, top, width, height, bits, "contents");
			layer.redraw();
		}
	}
});





////////////////
//
//	ZoomOut / ZoomIn:  magnify the entire canvas
//
////////////////


dnb.Command.createSubclass("ZoomOutCommand", {
	title			: "Zoom out",
	icon			: "images/icons/zoomOut.png",

	onSelect		: function(event){
		this.inherit("onSelect", arguments);
		this.controller.zoomOut();
	}
});

dnb.Command.createSubclass("ZoomInCommand", {
	title			: "Zoom in",
	icon			: "images/icons/zoomIn.png",

	onSelect		: function(event){
		this.inherit("onSelect", arguments);
		this.controller.zoomIn();
	}
});



/////////////////
//
//	PickUpShape : Pick up the contents bits from the selected shape
//
/////////////////
dnb.Command.createSubclass("PickUpShapeCommand", {
	title			: "Pick up bits from shape",
	icon			: "images/icons/copy.gif",

	onSelect		: function(event){
		this.inherit("onSelect", arguments);

		var target = this.getCommandTarget();
		if (!target) 	return;

		var bitmap = this.focusedLayer.getBitmapFromShape(target, true, "contents");
		this.focusedLayer.destroyChild(target);
		this.focusedLayer.addChild(bitmap);
		this.focusedLayer.redraw();
		this.focusedLayer.selectChild(bitmap);
	}
});



/////////////////
//
//	ClearShape : Clear the bits under the current shape
//
/////////////////
dnb.Command.createSubclass("ClearShapeCommand", {
	title			: "Clear bits under the current shape",
	icon			: "images/icons/eraser.png",

	onSelect		: function(event){
		this.inherit("onSelect", arguments);

		var target = this.getCommandTarget();
		if (!target) 	return;

		this.focusedLayer.clearBitsFromShape(target, null, "contents");
	}
});



/////////////////
//
//	NudgeSelected : Nudge the selected thing(s) according to the event
//
//			TODO:	* copy if alt down?
//
/////////////////
dnb.Command.createSubclass("NudgeSelectedCommand", {
	title			: "Nudget the selected thing according to the event",
	icon			: "images/icons/move.png",
	
	LEFT			: 37,
	UP				: 38,
	RIGHT			: 39,
	DOWN			: 40,

	onSelect		: function(event){
		this.inherit("onSelect", arguments);
		
		var selected = this.getSelectedTargets();

		var key = this.DOWN,
			shift = false,
			alt = false
		;
		if (event) {
			key = event.keyCode || event.charCode;
			shift = event.shiftKey;
			alt = event.altKey;
		}
		
		var x = 0,
			y = 0
		;
		switch (key) {
			case this.LEFT:		x = -1;	break;
			case this.UP:		y = -1;	break;
			case this.RIGHT:	x = 1;	break;
			case this.DOWN:		y = 1;	break;
		}
		if (shift) {
			x *= 10;
			y *= 10;
		}

		function moveIt(shape) {
			shape.moveBy(x, y);
		}
		selected.forEach(moveIt);
		this.focusedLayer.redraw();			// ENCAPSULATION ?
		this.interactor.redraw();
	}
});







////////////////
//
//	MenuCommand:  action to show a toolbar as a menu, 
//					which autoHides on mouseUp if action.autoHide == true
//
////////////////
dnb.Command.createSubclass("MenuCommand", {
	menu : null,
	autoHide : true,
	
	onSelect : function(event) {
		this.inherit("onSelect", arguments);
// TODO: createInstance here
		if (this.menu == null && this.menuId) {
			this.menu = window[this.menuId];
		} else if (!(this.menu instanceof dnb.Toolbar)) {
			this.menu = dnb.createInstance(this.menu, this.menuProps);
		}
		if (!this.menu) throw new TypeError();
		this.menu.autoHide = this.autoHide;
		this.controller.addOverlayTool(this.menu);
		this.menu.showAsMenu(event);
	}
});




/////////////////
//
//	SetFillColor : Set the global fill color, as well as that for any selected shapes
//
/////////////////
dnb.MenuCommand.createSubclass("FillChooser", {
		title 		: "Set fill options...",
		icon 		: "images/icons/fillColor.png",
		menu 		: "ColorSpectrum",
		menuProps 	: {colorProperty:"fill"}
});



/////////////////
//
//	SetLineColor : Set the global line color, as well as that for any selected shapes
//
/////////////////
dnb.MenuCommand.createSubclass("LineChooser", {
		title 		: "Set line options...",
		icon 		: "images/icons/lineColor.png",
		menu 		: "ColorSpectrum",
		menuProps 	: {colorProperty:"stroke"}
});


/////////////////
//
//	ShapeChooser : Pick a shape, any shape...
//
/////////////////
dnb.MenuCommand.createSubclass("ShapeChooser", {
		title 		: "Shape chooser...",
		menuId		: "shapeMenu"
});



/////////////////
//
//	BrushChooser : Choose brush size (for brush or pencil)
//
/////////////////
dnb.MenuCommand.createSubclass("BrushChooser", {
		title 		: "Brush chooser...",
		icon 		: "images/icons/brush.png",
		menuId		: "brushMenu"
});

dnb.Command.createSubclass("BrushSizeCommand", {
	title		: "Make the brush this big",
	brushSize	: 1,
	iconFill	: "black",
	toolType	: "BrushTool",

	init : function() {
		this.inherit("init", arguments);
		this.icon = new dnb.Circle({fill:this.iconFill, left:(20 - this.brushSize)/2, top:(20-this.brushSize)/2, width:this.brushSize, height:this.brushSize});
	},

	onSelect : function(event) {
		this.inherit("onSelect", arguments);
		this.controller.globalPaintProps.brushSize = this.brushSize;
		this.controller.selectTool(event, new dnb[this.toolType]());
	}
});


/////////////////
//
//	EraserChooser : Choose eraser size
//
/////////////////
dnb.MenuCommand.createSubclass("EraserChooser", {
		title 		: "Eraser chooser...",
		icon 		: "images/icons/brush.png",
		menuId		: "eraserMenu"
});

dnb.BrushSizeCommand.createSubclass("EraserSizeCommand", {
	title		: "Make the eraser this big",
	brushSize	: 1,
	iconFill	: "white",
	toolType	: "EraserTool"
});





/////////////////
//
//	SaveCommand : Save the file
//
/////////////////
dnb.Command.createSubclass("SaveCommand", {
	title 		: "Save",
	icon 		: "images/icons/save.gif",
	url 		: "php/save.php",

	onSelect : function(event, controller) {
		this.inherit("onSelect", arguments);
		this.controller.saveLayers();
	}
});



/////////////////
//
//	LoadCommand : Load the file (currently hacked)
//
/////////////////
dnb.Command.createSubclass("LoadCommand", {
	title 		: "Load",
	icon 		: "images/icons/folder.gif",

	onSelect : function(event, controller) {
		this.inherit("onSelect", arguments);
		this.controller.loadLayers(this.fileName);
	}
});





//
//	UNIMPLEMENTED CHOOSERS
//

// choosers
dnb.Command.createSubclass("MagnifyChooser", {
			title 		: "Magnification chooser...",
			icon 		: "images/icons/magnify.png",
			disabled	: true
});


dnb.Command.createSubclass("FontChooser", {
			title 		: "Font chooser...",
			icon 		: "images/icons/text.png",
			disabled	: true
});


dnb.Command.createSubclass("HistoryChooser", {
			title 		: "History chooser...",
			icon 		: "images/icons/marquee.png",
			disabled	: true
});

dnb.Command.createSubclass("SelectionChooser", {
			title 		: "Selection chooser...",
			icon 		: "images/icons/marquee.png",
			disabled	: true
});

dnb.Command.createSubclass("SliceChooser", {
			title 		: "Slice chooser...",
			icon 		: "images/icons/slice.png",
			disabled	: true
});

dnb.Command.createSubclass("ImageChooser", {
			title 		: "Image chooser...",
			icon 		: "images/icons/image.gif",
			disabled	: true
});

dnb.Command.createSubclass("OptionsChooser", {
			title 		: "Set options...",
			icon 		: "images/icons/properties.gif",
			disabled	: true
});

dnb.Command.createSubclass("SaveAsChooser", {
			title 		: "Save options...",
			icon 		: "images/icons/properties.gif",
			disabled	: true
});

dnb.Command.createSubclass("ColorChangeChooser", {
			title 		: "Color change...",
			icon 		: "images/icons/spectrum.png",
			disabled	: true
});









////////////////
//
//	Print Tool:  pick up the color at the mouse point
//
//	NOTE: this really wants to be more of a command or a push/pop thing...
//
////////////////

dnb.Command.createSubclass("PrintCommand", {
			title 		: "Print...",
			icon 		: "images/icons/print.gif",
			
			onSelect : function() {
				this.inherit("onSelect", arguments);
				var layer = this.focusedLayer;
				var wd = window.open("", "dprint", "scrollbars=1,resizable=1,height="+layer.height+",width="+layer.width);
				if (!wd) return alert("You must allow pop-up windows for this site to make printing work (for now).");
				var doc = wd.document;
				doc.write("<canvas id='printCanvas' width='"+layer.width+"' height='"+layer.height+"' style='position:absolute;left:0;top:0;'></canvas>");
				doc.close();
				var canvas = doc.getElementById("printCanvas"),
					context = canvas.context = canvas.getContext("2d"),
					element = layer.element
				;
				context.drawImage(element, 0, 0);
				wd.print();
				
					
				
				
			}
});


