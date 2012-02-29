if (Browser.isIos && window.openDatabase) {
	var __store = window.__store = {};
console.warn(Object.keys(__store));
   	var db = window.openDatabase("icat", "1", "iCatalog User Database", 1024*1024);
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS Settings(name TEXT, value TEXT)', []);
		tx.executeSql('SELECT name,value FROM Settings', [], 
			function(tx, result) {
				var rows = result.rows, last = rows.length, row, i = -1;
				while(++i < last) {
					row = rows.item(i);
					__store[row['name']] = row['value'];
				}
			});
	});
setTimeout(function(){console.warn(Object.keys(__store));},100);

	function _set(name, value) {
		__store[name] = value;
		db.transaction(function(tx) {
			tx.executeSql("UPDATE Settings SET name = ?,value = ?", [name, value]);
		});
		return value;
	}
	function _clear(name) {
		delete __store[name];
		db.transaction(function(tx) {
			tx.executeSql("DELETE from Settings where name = ?", [name]);
		});
	}
	
	hope.store = function(name, value) {
		if (arguments.length === 1) {
			if (!__store.hasOwnProperty(name)) return undefined;
			return __store[name];
		}
		if (value == null || value == "") 	_clear(name);
		else								_set(name, value);
		return value;	
}
