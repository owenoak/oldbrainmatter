Class.include("ProtoWidget CompositeWidgetMixin");


//	TODO:
//			- start on different day of week?
//			- show calendar for multiple months?
//
//
var DateSelector = Class.create(ProtoWidget, CompositeWidgetMixin, {
	klass : "DateSelector",
	
	style : "",
	className : "",
	weekClassName : "",
	dayClassName : "",

	startDate : new Date(),
	
	

	onActivate : function(event, part, element, partId) {
		this.warn("selected: ", partId);
	},


	setDate : function(newDate) {
		this.startDate = newDate;
		this.redraw();
	},

	showNextMonth : function() {
		this.setDate(this.data.monthEnd.addDays(1));
	},
	
	showPrevMonth : function() {
		var start = this.data.monthStart.addDays(-1);
		start.setDate(1);
		this.setDate(start);
	},


	// event handling
	onMouseOver : function(event, part, element, partId) {
		return false;		
	},

	onMouseOut : function(event, part, element, partId) {
//window.status = "";
		return false;		
	},

	onMouseDown : function(event, part, element, partId) {
		return false;		
	},
	
	onMouseUp : function(event, part, element, partId) {
		if (partId == null) return;
		
		var partSplit = partId.split(","),
			partType = partSplit[0]
		;
		
		switch (partType) {
			case "prev":
				this.showPrevMonth();
				break;
				
			case "next":
				this.showNextMonth();
				break;
				
			case "title":
			case "week":
				break;
		
			case "day":
				var date = new Date(partSplit[1], partSplit[2], partSplit[3]);
				this.onActivate(event, date, element, partId);
				break;
		}
		return false;
	},
	
	onClick : function(event) {
		return false;		
	},
	
	prepareToDraw : function() {
		this.data = this.getCalendarData();
	},
	
	onAfterDraw : function($super, parent) {
		this.$body = this.$main.select(".MiniCalendarWeeks")[0];
		this.$title = this.$main.select(".MiniCalendarTitle")[0];
		$super(parent);
	},
	
	onRedraw : function() {
		this.$title.innerHTML = this.data.titleHTML;
		this.$body.innerHTML = this.getWeeksHTML(this.data);
	},
	
	getHTML : function() {
		var data = this.data;
		data.weeksHTML = this.getWeeksHTML(data);
		data.html = this.MainTemplate.evaluate(data);
		return data.html;
	},

	getCalendarData : function(date) {
		if (date == null) 	date = this.startDate;
		else 				this.startDate = date;

		var data = {
			todayString : new Date().toDateString(),
			widget : this,
			startDate : this.startDate
		};
		//	constants for this drawing cycle			
		data.monthStart = new Date(data.startDate);
		data.monthStart.setDate(1);

		data.monthEnd = new Date(data.monthStart);
		data.monthEnd.setMonth(data.monthEnd.getMonth()+1);
		data.monthEnd.addDays(-1);

		// gridStart is the first day that we will show
		data.gridStart	= new Date(data.monthStart);
		data.gridStart.addDays( -1 * data.gridStart.getDay());
		
		// gridEnd is the last day we will show
		data.gridEnd	= new Date(data.monthEnd);
		data.gridEnd.addDays(6 - data.gridEnd.getDay());
		// round because daylight savings time will bump things up or down a tiny bit
		data.weekCount	= Math.round((data.gridEnd - data.gridStart) / (7 * Date.MSEC_IN_ONE_DAY));

		// get data for 
		data.displayMonth = data.monthStart.getMonth();
		data.displayMonthName = data.monthStart.getMonthName();
		data.displayYear = data.monthStart.getFullYear();
		data.titleHTML = this.getTitleHTML(data);	

		// currentDate is the next day to draw in the grid
		data.currentDate = data.gridStart.clone();
		return data;
	},

	getWeeksHTML : function(data) {
		data.weeksHTML = "";
		for (data.currentWeek = 0; data.currentWeek < data.weekCount; data.currentWeek++) {
			// Note: this is dependent on getWeekHTML incrementing the data.currentDate
			data.weeksHTML += this.getWeekHTML(data);
		}
		return data.weeksHTML;
	},

	getWeekHTML : function(data) {
		// assumes data.currentDate is the first day of the week to show
		data.daysHTML = "";
		for (var i = 0; i < 7; i++) {
			data.daysHTML += this.getDayHTML(data);
			data.currentDate.addDays(1);
		}
		data.weekClassName = this.weekClassName;
		return this.WeekTemplate.evaluate(data);
	},
	
	getDayHTML : function(data) {
		// assumes data.currentDate is the day to show
		var date = data.currentDate;
		data.dayClassName = this.getDayClass(date, data);
		data.year = date.getFullYear();
		data.month = date.getMonth();
		data.monthName = date.getMonthName(true);
		data.day = date.getDate();
		data.dayOfWeek = date.getDay();

		return this.DayTemplate.evaluate(data);
	},

	// override this to add special classes for different days 
	//	(e.g. if your have events on a given day, etc)
	getDayClass : function(date, data) {
		var classNames = [];
		if (this.dayClassName) classNames.push(this.dayClassName);
		
		// Sunday, Monday, etc.
		classNames.push(date.getDayName(true));
		
		if 		(date.getMonth() < data.displayMonth) classNames.push("PrevMonth");
		else if (date.getMonth() > data.displayMonth) classNames.push("NextMonth");
		
		if (date.toDateString() == data.todayString) classNames.push("Today");
		
		return classNames.join(" ");
	},

	getTitleHTML : function(data) {
		return data.displayMonthName + " " + data.displayYear;
	},

	MainTemplate : new Template(
		"<div id='#{widget.id}' style='#{style}' class='noselect inline-block DateSelector #{className}'>\
			<div class='MiniCalendarHeader'\
				><a partId='prev'  class='MiniCalendarPrev' href='#'>&nbsp;</a\
				><a partId='title' class='MiniCalendarTitle'>#{titleHTML}</a\
				><a partId='next'  class='MiniCalendarNext' href='#'>&nbsp;</a\
			</div>\
			<div class='DayColumn ColumnForSun'></div>\
			<div class='DayColumn ColumnForMon'></div>\
			<div class='DayColumn ColumnForTue'></div>\
			<div class='DayColumn ColumnForWed'></div>\
			<div class='DayColumn ColumnForThu'></div>\
			<div class='DayColumn ColumnForFri'></div>\
			<div class='DayColumn ColumnForSat	'></div>\
			<div class='MiniCalendarDOWHeader'\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[0]}</span></span\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[1]}</span></span\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[2]}</span></span\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[3]}</span></span\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[4]}</span></span\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[5]}</span></span\
				><span class='MiniCalendarDOW'><span>#{currentDate.DAY_INITIALS[6]}</span></span\
			></div>\
			<div class='MiniCalendarWeeks'>\
				#{weeksHTML}\
			</div>\
		</div>"
	),
	
	WeekTemplate : new Template(
		"<div class='MiniCalendarWeek MiniCalendarWeek#{currentWeek} #{weekClassName}' partId='week,#{currentWeek}'>#{daysHTML}</div>"
	),
	
	DayTemplate : new Template(
		"<a partId='day,#{year},#{month},#{day}' class='MiniCalendarDay #{dayClassName}' \
			href='#'\
			onmouseover='return false'\
		>#{day}</a>"
	)
});