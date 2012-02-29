/*	Misc, small, useful widgets.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr");


//	Parts mixin:
//
//	Add functionality to base Component class to create sub-parts easily
//	by creating them from configuration objects.
//
//	Usage:
//		- component.parts			map of partname -> config objects or arrays
//		- component.partDefaults	map of partname -> properties || method to get properties
//										for that part (method is .call()ed on component)
//
mapr.Parts = {
	// 	Given a partName, look in component.parts for config object(s) for that part.
	//
	//	If found, create the component(s) there and install in  component[partName].
	// 	Second-time through, just returns the installed part(s).
	//	
	//	If not found in this class's parts, will look in superclasses as necessary.
	//
	//	Adds property "owner" to each component.
	//
	//	<partName> 	is the key of a single component cfg, or an array of configs
	//					stored as component.parts[partName]
	//	<options> 	is properties to pass to all components so constructed.
	//
	//	<cfgOnly>	if true, don't convert to classes, leave as simple cfg objects
	//
	//	if part.ownerProp is set, this[ownerProp] == part
	//
	getParts : function(partName, options, cfgOnly) {
		if (this[partName]) return this[partName];

		var partCfg = this._getPartCfg(partName);
		if (!partCfg) return partName;
		
		// handle part as a function
		if (typeof partCfg == "function") {
			partCfg = partCfg.call(this, partName);
		}
		
		// merge options passed in with this.partDefaults
		var partDefaults = this._getPartCfg(partName+"Defaults") 
						|| this._getPartCfg("defaults");
		if (partDefaults) {
			if (typeof partDefaults === "function") {
				partDefaults = partDefaults.call(this, partName, partCfg);
			}
			options = util.mergeDefaults(options, partDefaults);
		}
		
		var parts;
		if (Ext.isArray(partCfg)) {
			parts = partCfg.map(function(itemCfg) {
				var partName;
				// if a string starting with "@", treat as a part
				if (typeof itemCfg == "string" && itemCfg.charAt(0) == "@") {
					partName = itemCfg.substr(1);
					itemCfg = this._getPartCfg(partName);
				}
				
				if (itemCfg) {
					var part = this._createPart(itemCfg, options, cfgOnly);
					if (partName && part && typeof part != "string") this[partName] = part;
					return part;
				}
			}, this);
		} else {
			parts = this._createPart(partCfg, options, cfgOnly);
		}
		if (cfgOnly != true) (this[partName] = parts);
		return parts;
	},
	
	// alias for getPart
	getPart : function(partName, options, cfgOnly) {
		return this.getParts(partName, options, cfgOnly);
	},
	
	// create a single 'part' item, generally via Ext.create()
	// NOTE: if a 'part' object is not a vanilla object,
	//			we just apply options to it, which munges it,
	//			which means you can't share parts between different components  :-(
	_createPart : function(cfg, options, cfgOnly) {
		if (!cfg) return;

		// pass through strings, eg: for "->" in toolbars
		if (typeof cfg === "string") return cfg;

		// if a vanilla object, do a Ext.create()
		if (cfg.constructor === Object && cfgOnly != true) {
			// do it this way so we don't munge the original cfg object
			cfg = Ext.apply({owner:this}, options, cfg);
			part = Ext.create(cfg, this.defaultType);
		} 
		// otherwise set cfg.owner and apply options
		else {
			part = cfg;
			if (!part.owner) part.owner = this;
			if (options) Ext.apply(part, options);
		}

		if (part && part.partName && !this[part.partName]) this[part.partName] = part;
		return part;
	},
	
	
	// look up the prototype inheritance chain for  item.parts[subProperty]  
	//	and return the first one found
	//
	// if part.inhert == true, find superclass part and merge its properties
	_getPartCfg : function(partName) {
		var part, proto = this.constructor.prototype;
		if (this.parts && this.parts[partName] != null) {
			 part = this.parts[partName];
		} else {
			while (proto) {
				if (proto.parts && proto.parts[partName] != null) {
					part = proto.parts[partName];
				}
				proto = proto.constructor.superclass;
				if (part) break;
			}
		}

		// if part.inhert == true, find superclass part and merge its properties
		if (part && part.inherit === true) {
			var superPart;
			while (proto) {
				if (proto.parts && proto.parts[partName] != null) {
					superPart = proto.parts[partName];
				}
				proto = proto.constructor.superclass;
				if (superPart) break;
			}
			if (superPart) part = util.mergeDefaults(part, superPart);
		}
	
		return part;
	},

	
};	// end Parts


// apply the Parts mixin to Component
Ext.override(Ext.Component, mapr.Parts);


})();			// end hidden from global scope
