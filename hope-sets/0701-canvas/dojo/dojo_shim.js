//
//	mini-dojo object here
//
var dojo = {

	render : {			// HACK-O-RAMA!
		html : {
			moz : true,
			ie : false,
			ie70 : false,
			safari : false,
			opera : false
		}
	},

	provide : function(path){
		path = path.split(".");
		var it = window;
		for (var i = 0; i < path.length; i++) {
			var name = path[i];
			if (it[name] == null) {
				it[name] = {};
			}
			it = it[name];
		}
		return it;
	},
	require : function(){},

	doc : function() {	return dnb.document },
	body : function() {	return dnb.document.body},

	byId : function(id) {
		if (typeof id == "string") {
			return dnb.document.getElementById(id);
		} return id;
	},
	
	byTagName : function(tag) {
		return dnb.document.getElementsByTagName(tag);
	},

	debug : function () {
		arguments.join = [].join;
		console.debug(arguments.join(" "));
	},
	


	lang : {
		inArray : function(arr, item) {
			for (var i = 0; i < arr.length; i++) {
				if (arr[i] == item) return true;
			}
			return false;
		},

	
		mixin : function(/*Object*/obj, /*Object...*/props){
			// summary:	Adds all properties and methods of props to obj. 
			for(var i=1, l=arguments.length; i<l; i++){
				dojo.lang._mixin(obj, arguments[i]);
			}
			return obj; // Object
		},
	
		_mixin : function(/*Object*/ obj, /*Object*/ props){
			// summary:
			//		Adds all properties and methods of props to obj. This addition is
			//		"prototype extension safe", so that instances of objects will not
			//		pass along prototype defaults.
			var tobj = {};
			for(var x in props){
				// the "tobj" condition avoid copying properties in "props"
				// inherited from Object.prototype.  For example, if obj has a custom
				// toString() method, don't overwrite it with the toString() method
				// that props inherited from Object.protoype
				if((typeof tobj[x] == "undefined") || (tobj[x] != props[x])){
					obj[x] = props[x];
				}
			}
			// IE doesn't recognize custom toStrings in for..in
			if(dojo.render.html.ie 
				&& (typeof(props["toString"]) == "function")
				&& (props["toString"] != obj["toString"])
				&& (props["toString"] != tobj["toString"]))
			{
				obj.toString = props.toString;
			}
			return obj; // Object
		}
	},	// end dojo.lang
	
	
	io : {
		//
		// cookie stuff
		//
		cookie : {
			set : function(/*String*/name, /*String*/value, 
												/*Number?*/days, /*String?*/path, 
												/*String?*/domain, /*boolean?*/secure){
				//summary: sets a cookie.
				var expires = -1;
				if((typeof days == "number")&&(days >= 0)){
					var d = new Date();
					d.setTime(d.getTime()+(days*24*60*60*1000));
					expires = d.toGMTString();
				}
				value = escape(value);
				document.cookie = name + "=" + value + ";"
					+ (expires != -1 ? " expires=" + expires + ";" : "")
					+ (path ? "path=" + path : "")
					+ (domain ? "; domain=" + domain : "")
					+ (secure ? "; secure" : "");
			},
			
			get : function(/*String*/name){
				//summary: Gets a cookie with the given name.
			
				// FIXME: Which cookie should we return?
				//        If there are cookies set for different sub domains in the current
				//        scope there could be more than one cookie with the same name.
				//        I think taking the last one in the list takes the one from the
				//        deepest subdomain, which is what we're doing here.
				var idx = document.cookie.lastIndexOf(name+'=');
				if(idx == -1) { return null; }
				var value = document.cookie.substring(idx+name.length+1);
				var end = value.indexOf(';');
				if(end == -1) { end = value.length; }
				value = value.substring(0, end);
				value = unescape(value);
				return value; //String
			},
			
			deleteCookie : function(/*String*/name){
				//summary: Deletes a cookie with the given name.
				dojo.io.cookie.setCookie(name, "-", 0);
			}
		}
	},// end io

	__ignoreMe:true
}






dojo.string = {}
/**
 * Trim whitespace from 'str'. If 'wh' > 0,
 * only trim from start, if 'wh' < 0, only trim
 * from end, otherwise trim both ends
 */
dojo.string.trim = function(str, wh){
	if(!str.replace){ return str; }
	if(!str.length){ return str; }
	var re = (wh > 0) ? (/^\s+/) : (wh < 0) ? (/\s+$/) : (/^\s+|\s+$/g);
	return str.replace(re, "");
}

/**
 * Trim whitespace at the beginning of 'str'
 */
dojo.string.trimStart = function(str) {
	return dojo.string.trim(str, 1);
}

/**
 * Trim whitespace at the end of 'str'
 */
dojo.string.trimEnd = function(str) {
	return dojo.string.trim(str, -1);
}
