// extend the Page object to add gear6-specific stuff
Object.extend(Page.prototype, {
	setDirtyState : function(dirty) {
		this.dataIsDirty = dirty;
		var saveHeader = $("PageSaveMessage");
		if (saveHeader) {
			if (this.dataIsDirty) 	saveHeader.addClassName("PageIsDirty");
			else					saveHeader.removeClassName("PageIsDirty");
		}
	}
});

// set up an alias as Gear6.Page
if (!window.Gear6) window.Gear6 = {};
Gear6.Page = Page;
