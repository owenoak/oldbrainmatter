/* TypeParser for TMS types */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

var TypeParser = {
	typeMap : {
		"uint8"			: "integer",
		"sint8"			: "integer",
		"int8"			: "integer",
		"uint16"		: "integer",
		"sint16"		: "integer",
		"int16"			: "integer",
		"uint32"		: "integer",
		"sint32"		: "integer",
		"int32"			: "integer",
		"uint64"		: "integer",
		"sint64"		: "integer",
		"int64"			: "integer",
		"bool"			: "boolean",
		"tbool"			: "boolean",
		"float32"		: "float",
		"float64"		: "float",
		"char"			: "string",
		"ipv4addr"		: "string",
		"ipv4prefix"	: "string",
		"macaddr802"	: "string",
		"date"			: "date",
		"time_sec"		: "seconds",
		"time"			: "seconds",
		"time_ms"		: "milliseconds",
		"time_us"		: "microseconds",
		"datetime_sec"	: "seconds",
		"datetime"		: "seconds",
		"datetime_ms"	: "milliseconds",
		"datetime_us"	: "microseconds",
		"duration_sec"	: "seconds",
		"duration"		: "seconds",
		"duration_ms"	: "milliseconds",
		"duration_us"	: "microseconds",
		"none"			: "null",
		"any"			: "any",
		"btype"			: "?",
		"attribute"		: "string",
		"string"		: "string",
		"utf8_string"	: "string",
		"binary"		: "binary",
		"oid"			: "string",
		"link"			: "string",
		"name"			: "string",
		"hostname"		: "hostname",
		"uri"			: "uri",
		"charlist"		: "string",
		"regex"			: "regex",
		"globpattern"	: "?"
	},

	parse : function(value, TMStype) {
		var type = this.typeMap[TMStype];
		if (this.parsers[type]) 		return this.parsers[type](value);
		else if (this.parsers[TMStype]) return this.parsers[TMStype](value);
		return value;
	},
	
	parsers : {
		"integer" : function(value) {
			return parseInt(value);
		},
		"float" : function(value) {
			return parseFloat(value);
		}
	}
}
