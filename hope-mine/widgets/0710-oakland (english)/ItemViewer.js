			protected handleEvents	= true;
			protected _itemIdPrefix	= "_item_";				// the id of each item will be:  
															//		this.id + "_" + this._itemIdPrefx + item.id
		
			// set up our children (which should be ItemViewerItems) to have the correct itemtemplate
			function createChildren() {
				super();
				for (var i = 0, kid; kid = this.children[i]; i++) {
					kid.id = this.id + this._itemIdPrefix + i;
					kid.template = this.itemtemplate;
					this.items.push(kid);
				}
			}
		
			// override the following methods if you have a non-array set of items
			function itemById(id) {
				return this.items[id];
			}
		
			function getItemId(item) {
				return (item.id || this.items.indexOf(item));
			}
		
			function itemFromNode(node) {
				var id = node.id;
				id = id.substring((this.id + this._itemIdPrefix).length);
				return this.itemById(parseInt(id));
			}
		
		
			// this should be generic
			
			// returns true if the domNode in question is one of our item nodes
			function isItemNode(domNode) {
				return (""+domNode.id).indexOf(this.id + this._itemIdPrefix) == 0;
			}
		
			function _getItemIdStr(item) {
				return this.id + "_" + this._itemIdPrefix + this.getItemId(item);
			}
		
		
			function getItemNode(item) {
				return this.getPart(this._itemIdPrefix+this.getItemID(item));
			}
			
		
		
			/* event handling for items of the item */
			function onitemclick(item, itemNode, domEvent) {
				this.selectItem(item, itemNode, domEvent);
			}
		
			function onitemover(item, itemNode, domEvent) {
				hope.addClass("hover", itemNode);
			}
			
			function onitemout(item, itemNode, domEvent) {
				hope.removeClass("hover", itemNode);
			}
		
			function onitemdown(item, itemNode, domEvent) {
				hope.addClass("down", itemNode);
			}
			
			function onitemup(item, itemNode, domEvent) {
				hope.removeClass("down", itemNode);
			}
			
			
			function onselectitem(item, itemNode, domEvent) {
				hope.addClass("selected", itemNode);	
			}
			
			function ondeselectitem(item, itemNode, domEvent) {
				hope.removeClass("selected", itemNode);	
			}
			
		
			
		
			// given a domEvent, figure out which piece of us they clicked on
			function getDomTarget(domEvent) {
				var domTarget = domEvent.target;
				while (domTarget) {
					if (domTarget == this.domNode) return null;
					if (this.isItemNode(domTarget)) return domTarget;
					domTarget = domTarget.parentNode;
				}
				return null;
			}
		
		
			// handlers for the main (outer) element delegate to the item under the mouse
			//	NOTE: they will delegate to the "onitem<event>" method of this object
			//	Also, if the item has an "on<event>" handler, that will be called AFTER the "onitem" method above.
			//
			// TODO: double click?
			function onmousemove(target, domEvent) {
				var target = this.getDomTarget(domEvent);
				if (!target) return false;
				if (this._currentTargetNode == target) return false;
				if (this._currentTarget) {
					this.onitemout(this._currentTarget, this._currentTargetNode, domEvent);
					this.handlePartEvent("mouseout", this._currentTarget, this._currentTargetNode, domEvent);
				}
				this.setCurrent(null, target);
				this.onitemover(this._currentTarget, this._currentTargetNode, domEvent);
			}
		
			function onmouseout(target, domEvent) {
				if (this._currentTarget) {
					this.onitemout(this._currentTarget, this._currentTargetNode, domEvent);
					this.handlePartEvent("mouseout", this._currentTarget, this._currentTargetNode, domEvent);
					this.setCurrent();
				}
				return false;
			}
			
			function onmousedown(target, domEvent) {
				if (this._currentTarget) {
					this.onitemdown(this._currentTarget, this._currentTargetNode, domEvent);
					this.handlePartEvent("mousedown", this._currentTarget, this._currentTargetNode, domEvent);
				}
				return false;
			}
		
			function onmouseup(target, domEvent) {
				if (this._currentTarget) {
					this.onitemup(this._currentTarget, this._currentTargetNode, domEvent);
					this.handlePartEvent("mouseup", this._currentTarget, this._currentTargetNode, domEvent);
				}
				return false;
			}
			
			function onclick(target, domEvent) {
				if (this._currentTarget) {
					this.onitemclick(this._selectedItem, domEvent, this._currentTarget);
					this.handlePartEvent("click", this._currentTarget, this._currentTargetNode, domEvent);
				}
				return false;
			}
			
			// you can call this with either item or itemNode, or null for both to clear
			function setCurrent(item, itemNode) {
				if (item && !itemNode) {
					itemNode = this.getItemNode(item);
				} else if (!item && itemNode) {
					item = this.itemFromNode(itemNode);
				}
				this._currentTarget = item;
				this._currentTargetNode = itemNode;
			}
			
			// call this when it's time for an item to be selected via the mouse
			// the actual change in the selected state might depend on:
			//		- the current selected state
			//		- any key modifiers in the domEvent (if passed)
			//		- if this item has multiselect
			function selectItem(item, itemNode, domEvent) {
				if (this.multiselect) {
					var shiftDown = (domEvent ? domEvent.shiftKey : false),
						altDown = (domEvent ? domEvent.altKey : false),
						ctrlDown = (domEvent ? domEvent.ctrlKey : false),
						cmdDown = (domEvent ? domEvent.metaKey : false)
					;
					// TODO!!!
				
				} else {
					if (this._selectedItem) {
						this.ondeselectitem(this._selectedItem, this._selectedNode, domEvent);
					}
					this._selectedItem = item;
					this._selectedNode = itemNode;
					this.onselectitem(item, itemNode, domEvent);
				}
			}