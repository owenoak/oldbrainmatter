
(function(hope) {	// Begin hidden from global scope


// TODO: get this from somewhere else (hope.ElementList ?)
function ElementList(it) {}




var bigZIndex = 100000;



//
//	Styles which take/return pixel values, so we can add/remove "px" automatically
//
// TODO: enumerate other styles for which we want to conver to/from pixels
var pixelStyleProps = (
	"width,height," +
	"top,bottom,left,right" +
	"padding,paddingLeft,paddingTop,paddingRight,paddingBottom," +
	"border,borderLeft,borderTop,borderRight,borderBottom," +
	"margin,marginLeft,marginTop,marginRight,marginBottom"
).toTruthMap();

// set a style using the pixelStyleProps map
function setStyleProperty(element, property, value) {
	if (pixelStyleProps[property] && (typeof value === "number" || (""+value).isANumber())) value = value+"px";
	return (element.style[property] = value);
}

// get a computed style property (returns numbers for all pixelStyleProps)
function getComputedStyleProperty(computedStyle, property) {
	var value = computedStyle[property];
	if (pixelStyleProps[property]) return (value === "auto" ? 0 : parseFloat(value));
	return value;
}


var elementMethods = {

//
//	html
//
	get html() {
		return this.innerHTML;
	},

	// TODO: clean things up?
	set html(html) {
		return this.innerHTML = html;
	},

	// clone this node (default for deep is true)
	clone : function(deep) {
		return this.cloneNode(deep != false);
	},

	// Compact syntax to create an element with specified tag name and extras
	// Attributes are attribute values to assign to the element via element.attribute()
	// Or pass a string attributes to set as innerHTML
	create : function create(tagName, attributes) {
		var element = document.createElement(tagName);
		if (attributes) {
			if (typeof attributes === "string") element.innerHTML = attributes;
			else								element.attribute(attributes);
		}
		return element;
	},	



//
//	parents and children
//

	// List of our children which are Elements as an ElementList.
	get elements() {
		return new ElementList(this.children);
	},
	
	// List of our children which are Nodes or Elements, as an ElementList
	get nodes() {
		return new ElementList(this.childNodes);
	},

	// Do we have any child Elements (ignores text nodes)?
	get isEmpty() {
		return this.children.length === 0;
	},
	
	// Pointer to our parent, returns undefined if we have no parent or our parent is document.
	get parent() {
		var parent = this.parentNode;
		return (parent instanceof Document ? undefined : parent);
	},
	
	// ElementList of our parents, closest to us first.
	get parents() {
		var parents = new ElementList(), parent = this.parent;
		while (parent) {
			parents.append(parent);
			parent = parent.parent;
		}
	},
	
	// Return our first parent who is explicitly positioned (position: relative, absolute or fixed)
	get offsetParent() {
		return this.findParent(this.isOffset);
	},

	// Return true this element contains another element
	contains : function(element) {
		var parent = element.parent;
		while (parent) {
			if (parent === this) return true;
			parent = parent.parent;
		}
		return false;
	},

	// Return true if this element is a direct child of another element.
	isChildOf : function(parent) {
		return this.parentNode === parent;
	},

	// Return true if this element is a descendant of another element.
	isDescendantOf : function(parent) {
		return parent.contains(this);
	},
	

	
//
//	matching elements via css selector or tester function
//
	
	// Find first sub-element of this node which matches selector.
	// If no match, returns undefined.
	//
	// if selector is a string, treats as a CSS selector
	// if selector is a function, finds first direct child where function is true
	// if includeSelf is true, checks this element first and returns it if matching
	find : function(selector, includeSelf) {
		if (selector === "self") return this;
		if (includeSelf && this.matches(selector)) return this;
		if (typeof selector === "string") {
			return this.querySelector(selector);
		} else if (typeof selector === "function") {
			return this.elements.firstWhere(selector);
		}
	},
	
	// Return all sub-elements which match selector as an ElementList.
	// If nothing matches, returns an empty ElementList.
	//
	// If selector is a string, treats as a CSS selector
	// If selector is a function, finds direct children where function is true.
	// If includeSelf is true and this element matches selector, we'll be the first thing in the list.
	findAll : function(selector, includeSelf) {
		var list;
		if (typeof selector === "string") {
			list = new ElementList(this.querySelectorAll(selector));
		} else if (typeof selector === "function") {
			list = this.elements.where(selector);
		}
		if (includeSelf && this.matches(selector)) list.prepend(this);
		return list;
	},
	
	// Return first parent which matches the selector.
	// If includeSelf is true, will consider this element as a 'parent'.
	findParent : function(selector, includeSelf) {
		var parent = (includeSelf ? this : this.parent);
		while (parent) {
			if (parent.matches(selector)) return parent;
			parent = parent.parent;
		}
	},
	
	// Return ElementList of parents which match selector.
	// If includeSelf is true, will consider this element as a 'parent'.
	findParents : function(selector, includeSelf) {
		var parents = new ElementList(), parent = (includeSelf ? this : this.parent);
		while (parent) {
			if (parent.matches(selector)) parents.append(parent);
			parent = parent.parent;
		}
		return parents;
	},
	
	// Return true if this element matches the selector (CSS selector or function).
	// NOTE: this is not very efficient in WebKit (uses native function in FF).
	matches : function(selector) {
		if (typeof selector === "string") {
			// use special moz method if found
			if (this.mozMatchesSelector) return this.mozMatchesSelector(string);

			// see if we're a child of our parent (note: this is not very efficient)
			return this.parentNode.findAll(selector).contains(this);
		} else if (typeof selector === "function") {
			return (selector.call(this, this) ? true : false);
		}
	},
	
	
//
//	Attribute manipulation
//

	// attribute mega-getter-setter
	//	- attribute:undefined + value:undefined = return object of key:value pairs for our attributes
	//	- attribute:string 	  + value:undefined	= get attribute
	//	- attribute:string 	  + value:string 	= set attribute
	//	- attribute:string 	  + value:null		= clear attribute
	//	- attribute:object						= set attributes for each object of key:value pairs
	attribute : function(attribute, value) {
		// return map of attributes
		if (attribute === undefined && value === undefined) {
			var key = 0, value = {};
			while (attribute = this.attributes[key++]) {			
				value[attribute.name] = attribute.value;
			}
			return value;
		} else if (typeof attribute === "string") {
			// return single attribute value
			if (value === undefined) {
				return this.getAttribute(attribute);
			// clear attribute value
			} else if (value === null) {
				this.clearAttribute(attribute);
			// set attribute value
			} else {
				switch (attribute) {
					case "class":
					case "classname":	this.className = value; break;
					case "innerHTML":		
					case "html":		this.innerHTML = value; break;
					case "text":		this.innerText = value;break;
					case "value":		this.value = value; break;
					case "style":		this.setStyles(this, value); break;
					case "parent":		if (typeof value === "string") parent = this.find(value);
										if (parent) parent.appendChild(this);
										break;
					default:			this.setAttribute(attribute, value);
				}
			}
		// set attributes for each key in object
		} else if (typeof attribute === "object") {
			for (var key in attributes) {
				this.attribute(key, attributes[key]);
			}
			return attribute;
		}
	},
		
	// Does a list-like attribute contain a certain value?
	// Delimiter is used to split the attribute value up -- default is " ".
	attributeContains : function(name, value, delimiter) {
		var attribute = this.getAttribute(name) || "";
		return attribute.containsItem(value, delimiter||" ");
	},

	// Add valueToAdd to the list-like attribute <name>.
	// Delimiter is used to split the attribute value up -- default is " ".
	addToAttribute : function(name, valueToAdd, delimiter) {
		var originalValue = this.getAttribute(name) || "",
			newValue = originalValue.addItem(valueToAdd, delimiter)
		;
		if (originalValue != newValue) this.setAttribute(name, newValue);
	},

	// Remove valueToRemove from the list-like attribute <name>.
	// Delimiter is used to split the attribute value up -- default is " ".
	removeFromAttribute : function(name, valueToRemove, delimiter) {
		var originalValue = this.getAttribute(name) || "",
			newValue = originalValue.addItem(valueToAdd, delimiter)
		;
		if (originalValue != newValue) this.setAttribute(name, newValue);
	},
	
//
// class name manipulation
//

	hasClass : function(className) {
		return this.className.containsItem(className, " ");
	},

	addClass : function(className) {
		return this.addToAttribute("class", className, " ");
	},

	removeClass : function(className) {
		return this.removeFromAttribute("class", className, " ");
	},

	// if element had the className, removes it -- otherwise adds it
	//	pass condition of boolean to set explicitly
	toggleClass : function(className, condition) {
		if (condition === undefined) condition = !this.hasClass(className);
		if (condition) 	return this.addClass(className);
		else			return this.removeClass(className);
	},
	
	
//
//	CSS getting/setting/properties
//
	
	// style mega-getter-setter
	//	- style:undefined + value:undefined  = return computedStyle object
	//	- style:string 	  + value:undefined	= get attribute
	//	- style:string 	  + value:string 	= set attribute
	//	- style:string 	  + value:null		= clear attribute
	//	- style:object						= set attributes for each object of key:value pairs
	styles : function(style, value) {
		var styles = this._computedStyles || (this._computedStyles = window.getComputedStyle(this, null));
		if (style === undefined && value === undefined) {
			return styles;
		} else if (typeof style === "string") {
			if (value === undefined) {
				if (style.indexOf(":") > -1) {
					return this.styles(style.toObject(":",";"));
				} else {
					return getComputedStyleProperty(styles, style);
				}
			} else {
				return setStyleProperty(this, style, value);
			}
		} else if (typeof style === "object") {
			for (var key in style) {
				setStyleProperty(this, key, style[key]);
			}
			return style;
		}
	},

	// box model
	get isBorderBox() {
		var style = this.styles();
		return (style.boxSizing || style.MozBoxSizing || style.WebkitBoxSizing) === "border-box";
	},

	// box model
	get isContentBox() {
		var style = this.styles();
		return (style.boxSizing || style.MozBoxSizing || style.WebkitBoxSizing) === "content-box";
	},

	// Return true if we are an offset node; position "relative", "absolute" or "fixed"
	isOffset : function() {
		var position = this.styles("position");
		return position === "relative" || position === "absolute" || position === "fixed";
	},
	


	// NOTE: these assume you're setting values in pixels!!!
	
	// border-box width and height
	get width() {	
		var width = this.styles("width")
		if (this.isBorderBox) return width;
		var insets = this.hInsets;
		return width + insets.left + insets.right;
	},
	get height() {
		var height = this.styles("height")
		if (this.isBorderBox) return height;
		var insets = this.vInsets;
		return height + insets.top + insets.bottom;
	},

	set width(width){
		if (this.isContentBox) {
			var insets = this.hInsets;
			width -= insets.left + insets.right;
		}
		return setStyleProperty(this, "width", width);
	},

	set height(height) {
		if (this.isContentBox) {
			var insets = this.vInsets;
			height -= insets.top + insets.bottom;
		}
		return setStyleProperty(this, "height", height);	
	},


	// content-box width and height
	get innerWidth() {	
		var width = this.styles("width")
		if (this.isContentBox) return width;
		var insets = this.hInsets;
		return width - insets.left + insets.right;
	},
	get innerHeight() {
		var height = this.styles("height")
		if (this.isContentBox) return height;
		var insets = this.vInsets;
		return height - insets.top + insets.bottom;
	},

	set innerWidth(width){
		if (this.isBorderBox) {
			var insets = this.hInsets;
			width += insets.left + insets.right;
		}
		return setStyleProperty(this, "width", width);
	},

	set innerHeight(height) {
		if (this.isBorderBox) {
			var insets = this.vInsets;
			height += insets.top + insets.bottom;
		}
		return setStyleProperty(this, "height", height);	
	},
	
	
	// TODO: cache this somehow?
	get padding() {	
		var styles = this.styles();
		return {
			left 	: parseFloat(styles.paddingLeftWidth),
			top  	: parseFloat(styles.paddingTopWidth),
			right	: parseFloat(styles.paddingRightWidth), 
			bottom 	: parseFloat(styles.paddingBottomWidth)
		}
	},

	get borders() {	
		var styles = this.styles();
		return {
			left 	: parseFloat(styles.borderLeftWidth),
			top  	: parseFloat(styles.borderTopWidth),
			right	: parseFloat(styles.borderRightWidth), 
			bottom 	: parseFloat(styles.borderBottomWidth)
		}
	},

	get margins() {	
		var styles = this.styles();
		return {
			left 	: parseFloat(styles.marginLeftWidth),
			top  	: parseFloat(styles.marginTopWidth),
			right	: parseFloat(styles.marginRightWidth), 
			bottom 	: parseFloat(styles.marginBottomWidth)
		}
	},

	get hInsets() {	
		var styles = this.styles();
		return {
			left 	: parseFloat(styles.paddingLeftWidth) + parseFloat(styles.borderLeftWidth),
			right	: parseFloat(styles.paddingRightWidth) + parseFloat(styles.borderRightWidth), 
		}
	},

	get vInsets() {	
		var styles = this.styles();
		return {
			top  	: parseFloat(styles.paddingTopWidth) + parseFloat(styles.borderTopWidth),
			bottom 	: parseFloat(styles.paddingBottomWidth) + parseFloat(styles.borderBottomWidth)
		}
	},

	//
	//	position relative to our offset parent (only make sense if we're actually offset)
	//
	get left()				{	return this.styles("left");				},
	get top()				{	return this.styles("top");				},
	get right()				{	return this.styles("right");			},
	get bottom()			{	return this.styles("bottom");			},

	set left(left)			{	return this.styles("left",left);		},
	set top(top)			{	return this.styles("top",top);			},
	set right(right)		{	return this.styles("right",right);		},
	set bottom(bottom)		{	return this.styles("bottom",bottom);	},


	//
	//	global position (relative to the DOCUMENT, takes scrolling into account ???)
	//
	get pageLeft()			{	return this.offsetLeft + this.parents.sum("offsetLeft")		},
	get pageTop()			{	return this.offsetTop  + this.parents.sum("offsetTop")		},
	get pageRight()			{	return this.pageLeft   + this.width							},
	get pageBottom()		{	return this.pageTop    + this.height						},


	// assumes you're setting to pixels
	// TODO: add speed component?
	resizeTo : function(width, height) {
		if (typeof width  === "number") this.width = width;
		if (typeof height === "number") this.height = height;
	},
	
	// assumes you're setting to pixels
	// TODO: add speed component?
	moveTo : function(left, top) {
		if (typeof left === "number") this.left = left;
		if (typeof top  === "number") this.top = top;
	},
	

	// z-index stuff
	moveAbove : function(element) {
		var z = element.styles("zIndex") || 0;
		this.style.zIndex = z+1;
	},
	
	moveBelow : function(element) {
		var z = element.styles("zIndex") || 0;
		this.style.zIndex = z-1;
	},

	moveToFront : function() {
		this.style.zIndex = bigZIndex++;
	},
	
	moveToBack : function() {
		this.style.zIndex = -1 * bigZIndex++;
	}
}


// convert a string of html to an ElementList of elements
String.prototype.toElements = function(html, outerTag) {
	var parent = document.body.create(outerTag || "div", html);
	return parent.elements;
}
// convert a string of html to a single Element
String.prototype.toElement = function(html, outerTag) {
	var parent = document.body.create(outerTag || "div", html);
	return parent.children[0];
}



// install some methods on document
document.find = function(selector) {
	return this.querySelector(selector);
}

document.findAll = function(selector) {
	return new ElementList(this.querySelectorAll(selector));
}



// set up a document-level DOMNodeRemoved method to clean up the _computedStyle of elements
document.body.addEventListener(
	"DOMNodeRemoved", 
	function(event){
		if (event.target && event.target._computedStyles) delete event.target._computedStyles;
	}, 
	false
);



})(hope); // End hidden from global scope
