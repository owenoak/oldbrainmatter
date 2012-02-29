
(function($) {	// begin hidden from global scope

//
// "Traffic" page for the Memcache service
//

new gear6.MemcachePage.subclass({
	reference : "gear6.TrafficPage",

	Class : {
		// graphStart and graphEnd are the smae for all Traffic pages
		// default to the past hour
		graphStart		: -1 * $.date.MSEC_PER_HOUR,
		graphEnd		: "now" 
	},

	prototype : {
		displayElements : ["#overview","#memcachePageSelector","#rightColumn"],
		Loader : gear6.MemcacheController.MemcacheTrafficLoader,

		// items are the same for all instances
		items : [],

		getStart : function() {
			if (this.Class.graphEnd == "now") {
				return Math.round(this.Class.graphStart / 1000);  // convert to seconds for the server
			} else {
				return $.date.printIso8601(this.Class.graphStart, $.date.timezoneOffset);
			}
		},
		
		getEnd : function() {
			if (this.Class.graphEnd == "now") {
				return "now"
			} else {
				return $.date.printIso8601(this.Class.graphEnd, $.date.timezoneOffset);
			}
		},
		
		getSamples : function() {
			return SC.config.maxDataSamples;
	//REFACTOR
	//		var width = $.chart.getWidth() || SC.config.maxDataSamples;
	//		return Math.min(SC.config.maxDataSamples, width);
		},
		
		setRange : function(start, end) {
			this.Class.graphStart = start;
			this.Class.graphEnd = end;
			app.refresh();
		},

		getColor 		: function(){	return $.message("traffic.color."+this.dataId)},
		
		template : 
		   "<div id='trafficWindow' class='Window INLINE'>"
		 + "	<div class='Header NOSELECT'>"
		 + "		<table cellspacing=0 cellpadding=0><tr>"
		 + "      <td id='trafficWindowTitle' class='title'>#{getTitle()}</td>"
		 + "      <td class='label' style='padding:0px 5px;'>#{message:UI.forServer}</td>"
		 + "      <td>"
//		 + "        <div class='label ipLabel selectedMemcacheServer'>"
//		 + "           #{MemcacheController:selection.getTitle()}"
//		 + "        </div>"
		 + "        <button id='statsIpMenu' class='light MenuButton selectedMemcacheServer'"
		 + "          onmousedown='MC.serverMenu.showNear(this)'>"
		 + "			#{MemcacheController:selection.getTitle()}"
		 + "        </button>"
		 + "		</table>"
		 + "	</div>"
		 + "	<div class='Body SQUARE Container'>"
		 + "		<center><span id='trafficLegend'></span></center>"
		 + "		<div id='trafficChartContainer'></div>"
		 + "		<div id='trafficSliderContainer'>#{template:RangeSliderTemplate}</div>"
		 + "	</div>"
		 + "</div>"

		
	}
});



})(jQuery);	// end hidden from global scope
