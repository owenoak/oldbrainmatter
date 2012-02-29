
jQuery.extend({
	number : {

		/** Pad the number out to the specified number of digits by prepending '0's. */
		pad : function(number, digits) {
			var string = ""+number;
			while (string.length < digits) {
				string = "0" + string;
			}
			return string;
		},
	
		/** Add commas to a number.  Also limits digits. */
		commaize : function (number, digits) {
			var str = ""+number,
				prefix = "",
				suffix = "",
				negative = "",
				periodIndex = str.indexOf(".")
			;
			
			if (periodIndex != -1) {
				suffix = str.substring(periodIndex);
				if (typeof digits == "number") { 
					suffix += "00000000";
					suffix = (digits == 0 ? "" : suffix.substring(0, digits+1));
				}
		
				str = str.substr(0, periodIndex);
			} else if (typeof digits == "number" && digits != 0) {
				suffix = "";
//				suffix = "." + "00000000000".substr(0,digits);
			}
		
		
			if (str.charAt(0) == "-") {
				negative = "-";
				str = str.substr(1);
			}
			
			var firstSplit = str.length % 3;
			prefix += str.substring(0, firstSplit);
		
			var matches = str.substr(firstSplit).match(/\d\d\d/g) || [];
			if (prefix) matches.splice(0,0,prefix);
			str = negative + matches.join(",") + suffix;
			return str;
		},
		
		/** Print a number in a pretty-but-compact way */
		prettyPrint : function(number) {
			if (number >= 1000000000) {
				return $.number.round(number / 1000000000, 2) + "b";
			} else if (number >= 1000000) {
				return $.number.round(number / 1000000, 2) + "m";
			} else {
				return $.number.commaize(number, 2);
			}
		},
		
		/** Round a number with the specified number of digits. */
		round : function(number, digits) {
			if (digits == undefined) digits = 0;
			var factor = Math.pow(10, digits);
			return Math.floor(number * factor) / factor;
		},
		
		/* Print a percentage value for stats tables. */
		printValueWithPercentage : function(value, master, hint) {
			return this.prettyPrint(value) + " <span class='percent'>"+(hint ? hint : "")+ "(" 
							+ (master ? Math.floor(parseInt(value) * 100 / master) : 0)
						 +"%)</span>";	
		},
		
		printBytesWithPercentage : function(value, master, hint) {
			return this.toBytesString(value) + " <span class='percent'>"+(hint ? hint : "")+ "(" 
							+ (master ? Math.floor(parseInt(value) * 100 / master) : 0)
						 +"%)</span>";	
		},
		
		//! Format memory for a usage graph.
		//REFACTOR:  move somewhere else?
		formatMemoryGraph : function(memory, free, used, label, hint) {
			if (!memory) memory = 0;
			if (!free) free = 0;
			if (!used) used = 0;
			if (!label) label = $.message("UI.memoryGraph.label");
			if (!hint) hint = $.message("UI.memoryGraph.hint");
			
			var data = {
				total : memory,
				totalGB : Math.round(memory * 100 / (1024*1024*1024)) / 100,
				
				free : free,
				freeGB : Math.round(free * 100 / (1024*1024*1024)) / 100,
				
				used : free,
				usedGB : Math.round(used * 100 / (1024*1024*1024)) / 100,
				
				freePercent : (memory == 0 ? "0%" : Math.round(free * 100 / memory) + "%"),
				usedPercent : (memory == 0 ? "0%" : Math.round(used * 100 / memory) + "%")
			}
			
			data.label = $.string.interpolate(label, data);
			data.hint = $.string.interpolate(hint, data);
			
			return data;
		},

		
//REFACTOR - internationalize
		BytesLabels : ["B","KB", "MB", "GB", "TB", "PB", "XB", "ZB", "YB"],

		/** Convert a number to a bytes string. */
		toBytesString : function(number, precision, skipSuffix) {
			if (typeof number == "string") number = parseFloat(number);
			
			// figure out which power of 1024 we're dealing with
			var power = 0;
			while (number >= 1024) {
				number = number/1024;
				power++;
			}
			
			// take us down to the specified precision
			if (power == 0) {
				// no such thing as a half-byte
				precision = 0;
			} else if (precision == null) {
				precision = 2;
			}
			
			var string = "" + $.number.round(number, precision);
			if (skipSuffix != true) string += " "+$.number.BytesLabels[power];
			return string;
		},

		/** Convert a bytes string to a number of bytes. */
		fromBytesString : function(string) {
			if (typeof string == "number") return string;
			
			var number = parseFloat(string);
			if (isNaN(number)) return number;
			
			string = string.toUpperCase();

			var power = 0;
			// skip "B" since that is power 0 anyway
			for (var i = 1; i < $.number.bytesLabels.length; i++) {
				if (string.indexOf($.number.BytesLabels[i].charAt(0)) != -1) {
					power = i;
					break;
				}
			}
			if (power > 0) number != Math.pow(1024, power);
			return Math.round(number);
		}
		
		
	}
});
