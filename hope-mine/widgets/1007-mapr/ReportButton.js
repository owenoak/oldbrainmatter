/*	"ReportButton" manages a list of reports
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");


// on construction or in config object, you must pass:
//		page:  pointer to the report page
//
mapr.widgets.ReportButton = Ext.extend(mapr.widgets.MenuButton, {
	checkHandler : function(title){ this.page.onSelectReport(title) },

	constructor : function(cfg) {
		var page = cfg.page;
		if (!page) throw "new ReportButton(): must set .page";
		if (!page.reports) throw "new ReportButton(): page must have .reports";
		
		this.items = util.keys(page.reports);
		
		mapr.widgets.ReportButton.superclass.constructor.call(this, cfg);

		// set us up as the reportButton of the page so we can reflect the selected report properly
		page.reportButton = this;
	}
});
Ext.reg("reportbutton", mapr.widgets.ReportButton);



})();			// end hidden from global scope
