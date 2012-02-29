// NOTE: stroke goes UNDERNEATH the Bitmap... ???

// NOTE:  if the URL for the image has not been loaded yet on Bitmap.draw(), 
//			the base class implementation will automatically defer the drawing in
//			Bitmap.redrawDelay msec increments.  This *could* mean that the drawing of
//			the image appears on top of other shapes that are being drawn in the same
//			canvas.  If you're concerned about this, you should manually check
//			Bitmap.isReadyToDraw() for all items in your list.
//
//		  The default Canvas implementation does this automatically for it's drawComponents()
//			method if you have canvas.deferDrawingUntilReady set to true (which is the default)

dnb.Shape.createSubclass("Bitmap", {
	redrawDelay : 100,			// delay after which we try to draw again if image hasn't loaded
	maxRedrawTries : 10,		// max # of redraw tries we'll attempt (note: could be a problem with big images)
	url : null,
	preload : true,
	width : null,
	height : null,
	autoSize : true,		// if true, we automatically size to the fill size of the Bitmap
	debugImageLoading : false,
	
	tools : {
		editMenu		: {
			constructor:"MenuCommand", title:"Edit bitmap", icon:"icons/piemenu.png"
		}
	},


	init : function() {
		this.inherit("init", arguments);
		if (this.url && this.preload) {
			this.getImageHandle();
		}
	},

	getRenderProps : function(canvas) {
		var p = this.inherit("getRenderProps", arguments);
		if (this.url || this.imageHandle) {
			p.url = this.getUrl(canvas);
			p.imageWidth = this.getImageWidth(canvas);
			p.imageHeight = this.getImageHeight(canvas);
			p.imageHandle = this.getImageHandle(canvas);
			p._redrawTries = 0;
			
			if (this.autoSize && this.width == null || this.height == null) {
				p.width = this.width = p.imageWidth;
				p.height = this.height = p.imageHeight;
			}
		}
		return p;
	},
	
	// draw the path so we can stroke or fill if desired
	drawPath : function(canvas, props) {
		var context = canvas.context;
		if (props.stroke || props.fill || props.clip) {
			context.beginPath();
			context.moveTo(0,0);
			context.lineTo(props.width, 0);
			context.lineTo(props.width, props.height);
			context.lineTo(0, props.height);
			context.closePath();
		};
	},
	
	// TODO:  I'm not sure this guy should schedule redraw -- that should probably be its parent doing that
	render : function(canvas, props) {
		this.inherit("render", arguments);

		var readyToDraw = true;
		if (props.imageHandle.loadError) {
			if (this.debugImageLoading) console.debug("can't draw ", props.url, " because it didn't load");
			readyToDraw = false;
			
		} else if (props.imageHandle.isLoading) {
			if (++props._redrawTries > this.maxRedrawTries) {
				if (this.debugImageLoading) console.debug(this, " image didn't load in "+this_redrawTries+" tries : giving up");
				// TODO: dnb.Bitmap.invalidateImage()  or just try again on the next draw cycle?
			} else {
				if (this.debugImageLoading) console.debug(this, " waiting for image to load: scheduling redraw");
				this.scheduleRedraw(canvas);
			}
			readyToDraw = false;
		}

		if (readyToDraw) this.renderImage(canvas, props);
		return this;
	},
	
	// NOTE: this is only called if the image is OK
	renderImage : function(canvas, props) {
		var handle = props.imageHandle;
		try {
			if (props.width == null || props.height == null) {
				canvas.context.drawImage(handle.bitmap, 0, 0);		
				props.offsetWidth = handle.width;
				props.offsetHeight = handle.height;
			} else {
				canvas.context.drawImage(handle.bitmap, 0, 0, props.width, props.height);
				props.offsetWidth = props.width;
				props.offsetHeight = props.height;
			}
		} catch (e) {
			dnb.Bitmap.invalidateImage(handle);
//			if (this.debugImageLoading) console.warn("image ", props.url, " didn't load properly:", e);
		}
		return this;
	},
		
	getImageWidth : function() {
		var handle = this.getImageHandle();
		if (handle && handle.bitmap.width) return handle.bitmap.width;
		return null;
	},
	
	getImageHeight : function() {
		var handle = this.getImageHandle();
		if (handle && handle.bitmap.height) return handle.bitmap.height;
		return null;	
	},

	getImageHandle : function() {
		if (this.imageHandle) return this.imageHandle;
		return dnb.Bitmap.getImageHandle(this.getUrl());
	},
	
	getImageBits : function() {
		return this.getImageHandle().bitmap;
	},
	
	setImageHandleTo : function(canvas) {
		var handle = new dnb.ImageHandle(null, canvas);
		handle.isLoading = false;
		handle.isLoaded = true;

		this.imageHandle = handle;
		return handle;
	},

	getSlice : function(map, partName) {
		var entry = map[partName];
		if (!entry || entry._name) return entry;
		
		if (entry.l == null) entry.l = map.info.l;
		if (entry.t == null) entry.t = map.info.t;
		if (entry.w == null) entry.w = map.info.w;
		if (entry.h == null) entry.h = map.info.h;
		entry._name = partName;
		return entry;
	},

	getSliceOfImage : function(url, partName, image, map) {
		var cache = dnb.Bitmap._imageCache,
			partURL = url+"#"+partName
		;
		if (cache[partURL]) return cache[partURL];
		var s = this.getSlice(map, partName),
			canvas = dnb.Canvas.createCanvasElement(s.w, s.h),
			context = canvas.context
		;
//console.debug(canvas, image, left, top, width, height, 0, 0, width, height);
		canvas.context.drawImage(image.bitmap, s.l, s.t, s.w, s.h, 0, 0, s.w, s.h);
		return (cache[partURL] = canvas);
	},

	getSliceMap : function(url) {
		url = url.substr(0, url.lastIndexOf(".")) + ".js"
		var map = dnb.Bitmap._mapCache[url];
		if (typeof map == "undefined") {
			dnb.loadJSFile(url);
			map = dnb.Bitmap._mapCache[url] = window.imageMap;

			// make sure map.info is defined with default sizes
			if (map.info == null) map.info = {};
			if (map.info.w == null) map.info.w = this.width;
			if (map.info.h == null) map.info.h = this.height;
			if (map.info.l == null) map.info.l = 0;
			if (map.info.t == null) map.info.t = 0;
		}

		return map;
	},
	
	getUrl : function(canvas) {
		return this.url;
	},
	
	imageHadError : function() {
		return dnb.Bitmap.imageHadError(this.getUrl());	
	},
	
	isReadyToDraw : function(canvas) {
		return dnb.Bitmap.imageIsLoaded(this.getUrl());
	}

});


