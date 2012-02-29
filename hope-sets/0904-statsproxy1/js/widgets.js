/* 
 	Very primitive code for manipulating basic 'widgets'
 */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

// move a set of elements to an ever-increasing z-index to show them above other things
jQuery.fn.moveToTop = function() {
	if (jQuery.fn.moveToTop.__topZ == null) jQuery.fn.moveToTop.__topZ = 10000;
	this.css("zIndex", jQuery.fn.moveToTop.__topZ++);
	return this;
}

// show the selected elements near another element, centered on the mouseX
jQuery.fn.positionNear = function(target, centerX) {
	var offset = target.offset(),
		targetTop = offset.top,
		targetHeight = target.height(),
		myWidth = this.width()
		myHeight = this.height(),
		bodyWidth = $("body").width(),
		bodyHeight = $("body").height()
	;
	// if mouseX was not provided, center on the target
	if (centerX == null) centerX = offset.left + (target.width() / 2);
	
	if ( (centerX + (myWidth / 2)) > bodyWidth ) {
		left = bodyWidth - (myWidth + 20);
	} else {
		left = Math.max(0, centerX - (myWidth / 2));
	}

	var top = targetTop + targetHeight + 5;
	if (top + myHeight > $("body").height()) {
		top = targetTop - myHeight;
	}
	top = Math.max(10, top);
	
	this.css({top: top, left:left});
	return this;
}


jQuery.fn.scrollIntoView = function() {
	var page = $('html'),
		pageHeight = page.height(),
		pageVisibleTop = page[0].scrollTop,
		pageVisibleBottom = pageVisibleTop + pageHeight,
		
		myTop = Math.floor(this.offset().top)
	;

	if (myTop < pageVisibleTop) {
		pageVisibleTop = myTop;
		
	} else if (myTop > pageVisibleBottom) {
		pageVisibleTop = myTop - 40;	// 40 is a hack...
	} else {
		// we're within the visible region, forget it
		return;
	}
	
	$('html,body').animate( { scrollTop:pageVisibleTop }, 250);
}


//
// dialog
//

jQuery.extend({
	dialog : {
		show : function showDialog() {
			$.clickMask.show();
			$("#dialog").moveToTop().show();
		},
		
		hide : function hideDialog() {
			$("#dialog").hide();
			$.clickMask.hide();
		}
	}
});


//
//	notifier -- displays messages
//
jQuery.extend({
	notifier : {
	
		// show/hide a message which blocks the main UI (eg: when loading or load error)
		show : function(msg, showAsError) {
			if (showAsError == null) showAsError = false;

			if (msg) $("#notifierMessage").html(msg);
			$("#notifier").moveToTop().toggleClass("error", showAsError).show()
		},
		
		hide : function() {
			$("#notifier").hide();
		},
		
		
		// show an error message which blocks the main UI
		showError : function(msg) {
			$.notifier.show(msg, true);
		},
		
		
		// show/hide a transient message that doesn't block the main UI
		flash : function(msg, seconds, showAsError) {
			if ($.notifier.timeout) {
				clearTimeout($.notifier.timeout);
				delete $.notifier.timeout;
			}
			
			if (showAsError == null) showAsError = false;
			
			if (seconds == null) seconds = 3;	// default show time is 3 seconds
			$("#flasherBody").html(msg);
			$("#flasher").toggleClass("error", showAsError).show();
			$.notifier.timeout = setTimeout($.notifier.hideFlasher, seconds*1000);
		},

		hideFlasher : function(msg) {
			$("#flasher").slideUp(100);
			clearTimeout($.notifier.timeout);
			delete $.notifier.timeout;
		},
		
		flashError : function(msg, seconds) {
			$.notifier.flash(msg, seconds, true);
		}

	}
});


//
//	ClickMask
//
jQuery.extend({
	clickMask : {
		eatClicks : true,
		
		show : function(eatClicks) {
			this.eatClicks = (eatClicks == true);
			$("#clickMask").moveToTop().show()
		},
		
		hide : function() {
			this.eatClicks = false;
			$("#clickMask").hide();
		},
		
		click : function() {
			if (this.eatClicks) return;
			this.hide();
			$.dialog.hide();
			$.menu.hide();
		}
	}
});



