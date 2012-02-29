Class.include("ProtoWidget UpdatingWidgetMixin");

//
//	Chart class for encapsulating FusionCharts, including rendering, automatic data reload, cookie enable/disable
//
var Chart = Class.create(ProtoWidget, UpdatingWidgetMixin, {
	klass 					: "Chart",
	
	id						: undefined,
	width 					: "100%",
	height 					: "150",
	flashFileUrl 			: '/charts/StackedColumn2D.swf',			
	updateUrl 				: undefined,						// url to load the chart data from
	cookieId	 			: undefined,						// prefix for the cookie for remembering enable/disabled of this chart
	retryOnUpdateFailure	: true,
	deferDrawInterval		: 0.1,				// defer chart initialization to make sure things are set up properly
    failCount               : 0,

	// explicitly DO NOT update on enable -- the chart will do it itself
	enable : function() {
		this.toggleCookies("+enabled","-disabled");
		this.enabled = true;
		if (this._drawn) this.startUpdateTimer();
	},

	
	onDraw : function(parent) {
		if (!this.chartObjectId) this.chartObjectId = this.id + "__chart";
		var chartObject = new FusionCharts(this.flashFileUrl,
                                           this.chartObjectId,
                                           this.width, 
                                           this.height, 
                                           '0', // debug  
                                           '1');  // register JS

		// NOTE: ideally, we'd only do the 'setDataURL' call    if (this.enabled)
		//			but that's causing rendering headaches, so just always set it
		var url = this.getUpdateUrl();
		if (url) {
			chartObject.setDataURL(encodeURIComponent(url));
		} else {
			// if no
			chartObject.setDataXML("<chart></chart>");
		}
		chartObject.render(parent);
	},
	
	onUpdateSucceeded : function(request, skipAnimation) {
		var chartObject = this.getChartObject();
		if (!chartObject || !chartObject.setDataXML) {
            // there is a race between creating and initializing the
	      // Flash object and the first update, so ignore the
	      // error and try again, unless it persists across
	      // several retries.
			this.failCount++;
			if (this.failCount > 5) {
                // warn on persistent failure
                return this.warn("onUpdateSucceeded(): chart object with id "+this.chartObjectId+" not found");
            } else {
				// try again in 50 ms
				var retry = this.onUpdateSucceeded.bind(this);
				setTimeout(function() {retry(request, skipAnimation)}, 100);
                return;
            }
        }
		chartObject.setDataXML(request.responseText);
        this.failCount = 0;          // reset on successful update
	},


	getChartObject : function() {
		return infosoftglobal.FusionChartsUtil.getChartObject(this.chartObjectId);
	},
	
    setXML : function(xml) {
        // if we're already waiting for old XML to load, forget it (this should be newer data anyway)
        if (this._setXMLTimer) clearTimeout(this._setXMLTimer);
        delete this._setXMLTimer;
        
        var chart = this.getChartObject();
        // if the chart is not ready, defer
        if (!this._drawn || !chart || !chart.setDataXML) {
	  // console.log("deferring setXML");
	  chart = this;
	  this._setXMLTimer = setTimeout(function() { chart.setXML(xml) }, 100);
	  return;
        }

        // if we get here, the chart is OK to set data now
        chart.setDataXML(xml);
        // console.log("chart.setXML finished");
    }
});
