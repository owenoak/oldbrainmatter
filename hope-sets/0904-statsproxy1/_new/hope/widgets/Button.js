new $.Drawable.subclass({
	reference : "$.Button",
	prototype : {
		className 		: "Button",
		eventHandlers 	: ["click"]
		template 		: "<div id='#{id}' class='#{className} #{_cssClass}' #{getAttributes()}>#{getTitle()}</div>",
		title			: undefined,
		getTitle : function(){
			return this.title;
		}
	}
});


new $.ScrollContainer.subclass({
	reference : "$.ButtonBar",
	prototype : {
		className : "ButtonBar",
		itemClass : "$.Button",
		itemOptions : { 
			onClick : function() {
				this.container.onButtonClick(this);
			}
		},
		onButtonClick : function(button) {
			this.items.select(button);
		}
	}
});
