new $.ScrollContainer.subclass({
	reference : "$.SelectableContainer",
	prototype : {
		showSelection : true,
		
		itemOptions : {
			eventHandlers : {
				click : function(event) {	this.container.onSelectItem(event, this); }
			}
		},
		
		onSelectItem : function(event, item) {
			if (this.showSelection) this.items.select(item);
			var value = (item.getValue ? item.getValue() : item);
			if (value.isObservable) 	value.notify("selected");
		}
	}
});
