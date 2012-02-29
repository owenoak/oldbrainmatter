/*
	Take a bunch of rules expressed as:

		<controlStatement name='method'>
			<english>
				(on|to|method) <methodName> [\(] [1:"," <variable#>
												[2: as <className#> ]
												[3: default <expression#> ]
											]... [\)]
					<statements>
				end [<methodName>]
			</english>
			<javascript>
				function <methodName>([1:"," <variable#>]...) {
					var it, result;
		[1
					<!-- TODO: try a conversion before throwing ? -->
			[2		if (typeof <variable#> != '<className#>') {
						throw new Error("Type error: expected a '<className#>' for parameter '<variable#>'); 
					}
			]
			[3		if (<variable#> == null) <variable#> = <expression#>;	]
		]...
					<statements>
				}	
			</javascript>
		</controlStatement>

	and convert them to english.rules.
	
	This allows us to adapt to any syntax by expressing the rules in an XML-like grammar.

*/

var ruleParser = {
	AUTO_PARSE : true,
	AUTO_PARSE_PARAMS : {
		tagName : "SCRIPT",
		tagType : "english/rules",
		alreadyParsedMarker : "processed",
		stripComments : true,
		commentStripRE : /<!--[\s\S]*?-->/gm,
		autoRemoveTag : true,
	},

	autoParse : function () {
		PARSER.parseDOMtags.call(this, this.AUTO_PARSE_PARAMS, this.parseRules);	
	},
	
	RULE_TYPES : [
		"controlStatement", "statement", "variable", "literal", "reference", "operator"
	],
	
	_rules : {},
	parseRules : function(text, element, elementAttributes) {
		
		// for each type of rule, parse tags for it from the text
		for (var i = 0, type; type = this.RULE_TYPES[i++]; ) {
			var tags = this._rules[type] = PARSER.parseTextTags(text, type);
			
			// and get the substrings for the "english" and "javascript" tags
			for (var t = 0, tag; tag = tags[t++]; ) {
				tag.english = PARSER.getInnerHTMLForTextTags(tag.innerHTML, "english");
				tag.javascript = PARSER.getInnerHTMLForTextTags(tag.innerHTML, "javascript")[0];
//			console.log(tag);
			}

		}

		// DEBUG: handle the first "controlStatement"
		var rule = this._rules["controlStatement"][0];
//		console.dir(rule);
		
//		for (var e = 0, english; english = rule.english[e++];) {
//			console.dir(PARSER.tokenize(english));
//		}
	}
}

if (ruleParser.AUTO_PARSE) ruleParser.autoParse();
