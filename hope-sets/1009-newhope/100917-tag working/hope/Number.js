/***	Number object extensions.	***/

Script.require("{{hope}}Object.js", function() {

hope.extendIf(Number.prototype, {
	random : function() {
		return Math.floor(Math.random() * this);
	},
	
	times : function(value) {
		var list = [], count = this;
		while (count-- > 0) {
			list[list.length] = value;
		}
		return value;
	}
}); 

Script.loaded("{{hope}}Number.js");
});// end Script.require()
