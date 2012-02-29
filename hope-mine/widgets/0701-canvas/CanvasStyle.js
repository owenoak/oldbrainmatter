/* fancy things supported

	
	"gradient" -- simple, directional gradient (N, SE, etc)
	
		gradient:n,color,color:$name
		gradient:direction,[pos,color],[pos,color]...:$name
		
		gradient:n,black,white:$name	
		gradient:n,[0,black],[1,white]:#black-white
		gradient:north,[0,white],[1,black]:#white-black
		
		// NOT YET:
		gradient:270,[0,rgba(0,0,0,1)],[1,rgba(0,0,0,0)]:#fade-out-white


	"linear" -- linear gradient w/same params as canvas, but can be percentages (of shape)

		linear:x1,y1,x2,y2,color,...:$name
		linear:x1,y1,x2,y2,[pos,color]...:$name

	"radial" -- radial gradient w/same params as canvas, but can be percentages (of shape)

		radial:x1,y1,r1,x2,y2,r2,color,...:$name
		radial:x1,y1,r1,x2,y2,r2,[pos,color],...:$name

	"circle" -- simplfied gradient, from center to outer edge

		circle:color,...
		circle:[pos,color],...


	TODO:
		multiple styles -- style|style|style:$name
		.name -- use reflection to get style from CSS class of the same name


*/





/*
	TODO:
			* <color>-.5 to darken, <color>+.5 to lighten
			* use regexps to be smarter about whitespace
			* how to make emboss work?

*/

