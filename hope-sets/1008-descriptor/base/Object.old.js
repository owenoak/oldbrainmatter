

//! "Smart" define of map of properties on an object.  Differences from O.defineProperties():
//		- if descriptor doesn't quack like an object constructor, just assigns the value
//		- if descriptor.export is set, sets constructor.exports to 
//		- if descriptor has both .value and .setter, 
//			- creates it._ (as protoclone of it.constructor.prototype._ )
//			- assigns value to it._[prop]
//			- deletes desc.value
O.define = function define(it, map) {
	for (var prop in map) {
		var desc = map[prop], 
			hasValue = desc.hasOwnProperty("value") 
			hasGetter = desc.hasOwnProperty("set"),
			value = desc.value
		;
		if (desc.constructor !== Object || !(hasValue || hasSetter)) {
			it[prop] = desc;
		} else {
			// if has value and setter, remove the value and squirrel it away
			if (hasValue && hasSetter) {
				delete desc.value;
				if (!it._) it._ = O.protoClone(it.constructor.prototype._);
				it._[prop] = value;
			}
			O.defineProperty(it, prop, desc);

			// put value back so descriptor remains unchanged
			if (hasValue && hasSetter) desc.value = value;
		}
	}
	return it;
}
