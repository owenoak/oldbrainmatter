
// really simple cookie stuff
// NOTE: subset of api of 
jQuery.extend({
	cookies : {
		get : function(name) {
			if (!document.cookie) return undefined;
			var cookies = document.cookie.split("; ");	// TODO: cross browser?
			for (var i = 0, len = cookies.length; i < len; i++) {
				var cookie = cookies[i].split("=");
				if (cookie[0] == name) return unescape(cookie[1]);
			}
			return undefined;
		},
		
		set : function(name, value, path, domain, expires, secure) {
			var newCookie = name + "=" + escape(value) +
					((expires) ? "; expires=" + expires.toGMTString() : "") +
					((domain) ? "; domain=" + domain : "") +
					((secure) ? "; secure" : "")
			;
			document.cookie = newCookie;
			return $.cookies.get(name);
		}
	}
});
