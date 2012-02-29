//! Date extensions
//!
(function() {// begin hidden from global scope



//!
//!	Date extension
//!

// couple of global functions
Date.parseFormat = function(str, format) {
	var ts = Date.parse(str);
	if (!isNaN(ts)) return new Date(ts);
}



})();// end hidden from global scope
