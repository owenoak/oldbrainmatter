//
//	Math extensions for dealing with angles and colors
//

Math.toRadians = function(degrees) {
	return degrees * Math.PI / 180;
}

Math.toDegrees = function(radians) {
	return radians * 180 / Math.PI;
}

Math.sinDegrees = function(degrees) {
	return Math.sin(Math.toRadians(degrees));
}

Math.cosDegrees = function(degrees) {
	return Math.cos(Math.toRadians(degrees));
}

Math.asinDegrees = function(degrees) {
	return Math.asin(Math.toRadians(degrees));
}

Math.acosDegrees = function(degrees) {
	return Math.acos(Math.toRadians(degrees));
}

// returns angle in DEGREES
Math.angleFromPoint = function(x, y) {
	var radians = Math.atan2(y, x);
	if (radians < 0) radians += (Math.PI*2);
	return Math.toDegrees(radians);
}


Math.angleFrom2Points = function() {
	var a = arguments;
	if (a.length == 2) {
		var startY = a[0].y,
			startX = a[0].x,
			endX   = a[1].x,
			endY   = a[1].y
		;
	} else {
		var startX = a[0],
			startY = a[1],
			endX   = a[2],
			endY   = a[3]
		;
	}
	return Math.angleFromPoint(endX - startX, endY - startY);
}