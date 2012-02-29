/*

	Simple (and fairly attractive) box packing algorithm.
	
	Given:
		- a fixed width and height (and unit size) 
		- a list of items
		- a 'getItemSize(item)' method  (returns width and height)
		- a 'getRandomNumber(upperBound)' method
	
	Outputs an array of items/positions, such that:
			left 	: left position in table
			top		: top position in table
			width	: width of item in table (eg: colspan)
			height	: height of item in table (eg: rowspan)
			item	: original item passed in
		- items are in same order as original item list
		- items that couldn't be placed are returned with left == -1

	Layout heuristic:
		- place item randomly at largest possible size, if no fit
		- place item linearly at largers possible size, if no fit
		- reduce size by one and try to place again
		- stop when we can't place something ???  property to skip?


*/

function BoxPacker(opts) {
	for (var prop in opts) {
		this[prop] = opts[prop];
	}
	this._makeGrid();
}
BoxPacker.prototype = {
	unitSize	: 1,			
	
	width		: 120,		// in units?
	height		: 120,
	
	unitWidth	: null,		// figured out in _makeGrid
	unitHeight	: null,		// figured out in _makeGrid
	
	// make the grid
	_makeGrid : function() {
		if (!this.gridWidth) this.gridWidth = Math.ceil(this.cloudWidth / this.unitSize);
		if (!this.gridHeight) this.gridHeight = Math.ceil(this.cloudHeight / this.unitSize);

		var grid = this.grid = [];
		for (var y = 0; y < this.gridHeight; y++) {
			var itemGrid = [];
			for (var x = 0; x < this.gridWidth; x++) {
				itemGrid[x] = this.emptyCellChar;
			}
			grid[y] = itemGrid;
		}
		return this.grid;
	},


	// place a list of items
	placeItems : function(list) {
		var startTime = new Date();
		var results = [];
		for (var i = 0; i < list.length; i++) {
			var it = this.placeItem(list[i]);
			if (it == null) break;
			results.push(it);
		}
		console.log((new Date() - startTime) + " msec to add " + i + " items";
		return results;
	},
	
	// place an individual item
	placeItem : function(it) {
		var size = this.getItemSize(it);
		
		for (var i = 0; i < sizes.length; i++) {
			var results;
			if (results = this.positionItemRandom(it, size)) return results;
			if (results = this.positionItemLinear(it, size)) return results;
		}
		return null;
	},


	// debug routine to print item numbers as they have been assigned to the grid
	toString : function() {
		var output = [];
		for (var x = 0; x < this.gridWidth; x++) {
			output[x] = [];
			for (var y = 0; y < this.gridHeight; y++) {
				output[x][y] = this.grid[y][x];
			}
		}

		for (var x = 0; x < this.gridWidth; x++) {
			output[x] = output[x].join("|");
		}
		return output.join("\n");
	}

}	// end BoxPacker.prototype