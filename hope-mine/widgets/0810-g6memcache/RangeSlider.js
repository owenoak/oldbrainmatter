// TODO:  
//	- normal/heavy/light tick marks
//	- doesn't handle page scroll properly


var RangeSlider = Class.create(Slider, {
	klass 			: "RangeSlider",
	
// THE FOLLOWING ARE FROM SLIDER AND HAVE THE SAME SEMANTICS
//	digits			: 0,		// number of decimal digits for value after change
//	minValue		: 0,		// minimum possible value at this time (must be >= trackMin)
//	maxValue		: 100,		// maximum possible value at this time (must be <= trackMax)
//	trackMin		: 0,		// minimum value shown on the track
//	trackMax		: 100,		// maximum value shown on the track
//	trackWidth		: 200,		// width of the track (from trackMin to trackMax, not including gutters)
//	gutterWidth		: 10,		// width of the gutter on each side of the track
//	ticks			: undefined,	// string of "value:label;value:label" for tick marks
// 	eventHandlers	: "onMouseDown",
	

// We store our value as "rangeStart:rangeEnd" and bind to those vars in setElementValue() etc
//	value			: 50,		// current value

// NEW STUFF

	rangeStart		: undefined,	// start of the selected range
	rangeEnd		: undefined,	// end of the selected range
	
	minRange		: undefined,	// minimum width of the range 

	// if true, we show a special indicator at the end of the track
	//	it ALWAYS appears at the end
	showEndIndicator	: false,
	endIndicatorTitle	: undefined,
	
	// constants for the css class name selectors of our sub-pieces
	// 	(so we can override the naming in subclasses)
	cssSelectors : {
		track 				: ".RangeTrack",
		innerTrack			: ".RangeInnerTrack",
		thumb				: ".RangeThumb",
		tick				: ".RangeTick",
		tickLabel			: ".RangeTickLabel",
		tickLabels			: ".RangeTickLabels",
			
		startThumb			: ".RangeStartThumb",
		endThumb			: ".RangeEndThumb",
		startLabel			: ".RangeStartLabel",
		endLabel			: ".RangeEndLabel",
		
		endIndicatorTick	: ".EndRangeTick",
		endIndicatorLabel	: ".EndRangeTickLabel"
	},
	
	onAfterDraw : function($super) {
		// get the range thumb start/end labels
		this.$startLabel = this.$main.select(this.cssSelectors.startLabel)[0];
		this.$endLabel = this.$main.select(this.cssSelectors.endLabel)[0];
		
		// bind our global event handlers once
		this.onThumbMove = this.onThumbMove.bindAsEventListener(this);
		this.onThumbUp = this.onThumbUp.bindAsEventListener(this);
		
		this.$endIndicatorTick = this.$main.select(this.cssSelectors.endIndicatorTick)[0];
		this.$endIndicatorLabel = this.$main.select(this.cssSelectors.endIndicatorLabel)[0]

		$super();
	},
	
	
	onResize : function($super) {
		if (!this._drawn || !this.visible) return;// console.warn("onResize: not visible");
		$super();

		if (this.showEndIndicator) {
			var left = this.getPositionForValue(this.trackMax);
			if (!isNaN(left)) {
				this.$endIndicatorTick.style.display = "block";
				this.$endIndicatorTick.style.left = left + "px";
				
				this.$endIndicatorLabel.style.display = "block";
				this.$endIndicatorLabel.style.left = left + "px";
			}
		}
	},
	
	
	// 
	//	value calculations
	//
	
	// TODO: will error if malformed value!
	setValue : function(value, updateElement) {
		// normalize the value
		if (value == null || value == "") value = this.minValue + ":" + this.minValue;

		// if they passed a number, assume that's the new rangeStart
		if (typeof value == "number") {
			value = value + ":" + (value + (this.rangeEnd - this.rangeStart));
		}
		if (typeof value != "string") return console.error("RangeSlider.setValue: value not understood: "+value);

		// split as "start:end"
		value = value.split(":");
		this.rangeStart = parseFloat(value[0]);
		this.rangeEnd = parseFloat(value[1]) || this.rangeStart;

		// Todo: check for NaN

		//	make sure that start is before end (will swap the two if this is not so)
		if (this.rangeStart > this.rangeEnd) {
			var temp = this.rangeEnd;
			this.rangeEnd = this.rangeStart;
			this.rangeStart = temp;
		}
		// make sure the range isn't too small
		if (this.minRange != undefined) {
		  if ((this.rangeEnd - this.rangeStart) < this.minRange) {
		    console.log("RangeSlider "+this.id+" selected range too small ("
		    		 +(this.rangeEnd - this.rangeStart)+"), coercing to "
		    		 +this.minRange+" ms");
		    if ((this.rangeEnd - this.minRange) > this.minValue) {
		      this.rangeStart = this.rangeEnd - this.minRange;
		    } else {
		      this.rangeEnd = this.rangeStart + this.minRange;
		    }
		  }
		}

		//	make sure that we're within the specified range
		this.rangeStart = this.rangeStart.max(this.minValue).min(this.maxValue).limitDigits(this.digits);
		this.rangeEnd = this.rangeEnd.max(this.minValue).min(this.maxValue).limitDigits(this.digits);

		this.value = this.rangeStart + ":" + this.rangeEnd;

		this.setElementValue();
		return this.value;
	},

  setElementValue : function() {
      if (!this._drawn) return;
        //  if (this.rangeStart == undefined || this.rangeEnd == undefined) return;  "fix" for IE may break FF
      var left = this.getPositionForValue(this.rangeStart),
	width = this.getPositionForValue(this.rangeEnd) - left
	;
      if (isNaN(left)) return;// console.warn("setElementValue(): position is not a number");
      this.$thumb.style.left = left + "px"
	this.$thumb.style.width = width + "px";
      
      // update the start and end labels
      this.$startLabel.innerHTML = this.toDisplayValue(this.rangeStart);
      this.$endLabel.innerHTML = this.toDisplayValue(this.rangeEnd);
    },
      
    getElementValue : function(element) {
      return this.value;
    },

	// linear scaling
	getPositionForValue : function($super, value) {
		if (typeof value == "string") value = parseFloat(value);
		return $super(value);
	},
	
	// linear scaling
	getValueForPosition : function($super, position) {
		return $super(position);
	},
	
	
	//
	//	event handling
	//
	
	onMouseDown : function($super, event) {
		var eventValue = this.getEventValue(event);
		
		// figure out the offset based on where the mouse was clicked
		//
		// if it was in the track before the start, no offset is needed
		if (eventValue < this.rangeStart) {
			this._mouseOffset = 0;
		// else if it was after the end, offset by the full width (so we're effectively moving the end)
		} else if (eventValue > this.rangeEnd) {
			this._mouseOffset = this.rangeEnd - this.rangeStart;
		// else it is in the thumb,
		//	so set the offset to the delta between eventValue & startRange
		//	so the thumb stays in the same relative position to where they clicked (and doesn't jump)
		} else {
			this._mouseOffset = eventValue - this.rangeStart;
		}
		
		$super(event);
		// TODO: moz only?
		// in mozilla, use the special 'grabbing' cursor
		if (Prototype.Browser.Gecko) {
			this.$thumb.style.cursor = "-moz-grabbing";
			this.$track.style.cursor = "-moz-grabbing";
		}
	},
	
	onTrackUp : function($super, event) {
		$super(event);
		this.$thumb.style.cursor = "";
		this.$track.style.cursor = "";
	},
	
	onThumbPieceDown : function (event, piece) {
		if (!this.enabled) return;
		this._thumbPiece = piece;
		document.observe("mousemove", this.onThumbMove);
		document.observe("mouseup", this.onThumbUp);
		this.onThumbMove(event);

		this.$thumb.style.cursor = "-moz-grabbing";

		// stop the track event from firing
		event.stop();
		return false;
	},
	
	onThumbMove : function(event) {
		if (this._thumbPiece == "start") {
			this.moveStartThumbToEvent(event);
		} else {
			this.moveEndThumbToEvent(event);
		}
		event.stop();
		return false;
	},
	
	onThumbUp : function(event) {
		document.stopObserving("mousemove", this.onThumbMove);
		document.stopObserving("mouseup", this.onThumbUp);

		// reset the cursor
		this.$thumb.style.cursor = "";
		this.$track.style.cursor = "";

		if (this.changeOn == "up") this.onChange(this.value, this.$element);
		return false;
	},
	
	
	// actually move the thumb
	// move the start to the new position while keeping the end the same distance away
	// NOTE: don't shrink the range if we're at the maxValue
	moveThumbToEvent : function(event) {
		var newStart = (this.getEventValue(event) - this._mouseOffset).max(this.minValue),
			currentDelta = this.rangeEnd - this.rangeStart,
			newEnd = newStart + currentDelta,
			deltaToEnd = this.maxValue - newStart
		;

		// make sure we don't shrink the range at the right end of the slider
		if (currentDelta > deltaToEnd) newStart = this.maxValue - currentDelta;
		this.setValue(newStart + ":" + newEnd);
		if (this.changeOn == "move") this.onChange();
	},

	
	// move the start thumb but leave the end thumb in place
	moveStartThumbToEvent : function(event) {
		var newStart = this.getEventValue(event);
		this.setValue(newStart + ":" + this.rangeEnd);
		if (this.changeOn == "move") this.onChange();
	},
	
	moveEndThumbToEvent : function(event) {
		var newEnd = this.getEventValue(event);
		this.setValue(this.rangeStart + ":" + newEnd);
		if (this.changeOn == "move") this.onChange();
	},
	
	// move to the end of the range
	moveToEnd : function() {
		var delta = this.rangeEnd - this.rangeStart;
		this.setValue(this.trackMax - delta + ":" + this.trackMax);
		this.onChange();
	},
	
	


	//
	//	templates
	//

	
	OuterTemplate : new Template(
		"<div class='RangeSlider' #{_attributes} #{_eventHandlers} onselectstart='return false'>\
			<div class='RangeTicks'>\
				#{_ticksHTML}\
				<span class='EndRangeTick' style='display:none'></span>\
			</div>\
			<div class='RangeTickLabels'>\
				#{_tickLabelsHTML}\
				<span class='EndRangeTickLabel' style='display:none' \
					onmousedown='return #{globalRef}.moveToEnd()'\
				>#{endIndicatorTitle}</span>\
			</div>\
			<div class='RangeTrack'>\
				<div class='RangeInnerTrack'></div>\
				<div class='RangeThumb'>\
					<span class='RangeInnerThumb'></span>\
					<span class='RangeStartThumb'\
						onmousedown='return #{globalRef}.onThumbPieceDown(Event.extend(event||window.event),\"start\")'\
					></span>\
					<span class='RangeEndThumb'\
						onmousedown='return #{globalRef}.onThumbPieceDown(Event.extend(event||window.event),\"end\")'\
					></span>\
					<span class='RangeStartLabel'></span>\
					<span class='RangeEndLabel'</span>\
				</div>\
			</div>\
		</div>"
	),

	TickTemplate : new Template(
		"<span class='RangeTick #{_tick.className}' ticknum='#{_tick.num}'></span>"
	),
	

	TickLabelTemplate : new Template(
		"<span class='RangeTickLabel' style='display:none' ticknum='#{_tick.num}' \
			onmousedown='return #{globalRef}.onTickDown(Event.extend(event||window.event), #{_tick.num})'\
		>#{_tick.title}</span>"
	)

});




