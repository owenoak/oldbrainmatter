

// parse ISO 8061 date:  YYYY-MM-DDThh:mm:ssTZD
// NOTE: we ignore timezone for now
jQuery.extend({
	date : {
		
		timezoneOffset : 0,			// offset in MILLISECONDS from GMT
		timezoneLabel  : "GMT",
		
		MSEC_PER_HOUR : 1000 * 60 * 60,
		MSEC_PER_DAY : 1000 * 60 * 60 * 24,
	
		/** Set the timezone offset from GMT and the timezoneLabel to use. 
			TODO: some signal if the timezone has actually changed?
		*/
		setTimezone : function(offset, timezoneLabel) {
			// set up the timezone stuff:
			// NOTE: offset comes in as +0800 as printed by strftime; divide by 100 to get hours    
			var serverUTCOffset = (offset/100) * $.date.MSEC_PER_HOUR,
				localStartDay = $.date.today(),
				UTCStartDay = Date.UTC(localStartDay.getFullYear(), 
									   localStartDay.getMonth(), 
									   localStartDay.getDate()
									  ),
				browserUTCOffset = UTCStartDay - localStartDay.getTime()
			;
			
			// $.date.timezoneOffset is the difference between browser time and server time
			$.date.timezoneOffset = (serverUTCOffset - browserUTCOffset);
			$.date.timezoneLabel = ServiceController.config.timezoneName;
		},
	
		// return a new date set to a particular time of today
		//	hours, min, sec all default to 0. Msec is always 0.
		today : function(hour, min, sec) {
			return $.date.setTime(new Date(), hour, min, sec, 0);
		},
		
		// return a new date set to a particular time of today
		//	hours, min, sec all default to 0. Msec is always 0.
		yesterday : function(hour, min ,sec) {
			return $.date.setTime($.date.addDays(new Date(), -1), hour, min, sec, 0);
		},


		// return the current time offset by the number of hours passed in
		now : function(hoursDelta) {
			var now = new Date();
			if (hoursDelta) now = new Date(now.getTime() + (hoursDelta * $.date.MSEC_PER_HOUR));
			return now;
		},
		
		offsetDate : function(date, offset) {
			if (!date) return new Date();
			
			if (!offset && typeof date != "number") return date;
			if (typeof date != "number") date = date.getTime();
			return new Date(date + (offset || 0));
		},
	
		/** Parse a string date. 
			Tries default new Date(string) first.
			If that doesn't work, tries parseISO8601().
			If that doesn't work, returns NaN
		*/
		parse : function(rawValue) {
			if (rawValue instanceof Date) return rawValue;
			
			var date = new Date(rawValue);
			if (!isNaN(date)) return date;
			var isoDate = $.date.parseISO8601(rawValue);
			if (!isoDate) return date;		// return value is NaN
			return isoDate;
		},
	
		parseISO8601 : function(string) {
			if (!string) return null;
			
//REFACTOR - move out of function, internationalize
			var match = string.match(/(\d\d\d\d)-(\d\d)-(\d\d)(.(\d\d):(\d\d):(\d\d)(.*)?)?/);
			if (!match) return undefined;
			// parse in base 10 in case there are leading zeroes on any of the date pieces
			var year = parseInt(match[1], 10),
				month = parseInt(match[2], 10) - 1,
				day = parseInt(match[3], 10),
				hasTime = match[4] != null,
				hour = (hasTime ? parseInt(match[5], 10) : 0),
				min = (hasTime ? parseInt(match[6], 10) : 0),
				sec = (hasTime ? parseInt(match[7], 10) : 0)
			;
			return new Date(year, month, day, hour, min, sec);
		},
		
		// convert a date to a nicer-looking locale string
		// Date is a Date object or a number of MILLISECONDS.
		print : function(date, offset, showTimezone) {
			// offset the date if necessary
				//	if (offset) date = $.date.offsetDate(date, offset);
			return $.date.printShortDate(date) + " " 
					+ $.date.printShortTime(date)
					+ (showTimezone ? " " + $.date.timezoneLabel : "");
		},


		// convert a date to a ISO 8601 format:
		//		YYYY-MM-DDTHH:MM:SS
		printIso8601 : function(date, offset) {
			// offset the date if necessary
			date = $.date.offsetDate(date, offset);

			return date.getFullYear() + "-"
				 + $.number.pad(date.getMonth()+1, 2) + "-"
				 + $.number.pad(date.getDate(), 2)
				 + "T"
				 + $.number.pad(date.getHours(), 2) + ":"
				 + $.number.pad(date.getMinutes(), 2) + ":"
				 + $.number.pad(date.getSeconds(), 2);
		},
		
		// Print this date in a format appropriate for output in the RangeSlider.
		// Date is a Date object or a number of MILLISECONDS.
		printSliderString : function(date, offset, boldTime, skipToday) {
			// offset the date if necessary
			date = $.date.offsetDate(date, offset);

			var day,
				time = $.date.printShortTime(date, true),
				tzone = $.date.timezoneLabel || "",
				output = ""
			;

			if (date >= $.date.TODAY) {
				if (skipToday != true) output = $.message("UI.today")+"<br>";
			} else if (date >= $.date.YESTERDAY) {
				output = $.message("UI.yesterday")+"<br>";
			} else {
				output = $.date.printShortDate(date, true) + "<br>";
			}
			
			if (boldTime) {
				output += "<b>" + time + " " + tzone + "</b>";
			} else {
				output += time + " " + tzone;
			}
			return output;
		},
		
		printShortDate : function(date, skipYears) {
			if (typeof date == "number") date = new Date(date);
			return  (date.getMonth() + 1) + "/" +
					date.getDate() +
					(skipYears == true ? "" : "/" + $.number.pad(date.getFullYear() % 100, 2));
		},
		
		printShortTime : function(date, skipSecs) {
			if (typeof date == "number") date = new Date(date);
			return $.number.pad(date.getHours(),2) + ":" +
				   $.number.pad(date.getMinutes(),2) +
				   (skipSecs == true ? "" : ":" + $.number.pad(date.getSeconds(),2));
		},
		
		// Convert a duration in SECONDS to a pretty string
		printDuration : function(duration, wrap) {
			if(duration > 86400) {
				var days = Math.floor(duration / 86400);
				duration = duration % 86400;
			}
			if(duration > 3600) {
				var hours = Math.floor(duration/3600);
				duration = duration % 3600;
			}
			if(duration > 60) {
				var minutes = Math.floor(duration/60);
				duration = duration % 60;
			}
			var output = [];
			if ( days   > 0) output.push( days	+ " day"+((days>1)?"s":""));
			if (hours   > 0) output.push( hours   + " hr"+((hours>1)?"s":""));
			if (minutes > 0) output.push( minutes + " min"+((minutes>1)?"s":""));
			output.push( duration + " sec"+((duration>1)?"s":""));

			// make the value wrap if indicated			
			var len = output.length;
			if (wrap && len > 2) {
				var item = Math.floor(len/2);
				output[item] = "<br>" + output[item];
			}
			
			return output.join(", ");
		},

		// Set the hours/min/sec/msec portions of a date.
		//	If you don't pass one of the above, sets it to 0.
		setTime : function(date, hour, min, sec, msec) {
			date.setHours(hour || 0);
			date.setMinutes(min || 0);
			date.setSeconds(sec || 0);
			date.setMilliseconds(msec || 0);
			return date;
		},

		// Add the specified # of days (positive or negative) to the date, preserving the time.
		// NOTE: this DOES work across daylight savings time boundaries.
		addDays : function(date, days) {
			// remember hours and minutes so we can reset them
			//	in case we're crossing a daylight savings boundary
			var startHours = date.getHours(),
				startMinutes = date.getMinutes()
			;
			date.setHours(12);	
			date.setTime(date.getTime() + (days * $.date.MSEC_PER_DAY));
			// reset to stored hours/mins
			date.setHours(startHours);
			date.setMinutes(startMinutes);
			return date;
		}

	}
});
jQuery.date.TODAY = $.date.today();
jQuery.date.YESTERDAY = $.date.yesterday();

