var page = new Gear6.Page({
	id : "memcache_media"
});


// hmm, having this here breaks encapsulation
page.registerOperations(Gear6.Module.prototype.operations);
page.registerUpdateOperation(Gear6.Module.prototype.updateOperation);

// initial bootstrap update, done after the document loads

// document.observe("dom:loaded", page.update.bind(page));
setTimeout( page.update.bind(page), 0);
