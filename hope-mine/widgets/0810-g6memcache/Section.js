Class.include("ProtoWidget CookieMixin");

//
//	Section which has children and can be collapsed (and remembers it show/hide state,etc)
//

var Section = Class.create(ProtoWidget, CookieMixin, {
	klass 				: "Section",

	id 					: undefined, 			// id of our outer element
	title				: undefined,			// title string
	
	animationInterval	: .25,					// Time in SECONDS to perform show/hide animations
	
	parentId			: undefined,			// id of the parent element to insert in to (if undefined, will insert into the body)
	templateId	 		: undefined,			// if you specify a template, the template will be expanded 
												// and any content inside it will be relocated inside the $body
	template			: undefined,
	
	children 			: undefined,			// children that we manage (assumed to be ProtoWidgets)
			
	collapseClassName 	: "Collapsed",			// name to add to the outer element when we are collapsed
	
	mainSelector 		: ".Section",			// css selector to get the main element (for auto-instantiation)
	headerSelector 		: ".SectionHeader",		// css selector to get the body element of the section
	bodySelector 		: ".SectionBody",		// css selector to get the body element of the section

	expanded 			: true,					// if true, our body content is visible

	$main 				: undefined,			// outer element for the section
	$header 			: undefined,			// header element
	$body 				: undefined,			// body element
		
		
	// do any page- or class-level initialization here
	initializeProperties : function($super) {
		$super();
		// check the cookies to see if we should initially be expanded or collapsed
		if (this.hasCookie("collapsed")) 	this.expanded = false;
		if (this.hasCookie("expanded"))		this.expanded = true;	
	},


	prepareToDraw : function(parent) {
		// HACK: put timestamp in there in case the section has a timestamp string
		this.timestamp = new Date().toPrettyString();
	},
	
	onDraw : function(parent) {
		this.expandMainTemplate(parent);
	},

	onAfterDraw : function(parent) {
		this.$main = $(this.id);
		this.$header = this.$main.select(this.headerSelector)[0];
		this.$body = this.$main.select(this.bodySelector)[0];

		this._collapseCallback = this._collapseCallback.bind(this);
		this._expandCallback = this._expandCallback.bind(this);

		// call expand to enable/disable children as appropriate
		this.expand(this.expanded, this.SKIP_ANIMATION);
	},

	//
	// show and hide
	//
	show : function() {
		this.$main.style.display = "block";
		if (this.expanded) setTimeout(this.enableChildren.bind(this), 100);
	},
	
	hide : function() {
		if (this.expanded) this.disableChildren();
		this.$main.style.display = "none";
	},

	//
	// manipulating children
	//
	onDrawChildren : function() {
		var originalKids = this.children;
		this.children = [];
		if (originalKids) {
			this.addChild.apply(this, originalKids);
		}
	},

	
	addChild : function(child1, child2, etc) {
		for (var i = 0; i < arguments.length; i++) {
			var child = arguments[i];
			if (!child) continue;

			this.children.push(child);
			child.parent = this;
			
			var parent = this.$body;
			if (child.parentId) {
				var childParent = $(child.parentId);
				if (childParent) parent = childParent;
			}

			if (!child._drawn) {
				child.draw(parent);
			} else {
				child.reparent(parent);
			}
		}
	},

	enableChildren : function() {
		if (this.children) {
			this.children.invoke("enable");
		}
	},
	disableChildren : function() {
		if (this.children) {
			this.children.invoke("disable");
		}
	},



	//
	//	show/hide
	//

	toggle : function(skipAnimation) {
		this.expand(!this.expanded, skipAnimation);
	},

	expand : function(expand, skipAnimation) {
		if (expand == false) return this.collapse(skipAnimation);

		this.expanded = true;
		this.toggleCookies(["+expanded","-collapsed"]);

		this.$main.removeClassName("Collapsed");
		if (skipAnimation || !window.Scriptaculous) {
			this._expandCallback();
		} else {
			new Effect.SlideDown(this.$body, { 
					duration: this.animationInterval,
					afterFinish : this._expandCallback
				});
		}
		return this;
	},
	_expandCallback : function() {
		this.enableChildren();
	},
	
	
	collapse : function(skipAnimation) {
		this.expanded = false;
		this.toggleCookies(["+collapsed","-expanded"]);

		if (skipAnimation || !window.Scriptaculous) {
			this._collapseCallback();
		} else {
			new Effect.SlideUp(this.$body, { 
					duration: this.animationInterval,
					afterFinish : this._collapseCallback
				});
		}
		return this;
	},
	_collapseCallback : function() {
		this.$main.addClassName(this.collapseClassName);
		this.$body.style.display = "none";
		this.disableChildren();
	}
});