//
//	ghettoTip 	
//		Automatically show a super-simple tooltip for any element which has a 'tooltip' attribute.
//		Allows you to do ghetto formatting of the tip:
//			"a\nb" 		 	== a<br>b	(where "\n" == two characters: "\" + "n")
//			"{foo}"			== <b>foo</b>
//			"{_foo_}"			== <i>foo</i>
//			"[[a|b][a|b]]"	== <table><tr><td class='col1'>a</td><td class='col2'>b</td></tr>...
//
//	To style, edit css for the "#GhettoTip".
//	Enabled automatically by call to "jQuery.ghettoTip.startWatchingBody()" below.
//
jQuery.extend({
	ghettoTip : {
		checkDelay : 400,
		
		startWatchingBody : function() {
			var body = $("body");
			body.bind("mouseover", $.ghettoTip.watchHandler);
			body.bind("mouseout", $.ghettoTip.hide);
		},
		
		stopWatchingBody : function() {
			body.unbind("mouseover", $.ghettoTip.watchHandler);
			body.unbind("mouseout", $.ghettoTip.hide);
		},
		
		// handler for the watch-for-tip event
		// "this" is the body element
		watchHandler : function(event) {
			var target = $(event.target), tip;
			if (! (tip = target.attr("tooltip"))) {
				target = target.parents("[tooltip]");
				tip = target.attr("tooltip");
			}
			if (!tip) return true;
			return $.ghettoTip.check(event, target, tip);
		},
		
		check : function(event, target, tip) {
			$.ghettoTip.stopCheck();
			$.ghettoTip._checkTimer = setTimeout(function() {
				$.ghettoTip.show(target, tip, event.pageX);
			}, $.ghettoTip.checkDelay);
		},
		
		stopCheck : function() {
			clearTimeout($.ghettoTip._checkTimer);
			delete $.ghettoTip._checkTimer;
		},
		
		// show the tip near the target element, centered under the mouse
		show : function(target, tip, mouseX) {
			this.stopCheck();

			// apply formatting to the tip
			var formatted = this.format(tip);
			if (!this._element) this.draw();

			// set the css class of the outer tip element to the 'tipclass' of the display element
			// TODO: get the css class of the target and set a 'targetclass' attribute on the element
			//			and do styling from that, so we can style automatically?
			var tipClass = target.attr("tipclass");
			if (tipClass) 	this._element.attr("class", tipClass);
			else			this._element.removeAttr("class");
			
			var targetClass = target.attr("class");
			this._element.attr("targetclass", targetClass);


			this._body.html(formatted);
			this._element.positionNear(target, mouseX).moveToTop().show();
		},
		
		// do out ghetto formatting of the tooltip contents
		format : function(tip) {
			tip = tip.replace(/\\n/g,"<br/>");
			var tableMatch = tip.match(/\[(.*)\]/);
			if (tableMatch) {
				var fullTableExpression = tableMatch[0],
					rows = tableMatch[1].split("]["),
					table = "<table>"
				;
				for (var i = 0, row; i < rows.length; i++) {
					row = rows[i];
					if (!row) continue;
					if (row.charAt(0) == "[") row = row.substr(1);
					if (row.charAt(row.length-1) == "]") row = row.substr(0, row.length-1);
					table += "<tr>";
					row = row.split("|");
					for (var j = 0, col; j < row.length; j++) {
						table += "<td class='col"+(j+1)+"'>"+row[j]+"</td>";
					}
					table += "</tr>";
				}
				table += "</table>";
				tip = tip.split(fullTableExpression).join(table);
			}
			tip = tip.replace(/\{_([^}]+)_\}/g,"<i>$1</i>");
			tip = tip.replace(/\{([^}]+)\}/g,"<b>$1</b>");
			return tip;
		},
		
		// draw the ghettoTip element
		draw : function() {
			// try to find an existing "id=GhettoTip" element in the body
			var element = $("#GhettoTip");
			// if we can't find one, install one
			if (element.length == 0) {			
				element = $("<div id='GhettoTip'>"
								+ "<div class='GhettoTipBorder'></div>"
								+ "<div class='GhettoTipBody'></div>"
							 + "</div>"
						   );
				$("body").append(element);
			}
			this._element = element;
			this._body = element.find(".GhettoTipBody");
			if (this._body.length == 0) this._body = this._element;
		},
		
		// hide the tooltip -- may be called anonymously
		hide : function() {
			$.ghettoTip.stopCheck();
			if ($.ghettoTip._element) $.ghettoTip._element.hide();
		}
	}

});


