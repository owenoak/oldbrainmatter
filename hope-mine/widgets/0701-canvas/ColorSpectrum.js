
dnb.Toolbar.createSubclass("ColorSpectrum", 
	{
		toolbarStyle : "menu",
	
		controller: null,
		colorProperty : "fill",
		
		gravity:"w",
		
		className : "dnb-ColorSpectrum",
		style : "cursor:pointer;",

		mouseColor : "red",
		currentColor : "red",
	
		width:	74,
		height:	298,
		sizeToParent:false, 
		
		styles : [
			dnb.StyleFactory.getStyle("gradient:n,[0.1,#cccccc],[0.9,#333333]","CS_Outline")
		],
		
		preloadedImages : [
			dnb.Bitmap.getImageHandle("images/spectrum/spectrumWithGray.png", "ColorSpectrumImage"),
			dnb.Bitmap.getImageHandle("images/spectrum/spectrumThumb.png", "ColorSpectrumThumb")
		],
		
		// these are "childrenToBe" because we don't want to create them until they're needed
		//	TODO: push this into Canvas?
		childrenToBe : {
//			currentColorSwatch : {type:"Rect", left:2, top:1, width:33, height:20, lineWidth:2, stroke:"CS_Outline"},
//			mouseColorSwatch : {type:"Rect", left:39, top:1, width:33, height:20, lineWidth:2, stroke:"CS_Outline"},
			hues : {constructor:"Bitmap", left:2, top:2, width:70, height:292, 
									url:"ColorSpectrumImage", 
									stroke:"CS_Outline", lineWidth:4
				},
			thumb : {constructor:"Bitmap", left:60, top:60, width:13, height:13, url:"ColorSpectrumThumb"}
		},

		makeChildren : function() {
			var children = this.childrenToBe;
			for (var name in children) {
				var item = children[name];
				item = this[name] = dnb.createInstance(item);
				this.addChild(item);
			}
		},

		hideThumb : function(skipRedraw) {
			this.thumb.left = 100;
			this.thumb.top = 100;
			if (skipRedraw != true) this.hues.redraw();
		},

		show : function(event) {
			this.inherit("show",arguments);
			this.originalColor = (this.controller ? this.controller.getColor(this.colorProperty) : null);
		},

		onMouseDown : function(event) {
			this.originalColor = this.getEventColor(event);	
		},
		
		getEventColor : function(event) {
			var mouseColor = this.originalColor;
			var point = this.getMousePoint(event);
			if (point.y < 20) {
				mouseColor = null;
				this.hideThumb(true);
			} else {
				this.hues.redraw();		// redraw the hues to get rid of the thumb
				mouseColor = this.getColorAtPoint(point);
				this.thumb.left = point.x - 10;
				this.thumb.top = point.y - 10;
			}
			this.redraw();		
			return mouseColor;
		},
		
		onMouseMove : function(event) {
			this.mouseColor = this.getEventColor(event);
			this.controller.setColor(this.colorProperty, this.mouseColor);
		},
		
		onMouseOut : function(event) {
			this.hideThumb();
			if (this.controller) this.controller.setColor(this.colorProperty, this.originalColor);			
		},
		
		onMouseUp : function(event) {
			this.currentColor = this.mouseColor;
			if (this.controller) this.controller.setColor(this.colorProperty, this.currentColor);
		}
	
	}
);