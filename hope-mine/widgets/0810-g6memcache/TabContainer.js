Class.include("ProtoWidget");

//	TODO:
//			- conver to "onSelect" ?
//			- base on Section -> draw, addChildren, how to deal with bodies?
//			- remember which tab is selected in a cookie
//			- put try/catches back  (with 'debugging' flag with re-throw?)
//			- reparent anything inside the main element rather than setting HTML
//			- loading message when loading a src='' tab
//			- animate tab setHTML transition?
var TabContainer = Class.create(ProtoWidget, {
    klass: "TabContainer",
	id : undefined,				// id of the html element to take over (optional)
	
	initialScrollTo : "left",	// which way should we scroll initially when a new tab is added ("left" or "right")
	tightenSpacing	: false,	// are we using 'tight spacing' mode?
	extraWidth	: 2,			// extra width to add to each button (for margin, etc)
								// change this to equal the left+right margin set on each tab button
	// 
	//	PUBLIC API
	//
	

	
	// properties we can set on a tab
	//	we use this when getting tabs from src in instantiateTabsFromHTML()
	tabProperties : {
		tabid 		: "Internal id for callbacks",
		title		: "Text shown in the label of the tab",
		bodyId		: "ID of the body element to show when this tab is selected",
 		selected	: "if true, tab will be selected automatically",
 		src			: "if set, the src URL will be loaded into the tab automatically",
 		html		: "html to start out for the tab",
 		onselect	: "method to call when this tab is selected"
	},

	// add a new tab at the end of the set of tabs
	addTab : function(tab) {
//		try {
			this.tabs.push(tab);

			tab._index = this._TAB_ID_SEQUENCE++;
			tab._elementId = this.id + "_button_" + tab._index;
	
			if (tab.tabid === undefined) tab.tabid = ""+tab._index;
			if (tab.title == null) tab.title = this.randomName();
			tab._tabContainer = this;
			
			// remember the tab to tabid link
			this._tabidMap[tab.tabid] = tab;
			this._tabIdList.push(tab._elementId);
			
			// get the HTML for the tab and insert it into the button container
			var tabHtml = this.TAB_BUTTON_TEMPLATE.evaluate(tab);
			this.scrollContainer.insert(tabHtml);
			this.checkScrollWidth();
			
			// scroll to left or right as appropriate
			if (this._scrollersShowing) {
				if (this.initialScrollTo == "left") {
					this.scrollTo(0);
				} else {
					this.scrollTo(this._minLeftScroll);
				}
			}
	
			// check to see if there is a body defined for the tab
			if (tab.bodyId) {
				var body = $(tab.bodyId);
				if (!body) {
					var body = this.TAB_BODY_TEMPLATE.evaluate(tab);
					this.bodyContainer.insert(bodyHTML);
				}
			}
			
			if (tab.onselect && typeof tab.onselect == "string") {
				tab.onselect = new Function("tabid, tabContainer", tab.onselect);
			}
			
			// select the tab if appropriate
			//	do it on a timer so we don't conflict with initialization
			if (tab.selected) {
				setTimeout(function(){this.selectTab(tab.tabid)}.bind(this),0);
			}

try {		} catch (e) {
			this.warn("Couldn't create tab ",tab);
		}
	},
	
	selectTab : function(tabid) {
		if (this._selectedTab) {
			$(this._selectedTab._elementId).removeClassName("TabButtonSelected");
		}
		
		try {
			var tab = this._tabidMap[tabid];
			$(tab._elementId).addClassName("TabButtonSelected");
			this._selectedTab = tab;

			var tabBody = $(tab.bodyId);
			var oldBody = this.$currentBody;

			// reset to the currentBody
			this.$currentBody = (tabBody || this.$mainBody);

// todo: crossfade wipe thing
			this.$currentBody.show();
			if (oldBody != this.$currentBody) oldBody.hide();
			
			if (tab.html) this.$currentBody.innerHTML = tab.html;
			if (tab.src) new Ajax.Updater(this.$currentBody, tab.src, {method:'get'});

			if (typeof tab.onselect == "function") {
				tab.onselect.call(this, tabid, this);
				
			} else if (typeof this.onselect == "function") {
				this.onselect(tabid, this);
				
			}
		} catch (e) {
			this.warn("Couldn't select tab ",tabid, ": ",e.message);
		}
	},

	setHTML : function(html) {
		html = $A(arguments).join("");
		this.$currentBody.innerHTML = html;
	},
	

	addChild : function(child1, child2, etc) {
		var body = this.$currentBody;
		for (var i = 0; i < arguments.length; i++) {
			var child = arguments[i];
			if (!child) continue;
			this.children.push(child);
			child.parent = this;
			if (!child._drawn) {
				child.draw(body);
			}
		}
	},


	// 
	//	PRIVATE API
	//

	// template for the entire tab section
	TAB_CONTAINER_TEMPLATE : new Template(
		"<div id='#{id}' class='TabContainer spacing0 roundALLmedium'>\
			<div class='TabHeader noselect roundTOPmedium'>\
				<div class='TabButtonContainer'>\
					<div class='TabButtonScrollContainer'><!--tab buttons go here --></div>\
				</div>\
				<div class='TabLeftScroller roundTLmedium' onmousedown='#{globalRef}.scrollLeftStart(event||window.event)' onmouseup='#{globalRef}.scrollEnd(event||window.event)'>\
					<div class='TabLeftScrollerImg'></div>\
				</div>\
				<div class='TabRightScroller roundTRmedium' onmousedown='#{globalRef}.scrollRightStart(event||window.event)' onmouseup='#{globalRef}.scrollEnd(event||window.event)'>\
					<div class='TabRightScrollerImg'></div>\
				</div>\
			</div>\
			<div class='TabBodyContainer'>\
				<!-- multiple tab bodies go here -->\
			</div>\
		</div>"
	),

	TAB_BODY_TEMPLATE : new Template(
		"<div id='#{bodyid}' class='TabBody #{className}'>#{html}</div>"
	),


	// template for an individual tab button
	TAB_BUTTON_TEMPLATE : new Template(
		"<div id='#{_elementId}' class='TabButton inline_block roundTOPmedium'\
			  onmousedown='#{_tabContainer.globalRef}.selectTab(\"#{tabid}\")'\
			>\
				#{title}\
		<\/div>"
	),
	
	_tightSpacing : 0,			// are we in 'tight spacing' mode?
	_maxTightSpacing : 0,		// how many levels of 'tight spacing' are set up in the CSS?
	_scrollersShowing : false,	// are we showing the scroller buttons
	
	initializeProperties : function() {
		var initialTabs = this.tabs;
		this.tabs = [];

		// initialize our data structures
		this._TAB_ID_SEQUENCE = 0;
		this._tabidMap = {};
		this._tabIdList = [];
		this._buttonSizes = [];
		
		// set the elements up and grab parts of the UI that we'll need to interact with
		this.initializeBody();
		
		// if we were initialized with any 'tabs', create them now
		if (initialTabs && initialTabs.length > 0) {
			for (var i = 0; i < initialTabs.length; i++) {
				this.addTab(initialTabs[i]);
			}
		}
		
		// if we were intialized with any children, set them up
		this.initializeChildren();
	},

	initializeChildren : function() {
		var originalKids = this.children;
		this.children = [];
		if (originalKids && originalKids.length > 0) {
			this.addChild.apply(this, originalKids);
		}
	},

	initializeBody : function() {
		if (this._bodyInitialized) return;
		if (this._bodyInitialized = true);
//		try {
			this.main = $(this.id);
			var onSelectHandler,
				initialBodies,
				initialButtons,
				initialHTML
			;
			if (this.main) {
				// pick up a global onselect handler if present
				onSelectHandler = this.main.getAttribute("onselect");

				// pick up any initial TabBody tags
				// and yank them out of the HTML (we'll re-add them later)
				initialBodies = this.main.select('.TabBody');
				if (initialBodies) {
					initialBodies = initialBodies.invoke("remove");
				}
				
				// pick up and remove any initial TabButton tags
				initialButtons = this.main.select(".TabButton");
				if (initialButtons) {
					initialButtons = initialButtons.invoke("remove");
				}

				// any other html in the main element should get stuffed back in 
				//	the mainbody element after template expansion
				initialHTML = this.main.innerHTML;
			}

			// get the HTML from the TAB_CONTAINER_TEMPLATE
			var html = this.TAB_CONTAINER_TEMPLATE.evaluate(this);

			// and stick into the DOM
			if (this.main) {
				// replace the main element with the proper html
				this.main.replace(html);

			} else {
				// append to the end of the body
				$$("BODY")[0].insert(html);
			}
			
			this.main = $(this.id);
			this.bodyContainer = this.main.select('.TabBodyContainer')[0];
			this.buttonContainer = this.main.select('.TabButtonContainer')[0];
			this.scrollContainer = this.main.select('.TabButtonScrollContainer')[0];
			this.leftScroller = this.main.select('.TabLeftScroller')[0];
			this.rightScroller = this.main.select('.TabRightScroller')[0];

			if (   !this.main 
				|| !this.bodyContainer 
				|| !this.buttonContainer 
				|| !this.scrollContainer
				|| !this.leftScroller
				|| !this.rightScroller) {
					throw new Error("couldn't initialize "+this.id+"an html element was not found");
			}
			
			// 
			if (onSelectHandler) {
				if (typeof onSelectHandler == "string") onSelectHandler = new Function("tabid,tabContainer", onSelectHandler);
				this.onselect = onSelectHandler;
			}
			
			if (initialButtons) {
				this.instantiateTabsFromHTML(initialButtons);
			}
			
			// re-add any existing TabBody sections
			if (initialBodies) {
				var bodyContainer = this.bodyContainer;
				initialBodies.each( function(body) {
					// append the body to the new bodyContainer
					bodyContainer.insert(body);
					body.hide();
				});
				// create a tab button for each existing body
				this.instantiateTabsFromHTML(initialBodies);
			}

			// make sure we have a body element with class TabMainBody
			this.$currentBody = this.$mainBody = this.main.select(".TabMainBody")[0];
			if (!this.$mainBody) {
				// create it if we need to
				this.bodyContainer.insert(this.TAB_BODY_TEMPLATE.evaluate(
						{className:"TabMainBody", html : initialHTML}
					));
				this.$currentBody = this.$mainBody = this.main.select(".TabMainBody")[0];
			} else if (initialHTML) {
				this.setHTML(initialHTML);
			}
			this.$mainBody.show();

			// now get pointers to all of the TabBody elements
			this.$bodies = this.main.select(".TabBody");
	try {		
		} catch (e) {
			this.warn("Could not initialize body of tabContainer ",this,"! error message: ",e.message);
		}
	},

	// instantiate TabButtons from a set of elements
	//	NOTE: elements can either be a list of ".TabButton" elements or ".TabBody" elements
	instantiateTabsFromHTML : function(elements) {
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			
			// don't instantiate a tab button for the $mainBody
			if (element == this.$mainBody) continue;
			
//			try {
				// are dealing with a TabButton or a TabBody?
				var isTabButton = element.hasClassName("TabButton");
				
				var tabProperties = {};
				for (var prop in this.tabProperties) {
					var value = element.getAttribute(prop);
					if (value != null) tabProperties[prop] = value;
				}
				
				if (tabProperties.tabid) {
					if (isTabButton) {
					
					// a TabBody element
					} else {
						if (tabProperties.bodyId == null) {
							tabProperties.bodyId = this.id + "_body_" + tabProperties.tabid;
						}
						element.setAttribute("id", tabProperties.bodyId);
						element.hide();
					}
				}
				this.addTab(tabProperties);
try {
			} catch (e) {
				this.warn("Couldn't create tab for element ",element);
			}
		}
	},
	

	
	// NOTE: this does not handle REMOVING tabs at this time
	checkScrollWidth : function() {
		var maxWidth = this.buttonContainer.getWidth(),
			scrollWidth = this.scrollContainer.getWidth()
		;
		
		// if REMOVING tabs is possible, rework the below
		if (scrollWidth <= maxWidth) return;
		
		if (this.tightenSpacing && this._tightSpacing < this._maxTightSpacing) {
			this.main.removeClassName("spacing"+this._tightSpacing);
			this._tightSpacing++;
			this.main.addClassName("spacing"+this._tightSpacing);
			return this.checkScrollWidth();
		}
		
		// if we get here, we're not showing the scrollers already
		if (!this._scrollersShowing) {
			this._scrollersShowing = true;

			this.main.addClassName("showLeftScroll");
			this.main.addClassName("showRightScroll");
			
			// resize the buttonContainer to NOT be underneath the scroller buttons
			var leftScrollerWidth = this.leftScroller.getWidth(),
				rightScrollerWidth = this.rightScroller.getWidth()
			;
			this.buttonContainer.style.left = leftScrollerWidth + "px";
			maxWidth -= (leftScrollerWidth + rightScrollerWidth);
			this.buttonContainer.style.width = maxWidth + "px";
		}
		
		this._minLeftScroll = maxWidth - scrollWidth;
	},
	
	getScrollOffset : function() {
		return parseInt(this.scrollContainer.style.left || 0);
	},
	
	enableScrollButtons : function() {
		var offset = this.getScrollOffset(),
			disableLeftScroll 	= offset >= 0,
			disableRightScroll	= offset <= this._minLeftScroll
		;
		
		if (disableLeftScroll) {
			this.main.addClassName("disableLeftScroll");
			this._mouseDownIn = null;
		} else {
			this.main.removeClassName("disableLeftScroll");
		}

		if (disableRightScroll) {
			this.main.addClassName("disableRightScroll");
			this._mouseDownIn = null;
		} else {
			this.main.removeClassName("disableRightScroll");
		}

		if (this._mouseDownIn == "left") 		this.scrollLeft();
		else if (this._mouseDownIn == "right")	this.scrollRight();
	},
	
	getButtonOffsets : function() {
		var list = this._tabIdList,
			sizes = this._buttonSizes = [ 0 ],
			total = 0
		;
		for (var i = 0; i < list.length; i++) {
			var element = $(list[i]);
			total -= element.offsetWidth + this.extraWidth;
			sizes.push(total);
		}
	},

	scrollTo : function(newLeft, skipAnimation) {
		if (skipAnimation == true) {
			return this.scrollContainer.style.left = newLeft+"px";
		}
		
		var tabber = this;
		new Effect.Move(this.scrollContainer, 
							{	x:newLeft, 
								mode:'absolute',
								duration:.2,
								afterFinish:function(){tabber.enableScrollButtons()}
							}
						);
	},

	scrollLeft : function () {
		var offset = this.getScrollOffset();
		// if already all the way to the left, bail
		if (offset == 0) return this._mouseDownIn = null;

		// figure out which item is the last one showing
		this.getButtonOffsets();
		for (var sizes = this._buttonSizes, last = 0; last < sizes.length; last++) {
			if (offset > sizes[last]) break;
		}
		// if we're all the way to the left already, nowhere to go so bail
		if (last == 1 && offset == sizes[0]) return;
		var newLeft = sizes[last-1] + 1;
		newLeft = Math.min(0, newLeft);
		return this.scrollTo(newLeft);
	},
	
	
	scrollRight : function () {
		var offset = this.getScrollOffset();
		// if already all the way to the right, bail
		if (offset <= this._minLeftScroll) return this._mouseDownIn = null;
		
		var	width = this.buttonContainer.offsetWidth,
			right = offset - width
		;
		this.getButtonOffsets();
		// figure out which item is the last one showing
		for (var sizes = this._buttonSizes, last = 0; last < sizes.length; last++) {
			if (right > sizes[last]) break;
		}
		
		// if we get to the end, we've scrolled all the way to the right so bail
		if (last == sizes.length) {
			this._mouseDownIn = null;
			return this.scrollTo(this._minLeftScroll, 0);
		}
		
		var newLeft = sizes[last] + width;
		newLeft = Math.max(this._minLeftScroll, newLeft);
		// HACK: sometimes for some reason we'd be off by a couple of pixels
		//		and we wouldn't scroll all the way to the right --
		//		consider it all the way to the right if we're within 5 pixels
		if (newLeft - 5 < this._minLeftScroll) newLeft = this._minLeftScroll;
		return this.scrollTo(newLeft);
	},

	scrollLeftStart : function () {
		this._mouseDownIn = "left";
		return this.scrollLeft();
	},
	
	scrollRightStart : function () {
		this._mouseDownIn = "right";
		return this.scrollRight();
	},
	
	scrollEnd : function () {
		delete this._mouseDownIn;
	},
	
	
	//
	//	debug
	//

	randomName : function() {
		var max = Math.floor(Math.random() * 20) + 1,
			letters = "abcdefghijklmnopqrstuvwxyz",
			name = letters.substring(0, max)
		;
		return name;
	}

});

