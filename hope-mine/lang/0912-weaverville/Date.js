/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//
 

/** Date utilities. */

jQuery.extend({
	date : {
		

		MSEC_PER_HOUR : 1000 * 60 * 60,
		MSEC_PER_DAY : 1000 * 60 * 60 * 24,


		//
		//	timezoneOffset
		//
		
		timezoneOffset : 0,			// offset in MILLISECONDS
		timezoneLabel  : "PST",
		
		/** Set the timezoneOffset between the browser and the server
			and/or the server timezoneLabel.
		 */
		setTimezoneOffset : function setTimezoneOffset(serverUTCOffset, timezoneLabel) {
			if (serverUTCOffset != null) {
				var serverUTCOffset = SP.config.timezoneOffset * $.date.MSEC_PER_HOUR,
					localStartDay = $.date.today(),
					UTCStartDay = Date.UTC(localStartDay.getFullYear(), 
										   localStartDay.getMonth(), 
										   localStartDay.getDate()
										  ),
					browserUTCOffset = UTCStartDay - localStartDay.getTime()
				;
				
				// $.date.timezoneOffset is the difference between browser time and server time
				this.timezoneOffset = (serverUTCOffset - browserUTCOffset);
			}
			if (timezoneLabel) this.timezoneLabel = SP.config.timezoneName;
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
			var match = string.match(/(\d\d\d\d)-(\d\d)-(\d\d)(T(\d\d):(\d\d):(\d\d)(.*)?)?/);
			if (!match) return undefined;
			if (match[4] != null) {		// date+time
			// specify base 10 to parseInt so "08" does 1not get falsely interpreted as octal
				return new Date(match[1],parseInt(match[2],10)-1,match[3],match[5],match[6],match[7]);
			} else {					// date only
				return new Date(match[1],parseInt(match[2],10)-1,match[3]);
			}
		},
		
		// convert a date to a nicer-looking locale string
		// Date is a Date object or a number of MILLISECONDS.
		print : function(date, offset, showTimezone) {
			// offset the date if necessary
			date = $.date.offsetDate(date, offset);
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
				if (skipToday != true) output = SP.message("UI-today")+"<br>";
			} else if (date >= $.date.YESTERDAY) {
				output = SP.message("UI-yesterday")+"<br>";
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
				   (skipSecs == true ? "" : ":" + date.getSeconds());
		},
		
		// Convert a duration in SECONDS to a pretty string
		printDuration : function(duration) {
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
			var str = "";
			if ( days   > 0) str += days	+ " day"+((days>1)?"s":"")+", ";
			if (hours   > 0) str += hours   + " hr"+((hours>1)?"s":"")+", ";
			if (minutes > 0) str += minutes + " min"+((minutes>1)?"s":"")+", ";
			str += duration + " sec"+((duration>1)?"s":"");
			return str;
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


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
