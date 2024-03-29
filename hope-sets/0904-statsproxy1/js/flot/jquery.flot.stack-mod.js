/*
Flot plugin for stacking data sets, i.e. putting them on top of each
other, for accumulative graphs. Note that the plugin assumes the data
is sorted on x. Also note that stacking a mix of positive and negative
values in most instances doesn't make sense (so it looks weird).

Two or more series are stacked when their "stack" attribute is set to
the same key (which can be any number or string or just "true"). To
specify the default stack, you can set

  series: {
    stack: null or true or key (number/string)
  }

or specify it for a specific series

  $.plot($("#placeholder"), [{ data: [ ... ], stack: true ])
  
The stacking order is determined by the order of the data series in
the array (later series end up on top of the previous).

Internally, the plugin modifies the datapoints in each series, adding
an offset to the y value. For line series, extra data points are
inserted through interpolation. For bar charts, the second y value is
also adjusted.
*/

(function ($) {
    var options = {
        series: { stack: null } // or number/string
    };
    
    function init(plot) {
        function findMatchingSeries(s, allseries) {
            var res = []; // made this an array
            for (var i = allseries.length-1; i >= 0; --i) { // loops through backwards now
                if (s == allseries[i])
                    break;
                
                if (allseries[i].stack == s.stack)
                    res.push(allseries[i]);	// add to the array
            }
            
            return res;
        }
        
        function stackData(plot, s, datapoints) {
            if (s.stack == null)
                return;

            var other = findMatchingSeries(s, plot.getData());
            if (!other)
                return;
				
			for (var z = 0; z < other.length; z++)	// loop through all values of the array (otherwise we only increment by the next one series' value)
			{
            
				var ps = datapoints.pointsize,
					points = datapoints.points,
					otherps = other[z].datapoints.pointsize,	// grab out of array
					otherpoints = other[z].datapoints.points,	// grab out of array
					newpoints = [],
					px, py, intery, qx, qy,
					withlines = s.lines.show, withbars = s.bars.show,
					withsteps = withlines && s.lines.steps,
					i = 0, j = 0, l;

				while (true) {
					if (i >= points.length)
						break;

					l = newpoints.length;

					if (j >= otherpoints.length
						|| otherpoints[j] == null
						|| points[i] == null) {
						// degenerate cases
						for (m = 0; m < ps; ++m)
							newpoints.push(points[i + m]);
						i += ps;
					}
					else {
						// cases where we actually got two points
						px = points[i];
						py = points[i + 1];
						qx = otherpoints[j];
						qy = otherpoints[j + 1];

						if (px == qx) {
							for (m = 0; m < ps; ++m)
								newpoints.push(points[i + m]);

							newpoints[l + 1] += qy;

							i += ps;
							j += otherps;
						}
						else if (px > qx) {
							// we got past point below, might need to
							// insert interpolated extra point
							if (withlines && i > 0 && points[i - ps] != null) {
								intery = py + (points[i - ps + 1] - py) * (qx - px) / (points[i - ps] - px);
								newpoints.push(qx);
								newpoints.push(intery + qy);
								for (m = 2; m < ps; ++m)
									newpoints.push(points[i + m]);
							}

							j += otherps;
						}
						else {
							for (m = 0; m < ps; ++m)
								newpoints.push(points[i + m]);
							
							// we might be able to interpolate a point below,
							// this can give us a better y
							if (withlines && j > 0 && otherpoints[j - ps] != null) {
								intery = qy + (otherpoints[j - ps + 1] - qy) * (px - qx) / (otherpoints[j - ps] - qx);

								newpoints[l + 1] += intery;
							}
							
							i += ps;
						}
						
						if (l != newpoints.length && withbars)
							newpoints[l + 2] += qy;
					}

					// maintain the line steps invariant
					if (withsteps && l != newpoints.length && l > 0
						&& newpoints[l] != null
						&& newpoints[l] != newpoints[l - ps]
						&& newpoints[l + 1] != newpoints[l - ps + 1]) {
						for (m = 0; m < ps; ++m)
							newpoints[l + ps + m] = newpoints[l + m];
						newpoints[l + 1] = newpoints[l - ps + 1];
					}
				}
				
				datapoints.points = newpoints;
			
			}
        }
        
        plot.hooks.processDatapoints.push(stackData);
    }
    
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'stack',
        version: '1.0'
    });
})(jQuery);