//
// 	Menus
//

jQuery.extend({
	menu : {
		show : function showMenu(element, menuId, selectedValue) {
			element = $(element);
			// if the menu is inactive, forget it
			if (element.hasClass("MenuButtonInactive")) {
				return;
			}
			
			$.menu.hide();
			$.clickMask.show();
			var menu = $(menuId);
			if (selectedValue != null) {
				menu.find("li").map(
					// NOTE:  "this" is each LI in turn
					function(element, index) {
						if (this.getAttribute("itemvalue") == selectedValue) {
							this.setAttribute("checked","true");
						} else {
							this.removeAttribute("checked");
						}
					}
				);
			}
			
			menu.positionNear(element).moveToTop().show();
			window.activeMenu = menu;
		},
		
		hide : function hideMenu() {
			if (window.activeMenu) window.activeMenu.hide();
			$.clickMask.hide()
			window.activeMenu = null;
		},
		
        initialize : function(values, options) {
			// set up the menu items
			if (typeof values == "string") {
				var html = values;
			} else {
				var html = [];
				html.push("<ul>");
				$.each(values, function(index, value) {
					if (value == "-") return html.push("<hr>");
					if (value[0] == "-") {
						value = value.substr(1);
						var title = (options.transformer ? options.transformer(value)
														 : value);
						html.push("<li class='label'>"+title+"</li>");
					} else {
						var title = (options.transformer ? options.transformer(value)
														 : value);
						html.push("<li itemvalue='"+value+"' onclick='"+options.callback+"'>"
									+ title
								+ "</li>");
					}
				});
				html.push("</ul>");
				html = html.join("\n");
			}
			// put the options list in the menu container
			var menuContainer = $(options.menuContainer);
			menuContainer.html(html);
			menuContainer.bind("click", function(){setTimeout($.menu.hide, 0)});

			
			// if there is a spacer element, put the options list in there as well
			if (options.spacerContainer) {
				$(options.spacerContainer).html(html);
			}

			// if there is a buttonContainer, give it the "MenuActive" or "MenuInactive" class
			//	to show or hide the menu arrow
			if (options.buttonContainer) {
				var button = $(options.buttonContainer);
				if (values.length > 1) {
					button.addClass("MenuButtonActive");
					button.removeClass("MenuButtonInactive");
				} else {
					button.addClass("MenuButtonInactive");
					button.removeClass("MenuButtonActive");
				}
			}	
		}
	}
});



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
		
		// Adjust the slider to reflect the some time.
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


//
//
// 'flot' based chart object to graph the 'data' type queries
//
//	- map of <seriesId> -> <title>     is done with messages:  	traffic.title.<seriesId>
//	- map of <seriesId> -> <menu item> is done with messages:  	traffic.menu.<seriesId>
//	- map of <seriesId> -> <color> 	   is done with messages:	traffic.color.<seriesId>

