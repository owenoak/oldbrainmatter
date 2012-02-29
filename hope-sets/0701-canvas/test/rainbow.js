

function makeRainbow(context, type, x1, y1, x2, y2, r1, r2) {
	if (type == "linear") {
		var gradient = context.createLinearGradient(x1, y1, x2, y2);
	} else {
		var gradient = context.createRadialGradient(x1, y1, r1, x2, y2, r2);
	}
	for (var i = 0; i < 256; i++) {
		gradient.addColorStop(i / 255, "rgb("+dojo.gfx.color.hsv2rgb(i, 255, 255).join(",")+")");
	}
	return gradient;
}

// big rainbow circle
// var rainbow = makeRainbow(context, "radial", 256, 256, 256, 256, 10, 266);context.fillStyle = rainbow; context.fillRect(0,0,512,512);
