// TODO: 	* hook this up to a gears database to remember?
//			* to camel case, etc
//			* other set of default rules?
;(function() {

	// map of known singlar:plural strings
	// whenever we pluralize a string, we add it to this map to get it back again quicker next time
	var singlesMap = {
		person:'people',
		man:'men',
		child:'children',
		sex:'sexes',
		move:'moves',
		cow:'kine'
	};
	
	// map of known plural:singular strings
	var pluralsMap = {};
	// init the plurals map to the same data as in the singlesMap
	for (var singular in singlesMap) {
		pluralsMap[singlesMap[singular]] = singular;
	}
	
	// NOTE: list of pluralizers and singularizers cribbed from Ruby On Rails
	
	// rules to turn a singular into a plural
	var pluralizers = [
		[/$/, 's'],
		[/s$/i, 's'],
		[/(octop|vir)us$/i, '$1i'],
		[/(alias|status)$/i, '$1es'],
		[/(bu)s$/i, '$1ses'],
		[/(buffal|tomat)o$/i, '$1oes'],
		[/([ti])um$/i, '$1a'],
		[/sis$/i, 'ses'],
		[/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
		[/(hive)$/i, '$1s'],
		[/([^aeiouy]|qu)y$/i, '$1ies'],
		[/(x|ch|ss|sh)$/i, '$1es'],
		[/(matr|vert|ind)(?:ix|ex)$/i, '$1ices'],
		[/([m|l])ouse$/i, '$1ice'],
		[/^(ox)$/i, '$1en'],
		[/(quiz)$/i, '$1zes']
	]
	
	// rules to turn a singular into a plural
	var singularizers = [
		[/s$/i, ''],
		[/(n)ews$/i, '$1ews'],
		[/([ti])a$/i, '$1um'],
		[/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, '$1$2sis'],
		[/(^analy)ses$/i, '$1sis'],
		[/([^f])ves$/i, '$1fe'],
		[/(hive)s$/i, '$1'],
		[/(tive)s$/i, '$1'],
		[/([lr])ves$/i, '$1f'],
		[/([^aeiouy]|qu)ies$/i, '$1y'],
		[/(s)eries$/i, '$1eries'],
		[/(m)ovies$/i, '$1ovie'],
		[/(x|ch|ss|sh)es$/i, '$1'],
		[/([m|l])ice$/i, '$1ouse'],
		[/(bus)es$/i, '$1'],
		[/(o)es$/i, '$1'],
		[/(shoe)s$/i, '$1'],
		[/(cris|ax|test)es$/i, '$1is'],
		[/(octop|vir)i$/i, '$1us'],
		[/(alias|status)es$/i, '$1'],
		[/^(ox)en/i, '$1'],
		[/(vert|ind)ices$/i, '$1ex'],
		[/(matr)ices$/i, '$1ix'],
		[/(quiz)zes$/i, '$1']
	]			
	
	
	function addToMaps(singular, plural) {
		singlesMap[singular] = plural;
		pluralsMap[plural] = singular;
	}
	
	hope.mixin(hope,
		{
			pluralize : function(singular) {
				if (singlesMap[singular]) return singlesMap[singular];
				// go from the bottom, most general rule is at [0]
				for (var i = pluralizers.length, rule; rule = pluralizers[--i];) {
					if (singular.search(rule[0]) > -1) {
						var plural = singular.replace(rule[0], rule[1]);
						addToMaps(singular, plural);
						return plural;
					}
				}
				return singular;
			},
			
			singularize : function(plural) {
				if (pluralsMap[plural]) return pluralsMap[plural];
				// go from the bottom, most general rule is at [0]
				for (var i = pluralizers.length, rule; rule = pluralizers[--i];) {
					if (plural.search(rule[0]) > -1) {
						var singular = plural.replace(rule[0], rule[1]);
						addToMaps(singular, plural);
						return singular;
					}
				}
				return plural;
			},
	
			inflector : {
				addRule : function(singular, plural) {
					if (singular.constructor == RegExp) {
						pluralizers.push([singular, plural]);
	
					} else if (plural.constructor = RegExp) {
						singularizers.push([plural, singular]);
					
					} else {
						singlesMap[singular] = plural;
						pluralsMap[plural] = singular;
					}
				}
			}
		}
	);

})();