jQuery.extend({
	chart : {
		dataId : 'composite',
		start : undefined,
		end : undefined,
		min_height : 75,
		
		// should the tooltip always be on the "left", or "alternate" left and right
		tooltipPosition : "left",		// "left" or "alternate"

		// selector to get the container for the flot chart
		chartSelector : "#trafficChartContainer",
		
		// options for all charts
		chartOptions : {
			// defaults for all series
			series : {
				stack : true,
				fill : 1,
				lines : {
					show : true,
					lineWidth : 0,
					fill : 1
				}
			},

			xaxis : {
				labelWidth: 100,
				tickFormatter : function(tick, axis) {
					return $.chart.labels[Math.floor(tick)];
				}
			},

			yaxis : {
				labelWidth: 60,
	                        min: 0,
	                        tickFormatter : function(tick, axis) {
	                            return $.number.prettyPrint(tick);
	                        }
	                },
			grid : {
				backgroundColor:"#ffffff",
				borderWidth: 1,
				clickable : true,
				hoverable : true,
				autoHighlight : false
			},
			
			legend : {
				show : false
			},
			
			crosshair : {
				mode : "x",
	            color: "rgba(25, 25, 25, 0.20)"
			}			
		},

		initialize : function() {
			if (this._initialized) return;
			// bind events to the chart object
			$(this.chartSelector).bind("plotclick", function(event, pos, item) {
				$.chart.onPlotClick(event, pos, item);
			}).bind("plothover", function(event, pos, item) {
				$.chart.onPlotHover(event, pos, item);
			}).bind("mouseout", function(event, pos, item) {
				$.chart.onPlotOut(event, pos, item);
			});

			this._initialized = true;
		},

		// parse the 'data' XML file into usable chart data
		parseData : function(serverData) {
			this.serverData = serverData;

			// make sure the 'd' and 'series' elements are arrays
			serverData.d = serverData.d || [];
			serverData.series = serverData.series || [];
			if (! (serverData.d instanceof Array) ) serverData.d = [serverData.d];
			if (! (serverData.series instanceof Array) ) serverData.series = [serverData.series];

			this.labels = [];
			var seriesIds = this.seriesIds = [];
			var attrs = [];

			// process the 'series' elements
			this.series = serverData.series;
			$.each(this.series, function(index, series) {
				attrs.push(series.attr);
				seriesIds.push(series.seriesId);
				var dataSeries = SP.dataSeriesMap[series.seriesId];
				series.title = dataSeries.title;
				series.color = dataSeries.color;
				series.data = [];

				return series;
			});

			$.each(serverData.d, function(index, datum) {
				$.chart.labels.push(datum.l);
				for (var i = 0, attr; attr = attrs[i]; i++) {
					var value = datum[attr];
					if (typeof value != "number") value = undefined;
					$.chart.series[i].data.push([index, value]);
				}
			});
			
			// debug
			window.series = this.series;
			window.labels = this.labels;
		},
		
		empty : function() {
			$(this.chartSelector).empty();
		},
		
		
		draw : function(fromResize) {
			var container = $(this.chartSelector),
				height = container.height()
			;
			
			var chartVisible = (height >= this.min_height);
			
			if (chartVisible) {
				// wrap the drawing of the chart in a try..catch block
				// 'cause the chart will throw an error if the display is not big enough
				try {
					if (!this.plot || fromResize) {
						this.plot = $.plot(this.chartSelector, this.series, this.chartOptions);
					} else {
						this.plot.setData(this.series);
						this.plot.setupGrid();
						this.plot.draw();
					}
					
					// update the legend
					this.drawLegend();			
				} catch (e) {
					chartVisible = false;
				}
			}			
		
			$("#trafficLegend").show();
			$.slider.show();
		},
		
		resize : function() {
			this.draw(true);
		},
		
		update : function(serverData) {
			this.initialize();
			if (serverData) this.parseData(serverData);
			
			// check to see if the chart object has a size
			//	and defer the update call if it does not
			var chartContainer = $(this.chartSelector);
			if (chartContainer.width() == 0) {
				setTimeout(function(){$.chart.update()}, 100);
				return;
			}
			
			this.draw();
		},
		
		drawLegend : function() {
			// TODO: "Time:" should come from a message file
			var row1 = "<tr><td id='ChartTimeLabel' class='label'>Time:</td>\n",
				row2 = "<tr><td id='ChartTimeValue' class='value'>&nbsp;</td>\n"
			;
			$.map(this.seriesIds, function(id) {
				var series = SP.dataSeriesMap[id];
				row1 += "<td class='color'><span class='ColorDisplay' style='background-color:"+series.color+"'>&nbsp;</span></td>"
						+"<td class='label'>"
							+ series.title
							+ ":"
						+"</td>\n";
				row2 += "<td id='chart"+id+"Value' class='value' colspan='2'>&nbsp;</td>\n";
			});
			output = 	"<span class='ChartLegend'>\n"
							+"<table cellspacing=0 cellpadding=0 class='ChartLegendTable'>\n" 
								+ row1 + "</tr>\n"
								+ row2 +"</tr>\n"
							+ "</table>\n"
						+"</span>";
			$("#trafficLegend").html(output);

			this.showCurrentValues();
		},

		// show the current values in the legend
		showCurrentValues : function(pos) {
			var data = this.getDataForPosition(pos);
			if (!data) return;
			
			for (var key in data) {
				var series = data[key];
				if (key == "Time") {
					$("#ChartTimeValue").html(series.value + " " + SP.config.timezoneName);
				} else {
					var value = parseInt(series.value) || series.value;
					if (typeof value == "number") value = $.number.commaize(value);
					$("#chart"+series.seriesId+"Value").html(value);
				}
			}
		
		},
		
		
		// mouse events on the plot
		
		// 	pos : {
		//		x : <global x>,
		//		y : <global y>
		//	},
		//
		//  item: {
		//      datapoint: the point, e.g. [0, 2]
		//      dataIndex: the index of the point in the data array
		//      series: the series object
		//      seriesIndex: the index of the series
		//      pageX, pageY: the global screen coordinates of the point
		//  }
		
		// get the data for a particular x position in the plot as an object:
		//	{
		//		label : <time label>
		//		<series label> : value at time
		//		<series label> : value at time
		//	}
		// TODO: what happens if no data at that position?
		getDataForPosition : function(position) {
			// figure out which position we want data for
			
			// if they passed a position, it's either a number or {x:#.###, y:#.###}
			if (position != null && position.x) {
				position = parseInt(position.x);
			}

			// if we don't have a valid position
			//	check the stored 'lastPosition'
			//	and default to the end of the graph
			if (isNaN(position) || position == null) {
				if (this._lastPosition != null) position = this._lastPosition;
				else							position = this.labels.length - 1;
			}
			if (this.labels[position] == undefined) return;
			this._lastPosition = position;
			
			var data = {
				"Time" : {seriesId:"time", value:this.labels[position]}
			};

			series = this.plot.getData();
			$.map(series, function(series) {
				var value = series.data[position][1];
				if (value == null) value = "<span class='hint'>"+$.message("UI.noData")+"</span>";
				data[series.title] = {
					seriesId : series.seriesId,
					color : series.color,
					value : value
				}
			});
			return data;
		},
		
		onPlotClick : function(event, pos) {
			var data = this.getDataForPosition(pos);
//			console.warn(data);
		},
		
		onPlotHover : function(event, pos) {
			this.showCurrentValues(pos);
		},

		onPlotOut : function(event) {},
		
		getWidth : function() {
			return $(this.chartSelector).width();
		},
		
		getHeight : function() {
			return $(this.chartSelector).height();
		}
	}
});