// RangeSlider which thinks in terms of milliseconds
//	and displays values in a special format
//
// TODO: have 'pinToNow' flag and auto-update?
var TimeRangeSlider = Class.create(RangeSlider, {
	klass 				: "TimeRangeSlider",

	showEndIndicator 	: true,
	endIndicatorTitle	: "Now",

	// if true, we advance the end so that it is always 'now'
	pinEndToNow 		: true,
	nowTitle		 	: "<B>Now</b>",

	prepareToDraw : function($super) {
		$super();
	},

	startUpdateTimer : function() {
		if (!this.pinEndToNow) return;
		
		if (this.updateTimer) return;

		// update every minute (it's really kinda silly since it's hardly going to move at all)
		this.updateTimer = setInterval(this.updateToNow.bind(this), 10000);		
	},

	stopUpdateTimer : function() {
		if (!this.pinEndToNow) return;
		if (!this.updateTimer) return;
		
		clearInterval(this.updateTimer);
		delete this.updateTimer;
	},
	
	enable : function() {
		this.startUpdateTimer();
	},
	
	disable : function() {
		this.stopUpdateTimer();
	},
	
	updateToNow : function() {
		var wasEndingNow = (Math.abs(this.rangeEnd - this.trackMax) < 1000);

		// set the new end to the current time
                var newEnd = new Date().getTime();

		// ENABLE THE BELOW TO JUMP BY DAYS FOR TESTING
		//var newEnd = this.trackMax + Date.MSEC_IN_ONE_DAY;

		// actually adjust the track size
		this.setTrackMax(newEnd, newEnd);

		// update to end if we were at the end before
		if (wasEndingNow)  {
		  this.moveToEnd();
		}
	},

	toDisplayValue : function(value) {
        if (this.pinEndToNow && Math.abs(value-this.trackMax) < 30000) {
		    return this.nowTitle;
	    }
		return new Date(value).toRangeString();	
	}
});


