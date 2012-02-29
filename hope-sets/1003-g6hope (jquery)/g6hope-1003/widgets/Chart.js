
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
			return this;
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
					$("#ChartTimeValue").html(series.value + " " + ServiceController.config.timezoneName);
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