/* Copy-to-clipboard widget */
jQuery.extend({
	clippy : {
		getHTML : function(textToCopy, bgColor) {
			if (!$.Browser.hasFlash) return "";
			var template = ($.Browser.MSIE ? $.clippy.MSIE_TEMPLATE : $.clippy.TEMPLATE);
			return $.string.interpolate(template, {text:textToCopy, bgColor:bgColor});
		},
		
		
		MSIE_TEMPLATE : 
			"<object classid='clsid:d27cdb6e-ae6d-11cf-96b8-444553540000' style='vertical-align:bottom' width='14' height='14'>\
				<param name='movie' value='clippy.swf'/>\
				<param name='allowScriptAccess' value='always' />\
				<param name='quality' value='high' />\
				<param name='scale' value='noscale' />\
				<param name='FlashVars' value='text=#{text}'/>\
				<param name='bgcolor' value='#{bgColor}'/>\
				<param name='wmode' value='transparent'/>\
			</object>",
		
		TEMPLATE : 
				"<embed src='clippy.swf'\
					style='vertical-align:bottom'\
					width='14'\
					height='14'\
					scale='noscale'\
					allowScriptAccess='always'\
					type='application/x-shockwave-flash'\
					pluginspage='http://www.macromedia.com/go/getflashplayer'\
					FlashVars='text=#{text}'\
					wmode='transparent'\
					bgcolor='#{bgColor}'\
				/>"
	}
});


// DEBUG
window.slider = $.slider;
window.date = $.date;
