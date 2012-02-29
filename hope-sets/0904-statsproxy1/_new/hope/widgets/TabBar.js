new $.SelectableContainer.subclass({
	reference : "$.TabBar",
	prototype : {
		className 	: "TabBar",
		itemClass 	: "$.Tab",
		orientation : "horizontal"
	}
});


new $.Button.subclass({
	reference : "$.Tab",
	prototype : {
		_cssClass : "Tab"
	}
});
