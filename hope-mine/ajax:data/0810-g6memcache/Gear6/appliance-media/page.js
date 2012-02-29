var page = new Page({
	id : "appliance_media"
});

// initial bootstrap update, done after the document loads
setTimeout( page.update.bind(page,true), 0);
