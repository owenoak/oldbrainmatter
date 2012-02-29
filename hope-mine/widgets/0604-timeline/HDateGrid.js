// TODO:
//	* 
//	* GRID START AND END DONT ROUND PROPERLY AT SMALL SIZES
//	* GRID UNITS PER DAY MUST BE GREATER THAN # OF ITEMS IN A DAY
//	* GRID UNITS PER DAY MUST BE MULTIPLE OF 4
//	* TIMEZONE SUPPORT
//	* IF START/END NOT SPECIFIED, TAKE FROM ITINERARY
//	* MULTIPLE ITINERARIES
//	* LODGING ITINERARY
//	* CONNECTING FLIGHTS/CARS
//	* DESTINATION ADDRESS
//	* GET DOW AND MONTH STRINGS FROM REGEXES ON DATE OBJECTS 
// 
function HDateGrid(itinerary, startDate, endDate, props) {
	// NORMALIZE START AND END DATE AS: DATES, STRINGS, #MSEC
	var bracket;
	if (startDate == null && endDate == null) {
		bracket = this.bracketDate();
	} else if (startDate != null && endDate == null) {
		bracket = this.bracketDate(startDate);
	}
	if (bracket != null) {
		startDate = bracket[0];
		endDate = bracket[1];
	}
//alert(startDate + "\n" + endDate);
	this._startDate = startDate;
	this._endDate = endDate;

	this._itinerary = itinerary;

	this._props = props;
	for (var prop in props) {
		this[prop] = props[prop];
	}

	// generate a unique id
	this.id = (this.ID_BASE + this.ID_COUNT++);
}

var P = HDateGrid.prototype;
P.IMG_DIR = '../../../img/Aqua64/';
P.MSEC_PER_DAY = 1000 * 60 * 60 * 24;
P.ID_BASE = "HDateGrid";
P.ID_COUNT = 0;

P.DOW_STRINGS = ["S","M","T","W","Th","F","S"];
P.MONTH_STRINGS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

P.modifier1 = "_weekStart";
P.modifier2 = "_monthStart";
P.modifier3 = "_gridStart";
P.modifier4 = "_gridEnd";


P.dateBracketStartDelta = 	-7;
P.dateBracketEndDelta = 	 15;

P.unitsPerDay = 4;
P.widthPerUnit = 7;



