
//
//	Mixin for expanding/collapsing sections
//

window.ExpanderMixin = {
	expanded 			: true,					// if true, our body content is visible
	collapseAttribute 	: "Collapsed",			// name to add to the outer element when we are collapsed
	bodyClassName		: undefined,			// set this to the CSS class name of the body element to show/hide
	animationInterval	: .25,					// Time in SECONDS to perform show/hide animations


	// do any page- or class-level initialization here
	// NOTE: if you are mixing this in and define your own initializeProperties,
	//		you'll have to call this manually
	initializeProperties : function() {
		// remember initial state so we don't update the cookie unnecessarily
		this._wasInitiallyExpanded = this.expanded;
		
		// check the cookies to see if we should initially be expanded or collapsed
		if (this.hasCookie("collapsed")) 	this.expanded = false;
		if (this.hasCookie("expanded"))		this.expanded = true;	

		this._collapseCallback = this._collapseCallback.bind(this);
		this._expandCallback = this._expandCallback.bind(this);
	},


	onAfterDraw : function($super, parent) {
		$super();
		this.$body = this.getBodyElement();

		// call expand to enable/disable children as appropriate
		this.expand(this.expanded, this.SKIP_ANIMATION);
	},
	
	onAfterRedraw : function($super) {
		$super();
		// call expand to enable/disable children as appropriate
		this.expand(this.expanded, this.SKIP_ANIMATION);	
	},

	getBodyElement : function() {
		return this.$main.select("."+this.bodyClassName)[0];
	},


	//
	//	show/hide
	//

	toggle : function(skipAnimation) {
		this.expand(!this.expanded, skipAnimation);
	},

	expand : function(expand, skipAnimation) {
		if (expand == false) return this.collapse(skipAnimation);

		if (this.expanded != true || !this.hasCookie("expanded")) {
			this.expanded = true;
			this.toggleCookies(["+expanded","-collapsed"]);
		}

		if (this._drawn) {
			this.$main.removeAttribute(this.collapseAttribute);
			if (skipAnimation || !window.Effect) {
				this._expandCallback();
			} else {
				new Effect.SlideDown(this.getBodyElement(), { 
						duration: this.animationInterval,
						afterFinish : this._expandCallback
					});
			}
		}
		return this;
	},
	_expandCallback : function() {},
	
	
	collapse : function(skipAnimation) {
		if (this.expanded == true || !this.hasCookie("collapsed")) {
			this.expanded = false;
			this.toggleCookies(["+collapsed","-expanded"]);
		}

		if (this.$main) {
			if (skipAnimation || !window.Effect) {
				this._collapseCallback();
			} else {
				new Effect.SlideUp(this.getBodyElement(), { 
						duration: this.animationInterval,
						afterFinish : this._collapseCallback
					});
			}
		}
		return this;
	},
	_collapseCallback : function() {
		this.$main.setAttribute(this.collapseAttribute, "true");
		this.getBodyElement().style.display = "none";
	}
};

Object.extend(ExpanderMixin, CookieMixin);

