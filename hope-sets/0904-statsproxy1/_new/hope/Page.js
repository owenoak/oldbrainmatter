new $.Container.subclass({
	reference 	: "$.Page",
	collector	: "$.Pages",

	Class : {
		byHash : function(hash) {
			return this.instances.getWhere(function(page){
				return $.string.startsWith(hash, page.hash);
			});
		}
	},
	
	prototype : {
		$parent	: "#main",
		
		displayElements : undefined,		// comma-separated list of global selectors 
											//	that are part of our view
		hash			: undefined,
		getHash	: function() {
			return this.hash;
		},
		
		// return a value to set the window title when this view is selected
		getWindowTitle : function() {},
		
		// return the 'title' of this page
		getTitle : function() {
			return $.expand(this.title, this);
		},
		
		getHashInfo : function(hash) {
			return {page:this};
		},

		onRefresh : function(requestQueue) {
//console.warn(this,".onRefresh()");
			if (this.Loader) {
				var request = new this.Loader({
					page : this
				});
				requestQueue.addRequest(request);
			}
		},
		
		update : function(data) {
//			console.debug(this, "updating with ",data);
		},
		
		show : function() {
			this.as($.Container, "show", arguments);
			this.showDisplayElements();
			this.notify("pageShown", this);
			
			// update the hash
			var hash = this.getHash();
			if (hash) app.setHash(hash);
			
			// and the window title
			var title = this.getWindowTitle();
			if (title) document.title = title;
		},
		
		hide : function() {
			this.as($.Container, "hide", arguments);
			this.hideDisplayElements();
			this.notify("pageHidden", this);
		},
		
		getTitle : function() {
			return $.message(this.titleMessage, this);
		},

		getMenuTitle : function() {
			return $.message(this.menuTitleMessage, this);
		},

		
		showDisplayElements : function() {
			if (!this.displayElements) return;
			if (typeof this.displayElements === "string") {
				this.displayElements = this.displayElements.split(",");
			}
			$.forEach(this.displayElements, function(element, index) {
				$(element).show();
			}, this);
		},
		
		// NOTE: assumes that showDisplayElements has already set up our elements
		hideDisplayElements : function() {
			$.forEach(this.displayElements, function(element, index) {
				$(element).hide();
			}, this);
		}
	}
});
