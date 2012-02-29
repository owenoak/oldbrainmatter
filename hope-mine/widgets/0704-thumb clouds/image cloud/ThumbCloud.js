function ThumbCloud(id, dataSets) {
	this.dataSets = dataSets;
	if (id) this.id = id;
	this.display = document.getElementById(id);
	this.display.style.width = this.cloudWidth + 2;
	this.display.style.height = this.cloudHeight + 2;
	
	this.makeGrid();	
}
ThumbCloud.prototype = {
	unitSize: 40,

	shapeMaps : {
		"s" : [[3,3],[2,2],[1,1]],
		"h" : [[3,2],[3,1],[2,1]],
		"v" : [[2,3],[1,3],[1,2]]
	},

	chanceOfASquare : .75,
	chanceOfAHoriz : .90,
	
	randomTryCount : 30,
	
	cloudWidth : 400,
	cloudHeight : 400,

	emptyCellChar : "-",

	style: "border:1px solid black;",
	

	placeItems : function(items) {
		for (var i = 0; i < items.length; i++) {
			var thumb = this.placeItem(items[i]);
			if (thumb == null && items[i].shape == "s") return;	// we're full
		}
	},

	
	renderThumb : function(item, thumb) {
		var box = document.createElement("div");
		box.id = "box"+item.id;
		box.className = "box";
		box.style.width = ((thumb.width * cloud.unitSize) - 4) + "px";
		box.style.height = ((thumb.height * cloud.unitSize) - 4) + "px";
		box.style.left = ((thumb.left * cloud.unitSize) + 2) + "px";
		box.style.top = ((thumb.top * cloud.unitSize) + 2) + "px";
		box.innerHTML = item.id;
		
		this.display.appendChild(box);
	},
	
	getShape : function(item) {
		if (!item.shape) {
			var rand = Math.random();
			item.shape = (rand < this.chanceOfASquare ? "s" :  rand < this.chanceOfAHoriz ? "h" : "v")
		}
		return item.shape;
	},
	
	placeItem : function(item, shape) {
		var thumb;
		var shape = this.getShape(item);
		var sizes = this.shapeMaps[shape];
		
		for (var i = 0; i < sizes.length; i++) {
			var width = sizes[i][0],
				height = sizes[i][1]
			;
			if (thumb = this.positionItemRandom(item, width, height)) break;
			if (thumb = this.positionItemLinear(item, width, height)) break;
		}
		
		if (thumb) {
			thumb.id = item.id;
			thumb.width = width;
			thumb.height = height;
			thumb.right = thumb.left + width;
			thumb.bottom = thumb.top + height;
			thumb.shape = shape;
			this.addItemToGrid(item, thumb);
			this.renderThumb(item, thumb);
			item.thumb = thumb;		// NOTE: assumes only one thumb per item???
			return thumb;
		}
		return null;
	},
	
	positionItemRandom : function(item, width, height) {
		var lastX = (this.gridWidth - width) + 1,
			lastY = (this.gridHeight - height) + 1
		;

		// try N times to place it randomly
		for (var i = 0; i < this.randomTryCount; i++) {
			var left = Math.floor(Math.random()*lastX),
				top = Math.floor(Math.random()*lastY)
			;
			if (this.itemFits(left, top, width, height)) {
				return {left:left, top:top};
			}
		}
		return null;
	},
	
	positionItemLinear : function(item, width, height) {
		var lastX = (this.gridWidth - width) + 1,
			lastY = (this.gridHeight - height) + 1
		;
		for (var top = 0; top < lastY; top++) {
			for (var left = 0; left < lastX; left++) {	
				if (this.itemFits(left, top, width, height)) {
					return {left:left, top:top};
				}
			}
		}
		return null;
	},
	
	itemFits : function(left, top, width, height) {
		var right = left + width,
			bottom = top + height
		;
		for (var x = left; x < right; x++) {
			for (var y = top; y < bottom; y++) {
				if (this.grid[x][y] != this.emptyCellChar) return false;
			}
		}
		return true;
	},
	
	addItemToGrid : function(item, thumb) {
		var right = thumb.left + thumb.width,
			bottom = thumb.top + thumb.height
		;
		for (var x = thumb.left; x < right; x++) {
			for (var y = thumb.top; y < bottom; y++) {
				this.grid[x][y] = item.id;
			}
		}
	},
	
	makeGrid : function() {
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
}