// ASSUMPTIONS:
//		- trackMin/Max/tickCount/tickLabels will NOT change after draw
//		- value/minValue/Max CAN change after draw: pass new props to redraw()
//		- 

var Slider = Class.create(Control, {
	klass 			: "Slider",
	
	digits			: 0,					// number of decimal digits for value after change
	
	value			: 50,					// current value

	minValue		: undefined,			// minimum possible value at this time (must be >= trackMin)
											//	undefined == use trackMin
	maxValue		: undefined,			// maximum possible value at this time (must be <= trackMax)
											//	undefined == use trackMin

	trackMin		: 0,					// minimum value shown on the track
	trackMax		: 100,					// maximum value shown on the track
	
	trackWidth		: 200,					// width of the track (from trackMin to trackMax, not including gutters)
											//   specify "x%" to resize to parent
	_trackWidth		: 200,					// internal measure of the current track width
											// 	in case trackWidth is a percentage
	
	gutterWidth		: 10,					// width of the gutter on each side of the track
	
	ticks			: undefined,			// string of "value:label;value:label" for tick marks
	
	eventHandlers	: "onMouseDown",
	
	changeOn		: "move",				// "move" == send an onChange() event every move of the slider
											// "up"   == send a single event when the mouse goes up
	
	
	// constants for the css class name selectors of our sub-pieces
	// 	(so we can override the naming in subclasses)
	cssSelectors : {
		track 		: ".SliderTrack",
		innerTrack	: ".SliderInnerTrack",
		thumb		: ".SliderThumb",
		tick		: ".SliderTick",
		tickLabel	: ".SliderTickLabel",
		tickLabels	: ".SliderTickLabels"
	},
	
	prepareToDraw : function($super) {
		$super();

		// if minValue or maxValue is "*", set to trackMin or trackMax
		if (this.minValue == undefined) this.minValue = this.trackMin;
		if (this.maxValue == undefined) this.maxValue = this.trackMax;

		if (this.ticks) {
			this.normalizeTicks();
	
			this._ticksHTML = "";
			this._tickLabelsHTML = "";
			this.ticks.forEach(function(tick, index) {
				this._tick = tick;
				this._ticksHTML += this.TickTemplate.evaluate(this);
				
				// draw the tick label if provided
				if (tick.title) {
					this._tickTitle = tick.title;
					this._tickLabelsHTML += this.TickLabelTemplate.evaluate(this);
				}
			}, this);
		}
	},
	
	normalizeTicks : function() {
		if (!this.ticks) return;
		var ticks = (typeof this.ticks == "string" ? this.ticks.split(";") : this.ticks);
		ticks.forEach(function(tick, index) {
			if (typeof tick == "string") tick = tick.split(":");
			var value = parseInt(tick[0]);
			ticks[index] = {
				num : index,
				value : value,
				title : tick[1],
				className : tick[2] || ""
			}
		}, this);
		this.ticks = ticks;
	},
	
	// make sure the elements are set to the proper time each time we show()
	//	in case we were initially hidden
	show : function($super) {
		$super();
		this.onResize();
	},
	
	onAfterDraw : function() {
		this.$element = this.$main;
		
		// bind our global event handlers once
		this.onTrackMove = this.onTrackMove.bindAsEventListener(this);
		this.onTrackUp = this.onTrackUp.bindAsEventListener(this);

		// get our dynamic sub-parts
		this.$track = this.$main.select(this.cssSelectors.track)[0];
		this.$innerTrack = this.$main.select(this.cssSelectors.innerTrack)[0];
		this.$thumb = this.$main.select(this.cssSelectors.thumb)[0];
	},
	
	setTrackMax : function(trackMax, maxValue) {
		if (trackMax) this.trackMax = trackMax;
		if (maxValue) this.maxValue = maxValue;
		this.onResize();
		this.setElementValue();
	},
	
	adjustScale : function() {
		// fraction each pixel is of the whole range
		this.pixelFraction = this._trackWidth / (this.trackMax - this.trackMin);	
	},
	
	onResize : function() {
		if (!this._drawn || !this.visible) return;
		// defer the sizing if we don't know the width of the thumb yet (eg: in Safari)
		var thumbWidth = this.$thumb.getWidth();
		if (thumbWidth == 0) {
			return this.onResize.bind(this).defer(0);
		}
		this.thumbWidth = thumbWidth;

		// if we're set to a percentage width (in JS, not CSS)
		//	update the size of the track
		var width = this.trackWidth;
		if (typeof width == "number") {
			this._trackWidth = this.trackWidth - (this.gutterWidth * 2);		
		} else if (width && typeof width == "string" && width.indexOf("%") > -1) {
			width = parseInt(width);
			var parent = $(this.$main.parentNode);

			width = parent.getDimensions().width - 
					(parseInt(parent.getStyle("padding-left")) +
					 parseInt(parent.getStyle("padding-right"))
					);
			// TODO: account for padding of parent
			this._trackWidth = width - (this.gutterWidth * 2);
		} else {
			//console.warn(this,"track width of ",width," not understood");
		}
		this.adjustScale();

		// make the track the correct width
		this.$track.style.width = (this._trackWidth + (this.gutterWidth * 2)) + "px";

		this.setElementValue();
		
		// move the tick marks into the proper spots
		var maxLabelHeight = 0;
		if (this.ticks) {
			var $ticks = this.$main.select(this.cssSelectors.tick);
			this.ticks.forEach(function(tick, index) {
				tick.left = this.getPositionForValue(tick.value);
				if (tick.value < this.trackMin || tick.value > this.trackMax) {
					$ticks[index].style.display = "none";
				} else {
					$ticks[index].style.left = tick.left + "px";
					$ticks[index].style.display = "";
				}
			}, this);
			
			// center the tick labels
			var labels = this.$main.select(this.cssSelectors.tickLabel);
			labels.forEach(function(label) {
				// show the label so getWidth() and getHeight actually work
				label.style.display = "block";

				maxLabelHeight = maxLabelHeight.max(label.getHeight());
				var width = label.getWidth(),
					tickNum = parseInt(label.getAttribute("ticknum")),
					tick = this.ticks[tickNum],
					left = tick.left
				;
				if (tick.value < this.trackMin || tick.value > this.trackMax) {
					label.style.display = "none";
				} else {
					label.style.left = (left + 2 - (width/2)) + "px";
				}
				
			}, this);
		}

		// make the labelContainer and $main the proper height
		//	(necessary because their children are position:absolute)
		var labelContainer = this.$main.select(this.cssSelectors.tickLabels)[0];
		if (labelContainer) {
			labelContainer.style.height = maxLabelHeight + "px";
			this.$main.style.height = (parseInt(labelContainer.getStyle("top")) + maxLabelHeight) + "px";
		}

		// call setBounds to adjust min/max indicators in the slider track
		this.setBounds();	
	},
	

	// set the max/min of the available part of the slider to the maxValue/minValue
	setBounds : function(min, max) {
		if (min != null) this.minValue = min;
		if (max != null) this.maxValue = max;
		if (!this._drawn) return;
		var minX = this.getPositionForValue(this.minValue),
			maxX = this.getPositionForValue(this.maxValue)
		;
		if (isNaN(minX) || isNaN(maxX)) return;// console.warn("setBounds: position not a number");
		this.$innerTrack.style.left = minX + "px";
		this.$innerTrack.style.width = (maxX - minX) + "px";
	},

	
	setMinValue : function(min) {
		this.setBounds(min);
	},

	setMaxValue : function(max) {
		this.setBounds(null, max);
	},
	
	// 
	//	value calculations
	//
		
	
	setValue : function(value, updateElement) {
		if (!value) value = 0;
		this.value = value.max(this.minValue).min(this.maxValue).limitDigits(this.digits);
		this.setElementValue();
		return value;
	},

	setElementValue : function() {
		if (!this._drawn || !this.visible || isNaN(this.value)) return;
		// if thumbWidth is not set, we've never been sized
		//	defer to onResize(), which will call setElementValue() after determining sizes
		if (this.thumbWidth == null) return this.onResize();
		
		var valueX = this.getPositionForValue(this.value),
			left = (valueX - (this.thumbWidth / 2)) + "px"
		;

//console.warn(this.id, ":",this.$thumb,":", valueX,":", this.thumbWidth,":", left);
		
		this.$thumb.style.left = left;
	},

	getElementValue : function(element) {
		return this.value;
	},

	// linear scaling
	getPositionForValue : function(value) {
		var trackStartOffset = this.trackMin * this.pixelFraction,
			position = this.gutterWidth + 
				(value * this.pixelFraction)
				- trackStartOffset
		;
		return position;
	},
	
	// linear scaling
	getValueForPosition : function(position) {
		return (position / this.pixelFraction) + this.trackMin;
	},
	
	
	//
	//	event handling
	//
	
	onMouseDown : function (event) {
		if (!this.enabled) return;
		document.observe("mousemove", this.onTrackMove);
		document.observe("mouseup", this.onTrackUp);
		this.moveThumbToEvent(event);
		return false;
	},
	
	onTrackMove : function(event) {
		this.moveThumbToEvent(event);
		return false;
	},
	
	onTrackUp : function(event) {
		document.stopObserving("mousemove", this.onTrackMove);
		document.stopObserving("mouseup", this.onTrackUp);
		if (this.changeOn == "up") this.onChange(this.value, this.$element);
		return false;
	},
	

	onTickDown : function(event, tickNum) {
		if (!this.enabled) return;
		var value = this.ticks[tickNum].value;
		value = this.setValue(value);
// THIS SEEMS WRONG according to the signature of control.onChange
		// tick click always signals a change
		this.onChange(value, this.$element);
		event.stop();
		return false;
	},

	getEventValue : function(event) {
		var left = this.$track.viewportOffset().left + this.gutterWidth,
			x = (event.pointerX() - left).max(0).min(this._trackWidth)
		;
		return this.getValueForPosition(x)
	},

	moveThumbToEvent : function(event) {
		var value = this.getEventValue(event);
		value = this.setValue(value);
// THIS SEEMS WRONG according to the signature of control.onChange
		// only signal a change here if we're signaling for each move
		if (this.changeOn == "move") this.onChange(value, this.$element);
	},

	//
	//	templates
	//

	
	OuterTemplate : new Template(
		"<div class='Slider' #{_attributes} #{_eventHandlers} onselectstart='return false'>\
			<div class='SliderTicks'>\
				#{_ticksHTML}\
			</div>\
			<div class='SliderTrack'>\
				<div class='SliderInnerTrack'></div>\
				<span class='SliderThumb'></span>\
			</div>\
			<div class='SliderTickLabels'>\
				#{_tickLabelsHTML}\
			</div>\
		</div>"
	),

	TickTemplate : new Template(
		"<span class='SliderTick #{_tick.className}' ticknum='#{_tick.num}'>|</span>"
	),
	

	TickLabelTemplate : new Template(
		"<span class='SliderTickLabel' style='display:none' ticknum='#{_tick.num}' \
			onmousedown='return #{globalRef}.onTickDown(Event.extend(event||window.event), #{_tick.num})'\
		>#{_tick.title}</span>"
	)

});


