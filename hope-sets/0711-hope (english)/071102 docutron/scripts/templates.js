var TEMPLATE = {

	AUTO_PARSE : true,
	AUTO_PARSE_PARAMS : {
		tagName : "SCRIPT",
		tagType : "templates",
		alreadyParsedMarker : "processed",
		stripComments : true,
		commentStripRE : /<!--[\s\S]*?-->/gm,
		autoRemoveTag : true,
	},

	_templates : [],
	_templatesById : {},
	_templatesBySelector : {},

	TEMPLATE_RE 		: /<template([\s\S]*?)>([\s\S]*?)<\/template>/gm,

	autoParse : function() {
		PARSER.parseDOMtags.call(this, this.AUTO_PARSE_PARAMS, this.parseTemplates);
	},

	parseTemplates : function(text, element, elementAttributes) {
		var template, match;
		this.TEMPLATE_RE.lastIndex = 0;
		
//		try {
			while (match = this.TEMPLATE_RE(text)) {
				template = {
						outerHTML : match[0],
						innerHTML : match[2]
					}

				PARSER.parseAttributeString(match[1], template);
				
				this._templates.push(template);
				if (template.id) this._templatesById[template.id] = template;
				if (template.selector) this._templatesBySelector[template.selector] = template;				
//console.warn(template);
			}
//		} catch (e)  {}
	},
	
	applyTemplates : function(outerElement) {
		// apply templates by selector to the outerElement
		for (var selector in this._templatesBySelector) {
			var template = this._templatesBySelector[selector];
			var elements = BROWSER.byTag(selector);
			console.log(elements);
		}
		
	},
	
	applyTemplate : function(template, element) {
	
	}

}

if (TEMPLATE.AUTO_PARSE) TEMPLATE.autoParse();
TEMPLATE.applyTemplates();