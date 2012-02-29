
//
//	Slider -- this is hard-coded to only work for the RangeSlider on the traffic page
//
//
jQuery.extend({
	slider : {
		
		// css selector to get the outer piece of the slider
		mainSelector : "#trafficSlider",

		// default track range is the last 24 hours
		trackMin : undefined,			// smallest # on the track
		trackMax : undefined,			// largest # on the track
		
		minDuration : 1000 * 30 * 60,	// min display width is 5 minutes
		
		// the 'gutter' is the grey part of the bar -- used as an offset in calculating positions
		gutterWidth : 10,
		
		// default range comes from the 'info' view
		start 	 : undefined,							// current start position
		end		 : undefined,							// current end position

		// if true, the slider range should always update to include 'now'
		pinToNow : true,
		
		initialize : function() {},
		
		// initialize the slider (called the first time we are show()n)
		update : function(start, end) {
			this.setTime();
			this.setRange(start, end);
		},
		
		//  onChange() is fired when the mouse goes up (after sliding completes).
		//	this way we only update the chart once rather than many times while they are dragging
		onChange : function() {
			// we're considered 'now' within 30 sec of the track end
			if (this.end >= this.trackMax - 30000) {
				var delta = this.start - this.end;
				SP.selectChartRange(delta, "now");
			} else {
				SP.selectChartRange(this.start, this.end);
			}
		},
		

		// EITHER:
		//		end is "now" and newStart is a negative number (for # of seconds back)
		//		or end and start are numbers/strings that represent timestamps
		setRange : function(newStart, newEnd, skipUpdate) {
			if (newStart != null && newEnd != null) {
				if (newEnd == "now") {
					var delta = parseInt(newStart);
					newStart = isNaN(delta) ? this.start : this.trackMax + delta;
					newEnd = this.trackMax;
				} else {
					if (newStart instanceof String) newStart = parseInt(newStart);
					else if (newStart instanceof Date) newStart = newStart.getTime();
		
					if (newEnd instanceof String) newEnd = parseInt(newEnd);
					else if (newEnd instanceof Date) newEnd = newEnd.getTime();
				}
				
				this.start = newStart;
				this.end = newEnd;
			}
			
			var delta = this.end - this.start;

			this.start = Math.min(this.start, this.trackMax - this.minDuration);
			this.start = Math.max(this.start, this.minDuration);
			
			this.end = Math.min(this.end, this.trackMax);
			this.end = Math.max(this.end, this.trackMin + this.minDuration);

			if (skipUpdate != true) this.updateThumb();
		},
		
		// show the slider, setting things up as necessary
		show : function() {
			this.initialize();
			this.setTime();
			$("#trafficSliderContainer").show();
		},
		
		hide : function() {
			$("#trafficSliderContainer").hide();
		},
		
		// Sdjust the slider to reflect the some time.
		//	If time is not passed, assumed to be "now".
		// NOTE: this does not move the thumb to the proper place!
		setTime : function(startTime) {
			// if they didn't specify a time, adjust to the current time
			if (!startTime) startTime = new Date().getTime();
			else if (startTime instanceof Date) startTime = startTime.getTime();
			
			// adjust the track max & min to 24 hours from startTime
			this.trackMin = startTime - $.date.MSEC_PER_DAY;
			this.trackMax = startTime;

			// move the tick marks to the proper spot
			var staticTicks = this.getPiece(".StaticRangeTickContainer");
			var timeSoFarToday = (this.trackMin - $.date.yesterday().getTime() + $.date.timezoneOffset),
				left = ((timeSoFarToday / (this.trackMax - this.trackMin)) * -100) + "%"
			staticTicks.css("left", left);

			// update the static tick labels to show the correct dates
			this.dayLabelTimes = {};

			var startLabel = this.getPiece(".StartLabel"),
				endLabel = this.getPiece(".EndLabel")
			;
			// set the start label
			startLabel.html($.date.printSliderString(this.trackMin, $.date.timezoneOffset));

			// set min and max x so the satic day labels don't overlap with the start/end labels
			this.labelMinX = Math.round(startLabel.offset().left + startLabel.width());
			this.labelMaxX = Math.round(endLabel.offset().left);

			this.getPiece(".StaticRangeTickContainer .Label").each(this.setDayLabel);
		},
		
		setDayLabel : function(index, element) {
			var className = element.className,
				day = className.charAt(0),
				hours = className.substr(1, className.indexOf(" ")-1),
				date
			;
			if (day == "t") {
				date = $.date.today(hours);
			} else {
				date = $.date.yesterday(hours);
			}
			var dateString = $.date.printSliderString(date);
			
			element = $(element);
			element.html(dateString).show();
			
			// hide the element if it is not within the labelMinX and labelMaxX
			var left = Math.round(element.offset().left),
				right = Math.round(left + element.width())
			;
			if (! (left > $.slider.labelMinX && right < $.slider.labelMaxX)) {
				element.hide();
			}

			// remember the date so we can show the correct time when they click on the label
			$.slider.dayLabelTimes[day + hours] = date;
		},
		
		// Update the thumb to reflect the currently selected range.
		// Pass in newStart and/or newEnd to update that value.
		updateThumb : function() {
			// move and resize the thumb to reflect start and end
			var delta = this.trackMax - this.trackMin,
				thumb = this.getPiece(".RangeThumb"),
				width = this.getWidthForDelta(this.start, this.end)
			;
			thumb.width(width);
			thumb.css("left", this.getPercentageForValue(this.start));
			
			// update the thumb labels
			var startMsg = $.date.printSliderString(this.start, $.date.timezoneOffset, true, true),
				endMsg = (this.pinToNow && this.end == this.trackMax 
							? "<b>"+$.message("UI.now")+"</b>"
							: $.date.printSliderString(this.end, $.date.timezoneOffset, true, true)
						 )
			;
			this.getPiece(".RangeStartLabel").html(startMsg);
			this.getPiece(".RangeEndLabel").html(endMsg);
		},
		
		
		
		getTrackWidth : function() {
			return this.getPiece(".RangeTrackBarInner").width();
		},
		
		getTrackLeft : function() {
			return this.getPiece(".RangeTrackBarInner").offset().left;
		},
		
		getPixelFraction : function(trackWidth) {
			if (!trackWidth) trackWidth = this.getTrackWidth();
			return (trackWidth / (this.trackMax - this.trackMin));
		},
		
		// return the value associated with a particular page-x coordinate
		getValueForPageX : function(pageX) {
			var trackLeft = this.getTrackLeft(),
				trackWidth = this.getTrackWidth()
			;
			var localX = pageX - trackLeft;

			var pixelFraction = this.getPixelFraction(trackWidth);
//console.log(pageX, trackLeft, trackWidth, localX, pixelFraction, pixelFraction*localX);
			return Math.round((localX / pixelFraction) + this.trackMin);
		},
		
		// return the width between two points as a percentage
		getWidthForDelta : function(start, end) {
			return (((this.end - this.start) / (this.trackMax - this.trackMin)) * 100) + "%"
		},

		// return the left for a particular value as a percentage
		getPercentageForValue : function(value) {
			return (((value - this.trackMin) / (this.trackMax - this.trackMin)) * 100) + "%";
		},
		
		
		// get sub-element(s) of the slider
		getPiece : function(selector) {
			if (!selector) return $(this.mainSelector);
			return $(this.mainSelector + " " + selector);
		},


		// return the left for an event
		getEventValue : function(event) {
			event = $.event.fix(event||window.event);
			return this.getValueForPageX(event.pageX);
		},

		moveThumbToEvent : function(event, piece) {
			var x = this.getEventValue(event) - this._mouseOffset;
			if (x == undefined) return false;

			var delta = this.end - this.start, start, end
			// moving the entire thumb
			// pin to end track preserving the delta
			if (piece == 'track') {
				start = Math.max(x, this.trackMin);
				if (start + delta > this.trackMax) start = this.trackMax - delta;
				end = start + delta;

			} 
			// moving the end thumb
			// pin to within <minDuration> of the start thumb
			else if (piece == 'end') {
				end = Math.max(x, this.trackMin + this.minDuration);
				start = this.start;
				if (end - this.minDuration < this.start) start = end - this.minDuration;
			
			// moving the start thumb
			// pin to within <minDuration> of the end thumb
			} else {
				start = Math.max(x, this.trackMin);
				end = this.end;
				if (start + this.minDuration > this.end) end = this.start + this.minDuration;
			}
			
			// update the slider's value (which will update our controller)
			this.setRange(start, end);

			return false;
		},
		
		// Mouse went down in part of the slider -- start tracking mousemove to move the slider.
		//	<piece> will be one of [track|start|end]
		onTrackDown : function(event, piece) {
			event = $.event.fix(event||window.event);

			if (piece == null) piece = "track";
			var slider = this,
				moveCallback = function(event){return slider.moveThumbToEvent(event, piece)},
				upCallback   = function() {
					$(document).unbind("mousemove", moveCallback); 
					slider.onChange();
					return false;
				}
			;
			$(document).bind("mousemove", moveCallback);
			$(document).one("mouseup", upCallback);
	
			// figure out the offset from the mouse position to the left of the thumb
			var eventValue = this.getEventValue(event);
			if (eventValue < this.start) {
				if (piece == 'start') {
					this._mouseOffset = eventValue - this.start;
				} else {
					this._mouseOffset = 0;
				}
			} else if (eventValue > this.end) {
				if (piece == 'end') {
					this._mouseOffset = eventValue - this.end;
				} else {
					this._mouseOffset = (this.end - this.start);
				}
			} else {
				this._mouseOffset = eventValue - this.start;
			}

			// do the initial move to kick things off
			this.moveThumbToEvent(event, piece);

			event.stopPropagation();
			return false;
		},
		
		onTickDown : function(event, labelName) {
			var date = this.dayLabelTimes[labelName];
			this.setRange(date, date + (this.end - this.start));
			$.event.fix(event||window.event).stopPropagation();
			this.onChange();
			return false;
		},
		
		moveToStart : function(event) {
			this.setRange(this.trackMin, this.trackMin + (this.end - this.start));
			$.event.fix(event||window.event).stopPropagation();
			this.onChange();
			return false;
		},
		moveToEnd : function(event) {
			this.setRange(-1 * (this.end - this.start), "now");
			$.event.fix(event||window.event).stopPropagation();
			this.onChange();
			return false;
		}
	}
});