//
//	pass a url#key to automatically load an imageMap with the same name as your url
//			and get just a section of that image
//
dnb.Bitmap.addToClass({
	_imageCache : {},
	_mapCache : {},
	
//	getSliceMap : dnb.Bitmap.prototype.getSliceMap,
	
	getImageHandle : function(url, alias, callback, errback) {
		if (!url) return null;
		var cache = dnb.Bitmap._imageCache;
		if (cache[url]) return cache[url];
		if (alias && cache[alias]) return cache[alias];
		
		var partName,
			hashChar = url.indexOf("#"),
			map
		;
		if (hashChar > -1) {
			partName = url.substr(hashChar+1)
			url = url.substr(0, hashChar);
//			map = dnb.Bitmap.getSliceMap(url);
		}
		
		var handle = cache[url];
		if (!handle) {
			var image 	= new Image()
				handle 	= new dnb.ImageHandle(url, image)
			;
			image.onload=function(event) {
				handle.isLoading = false;
				handle.isLoaded  = true;
				
				// once the image has loaded, convert it to a Canvas so that we can manipulate it
				var canvas = dnb.Canvas.createCanvasElement(this.naturalWidth, this.naturalHeight);
				canvas.context.drawImage(this, 0, 0);
				handle.bitmap = canvas;
				
				delete this.onload;
				delete this.onerror;

				if (callback) callback(handle);
			}
			// NOTE: this doesn't fire for a "file:///" image in Moz  :-(
			image.onerror=function(event) {
console.warn(handle.url+" load ERROR");
				dnb.Bitmap.invalidateImage(url);

				delete this.onerror;
				delete this.onerror;

				if (errback) errback(handle);
			}
			
			// actually start loading
			image.src = url;

			cache[url] = handle;
			if (alias) cache[alias] = handle;
		}
		
//		if (map && this.imageIsLoaded(url)) return this.getSliceOfImage(url, partName, handle, map);
		return handle;
	},
	
	imageIsLoaded : function(url) {
		var it = dnb.Bitmap._imageCache[url];
		return (it && it.isLoaded);
	},
	
	imageHadError : function(url) {
		var it = dnb.Bitmap._imageCache[url];
		return (it && it.loadError);
	},
	
	invalidateImage : function(it) {
		if (typeof it == "string") {
			it = dnb.Bitmap._imageCache[it];
		}
		if (!it) return;
		
		it.isLoading = false;
		it.loadError = true;
		console.warn("file: ", it.url, "didn't load!");
	}

});


//
//	create a simple "ImageHandle" class to encapsulate the details of an image
//
dnb.createClass("ImageHandle", {
	init		: function(url, bitmap) {
		this.url 	= url;
		this.bitmap = bitmap;
	},
	bitmap		: null,
	isLoading 	: true,
	isLoaded	: false,
	loadError	: false	
});