/* slider whose bar scales by log2 (as opposed to linear) */
var Log2Slider = Class.create(Slider, {
	klass : "Log2Slider",

	adjustScale : function() {
		this.scaledTrackMin = this.trackMin.log2();
		this.scaledTrackMax = this.trackMax.log2();	
	},

	getPositionForValue : function(value) {
		if (value == 0) return this.gutterWidth;
		var position = this.gutterWidth +
			(this._trackWidth * (value.log2() - this.scaledTrackMin) 
				/ (this.scaledTrackMax - this.scaledTrackMin));

//		console.warn(this, "\nv", value, "=",position,"\ngw", this.gutterWidth, "_tw", this._trackWidth,
//					"sTM", this.scaledTrackMin, "sTM", this.scaledTrackMax);
				
		return position;

	},
	getValueForPosition : function(position) {
		var value = ((position/this._trackWidth) 
						* (this.scaledTrackMax - this.scaledTrackMin) + this.scaledTrackMin);
		return Math.pow(2, value);
	}
});


/* slider whose bar scales by log10 (as opposed to linear) */
var Log10Slider = Class.create(Log2Slider, {
	klass : "Log10Slider",
	
	adjustScale : function() {
		this.scaledTrackMin = (this.trackMin == 0 ? 0 : this.trackMin.log10());
		this.scaledTrackMax = this.trackMax.log10();	
	},

	getPositionForValue : function(value) {
		if (value <= this.minValue) return this.gutterWidth;
		return this.gutterWidth +
			(this._trackWidth * (value.log10() - this.scaledTrackMin) 
				/ (this.scaledTrackMax - this.scaledTrackMin));

	},
	getValueForPosition : function(position) {
		if (position == 0) return this.minValue;
		var value = ((position/this._trackWidth) 
						* (this.scaledTrackMax - this.scaledTrackMin) + this.scaledTrackMin);
		return Math.pow(10, value);
	}
});
