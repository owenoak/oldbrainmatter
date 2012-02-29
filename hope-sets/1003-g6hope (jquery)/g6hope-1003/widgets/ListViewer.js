new $.SelectableContainer.subclass({
	reference : "$.ListViewer",
	
	prototype : {
		_cssClass		: "ListViewer",
		itemClass		: "$.ListItem"
	}
});

new $.Drawable.subclass({
	reference : "$.ListItem",
	prototype : {
		_cssClass		: "Item ListItem",
		title			: undefined,
		
		getTitle : function() {
			return this.title;
		},
		
		template 		: "<li class='#{className} #{_cssClass}' #{getAttributes()}>#{getTitle()}</li>"
	}
});
