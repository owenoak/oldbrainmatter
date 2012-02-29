(function(){//begin hidden from global scope


/////////
//
//	Stylesheet manipulation helpers
//
//	NOTE: late model WebKit and Gecko ONLY!
//
/////////

// MEH:  Different names for the stylesheet rule constructors.
//		 Make an alias for whichever is defined as StyleSheetRule
window.StyleSheetRule = window.CSSStyleRule || window.CSSStyleDeclaration;
if (!window.StyleSheetRule) throw "Stylesheet manipulation not supported in this browser";


var SS = StyleSheet,
	SSp = StyleSheet.prototype,
	SSRp = StyleSheetRule.prototype
;


//
//	utility methods
//

// create a new stylesheet with specified cssText, append it to the document and return it
SS.create = function(cssText, attributes) {
	var sheet = document.createElement("style");
	sheet.innerHTML = cssText;
	if (attributes) for (var key in attributes) sheet.setAttribute(key, attributes[key]);
	// append it to the body (or the head if body not defined yet)
	(document.body || document.getElementsByTagName("head")[0]).appendChild(sheet);
	return sheet;
}

// split a cssText string into a map of prop=>value pairs
// <cssText> is a css text string like:   prop:value;prop:value;
SS.split = function(cssText) {
	var split = cssText.split(/\s*([\w-]+)\s*:\s*(.*?)\s*;\s*/);
	var i = -1, key, map = {};
	while ((key = split[++i]) != null) {
		if (key != "") map[key] = split[++i];
	}
	return map;
}

// join a styleMap (eg: from split()) into a style string
SS.join = function(styleMap) {
	var cssText = "";
	for (var key in styleMap) {
		cssText += key + ":" + styleMap[key] + "; ";
	}
	return cssText;
}

// merge properties from map2 into map1.
// Note: modifies map1 directly!
//	to REMOVE a property in map1, have a property in map2 with value null or undefined
SS.merge = function(map1, map2) {
	for (var key in map2) {
		var value = map2[key];
		if (value == null) 	delete map1[key];
		else				map1[key] = map2[key];
	}
	return map1;
}


//
//	methods attached directly to StyleSheet instances
//

// find index of the first rule in a stylesheet which matches a selector EXACTLY
//	<selector> is a selector string or a stylesheet Rule which is present in this stylesheet
SSp.indexOf = function(selector) {
	var i = -1, rule;
	if (typeof selector === "string") {
		while (rule = this.cssRules[++i]) {
			if (rule.selectorText === selector) return i;
		}
	} else {
		while (rule = this.cssRules[++i]) {
			if (rule === selector) return i;
		}
	}
	return -1;
}


// return the first rule in a StyleSheet which matches a selector EXACTLY
//	<selector> is a selector string
//  <style> is property name (if null, returns entire style rule)
SSp.get = function(selector, style) {
	var index = this.indexOf(selector);
	var rule = (index > -1 ? this.cssRules[index] : undefined);
	return (rule && style ? rule.styles()[style] : rule);
}

// change the definition of the first rule in a stylesheet to match selector EXACTLY
//	<selector> is a selector string or a StyleSheetRule that's part of this StyleSheet
//  with 2 arguments:
//		<style> as string is full body to use for style definition, 
//	 or
//		<style> as object is prop->value pairs to MERGE with current style
//	with 3 arguments:
//		<style> is style property name and <value> is new value for that property
//
SSp.set = function(selector, style, value) {
	var index = this.indexOf(selector), 
		oldRule = (index != -1 ? this.cssRules[index] : null),
		oldStyles = oldRule ? oldRule.styles() : {}
	;
	
	// if we found a matching rule, get rid of it
	if (oldRule) this.deleteRule(index);

	// if they passed a StyleSheetRule, get its selectorText
	if (selector instanceof StyleSheetRule) selector = selector.selectorText;

	// if <value> is non-null, assume  <style> is a style property name and <value> is new value
	if (value !== undefined) {
		var temp = {};
		temp[style] = value;
		style = temp;
	}
	
	// if object style, merge with oldStyles and convert to string
	if (typeof style === "object") {
		style = StyleSheet.join(StyleSheet.merge(oldStyles, style));
	}
	this.insertRule(selector + " { "+style+"}", index);

	return this;	// for chaining
}



//
//	methods attached directly to StyleSheetRule instances
//


// replace this rule with a new set of style properties
// <styles> is a string for the new body of the style definition
SSRp.set = function(style, value) {
	this.parentStyleSheet.set(this, style, value);
	return this;	// for chaining
}

// split this rule up into key:value pairs
SSRp.styles = function() {
	return StyleSheet.split(this.style.cssText);
}


})();// end hidden from global scope
