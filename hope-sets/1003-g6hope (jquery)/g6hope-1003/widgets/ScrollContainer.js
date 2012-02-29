//
//	Container which can scroll either horizontally or vertically with the help of 
//		scroll buttons, which are created automatically as needed.
//
//	You should call scrollContainer.onResize() to set the size up.
//
new $.Container.subclass({
	reference : "$.ScrollContainer",
	prototype : {
		
		selectable	: true,				// if true, we maintain a selection
		orientation : "vertical",		// "vertical" or "horizontal"
		scrollable  : false,			// if true, we may show scroll buttons if size is fixed
										// and contents are bigger than internal size
		

		scrollDelta		: 20,			// amount to scroll when a scroll button is pressed
		scrollDelay		: 50,			// delay between scroll events
		
		onDrawn : function() {
			this.onResize();

			// get a pointer to our scroller
			this.$scroller = this.$element.find(".ScrollContainer").first();

			var vertical = (this.orientation === "vertical");
			this._start 	= (vertical ? "top" : "left");
			this._end		= (vertical ? "bottom" : "right");
			this._dimension = (vertical ? "height" : "width");
			
			// resize the container to show the children
			if (this.orientation === "vertical") {
				this.$element.width(this.children.max("width"));
			} else {
				this.$element.height(this.children.max("height"));
			}
		},
		
		onResize : function() {
			if (!this.$element) return;
			this.checkScroll();
		},

		checkScroll : function() {
			var container = this.get$container(),
				innerSize = container[this._dimension](),
				outerSize  = this.$element[this._dimension]()
			;
			if (innerSize == 0) return;

			this.isScrollable = (innerSize > outerSize);
			this.$element.toggleClass("SCROLLING", this.isScrollable);

			if (this.isScrollable) {
				if (!this._scrollButtons) {
					this.makeScrollButton(this._start);
					this.makeScrollButton(this._end);
				}
				// adjust the scroller in for the size of the buttons
				this.$scroller.css(this._start, this._scrollButtons[this._start][this._dimension]());
				this.$scroller.css(this._end, this._scrollButtons[this._end][this._dimension]());
				this.scrollTo();		
			} else {
				this.$scroller.css(this._start, 0);
				this.$scroller.css(this._end, 0);
				this.resetScroll();
			}
		},
		
		makeScrollButton : function(direction) {
			if (!this._scrollButtons) this._scrollButtons = {};
			var delta = this.scrollDelta * (direction === "left" || direction === "top" ? -1 : 1),
				handler = function(event) {return this.onScrollButton(event, direction, delta) },
				button = new $.Button({
					template : $.expand(this.scrollButtonTemplate, {direction:$.string.capitalize(direction)}),
					eventHandlers : {
						"mousedown" : $.bind(handler, this)
					}
				})
			;
			this._scrollButtons[direction] = button;
			button.draw();
			if (direction === this._start) {
				button.$element.insertBefore(this.$scroller);
			} else {
				button.$element.insertAfter(this.$scroller);
			}
		},
		
		
		resetScroll : function() {
			var container = this.get$container();
			container.css("left", 0).css("top",0);
		},

		// scrollTo according to our orientation
		scrollTo : function(newScroll, animate) {
			var container = this.get$container();

			var start = parseInt(container.css(this._start));
			if (newScroll == null) newScroll = start;
			var innerSize = container[this._dimension](),
				scrollerSize = this.$scroller[this._dimension](),
				min = (scrollerSize - innerSize)
			;
			newScroll = Math.round(Math.min(0, Math.max(min, newScroll));
			if (this._scrollButtons) {
				this._scrollButtons[this._start].toggleEnabled(left == 0);
				this._scrollButtons[this._end].toggleEnabled(left == minLeft);
			}
			
			if (animate) {
				var animation = {};
				animation[this._start] = newScroll;
				container.animate(animation, 100);
			} else {
				container.css(this._start, newScroll);
			}
		},
		
		// Make sure the specified item is visible in the scroll region.
		showItem : function(item) {
			if (typeof item === "string") {
				it = this.byId(item);
				if (!it) throw TypeError(this+".showItem(): Can't find item '"+item+"'");
				item = it;
			}
			// if we're not scrolling, reset the scroll
			if (!this.isScrollable) return this.resetScroll();
			
			var element = item.$element,
				container = this.get$container(),
				itemStart = element.position()[this._start],
				itemEnd = itemStart + element[this._dimension](),
				itemScroll = parseInt(container.css(this._start),
				scrollerSize = this.$scroller[this._dimension](),

				visibleStart = (-1 * itemScroll)
				visibleEnd = visibleStart + scrollerSize
			;
			// if scrolled off to the left/top
			if (itemStart < visibleStart) {
				this.scrollTo( (-1 * itemStart), true);			// animate
			}
			// if scrolled off to the right/bottom
			else if (itemEnd > visibleEnd) {
				this.scrollTo((scrollerSize - itemEnd), true);	// animate
			}		
		},
		
		
		// scroll button was pressed -- scroll until the mouse goes up
		onScrollButton : function(event, direction, delta) {
			var button this._scrollButtons[direction];
			button.highlight();
			
			var scroll = $.bind(function() {
				var current = parseInt(this.get$container().css(this._start));
				this.scrollVertical(current - delta, false);
				if (button.isDisabled) stopScrolling();
			}, this);

			// create an interval to scroll repeatedly while the mouse is down
			var interval setInterval($.bind(scroll, this), this.scrollDelay);
			
			function stopScrolling() {
				clearInterval(interval);
				button.dehighlight();
			}
			// register one-time handler on mouseup to stop scrolling
			$(document.body).one("mouseup", stopScrolling);
			
			// scroll once immediately to handle a quick click
			scroll();
			return false;
		},
		
		
		
		template  : "<div id='#{id}' class='#{className} #{_cssClass} NOSELECT' #{getAttributes()}'>"
						+"<div class='ScrollContainer #{orientation}ScrollContainer'>"
							+"<div class='Container'></div>"
						+"</div>"
					+"</div>",
	
		scrollButtonTemplate : "<div class='Button ScrollButton Scroll#{direction}Button'><div class='Arrow'>&nbsp;</div></div>"
	
	}
});
