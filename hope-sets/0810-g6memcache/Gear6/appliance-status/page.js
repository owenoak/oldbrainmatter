
// create the ChartSection and the Chart
// TODO: base this on new Section()
var chartSection = new Section({
	id 				: "chartSection",
	parentId		: "contentHolder",
	templateId 		: "SectionTemplate",
	cookieId	 	: "appliance#chartSection",
	title			: "Status of individual Memcache Services",

	children : [
		new Chart({
// TODO: change updateUrl
                updateUrl	: "/admin/launch?script=rh&template=memcache-get-xml",
				id 			: "memcache_get",
				parentId 	: "chartSection_child",
				width		: (Prototype.Browser.IE ? "680" : "100%"),
				height		: "300"
			})	
	]
            }).draw();

var statsTable = new DataGrid({
    sanitizeJSON    : false,
	updateUrl		: "/admin/launch?script=rh&template=get_index_stats",
	id				: "statsTable",
	parentId		: "statsSection_child",
	templateId 		: "StatsTableTemplate",
	updateOnDraw 	: true,
	deferDrawInterval: .1,

	labels : {
		gets 		: "Get Hits/second",
		sets 		: "Sets/second",
		reads 		: "Bytes Received/second",
		
		misses		: "Get Misses/second",
		evictions	: "Evictions/second",
		writes		: "Bytes Sent/second"
	},

	values : {
		gets 		: "",
		sets 		: "",
		reads 		: "",
		misses		: "",
		evictions	: "",
        writes		: "",
        date        : ""
	},

	// TODO: convert numbers into units (KB, MB, etc)
	updateDisplayValues : function() {
		var values = this.values || {};
		var displayValues = this.displayValues = {};
		for (var prop in values) {
			var value = "" + values[prop],
				displayValue = Math.round(parseInt(value))
			;
			if (isNaN(displayValue)) displayValue = 0;
			if (prop == "reads" || prop == "writes") {
				displayValue = displayValue.toBytesString();
				displayValue = [
					"<span style='cursor:help' title='",value," Bytes'>", displayValue, "</span>"
					].join("");
			}
            if (prop == "date") {
                displayValue = values[prop];
            }
			displayValues[prop] = displayValue;					
		}
		return displayValues;
	}
});

var statsSection = new Section({
	id 				: "statsSection",
	parentId		: "contentHolder",
	templateId 		: "SectionTemplate",
	cookieId	 	: "appliance#statsSection",
    title           : "Performance of " + moduleCount + " Active Memcache Service"
    					+ (moduleCount > 1 ? "s" : ""),
	onChildUpdated	: function() {
		var el = this.$main.select(".Timestamp")[0];
		if (el) el.innerHTML = this.children[0].displayValues['date'];
        // HACK: update chart timestamp here too so they stay in sync
        el = chartSection.$main.select(".Timestamp")[0];
		if (el) el.innerHTML = this.children[0].displayValues['date'];
	},
	children 		: [statsTable]
}).draw();

function selectService(id) {
    // alert ('service '+id+' selected');
    document.location = '/admin/launch?script=rh&template=memcache-stats&var_service=' +id ;
}

