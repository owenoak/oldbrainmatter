
//
//	TODO: 	* clean this up
//			* pull stuff out of Bitmap class
//			* break on word boundaries (what are those?)
//			* make BitmapTextBox a subclass of Bitmap
//			* cache a particular string (font+w+h+string+?) always?
//			* cache words, since words won't break?
//

dnb.Bitmap.createSubclass("BitmapTextBox", {
	url		 	: "fonts/Skia18.png",
	contents 	: "enter text here",
	autoSize	: false,
	lineSpacing	: 1.2,		// amount of space between lines (must be a multiplier for now)
	
	init : function() {
		this.inherit("init", arguments);
		if (this.preload && this.url) {
			this.getSliceMap(this.url);
		}
	},

	getRenderProps : function(canvas) {
		var p = this.inherit("getRenderProps", arguments);
		p.contents = this.getContents();
		p.offsetWidth = 0;					// maximum width of any line drawn, for sizing
		p.offsetHeight = 0;					// height of actual text drawn
		return p;
	},
	
	renderImage : function(canvas, props) {
//console.time("renderImage");
		var contents = props.contents,
			imageHandle = props.imageHandle,
			map  = this.getSliceMap(props.url),
			shapeWidth = props.width,
			shapeHeight = props.height,
			cursorTop = 0,
			cursorLeft = 0,
			slice = this.getSlice(map, "a"),
			letterHeight = slice.h,
			lineHeight = letterHeight * this.lineSpacing
		;
		for (var i = 0, len = contents.length; i < len; i++) {
			var letter = contents.charAt(i),
				sliceImg = this.getSliceOfImage(props.url, letter, imageHandle, map);
			;
			if (sliceImg != null) {
				if (cursorLeft + sliceImg.width > shapeWidth) {
					props.offsetWidth = Math.max(props.offsetWidth, cursorLeft);
					cursorLeft = 0;
					cursorTop += lineHeight;
					// bail if the text doesn't fit
					if (cursorTop > shapeHeight) break;
				}
				canvas.context.drawImage(sliceImg, cursorLeft, cursorTop);
				cursorLeft += sliceImg.width;
			}
		}
		// remember how big we actually drew the text
		props.offsetWidth = Math.max(props.offsetWidth, cursorLeft);
		props.offsetHeight = (cursorTop + lineHeight);
//console.timeEnd("renderImage");
		return this;
	},

	getContents : function() {
		return this.contents;
	},

	startEditing : function(skipRedraw) {
		var results = prompt("Whaddya wanna say? (html -- markup ok)", this.contents);
		if (results == null) return;
		this.contents = results;
		if (!skipRedraw && this.$cache.canvas) this.$cache.canvas.scheduleRedraw();
		return this.contents;
	}
});