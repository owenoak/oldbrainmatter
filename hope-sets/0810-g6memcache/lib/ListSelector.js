Class.include("ProtoWidget CompositeWidgetMixin");

// draw patterns
//		- layout vertical vs. horizontal
//			- use inline block for this?
//		- if > certain height:
//			- overflow:auto
//			- have up/down (left/right) scroller widgets
//			- split into columns (rows)

// interaction patterns
//		- list of URLs		- NavigationMenu ?
//		- menu/submenu
//		- select (popup)
//		- multi-select w/ checkbox semantics (and shift/etc semantics as well)
//			- select/deselect all on double click?
//		- items have own action semantics
//		- drag to reorder
//		- drag and drop
//		- multi-column list w/headers & sort
//		- deferred items
//		- filter items

// TODO
//		- showSelection property  (add 'Selected' to selected element)
//		- wrap menu items?  (add property to outside of menu?)
//		- generic 'Selector' class to base ListSelector etc on?
//		- checkboxItem
//			- use image rather than real checkbox
//			- partial select of children semantics (on|off|partial)
//			- some way to figure current value of checkbox
//		- radioItem
//			- have "valueSelector" and "value"?
//		- is it an 'activate' if they click on a label?  some other event?  activate with null item?

var ListSelector = Class.create(ProtoWidget, CompositeWidgetMixin, {
	klass : "ListSelector",
	
	selectedIndex : undefined,
	
	style	: "",								// style attributes to apply to outer Menu element
	className : "ListSelector",					// class name to apply to the $main element
	itemClassName : "Item",						// class name to apply to each normal item in the menu
	headerItemClassName : "HeaderItem",			// class name to apply to each label menu item
	labelItemClassName : "LabelItem",			// class name to apply to each label menu item
	separatorItemClassName : "SeparatorItem",	// class name to apply to each separator menu item
	
	activateOn : "click",						// "down" or "up" or "click"  ("up" and "click" are effectively the same)
			
	maxHeight : 300,							// maximum height of the popup
												// if not undefined, we'll split the menu items up into columns
												//	trying to make them no taller than this

	/**
	 *	Event handlers 
	 *	Override "menu.onActivate(item)" to do something special when a particular menu item is activated.
	 *	The rest of them you can ignore unless your menu is doing something special.
	 **/

	onActivate : function(event, part, element, partId) {
		this.info("item activated:",part);
	},

	// mouse has entered the entire widget
	onMouseEnter : function(event, part, element, partId) {
		this.error("mouseEnter:");
	},
	
	// mouse has left the entire widget
	onMouseLeave : function(event, part, element, partId) {
		this.warn("mouseLeave");
	},

	onMouseDown : function(event, part, element, partId) {
		if (this.activateOn == "down") this.onActivate(event, part, element, partId);
	},
	
	onMouseUp : function(event, part, element, partId) {
		if (this.activateOn == "up") this.onActivate(event, part, element, partId);
	},

	onMouseClick : function(event, part, element, partId) {
		if (this.activateOn == "click") this.onActivate(event, part, element, partId);
	},
	

	// return the part for a specified partId
	getPart : function(partId) {
		if (!this.items) return;
		return this.items[partId];
	},

	
	//
	//	drawing semantics
	//

	// make sure that the popup is smaller than the maxHeight (if defined)
	onAfterDraw : function() {
		if (this.maxHeight == undefined || !this.$main) return;
		var totalHeight = this.$main.getHeight();
		if (totalHeight > this.maxHeight) this.divideItemsIntoColumns(totalHeight);
	},
	
	divideItemsIntoColumns : function(totalHeight) {
		var elements = this.$main.childElements();
		var	heights = elements.invoke("getHeight");

		// figure out roughly how many columns we'll need
		var colEstimate = Math.ceil(totalHeight / this.maxHeight);
		// adjust our target max height to spread the items out evenly
		var maxHeight = Math.ceil(totalHeight / colEstimate) + 20;

		// divide the elements up into columns
		var columns = [[]];
		for (var i = 0, bottom = 0, col = 0; i < elements.length; i++) {
			var element = elements[i],
				height = heights[i]
			;
			if (bottom + height > maxHeight && columns[col].length > 0) {
				bottom = 0;
				col++;
				columns[col] = [];
			}
			columns[col].push(element);
			bottom += height;
		}

		// create a table to hold the columns
		var props = {
				menu		: this,
				itemsHTML 	: ""
			}
		;
		for (var i = 0; i < columns.length; i++) {
			props.index = i;
			props.itemsHTML += this.itemColumnTemplate.evaluate(props);
		}
		var tableHTML = this.itemTableTemplate.evaluate(props);
		var table = Element.htmlToElements(tableHTML)[0];

		for (var i = 0; i < columns.length; i++) {
			var cell = table.select(".column"+i)[0],
				column = columns[i],
				length = column.length
			;
			if (!cell) continue; 	//TOTHROW
			for (var e = 0; e < length; e++) {
				var element = column[e];
				cell.appendChild(element);
			}
		}
		
		this.$main.insert(table);	
	},
	
	/**
	 *	Return HTML for the widget
	 **/
	getPartsHTML : function() {
		if (!this.items) return;
		
		var partsHTML = "";
		for (var i = 0; i < this.items.length; i++) {
			var item = this.item = this.items[i];
			item.index = i;
			if (item.isSeparator) {
				partsHTML += this.SeparatorItemTemplate.evaluate(this);						
			} else if (item.isHeader) {
				partsHTML += this.HeaderItemTemplate.evaluate(this);
			} else if (item.isLabel) {
				partsHTML += this.LabelItemTemplate.evaluate(this);
			} else {
				partsHTML += this.ItemTemplate.evaluate(this);
			}
		}
		return partsHTML;
	},
	
	MainTemplate : new Template(
					"<div class='#{className}' style='#{style}'>\
						#{partsHTML}\
					<\/div>"),

	ItemTemplate : new Template(
					"<a partId='#{item.index}' class='#{itemClassName} #{item.className}' style='#{item.style}' href='#'>\
						#{item.title}\
					<\/a>"),
	LabelItemTemplate : new Template(
					"<span partId='#{item.index}' class='#{labelItemClassName} #{item.className}' style='#{item.style}'>\
						#{item.title}\
					<\/span>"),
	HeaderItemTemplate : new Template(
					"<span partId='#{item.index}' class='#{headerItemClassName} #{item.className}' style='#{item.style}'>\
						#{item.title}\
					<\/span>"),
	SeparatorItemTemplate : new Template(
					"<hr partId='#{item.index}' class='#{separatorItemClassName} #{item.className}' style='#{item.style}'/>"
					),

	itemTableTemplate : new Template(
					"<table class='MenuItemTable' cellspacing=0 cellpadding=0><tr>#{itemsHTML}</tr></table>"
					),
	itemColumnTemplate : new Template(
					"<td class='MenuItemColumn column#{index}'></td>"
					)

});
