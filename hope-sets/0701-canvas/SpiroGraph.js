
dnb.Path.createSubclass("SpiroGraph", {

	maxIterations : 5000,	// SEEMS PRETTY BIG TO ME...
	stepCount : 100,		// do 100 iterations at a time
	restoreContext : false,	// leave the context alone after drawing, so the stroke, etc stay the same

	overlayGears : "after",	// "before" or "after", anything else ignores
	
	stroke : "blue",
	lineWidth: 0.1,
	
	bigRadius : null,
	smallRadius : null,
	smallOffset : null,	// offset in the small circle
	
	getRenderProps : function(canvas) {
		var p = this.inherit("getRenderProps", arguments);

		p.maxIterations = this.maxIterations;
		
		var canvasSize = Math.max(this.getWidth(canvas), this.getHeight(canvas));
		
		p.bigRadius = this.bigRadius || Math.round(canvasSize / 2 * (1+Math.random()));
		p.smallRadius = this.smallRadius || Math.round(p.bigRadius * Math.random());
		p.smallOffset = this.smallOffset || Math.floor(p.smallRadius * (Math.random() - .5))+1;

console.debug("bigRadius: ", p.bigRadius, " smallRadius:", p.smallRadius, " smallOffset:", p.smallOffset);
		
		// derived values used in the formula below
		p.radii = p.bigRadius + p.smallRadius;
		p.radiiRatio = p.radii / p.smallRadius;
		p.smallAndOffset = p.smallRadius + p.smallOffset;

		p.startX = p.bigRadius - p.smallOffset;
		p.startY = 0;
		
		return p;
	},
	
	beforeRender : function(canvas, newProps) {
		this.inherit("beforeRender", arguments);
		if (this.overlayGears == "before") this.drawGears(canvas, props);	
	},

	afterRender : function(canvas, newProps) {
		this.inherit("afterRender", arguments);
		if (this.overlayGears == "after") this.drawGears(canvas, this._lastRenderProps);
	},
		
	drawPath : function(canvas, props) {
		var	iteration = {
			x1 : props.startX,
			y1 : props.startY,
			x2 : null,
			y2 : null,
			i : 0
		}

		canvas.context.beginPath();
		canvas.context.moveTo(iteration.x1,iteration.y1);

		do {
			var angle = iteration.i * Math.PI/30;
			with (props) {
				iteration.x2 = radii * Math.cos(angle) - smallAndOffset * Math.cos(radiiRatio * angle);
				iteration.y2 = radii * Math.sin(angle) - smallAndOffset * Math.sin(radiiRatio *angle)
			}
			canvas.context.lineTo(iteration.x2, iteration.y2);

			iteration.x1 = iteration.x2;
			iteration.y1 = iteration.y2;

			iteration.i++;

			if (iteration.i == 1) continue;

			if (   iteration.i > props.maxIterations 
				|| iteration.x2 == props.startX && iteration.y2 == props.startY) {
				iteration.done = true;
				break;
			}

		} while (!iteration.done);
		return this;
	},
	
	drawGears : function(canvas, props) {
		canvas.context.save();
		
		var big = props.bigRadius,
			small = props.smallRadius,
			smallOffset = props.smallOffset
		;
		// draw the origin
		new Cross({left:-5, top:-5, width:10, height:10, lineWidth:1, stroke:"red"}).draw(canvas);

		// draw the big circle
		new Circle({left:-big, top:-big, width:(big*2), height:(big*2), stroke:"white", lineWidth:4}).draw(canvas).draw(canvas, {stroke:"pink", lineWidth:2});

		// draw the small circle
		var smallLeft = (smallOffset < 0 ? big : big - small);
		new Circle({left:smallLeft, top:-small, width:(small*2), height:(small*2), stroke:"white", lineWidth:4}).draw(canvas).draw(canvas, {stroke:"lightGreen", lineWidth:2});

		// draw the small offset
		new Cross({left:big-smallOffset-5, top:-5, width:10, height:10, stroke:"red", lineWidth:1}).draw(canvas);	
		
		canvas.context.restore();
	},
	
	animate : function(canvas, props, stepProps) {
		
	}
});