// add a special method to Dates to format the range
//	ACCORDING TO THE Date.prototype.timeZoneOffset
//	eg:  	3/8 12:33 PST
//
//	pass <true> for "multiline" to split date/time into multiple lines
//	pass a number for "offset" to specifiy a different timezone offset
Date.prototype.timeZoneOffset = 0;
Date.prototype.toRangeString = function(multiLine, offset) {
	if (offset == null) offset = this.timeZoneOffset || 0;
	var date = new Date(this.getTime() + offset);
	var day = (date.getMonth() + 1) + "/" + date.getDate(),
		time = date.getHours().pad(2) + ":" 
				+ date.getMinutes().pad(2) 
				+ (this.timeZoneString ? " " + this.timeZoneString : "")
	;
	if (multiLine) 	return day + "<br>" + time;
	else			return day + " <b>" + time + "</b>";
}




// TimeRangeSlider which has different segments of the bar
//	at different time resolutions
var NOW = new Date().getTime();
var SegmentedTimeRangeSlider = Class.create(TimeRangeSlider, {
	klass 			: "SegmentedTimeRangeSlider",

	segments : undefined,
// eg:
//	segments : [
//		{	start : NOW - (28 * Date.MSEC_IN_ONE_DAY), width:.25 },
//		{	start : NOW - (7 * Date.MSEC_IN_ONE_DAY), width:.25 },
//		{	start : NOW - Date.MSEC_IN_ONE_DAY, width:.5 }
//	],
	
	adjustScale : function() {
		// normalize the segments
		var startPercent = 0;
		this.segments.forEach(function(segment, index) {
			segment.startPercent = startPercent;
			startPercent += segment.width;

			var nextSegment = this.segments[index+1];
			if (nextSegment) {
				segment.end = nextSegment.start;
			} else {
				segment.end = this.trackMax;
			}
			segment.delta = segment.end - segment.start;
		}, this);

		this.segments.forEach(function(segment) {
			segment.pixelFraction = (this._trackWidth * segment.width) / segment.delta;
			segment.left = (this._trackWidth * segment.startPercent);
			segment.right = segment.left + (this._trackWidth * segment.width);
		}, this);
	},
	
	getPositionForValue : function(value) {
		if (value < this.trackMin) return this.gutterWidth;
		
		// figure out which segment we're in
		for (var segment, i = 0; i < this.segments.length; i++) {
			segment = this.segments[i];
			if (value <= segment.end) break;
		}

		var segmentOffset = value - segment.start;
		
		// start the left out according to the segment.left
		var left = this.gutterWidth + segment.left +
					segment.pixelFraction * segmentOffset;
        //        if (isNaN(left)) return this.gutterWidth;  "FIX" for IE, may break FF
		return left;
	},
	getValueForPosition : function(position) {
		// figure out which segment we're in
		for (var segment, i = 0; i < this.segments.length; i++) {
			segment = this.segments[i];
			if (position <= segment.right) break;		// TODO: some sort of limit digits?
		}

		var segmentOffset = position - segment.left;
		return (segmentOffset / segment.pixelFraction) + segment.start;
	}	

});
