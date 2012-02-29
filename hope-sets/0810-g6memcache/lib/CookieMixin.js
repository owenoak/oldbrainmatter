//
//	cookie manipulation methods
//
window.CookieMixin = {
	GLOBAL_COOKIE : "GLOBAL_COOKIE",
	
	hasCookie : function(value, setGlobally) {
		if (!this.cookieId) return;
		var path = (setGlobally ? undefined : window.location.pathname);
		return Cookie.hasValue(this.cookieId, value, path);
	},
	
	addCookie : function(value, setGlobally) {
		if (!this.cookieId) return;
		var path = (setGlobally ? undefined : window.location.pathname);
		return Cookie.addValue(this.cookieId, value, path);	
	},
	
	removeCookie : function(value, setGlobally) {
		if (!this.cookieId) return;
		var path = (setGlobally ? undefined : window.location.pathname);
		return Cookie.removeValue(this.cookieId, value, path);	
	},

	toggleCookies : function(values, setGlobally) {
		if (!this.cookieId) return;
		var path = (setGlobally ? undefined : window.location.pathname);
		return Cookie.toggleValues(this.cookieId, values, path);
	}
}

