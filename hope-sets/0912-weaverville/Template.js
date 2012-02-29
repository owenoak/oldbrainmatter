/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Template expander class. **/

//
//	regular expressions we use below
//
$.extend($.patterns, 
	{
		templateTokenizer : {
			start : /({{@?|<@>)/g, 
			end	: /(<\/@>|}})/g
		}
	}
);

new $.Thing({
	name : "Template",
	collection : "Templates",

	prototype : {
		args : "it",			// name of the argument(s) in the expander function

		initialize : function() {
			if (this.id) this.register();
		},

		// the first time the Template is expanded
		//	we replace the "expand" function with a custom expander function
		//	and then call the expander function
		expand : function() {
			this.expand = this.makeExpander();
			return this.expand.apply(this, arguments);
		},

		// make an expander function for evaluating the template
		makeExpander : function() {
			var args = this.args,
				firstArg = args.split($.patterns.splitOnCommas)[0],
				indent = "",
				chopped = $.string.chop(this.text, $.patterns.templateTokenizer.start, $.patterns.templateTokenizer.end),
				script = [];
			;
			// TODO: move this into non-inlined function for speed?
			chopped.forEach(function(next) {
				if (typeof next == "string") {
					script.push("output += \"" + $.string.makeDoubleQuoteSafe(next) + "\";");
					return;
				}

				// handle  <@>...</@>
				if (next.start[0] == "<@>") {
					script.push("try {");
					script.push(next.middle);
					script.push("} catch (e) {}");
				}

				else {
					// output attributes if they are not empty
					if (next.start[0] == "{{@") {
						script.push("try { ");

						var key = next.middle,
							attributeName = next.middle
						;
						if (key == "class") key = "className";
						
						if (key == "attributes") {
							script.push("output += arguments[0].getAttributesHTML();");
//NOTE: not doing events this way for now
//						} else if (key == "events") {
//							script.push("output += arguments[0].getEventsHTML();");
						} else {
							script.push("__value = arguments[0]."+key+";"
									+ "if (__value != null && value != '') {"
										+" output += ' "+attributeName+"=\"' + __value + '\"';"
									+ "}");
						}
						script.push(
							"} catch(e){ __value = null;};"
						);

					// handle  {{...}}
					// doing a try/catch for now, may want to reconsider for speed
					//
					} else {
						script.push(
							"try { output += ((__value = ("+next.middle+")) != null ? __value : '') } catch (e){}"
//								"try { __value = ("+next.middle+") } catch(e){ __value = null;};",
//								"if (__value != null) output += __value; "
						);
					}
				}
			});

			script = [
				"	"+firstArg+" = "+firstArg+" || {};",
				"	var __value, output = output || '';",
				"	try {",
				"		"+script.join("\n		"+indent),
//				"	console.warn(output);",
				"	} catch (e) {",
				"		console.error('error expanding template \""+this.id+"\":' + e.message);",
				"	}",
				"	return output;",
			].join("\n"+(indent||""));

			return new Function(args, script);
		},

		toElement : function() {
			return this.expand.apply(this, arguments).toElement();
		},

		toElements : function(context) {
			return this.expand.apply(this, arguments).toElements();
		}
	},	// end prototype

	defaults : {

		/** Override getInstance to return contents of an html element as a template
			if properties is a string "#<id>".
			
			Returns null if no template was found.
		 */
		getInstance : function(properties) {
			if (typeof properties == "string" && properties.charAt(0) == "#") {
				var id = properties,
					element = $(id),
					attributes = element.attr()
				;
				attributes.text = element.html();
				return new $.Template(attributes);
			}
			return $.Thing.getInstance.apply(this, arguments);
		},

		// 	Load one or more templates from a URL.
		//	Use Loader.loadTemplate() and Loader.loadTemplates() instead of this
		//		unless you know what you're doing.
		//
		// 	NOTE: url is assumed to be an absolute url
		//
		//	NOTE: throws an error if the file couldn't be loaded
		//			or there was an error parsing the templates
		load : function(url, async) {
			$.ajax({
				url : url,
				async : (async !== undefined ? async : true),
				success : $.Template.onLoaded,
				error : $.Template.onLoadError,
				format : "text"
			});
		},

		onLoaded : function(text) {
			$.Template.parse(text);
		},

		onLoadError : function() {
			console.warn("Error loading templates");
		},

		/**  Parse one or more templates from text. */
		parse : function(text) {
			// if there are a bunch of templates in the string, create a Template from each
			if (text.indexOf("<template") > -1) {
				var templates = $.string.forEachTag(text, "template", 
					function(tagName, attributes, contents) {
						attributes = $.string.getAttributes(attributes);
						if (contents) attributes.text = contents;
						return new $.Template(attributes);
					}
				);
				return templates;
			}

			// otherwise if the entire string is just one template
			else {
				return new $.Template({text:text});
			}
		},

		// expand the specified template with arguments 1..n
		expand : function(templateId) {
			var template = $.Template.getInstance(templateId);
			if (!template) {
				throw TypeError(this+".expand(",templateId,"): template not found");
				return "";
			}
			var args = $.args(arguments, 1);
			return template.expand.apply(template, args);
		},

		toElements : function(templateId) {
			var results = $.Template.expand.apply($.Template, arguments);
			if (results) return $(results);
		}
	}

});


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