dnb.createSingleton("StyleFactory", {
	debugFunctions : false,		// if true, we print out functions as we create them

	renderStyle : function(style, canvas, shape) {
		if (style == null) return null;
		var renderer = this.getStyle(style);
		if (renderer) {
			if (typeof renderer == "function") return renderer(canvas, shape);
			return renderer;
		}
		console.warning("dnb.StyleFactory.renderStyle('",style,"'): style not recognized.  Returning pink.");
		return "pink";
	},

	splitParams : function(paramStr) {
		// TODO: this needs to handle spaces inside items:   "left + (width/2), bottom"
	
		var split = paramStr.match(/([^\s\[,]*?)+(?=(,|$))|\[(.*?)\]/g);
		var params = [];
		for (var i = 0; i < split.length; i++) {
			var param = split[i];
			if (param.indexOf("[") > -1) param = param.match(/[^\s\[\],]+/g);
			params.push(param);
		}
		return params;
	},

	// if className is passed in, will remember the style under that class name for you
	getStyle : function (style, id) {
//console.debug("style:", style, "id:", id);

		// if they didn't pass in a class name, check the string for ":class=foo"
		//	(which must be at the end) and use that as the class name (recursively)
		// TURNING OFF BECAUSE THAT MEANS WE HAVE TO DO A REGEX EVERY TIME WE GET A SIMPLE STYLE
		//if (!id && (id = style.match(/:class=([^:]*)/))) {
		//	style = style.substr(0, style.indexOf(id[0]));
		//	id = id[1];
		//	return dnb.StyleFactory.getStyle(style, id);
		//}

		var _cache = dnb.StyleFactory._styleCache;
		if (_cache[id] && _cache[id] == _cache[style]) return _cache[id];
		if (_cache[style]) return (id ? _cache[id] = _cache[style] : _cache[style]);
		
		var renderer;
		
		if (typeof style == "function") {
			renderer = style;
		} else if (style.indexOf("|") > -1) {
			var styles = style.split("|");
			renderer = [];
			for (var i = 0; i < styles.length; i++) {
				if (styles[i]) renderer.push(dnb.StyleFactory.getStyle(styles[i]));
			}
		
		} else if (style.charAt(0) == ".") {
			// take from CSS class
			alert("render styles from css classes not yet implemented (" + style + ")");
	
		} else if (style.indexOf(":") > -1) {
			var type = style.split(":"),
				params = type[1],
				type = type[0]
			;
			
			params = this.splitParams(params);
			switch (type) {
				case "gradient":	renderer = dnb.StyleFactory.createDirectionGradientRenderer.apply(dnb.StyleFactory,params);
					break;

				case "linear":		renderer = dnb.StyleFactory.createLinearGradientRenderer.apply(dnb.StyleFactory,params);
					break;

				case "radial":		renderer = dnb.StyleFactory.createRadialGradientRenderer.apply(dnb.StyleFactory,params);
					break;

				case "circle":		renderer = dnb.StyleFactory.createCircleGradientRenderer.apply(dnb.StyleFactory,params);
					break;

				case "pattern":		renderer = dnb.StyleFactory.createPatternRenderer.apply(dnb.StyleFactory,params);
					break;

				case "emboss":		renderer = dnb.StyleFactory.createEmbossRenderer.apply(dnb.StyleFactory,params);
					break;
			
			}
		} else {
			renderer = style;
		}
		
		if (renderer == null) {
			console.debug("Render style '", type, "' not understood");
			renderer = function(){return "pink"};
		}
		
		// remember as the entire outer style string
//console.debug("adding to cache as " + style);
		dnb.StyleFactory._styleCache[style] = renderer;
	
		// and if a id was specified, remember as that as well
		if (id) {
			if (dnb.StyleFactory._styleCache[id]) console.debug("dnb.StyleFactory.redefining style " + id);
//console.debug("adding to cache as " + id);
			dnb.StyleFactory._styleCache[id] = renderer;
		}
	
		return renderer;
	},

	// cache of styles we've already created renderers for
	_styleCache : {
		// pre-seed with a couple of things
		$fg : function(canvas,shape) {	return canvas.color;	},
		$bg	: function(canvas,shape) {	return canvas.backgoundColor;	}
	},


	addGradientStopScripts : function(script, argList, startArg) {
		if (startArg == null) startArg = 0;
	
		var stopCount = argList.length - startArg;
		for (var i = 0; i < stopCount; i++) {
			var stop = argList[i+startArg], position, color;
			if (typeof stop == "string") {
				position = (i/(stopCount-1));
				if (isNaN(position)) position = 1;
				color = stop;
			} else {
				position = stop[0];
				color = stop[1];
			}
			// dereference it if they provided a named color
			if (dnb.StyleFactory._styleCache[color]) color = dnb.StyleFactory._styleCache[color];
			script.push("style.addColorStop("+position+",'"+color+"');");
		}
	},


// only supporting direction of N,S,E,W,NE,NW,SE,SW etc
	createDirectionGradientRenderer : function (direction) {
		var directionScript = dnb.StyleFactory.directionGradientCoordinates[direction.toUpperCase()];
	
		if (directionScript == null) {
			console.debug("GradientFactory: direction '" + direction + "' not understood. Defaulting to 'N'");
			directionScript = GradientFactory.directionScripts('N');
		}

		var script = ["with (props) {", directionScript, "}\n"];
		
		script.push("var style = canvas.createLinearGradient(x1, y1, x2, y2);");		
		dnb.StyleFactory.addGradientStopScripts(script, arguments, 1);
		script.push("return style;");
		
		return dnb.StyleFactory.createFunction("canvas,props", script.join("\n"), "directionGradientRenderer");
	},
	directionGradientCoordinates : {
		"N" : "	var x1=(width/2), y1=0, x2=x1, y2=height;",
		"S" : "	var x1=(width/2), y1=height, x2=x1, y2=0;",
		"E" : "	var x1=width, y1=(height/2), x2=0, y2=y1;",
		"W" : "	var x1=0, y1=(height/2), x2=width, y2=y1;",
		"NW": "	var x1=0, y1=0, x2=width, y2=height;",
		"NE": "	var x1=width, y1=0, x2=0, y2=height;",
		"SW": "	var x1=0, y1=height, x2=width, y2=0;",
		"SE": "	var x1=width, y1=height, x2=0, y2=0;"
	},
	
	
	
	createLinearGradientRenderer : function (x1, y1, x2, y2) {
		var script = [
			"with (props) {",
				"	var x1 = " + (x1.indexOf("%") == -1 ? x1 : "(" + (parseFloat(x1) / 100) +" * width), ") +
						"y1 = " + (y1.indexOf("%") == -1 ? y1 : "(" + (parseFloat(y1) / 100) +" * height), ") +
						"x2 = " + (x2.indexOf("%") == -1 ? x2 : "(" + (parseFloat(x2) / 100) +" * width), ") +
						"y2 = " + (y2.indexOf("%") == -1 ? y2 : "(" + (parseFloat(y2) / 100) +" * height)") + ";",
			"}"
		];
		
		script.push("var style = canvas.createLinearGradient(x1, y1, x2, y2);");	
		dnb.StyleFactory.addGradientStopScripts(script, arguments, 4);
		script.push("return style;");

		return dnb.StyleFactory.createFunction("canvas,props", script.join("\n"), "linearGradientRenderer");
	},
	
	
	// simpler radial gradient that does center-out effect for full size of element
	createCircleGradientRenderer : function () {
		var script = [	
				"var centerX = Math.floor(canvas.width / 2),",
				"	 centerY = Math.floor(canvas.height / 2);",
				"	 style = canvas.createRadialGradient(0,0, 1, 0,0, Math.max(canvas.width, canvas.height));"
			]
		;
		dnb.StyleFactory.addGradientStopScripts(script, arguments, 0);
		script.push("return style;");
		
		return dnb.StyleFactory.createFunction("canvas,props", script.join("\n"), "circleGradientRenderer");
	},
	
	createRadialGradientRenderer : function (x1, y1, r1, x2, y2, r2) {
		var script = [	
				"with (props) {",
				"	var x1 = " + (x1.indexOf("%") == -1 ? x1 : "(" + (parseFloat(x1) / 100) +" * width), "),
						"y1 = " + (y1.indexOf("%") == -1 ? y1 : "(" + (parseFloat(y1) / 100) +" * height), "),
						"r1 = " + (r1.indexOf("%") == -1 ? r1 : "(" + (parseFloat(r1) / 100) +" * Math.Max(width, height)), "),
						"x2 = " + (x2.indexOf("%") == -1 ? x2 : "(" + (parseFloat(x2) / 100) +" * width), "),
						"y2 = " + (y2.indexOf("%") == -1 ? y2 : "(" + (parseFloat(y2) / 100) +" * height), "),
						"r2 = " + (r2.indexOf("%") == -1 ? r2 : "(" + (parseFloat(r2) / 100) +" * Math.Max(width, height))"),
				";}",
				"var style = canvas.createRadialGradient(x1, y1, r1, x2, y2, r2);"
			]
		;
		dnb.StyleFactory.addGradientStopScripts(script, arguments, 6);
		script.push("return style;");
		
		return dnb.StyleFactory.createFunction("canvas,props", script.join("\n"), "radialGradientRenderer");
	},
	
	
	createPatternRenderer : function(url) {
		console.error("createPatternRenderer not implemented");
	},
	
	
	createEmbossRenderer : function () {
		console.error("createEmbossRenderer not implemented");
	},
	
	
	// TOGENERICIZE
	createFunction : dnb.createFunction
});
