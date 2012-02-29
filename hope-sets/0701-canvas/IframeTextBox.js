
// NOTE: you can really only use this to draw one thing at a time at this point
//		AND each one creates an iframe, so creating a lot of them is pretty expensive
//		Use a regular div if you can!
// TODO: have a pool of iframes (creating more as neessary) so we can draw more than one thing?
//			-- keep this at the class level, to reuse more efficiently?
// TODO: write the page stylesheets into the frame?
dnb.Shape.createSubclass("IframeTextBox", {
	width		: 100,	// REALLY SHOULD OVERRIDE AT LEAST THIS
	height		: 100,
	contents	: "",	// html to draw, tags will be interpreted
	
	
	getRenderProps : function(canvas) {
		var props = this.inherit("getRenderProps", arguments);
		props.contents = this.getContents();
		return props;
	},
	
	// the current CANVAS implementation of drawWindow() for an iframe only works
	//	a little while after the iframe's content has been written.
	// When the canvas asks us if we're ready to draw, only return in the affirmative
	//	if we've already drawn and the contents are what was drawn in the iframe last time.
	// If not, set the iframe contents and return false, so the Canvas will try to redraw again in a bit
	//
	//	NOTE: this implementation calls getRenderProps() before drawing the contents to get the width/height
	//			could possibly do without this (although that feels hackish)
	prepareToDraw : function(canvas) {
		if (this.contentsReady && this.lastContents == this.contents) {
			return true;
		}
		
		var props = this.getRenderProps(canvas);
		var iframe = this._getIframe(props.contents, props.width, props.height);

		// TODO: there must be a better way to do this...
		var doc = iframe.contentWindow.document;
		doc.write("<html><body>"+props.contents+"</body></html>");
		doc.close();
		
		this.contentsReady = true;
		this.lastContents = this.contents;
		return false;
	},
	
	render : function(canvas, props) {
//console.debug(this._getIframe());
		canvas.drawWindowContents(this._getIframe());
	},
	
	
	_iframeStyle : {
						position:"absolute",
						left:-100000,
						top:-100000,
//						right:0,
						top:100,
						zIndex:100000,
						border:"1px solid red"
	},
	
	// NOTE: we pass in the contents here in case we want to have a pool of iframes at some point
	//			that are keyed by contents
	_getIframe : function(contents, width, height) {
		var iframe = this._iframe;
		if (iframe == null) {
			iframe = this._iframe = dnb.createElement({
					tag:"IFRAME",
					parent:"body",
					style: this._iframeStyle
				});

		}

		if (width) iframe.style.width = iframe.width = width;
		if (height) iframe.style.height = iframe.height = height;
		return iframe;
	},
	
	
	resizeTo : function(left, top, width, height) {
		this.inherit("resizeTo", arguments);
		this._getIframe(this.contents, width, height);
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