
(function() {
console.time("parsing rules");

english.rules = {
	"file" :
		new Rule(
			"?<<handler>> EOF",
			"&gt;script language='javascript'&lt;EOL<handler>EOL&gt;/script&lt;EOL"
		),


	"handler" : 
		new Rule(
			"[on|to|method|when] *methodName EOL ?<statementList> end ?**methodName EOL",
			"function <methodName> {EOL <statementList>	EOL}"
		),
		
	"statementList" : 
		new Rule(
			"<<statements>>",
			"<recurse>"
		),

	"statements" : 
		new Rule(
			"?[<ifStatement>|<statement>]"		
		),

	"statement"	: 
		new Rule(
			"[STATEMENT|OTHER_STATEMENT] EOL",
			"<recurse>();EOL"
		),

	"ifStatement" : 
		new Rule(
			"if <logical> ?then EOL ?<<statementList>> end ?if EOL",
			"if (<logical>) {EOL <statementList> }EOL"
		),

	"boolean" :	
		new Rule(
			"[true|false]",
			"<recurse>"
		),

	"logical" : 
		new Rule(
			"<boolean> ?<<logicalSuffix>>"
		),
		
	"logicalSuffix" : 
		new Rule(
			"[<logicalOr>|<logicalAnd>]"
		),

							
	"logicalOr" : 
		new Rule(
			"or <boolean>",
			"|| <boolean>"
		),

	"logicalAnd" : 
		new Rule(
			"and <boolean>",
			"&& <boolean>"
		),
	
	dontMessUpInStupidBrowsers : {}
};

// go through all of the rules and make sure they know their name!
for (var name in english.rules) {
	english.rules[name].name = name;
}

console.timeEnd("parsing rules");
})();
