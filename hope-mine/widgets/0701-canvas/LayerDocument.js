dnb.createClass("LayerDocument", {
	debugging			: true,
	debuggingEvents		: false,
	
	$hasBeenDrawn		: false,

	// defaults passed in to layers
	width 				: null,		// width and height of all layers we create
	height 				: null,		//	null = take from parent
	zoom				: 1,		// magnification level

	gravity 			: "C",		// for showing... ?
	layerDefaults 		: {			// other random defaults passed in to all new layers
								hasContents:true
						  },
	
	layerContainer 		: "",		// id/dom element that holds the layers, both tool and user layers
	layerScroller		: "",		// id/dom element that is the scroll container for all the layers
	layers 				: null,		// listof canvases
	selectedLayers 		: null,
	shapes 				: null,
	
	interactor			: null,		// decorator layer that tools interact with, gets redrawn frequently

	toolbars			: null,		// ALL tools (overlay and underlay)
	underlayToolbars	: null,		// list of all tool layers that appear UNDER content (eg: grid)
	overlayToolbars		: null,		// list of all tool layers that appear OVER content (eg: interactor, menus, etc)
	contextMenu			: null,		// context menu for the interaction layer
	scratchLayer 		: null,		// decorator layer for doing compositing, etc, usually not displayed
	decoratorLayerDefaults :{},
	
	showGrid 			: true,		
	gridLayer 			: null,		// decorator layer to show the grid
	gridSize 			: 10,
	gridMajorUnits		: 100,
	
	toolQueue			: null,		// stack of tools	
	
		
	undoStack 			: null,
	undoPointer 		: -1,

	notifier			: {			// element that shows notices (like 'saved' etc), instantiated automatically
								id			:"paintNotifier",		// NOT GENERIC
								opacity		: null,
								delay		: 2000,
								fade		: true
							},
	
	statusBar			:  {		// element that shows status messages (eg: tool messages), instantiated automatically
								id			:"paintStatus",			// NOT GENERIC
								opacity		: 1,
								delay		: 0,
								fade		: false
							},
	
	underlayToolbarZStart	: 10,		// base zIndex for "underlay" layers (like grid)
	childLayerZStart		: 1000,		// base zIndex for normal "canvas" layers
	overlayToolbarZStart	: 10000,	// base index for "overlay" layers (like interactor)
	
	globalPaintProps : {
		stroke		: "blue",
		fill		: "lightBlue",
		lineWidth	: 2,
		brushSize 	: 10
	},

	init : function() {
		this.initChildren();

		this.toolbars = [];
		this.overlayToolbars = [];
		this.underlayToolbars = [];
		this.undoStack = [];

		this.toolStack = [];
		
		this.inherit("init", arguments);
	},
	
	
	//
	//	load & save
	//
	serialize : function() {
		console.time("serializing");
		var output = ["{\n",
						"	'format'		: \"LayerDocument\",\n",
						"	'formatVersion'	: 1,\n",
						"	'width'			: ",this.width,",\n",
						"	'height'		: ",this.height,",\n",
						"	'layers'		: [\n"
					];
						
						
						
		var layers = this.children(),
			layerOutput = []
		;
		for (var i = 0, layer; layer = layers[i++];) {
			layerOutput.push(layer.serialize());
		}
		
		output.push(layerOutput.join(",\n"));	// end layers
		output.push("\n\t]\n");	// end layers
		output.push("}");	// end outer	
		console.timeEnd("serializing");
		return output.join("");
	},


	saveURL 	: "php/saveLayers.php",
	userLocation: "../users/",		// NOTE: don't send to the server as it's not safe!
	userName	: "testuser",	
	fileName	: "test",
	saveLayers 	: function(fileName) {
		if (fileName == null) fileName = this.fileName;
		var userName = this.userName;

		this.showNotice("Saving as user:'", userName, "' file:'", fileName, "'");
		
		console.time("saving");
		console.time("serializing");
		var data = this.serialize();
		var contents = this.children(0).serializeContents();
		console.timeEnd("serializing");
		
		console.time("posting");
		dnb.postObjectTo(this.saveURL, {userName:this.userName, file: fileName, data: data, contents:contents });
		console.timeEnd("posting");

		console.timeEnd("saving");
		this.showNotice(fileName," saved!");
	},
	
	// load layers and shapes from a file
	//	TODO: this should really go to the app, which will create a new document instead of this janky 1/2 measure
	loadLayers : function(fileName) {
		if (fileName == null) fileName = this.fileName;
		var userName = this.userName,
			filePath = this.userLocation + this.userName + "/" + fileName + ".js"
		;
		this.showNotice("Loading '"+fileName+"'...");
		
		console.time("loading ",filePath);
		console.time("loading data");
		var results = dnb.XhrRequest(filePath);
		console.timeEnd("loading data");
		
		eval("results = "+results);
		var layer = this.children(0);

		// set the first child's contents
		var contentsUrl = results.layers[0].contentsUrl;
		layer.loadUrl(contentsUrl);

		// get rid of the old shapes and create new ones
		layer.destroyChildren();
		layer.childrenToBe = results.layers[0].childrenToBe;
		layer.makeChildren();

		layer.redraw();

		console.timeEnd("loading ",filePath);
		this.showNotice(fileName," loaded!");
	},
	
	
	//
	//	drawing semantics
	//
	
	
	draw : function() {
		if (this.$hasBeenDrawn) return;

		if (this.width == null || this.height == null) {
			var containerSize = dojo.html.getContentBox(this.layerContainer);
			this.width = containerSize.width;
			this.height = containerSize.height;
		}
		
		if (this.showGrid) this.makeGridLayer();

		// create a layer if one has not been created yet (this will probably change at some point)
		if (!this.hasChildren()) this.newLayer();

		// select and focus this child
		this.selectChild(this.children(0));
		this.focusChild(this.children(0));

		this.forEachChild("draw");

		// interaction canvas -- handles mouse events
		this.makeInteractor();
		this.setContextMenu();
		this.fixZIndexes();

		this.captureEvents();
		
		this.$hasBeenDrawn = true;
	},
	
	makeInteractor : function() {
		if (this.interactor) return this.interactor;
		var currentDefaults = {
				id				: this.getId()+"_interactor", 
				controller 		: this,
				parent 			: this.layerContainer,
				width			: this.width, 
				height			: this.height,
				style			: {position:"absolute"},
				contextMenu		: this.contextMenu
			}
		;

		var it = (this.interactor = new dnb.InteractionCanvas(currentDefaults, this.decoratorLayerDefaults, arguments));	
		this.addOverlayTool(it);
	},

	setContextMenu : function() {
		if (this.contextMenu) {
			var menu = this.contextMenu;
			menu.controller = this;
			menu.parent = this.layerContainer;
			this.addOverlayTool(this.contextMenu);
		}	
		this.interactor.contextMenu = menu
	},

	toggleGrid : function(newState) {
		if (newState == null) newState = !(this.showGrid);
		if (newState) 	this.makeGridLayer();
		else			this.hideGridLayer();
	},

	makeGridLayer : function() {
		if (this.gridLayer) return this.gridLayer.show();
		var gridLayerDefaults = {
				id				: this.getId()+"_grid", 
				controller		: this,
				style			: {position:"absolute"},
				parent 			: this.layerContainer,
			},
			gridShapeDefaults = {
				gridSize 			: this.gridSize,
				gridMajorUnits	: this.gridMajorUnits
			}
		;
		
		var grid = this.gridLayer = this.createLayer(gridLayerDefaults);
		grid.addChild(new dnb.Grid(gridShapeDefaults));
		this.addUnderlayTool(grid);
		return grid;
	},

	hideGridLayer : function() {
		if (this.gridLayer) this.gridLayer.hide();
	},

	getScratchLayer : function(alwaysCreate) {
		if (alwaysCreate == true) return this.createLayer();
		return this.scratchLayer || (this.scratchLayer = this.createLayer());
	},



	//
	//	child semantics -- our "children" are canvases
	//	

	redrawSelectedChildren : function() {
		this.forEachSelectedChild("scheduleRedraw");
	},

	onChildrenChanged : function(what, who) {
		this.fixZIndexes();
	},
	
	onAddChild : function(layer, index) {
		if (this.$hasBeenDrawn && !layer.$hasBeenDrawn) layer.draw();
	},
	
	onRemoveChild : function(layer, index) {
		layer.hide();
	},

	onReorderChild : function(layer, start, end) {},
	
	onDestroyChild : function(layer) {},
	
	onSelectChild : function(layer) {
		if (this.debugging) console.debug("selected ", layer);			
	},
	onDeselectChild : function(layer) {
		if (this.debugging) console.debug("deselected ", layer);			
	},


	
	// controller/tool API
//	focusedChild() {},		// focused layer

	

	setCursor : function(cursor) {
		this.interactor.setCursor(cursor);
	},

	resetCursor : function() {
		this.interactor.resetCursor();
	},

	
	getSelectedShapes : function() {
		var layers = this.selectedChildren(),
			shapes = []
		;
		for (var i = 0; i < layers.length; i++) {
			shapes = shapes.concat(layers[i].selectedChildren());
		}
		return shapes;
	},

	
	// set global color + that of any selected shapes
	setColor : function(property, color) {
		this.globalPaintProps[property] = color;
		var shapes = this.getSelectedShapes();
		shapes.forEach(
			function(shape) {
				shape[property] = color;
			}
		);
		this.redrawSelectedChildren();
	},

	// get the current ["fill"|"stroke"] color
	getColor : function(property) {
		var shape = this.getSelectedShapes()[0] || this.globalPaintProps;
		return shape[property];
	},	
	


	//
	//	layer methods
	//
	

	addLayer : function(layer) {
		this.addChild(layer);
		return layer.draw();
	},

	addOverlayTool : function(tool) {
		tool.parent = this.layerContainer;
		tool.controller = this;
		dnb.addOnceToArray(this.overlayToolbars, tool);
		dnb.addOnceToArray(this.toolbars, tool);
		tool.draw();
		this.fixZIndexes();
		return tool;
	},
	
	addUnderlayTool : function(tool) {
		tool.controller = this;
		tool.parent = this.layerContainer;
		dnb.addOnceToArray(this.underlayToolbars, tool);
		dnb.addOnceToArray(this.toolbars, tool);
		this.fixZIndexes();
		return tool.draw();
	},
	
	// NOTE: this only adds a single layer, so you can pass as many argument properties as you want
	//		the layer is added to the layers list at the top
	// always adds at the end, TODO: get smarter about this
	newLayer : function() {
		return this.addLayer(this.createLayer.apply(this, arguments));
	},
	
	// create a layer, but don't add it to the layers collection
	//	(useful for making scratch layers, etc)
	createLayer : function() {
		// NICE: you can just pass arguments in and it works!
		var currentDefaults = {
				parent 			: this.layerContainer,
				width			: this.width, 
				height			: this.height,
				gravity 		: this.gravity,
				controller 		: this,
				style			: {position:"absolute"}
			};
		return new dnb.Canvas(currentDefaults, this.layerDefaults, arguments[0]);//[].concat(arguments));	
	},
	
	
	// NOTE: this will be executed on each layer passed in, or on all selected layers if no arguments
	mergeLayers : function() {
		var list = this.getArgsOrChildSelection(arguments);

		var merged = this._mergeLayersIntoScratch.apply(this, list);
		list[0].setTo(merged);
		
		// remove the first element and destroy all the remaining layers
		list.shift();
		this.destroyChildren.apply(this, list);
	},

	// NOTE: this will be executed on each layer passed in, or on all selected layers if no arguments
	// merge the layers without affecting the current layer set
	_mergeLayersIntoScratch : function() {
		var list = this._argumentsOrSelectedLayers(arguments);
		var scratch = this.getScratchLayer();
		scratch.clear();
		list.forEach(function(layer) {
				scratch.context.drawImage(layer.element,0,0);
			}, this);
		return scratch;
	},
	
	
	_fixZs : function(list, startZ) {
		for (var i = 0; i < list.length; i++) {
			list[i].setZIndex(i + startZ);
		}
	},
	fixZIndexes : function() {
		this._fixZs(this.underlayToolbars, this.underlayToolbarZStart);
		this._fixZs(this.children(), this.childLayerZStart);
		this._fixZs(this.overlayToolbars, this.overlayToolbarZStart);
	},
	


	//
	// geometry
	//
	setSize : function(width, height, gravity) {
		if (width) this.width = width;
		if (height) this.height = height;
		if (gravity) this.gravity = gravity;
		this.forEachChild("resize", arguments);
	},


	scrollTo : function(left, top) {
		var it = dojo.byId(this.layerScroller);
		if (left != null) it.scrollLeft = left;
		if (top != null)  it.scrollTop  = top;
		this.onScroll(it.scrollLeft, it.scrollTop);
	},


	scrollBy : function(left, top) {
		var it = dojo.byId(this.layerScroller);
		if (left) it.scrollLeft += left;
		if (top) it.scrollTop += top;
		this.onScroll(it.scrollLeft, it.scrollTop);
	},

	onScroll : function(left, top) {},


	magnify : function(zoom, event) {
		this.zoom = Math.min(zoom, 8);
		this.forEachChild("magnify", arguments);
		this.interactor.magnify(this.zoom);
		if (this.gridLayer) {
			var gridShape = this.gridLayer.children(0);
			gridShape.gridSize = (10 * this.zoom);
			this.gridLayer.resizeTo(this.width * this.zoom, this.height * this.zoom);
			this.gridLayer.clear();
			this.gridLayer.redraw();
		}
		return this.zoom;
	},


	magnifyToRect : function(l, t, w, h) {
		var wRatio = (this.width / w),
			hRatio = (this.height / h),
			ratio = Math.ceil(Math.min(wRatio, hRatio))
		;
		ratio = this.magnify(ratio);
		this.scrollTo(l * ratio, t*ratio);
	},

	zoomOut : function() {
		this.magnify(this.zoom / 2);
	},
	
	zoomIn : function() {
		this.magnify(this.zoom * 2);	
	},


	// these act on the selectedLayer(s)
	cut : function() {},
	copy : function() {},
	paste : function() {},
	pasteInto : function() {},
	crop : function() {},
	



	//
	//	toolbar semantics
	//
	addToolbar : function() {},


	
	addUndoCommand : function() {},
	undo : function() {},
	redo : function() {},
	
	
	
	//
	//	notices and status
	//
	
	
	_getMessenger : function(name) {
		if (!(this[name] instanceof dnb.Messenger)) {
			this[name] = new dnb.Messenger(this[name]);
		}
		return this[name];
	},
	showNotice : function() {
		this._getMessenger("notifier").show(dnb.joinArguments(arguments));
	},
	showNoticeImmediately : function() {
		this._getMessenger("notifier").showImmediately(dnb.joinArguments(arguments));
	},
	clearNotice : function() {
		this._getMessenger("notifier").clear();		
	},
	
	showStatus : function() {
		this._getMessenger("statusBar").show(dnb.joinArguments(arguments));	
	},
	
	clearStatus : function() {
		this._getMessenger("statusBar").clear();	
	},



	//
	//	tool semantics
	//	

	activeTool : function() {
		return this.toolStack[this.toolStack.length-1];
	},

	// switch the tool that responds to mouse events
	//	note: implicitly de-selects (all) current tool(s)
	selectTool : function(event, tool) {
		this._clearToolStack();
		this.toolStack.push(tool);
		tool.onSelect(event, this);
	},

	// someone (generally the current tool, maybe a toolbar) is changing the tool temporarily
	//		suspend the top tool and select the new one
	pushTool : function(event, newTool) {
		var active = this.activeTool();
		if (active) {
			if (this.debuggingEvents) console.info("pushTool(",newTool,"): suspending:",active);
			active.onSuspend(event, newTool);
		}
		this.toolStack.push(newTool);
		newTool.onSelect(event, this);
		if (this.debuggingEvents) console.info("pushTool(",newTool,"): stack now looks like:\n",this.toolStack);
	},
	
	// the push()ed tool is done, so it pops itself and we go back to the last one
	popTool : function(event, tool) {
		var topTool;
		// XXX
		while ( tool != topTool) {
			topTool = this.toolStack.pop();
			if (!topTool) break;
		}
		tool.onDeselect();

		var active = this.activeTool();
		if (active) {
			if (this.debuggingEvents) console.info("popTool(",tool,"): resuming:",active);
			active.onResume(event, tool);
		}
		if (this.debuggingEvents) console.info("popTool: stack now looks like:\n",this.toolStack);
	},
	
	_clearToolStack : function() {
		for (var tool; tool = this.toolStack.pop(); ) {
			tool.onDeselect();
		}
	},


	
	
	performCommand : function(event, action) {
		if (!event.clientX) event.clientX = this._lastClientX;
		if (!event.clientY) event.clientY = this._lastClientY;
		action.onSelect(event, this, this.focusedChild());
	},



	//
	//	event handling
	//		-- basic scheme is that this controller grabs all events and passes them to the
	//			active tool, if there is one
	//
	captureEvents : function() {
		this.keyHandlers = {};
		var controller = this;

		// add a mouseMove handler so we can note the last moust position
		dnb.addGlobalEvent("mousedown", function(event){return controller._routeMouseEventToActiveTool(event, "onMouseDown")}, false);
		dnb.addGlobalEvent("mouseup", function(event){return controller._routeMouseEventToActiveTool(event, "onMouseUp")}, false);
		dnb.addGlobalEvent("click", function(event){return controller._routeMouseEventToActiveTool(event, "onClick")}, false);
		dnb.addGlobalEvent("dblclick", function(event){return controller._routeMouseEventToActiveTool(event, "onDoubleClick")}, false);
		dnb.addGlobalEvent("mousemove", function(event){return controller._routeMouseEventToActiveTool(event, "onMouseMove")}, false);

		dnb.addGlobalEvent("keypress",function(event){return controller.onKeyPress(event)},false);
		dnb.addGlobalEvent("keydown",function(event){return controller.onKeyDown(event)},true);
		dnb.addGlobalEvent("keyup",function(event){return controller.onKeyUp(event)},true);
	},

	_routeMouseEventToActiveTool : function(event, eventName) {
		var tool = this.activeTool();
		if (!tool) return;
		if (event.button != 0 && tool.ignoreRightClick) return;
		this._lastClientX = event.clientX;
		this._lastClientY = event.clientY;

		if (this.debuggingEvents) console.debug("LayerDocument."+eventName, " sending to:", tool);
		if (tool && tool[eventName]) return tool[eventName](event);
	},


	
	// code can be a number or a character, method should be pre-hitched
	//	note: simplistic, only one method can be set on a key at a time, 
	//			and setting another one clobbers the last
	addKeyHandler : function(which, method) {
		this.keyHandlers[which] = method;
	},
	
	// simplistic
	removeKeyHandler : function(which, method) {
		delete this.keyHandlers[which];
	},


	
	onKeyDown : function(event) {
		var code = event.charCode || event.keyCode,
			key = String.fromCharCode(code)
		;
//console.table("down:", event.keyCode, event.charCode, code);
//console.dir(event);
		var active = this.activeTool();
		if (active && active.onKeyDown) return active.onKeyDown(event);	
	},

	onKeyUp : function(event) {
		var code = event.charCode || event.keyCode,
			key = String.fromCharCode(code)
		;
//console.table("up:", event.keyCode, event.charCode, code);
		var active = this.activeTool();
		if (active && active.onKeyUp) return active.onKeyUp(event);	
	},
	
	onKeyPress : function(event) {
		var code = event.charCode || event.keyCode,
			key = String.fromCharCode(code)
		;
		
		// TODO: make this use the key registry
		if (code >= 37 && code <= 40) {
			if (this._nudgeCommand == null) this._nudgeCommand = new dnb.NudgeSelectedCommand();
			this._nudgeCommand.onSelect(event, this);
		}
		if (code == 32 && this.activeTool().chooserCommand) {
			this.performCommand(event, new dnb[this.activeTool().chooserCommand]);
		}


//console.table("press:", event.keyCode, event.charCode, code);
//console.dir(event);
		var active = this.activeTool();
		if (this.debuggingEvents) console.debug("LayerDocument."+event.type, active, code, key);
		if (active && active.onKeyPress) {
			var result = active.onKeyPress(event);
			if (result != true) return result;
		}

		if (this.keyHandlers[key])  return this.keyHandlers[key](event);
		if (this.keyHandlers[code]) return this.keyHandlers[code](event);
	}
	
	
});


//
//	the "child" collection for the controller is a list of layer objects
//		(which themselves have "shape" children)
//
dnb.LayerDocument.mixInClass(dnb.ChildCollection);