P.getHTML = function () {
var t0 = new Date().getTime();
	if (this._BINARY_CLASS_MATRIX == null) {
		this._BINARY_CLASS_MATRIX = this.makeBinaryClassMatrix(this.modifier1, this.modifier2, this.modifier3, this.modifier4);
	}
	var classes = this._BINARY_CLASS_MATRIX;

	var totalDays = daysThisMonth = 0,
		
		todayTime = this._startDate.getTime(),
		today = new Date(todayTime),
		yesterday = new Date(todayTime - this.MSEC_PER_DAY),
		endTime = this._endDate.getTime(),
		isStart = true
	;
		
	var monthStream = [],
		gridStream = [],
		dateStream = [],
		dowStream = [],
		cityStream = []
	;

	var dowSpacer = [];
	if (this.unitsPerDay > 2) {
		var noonItem = Math.floor(this.unitsPerDay / 2),
			morningEnd = Math.floor(noonItem / 2),
			eveningStart = noonItem + morningEnd
		;
		
		for (var i = 1; i < (this.unitsPerDay - 1); i++) {
			if (i == noonItem) {
				dowSpacer.push("<td class='_noonSpacer'></td>");			
			} else if (i < morningEnd || i >= eveningStart) {
				dowSpacer.push("<td class='_nightSpacer'></td>");				
			} else {
				dowSpacer.push("<td class='_daySpacer'></td>");			
			}
		}
	}
	dowSpacer = dowSpacer.join("");

	while (todayTime < endTime ) {
		var dow = today.getDay(),
			date = today.getDate(),
			month = today.getMonth(),
			isWeekend = (dow == 0 || dow == 6),
			isEnd = (todayTime + this.MSEC_PER_DAY >= endTime),
			classNum = 0
		;
		
		// DO A BIT MASK TO GET THE SPECIAL CLASSES FOR THIS DAY
		if (dow == 0) 	classNum += 1;
		if (date == 1)	classNum += 2;
		if (isStart)	classNum += 4;
		if (isEnd) 		classNum += 8;
		
		var specialClasses = classes[classNum];
		
		gridStream.push("<td '", this.id, "_g_", todayTime, "' class='_midnightSpacer", (!isEnd ? specialClasses : ""), "'></td>");
		gridStream.push(dowSpacer);
		if (this.unitsPerDay > 1) {
			gridStream.push("<td class='_nightSpacer", (isEnd ? specialClasses : ""), "'></td>");
		}

		dateStream.push("<td id='", this.id, "_d_", todayTime, "' colspan='", this.unitsPerDay, "' class='", (dow == 0 || dow == 6 ? "_dayWeekend" : "_day"), specialClasses, "'>", today.getDate() , "</td>");
		dowStream.push("<td colspan='", this.unitsPerDay, "' class='", (dow == 0 || dow == 6 ? "_dowWeekend" : "_dow"), specialClasses, "'>", this.DOW_STRINGS[dow], "</td>");

		if (date == 1 || isEnd) {
			if (isEnd) daysThisMonth++;
			monthStream.push("<td colspan='", (daysThisMonth * this.unitsPerDay), "' class='_month", specialClasses, "'>", this.MONTH_STRINGS[yesterday.getMonth()], " ", yesterday.getFullYear(), "</td>");
			daysThisMonth = 0;
		}


		yesterday.setTime(todayTime);
		today.setTime(todayTime += this.MSEC_PER_DAY);
		
		totalDays++;
		daysThisMonth++;
		isStart = false;	
	}
	
	// figure out the itinerary row
	var itinerary = this._itinerary,
		itineraryStream = [];
	
	var currentCell = 0,
		currentDate = this._startDate,
		gridEndCell = this.getGridUnitDelta(this._startDate, this._endDate)
	;
	for (var i = 0; i < itinerary.length; i++) {
		var item = itinerary[i],
			itemStartCell = this.getGridUnitDelta(currentDate, item.startDate),
			itemEndCell = this.getGridUnitDelta(currentDate, item.endDate),
			itemDelta
		;

		// make sure we're within range
		if (itemStartCell < 0 && itemEndCell < 0) continue;
		if (itemStartCell > gridEndCell) continue;
		
		// cut off to the beginning and end of the grid
		if (itemStartCell < 0) itemStartCell = 0;
		if (itemEndCell < gridEndCell) {
			itemDelta = (itemEndCell - itemStartCell);
		} else {
			itemDelta = this.getGridUnitDelta(currentDate, this._endDate);
		}

//alert(item.type + ": " + item.location + "\n" + itemStartCell + ":" + itemEndCell + "\n" + (itemDelta));

		// make sure this leg of the trip is within the specified time range
		//if (item.endDate.getTime() < this._startDate().getTime()) continue;
		
		var contents = [], 
			directionClass = ""
		;

		switch (item.type) {
			case "Home":
				contents.push(item.location);
				break;
				
			case "Visit":
			case "Workshop":
				contents.push(item.location);
			
				break;
				
			case "Plane":
			case "Train":
			case "Car":
			case "Metro":
				contents.push("<img src='" + this.IMG_DIR + item.type + ".png' class='_icon'>");
				if (item.startLocationCode && item.endLocationCode) {
					contents.push("<center><nobr>", item.startLocationCode, " &gt; ", item.endLocationCode,"</nobr></center>");
				}

				if (itinerary[i-1] && itinerary[i-1].type == "Home") {
					directionClass = " _fromHome";
				} else if (itinerary[i+1] && itinerary[i+1].type == "Home") {
					directionClass = " _toHome";
				}
				

				break;

			default:
				contents = "'" + item.type + "'???";
				continue;
				break;
		}

		currentDate = item.endDate;

		itineraryStream.push("<td colspan='", (itemDelta), "' class='_", item.type, "Cell", directionClass, "'>",
								"<div class='_", item.type, "'>", contents.join(""), "</div></td>"
							);
		hasStarted = true;
	}
	
//	alert(monthStream);
//	alert(gridStream);
//	alert(dateStream);
//	alert(dowStream);
		
	var widthStyle = (this.autoResize ? "" : " style='width:" + (totalDays * this.widthPerUnit * this.unitsPerDay) + "'");
	var html = [
				"<div id='", this.id,"' class='HDateGrid'>",
					"<table id='", this.id,"_table' cellspacing=0 cellpadding=0 class='HDateGrid _table'", widthStyle, ">",
						"<tr>", monthStream.join(""), "</tr>",
						"<tr>", gridStream.join(""), "</tr>",
						"<tr>", dateStream.join(""), "</tr>",
						"<tr>", dowStream.join(""), "</tr>",
						"<tr>", gridStream.join(""), "</tr>",
						"<tr>", itineraryStream.join(""), "</tr>",
					"</table>",
				"</div>"
			].join("");
var t1 = new Date().getTime();
//alert(t1-t0);
	return html;
}


P.getGridUnitDelta = function (dateOne, dateTwo) {
	var dateOneUnits = Math.floor((dateOne.getTime() * this.unitsPerDay) / this.MSEC_PER_DAY),
		dateTwoUnits = Math.floor((dateTwo.getTime() * this.unitsPerDay) / this.MSEC_PER_DAY)
	;
	return dateTwoUnits - dateOneUnits;
}

P.makeBinaryClassMatrix = function (modifier1, modifier2, modifier3, modifier4) {
	modifier1 = " " + modifier1;
	modifier2 = " " + modifier2;
	modifier3 = " " + modifier3;
	modifier4 = " " + modifier4;
	var list = [
		"",
		modifier1, 
					modifier2, 
		modifier1 + modifier2, 
	 							  modifier3,
		modifier1				+ modifier3, 
					modifier2	+ modifier3, 
		modifier1 + modifier2	+ modifier3, 
											   modifier4,
		modifier1							 + modifier4, 
					modifier2				 + modifier4, 
		modifier1 + modifier2				 + modifier4, 
								+ modifier3  + modifier4,
		modifier1				+ modifier3  + modifier4, 
					modifier2	+ modifier3  + modifier4, 
		modifier1 + modifier2	+ modifier3  + modifier4, 
	];
	return list;
}



P.bracketDate = function (date) {
	// DO STRING NORMALIZATION ON DATE
	if (date == null) date = new Date();
	var time = date.getTime();
	return [
				new Date(time + (this.MSEC_PER_DAY * this.dateBracketStartDelta)),
				new Date(time + (this.MSEC_PER_DAY * this.dateBracketEndDelta))
			];
}



