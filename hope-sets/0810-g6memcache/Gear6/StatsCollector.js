// -*- Mode: javascript; javascript-indent-level: 4; indent-tabs-mode: t -*-
// Collect stats from the Gear6 appliance

// ####################
// 
// COLOURS AS SET BY THE MINISTRY OF COLOURS EXECUTIVE
// ORDER G6:TRAN/15JA09-3C12
//
// In dark and light versions for alternating bands.

var opColours = {
    get_hits :     ['99CC00','cce500'],
    get_misses :   ['B42D33','d99699'],
    cmd_get :      ['F47836','f9bb9b'],
    cmd_set :      ['005C8A','00adc4'],
    bytes_read :   ['005c8A','00adc4'],
    bytes_written: ['F47836','f9bb9b'],
    evictions :    ['DE006B','ee00b5'],
    curr_items :   ['666666','b2b2b2'],
    connection_structures :   ['333333','999999'],
    curr_connections :   ['333333','999999'],
    connectTimeUs : ['333333','999999'],
    getTimeUs :    ['F47836','f9bb9b'],
    setTimeUs :    ['005C8A','00adc4']
}

var statDisplayNames = {
  "composite"			: "Overall Statistics",
  "get_hits"			: "Get Hits/sec",
  "get_misses"			: "Get Misses/sec",
  "cmd_get"			: "Gets/sec",
  "cmd_set"			: "Sets/sec",
  "bytes_written"		: "Bytes Sent/sec",
  "bytes_read"			: "Bytes Received/sec",
  "evictions"			: "Evictions/sec",
  "curr_items"			: "Items",
  "curr_connections"		: "Connections",
  "connection_structures"       : "Connection Structures",
  "sync_queue_size"		: "Sync Queue Size",
  "setTimeUs"                   : "Set Response Time (us)",
  "connectTimeUs"               : "Connect Time (us)",
  "getTimeUs"                   : "Get Response Time (us)"
};

var plotBorderThickness = 1,
  plotBorderColor = '6b8e00'
  ;
var statsData = {
    service     : "",
    instances   : [],
    dataset     : "memcache_deltas",
    statname    : "",
    curInstance : null,
    startTimeRaw: 0,
    endTimeRaw  : 0,
    startTime   : 0,
    endTime     : 0,
    caption     : "",
    indicatorTitle: "Live Data"
};

var debugStats = false;
var statsLog = function() {
  if (debugStats == true) {
    console.log.apply(console, arguments);
  }
};


var getDetailsChartData = function(o) {
    var start = new Date();
    //     statsLog("getDetailsChartData: statname = "+ o.detailsType);
    var a = o.detailsRange.split(":");
    // round to nearest second
    var qstart = new Date((Math.floor(parseInt(a[0])/1000))*1000);
    var qend   = new Date((Math.floor(parseInt(a[1])/1000))*1000);

    statsData.startTimeRaw = qstart.getTime();
    statsData.startTime = dateToDateTimeSec(qstart);
    statsData.endTimeRaw = qend.getTime();
    statsData.endTime   = dateToDateTimeSec(qend);
    statsData.statname  = o.detailsType;
    a = o.detailsServices.split("|");

    statsData.service = a[0];
    statsData.instances = [];
    if (statsData.service == "Appliance") {
        // give the "appliance" the pseudo-instance "Appliance" to keep the
        // caching code happy.
        statsData.instances.push("Appliance");
	statsData.caption = "Appliance: "+(statDisplayNames[statsData.statname] || statsData.statname);
    } else {
        for(i=1; i< a.length;i++) {
            b = a[i].split(":");
            statsData.instances.push(b[1]);
        }
	statsData.caption = statsData.service+": "+(statDisplayNames[statsData.statname] || statsData.statname);
    }
    statsLog("getDetailsChartData: "+statsData.instances.length+" instances, statsdata = ", statsData);
    var xml = getFcXML(statsData);
    var end = new Date();
    //    statsLog("getDetailsChartData done in "+(end.getTime()-start.getTime())+" ms");
    return xml;
};

var getFcXML = function(data) {
    var xml = "";

    //    statsLog("Getting "+data.statname+" for service: "+data.service 
    //          +" starting at "+data.startTime);
    maybeGetData(data);
};

// go through the request in "data" and fetch the desired data 
var maybeGetData = function(data) {
    var queryTcl = "",
        stats,
        curInstance = "",
        start, 
        stop, 
        now = new Date()
    ;
    //  figure out which stats we are interested in
    if (statsData.statname == "composite") {
        // "composite" means get these four on a single graph
      stats = ["evictions","cmd_set","get_misses","get_hits"];
    } else {
        // else just get the one, but put it in an array so we can avoid
        // special casing composite later
        stats = [statsData.statname];
    }

    // go through each instance/stat and see if we need to fetch data for
    // it; append to queryTcl string if so.

    // consider each stat in turn.
    stats.each(
	       function(stat){
		 data.instances.each(
				     function(inst){
				       curInstance = inst;
				       statsLog("   request: : "+timeToTimeSec(data.startTimeRaw)+" - "+timeToTimeSec(data.endTimeRaw)
						+" == ("+data.startTimeRaw+", "+data.endTimeRaw,")");
				       start = data.startTime;
				       stop = data.endTime;
				       queryTcl += addToQuery(data.service, inst, stat, data.startTimeRaw, data.endTimeRaw, now);
				     });
		 // done with stats
	       });
    // done with instances
    
    // Finish up the query for the AJAX postBody so the server side script can decode it
    queryTcl = "query="+ queryTcl;
    
    var url = '/admin/launch?script=rh&template=get_mc_stats',
            callParams = {
            method: "post",
            asynchronous: true,
            evalJS: false,
            postBody: queryTcl, 
            onSuccess: finishUpdate
        };

        // we have the request, send it
        var response = new Ajax.Request(url, callParams);
};

var addToQuery = function(service, inst, stat, start, stop, now) {
  var querystring,
      delta = now.getTime() - stop
      ;

    //    statsLog("making query for "+inst+"/"+stat+" with ("+start+" - "+stop+")");
    querystring = "{service "+service+" instance "+inst+"  stat "+stat
  +" start \""+start+"\" stop \""+((delta < 30000)?"NOW":stop)+"\"} ";
    return querystring
};

var finishUpdate = function(response) {
    statsLog("finishUpdate: response = ", response);
    var xml = makeXML(statsData, response);
    statsLog("GOT GRAPH XML: ");
    page.detailsChart.setXML(xml);
    var now =  new Date();
    statsLog("finishUpdate: setXML done "+now.toShortString());
    return xml;
};

var mkToolTip = function(stat, v, t) {
  var s = (statDisplayNames[stat] || stat),
      val = v, 
      suffix = ""
      ;
  if (v > 1000) {
    v = v / 1000.0;
    suffix = "K";
    if (v > 1000) {
      v = v / 1000.0;
      suffix = "M";
      if (v > 1000) {
	v =  v / 1000.0;
	suffix = "G";
      }
    }
    val = v.toFixed(2).toString() + suffix;
  }
  return s+": "+val+ "&lt;BR&gt;" + t;
};

var makeXML = function(data, response) {
    statsLog("makeXML data=", data);
    var cats = "",
        datasets = [],
        datasetNames = [],
        colourIndex = 0,
        enabled = "true",
        start = new Date(),
        a = [],
        service = "",
        instance = "",
        stat = "",
        label = "",
        n = 0,
        doTooltips = true;
        ;
    eval(response.responseText); // turn the JSON-ish response into JS objects
    
    if (data.instances.length == 0) {
        // no instances selected, therefore no stats for YOU
      data.reason = "has no selected instances, no stats available";
      return fcXMLDisabled.evaluate(data);
    }
    var cats = "<categories>\n";
    data.labelStep = 10;
    
    var svc = ServiceTreeSelectors[0].getServiceObject(data.service);
    if (svc != undefined && svc.enable != undefined) 
        enabled = svc.enable;

    if (enabled == "false") {
        // disabled service, therefore no stats for YOU  XXX need to fix this
      data.reason = "is disabled, no stats available";
      return fcXMLDisabled.evaluate(data);
    }

    doTooltips = (data.statname != "composite")
    for (var i = 0; i < s.length; i++) {
      colourIndex++;
      a = s[i].split("/");
      service  = a[0];
      instance = a[1];
      if (stat != a[2]) colourIndex = 0; // reset for new stat
      stat     = a[2];
      label    = stat +"/" +instance;
      d[i].each(function(pt){
	  if (i == 0) {
	    cats += "  <category label='"
	      + pt.t		// server script get_mc_stats.tem formatted time stamp for us
	      +"' />\n";
	  }
	  if (datasets[label] == undefined) {
	    datasets[label] =  "<dataset seriesname='"+stat
	      +"' showValues='0' color='"
	      +opColours[stat][colourIndex%2]  // XXX
	      +"' areaBorderColor='ffffff' "
	      +"plotBorderThickness='"+plotBorderThickness+"' "
	      +"plotBorderColor='"+plotBorderColor+"'>\n";
	    datasetNames.push(label);
	  }
	  if (doTooltips) {
	    datasets[label] += "<set value='" +pt.v+ "' toolText='"
	                       +mkToolTip(data.statname, pt.v, pt.t)+"' />\n";
	  } else {
	    datasets[label] += "<set value='" +pt.v+ "' />\n";
	  }
	  n++;
	});
    }

    // close off dataset tags and concatenate the datasets
    var datasetXML = "";
    datasetNames.each(function(dn) { 
        datasetXML += (datasets[dn] + "</dataset>\n");
    });
    cats += "</categories>\n";
    var numsteps = n/s.length;
    if (n == 0) {
      // we got no data, make fake zeros for the segment.
      statsLog("makeXML: making fakeup for missing data");
      cats = "<categories>\n";
      datasetXML = "<dataset seriesname='dummy' showvalues='0'> \n";
      n = 0;
      for (var tm = data.startTimeRaw; tm <= data.endTimeRaw; tm += 100000) {
	cats += "  <category label='"+timeToTimeSec(tm)+"' />\n";
	datasetXML +=  "  <set value='0' />\n";
	n++;
      }
      numsteps = n;
      cats += "</categories>\n";
      datasetXML += "</dataset>\b";
    }
    // adjust label spacing depending on how many points we have
    data.labelStep = Math.floor((numsteps>100)?(numsteps/10):10);
    var end = new Date();
    statsLog("makeXML: made "+n+" points, step "+data.labelStep+", from "+data.startTimeRaw+" to "
		+data.endTimeRaw +" in "+(end.getTime() - start.getTime())+" ms");
    return fcXMLHeader.evaluate(data) + cats + datasetXML + fcXMLTrailer;
}

var dateToDateTimeSec = function(d) {
    year = d.getYear() + 1900;  // geeze, it's 2009, is JS still this broken?
    dts = year +"/"+(d.getMonth()+1).pad(2) +"/"+d.getDate().pad(2) 
    +" "+d.getHours().pad(2) +":"+ d.getMinutes().pad(2) +":"+d.getSeconds().pad(2);
    return dts;
}

var timeToTimeSec = function(ts) {
    var d = new Date(ts);
    var dts = d.getHours().pad(2) +":"+ d.getMinutes().pad(2) +":"+d.getSeconds().pad(2);
    return dts;
}

  var fcXMLDisabled = new Template(" \
<?xml version=\"1.0\" encoding=\"ISO-8859-15\"?> \
<chart  showValues='0'  \
		numVDivLines='0'  \
		animation='0'  \
        labelDisplay='Rotate' \
        slantLabels='1' \
		labelStep='#{labelStep}'  \
		showLegend='0'  \
		bgColor='ffffff' \
		plotGradientColor=''  \
		plotBorderThickness='0'  \
		drawAnchors='1' \
		anchorRadius='1' \
		anchorBorderThickness='0' \
		anchorAlpha='0' \
		anchorSides='3' \
		anchorBgColor='666666' \
		anchorBorderColor='666666' \
        caption='Service #{service} #{reason}' \
 	> \
<categories> \
  <category label='' /> \
</categories> \
<dataset seriesname='no data'> \
  <set value='0'/> \
</dataset> \
<styles> \
  <definition> \
   <style name='TTipFont' type='font' isHTML='1' /> \
  </definition> \
  <application> \
   <apply toObject='TOOLTIP' styles='TTipFont' /> \
  </application> \
 </styles> \
</chart> ");

var fcXMLHeader = new Template(" \
<?xml version=\"1.0\" encoding=\"ISO-8859-15\"?> \
<chart  caption='#{caption} (#{indicatorTitle})'  \
        showValues='0'				 \
	numVDivLines='0'			 \
	animation='0'				 \
        labelDisplay='Rotate'			 \
        slantLabels='1'				 \
	labelStep='#{labelStep}'		 \
	showLegend='0'				 \
	bgColor='ffffff'			 \
	plotGradientColor=''			 \
	plotBorderThickness='0'			 \
	drawAnchors='1'				 \
	anchorRadius='1'			 \
	anchorBorderThickness='0'		 \
	anchorAlpha='0'				 \
	anchorSides='3'				 \
	anchorBgColor='666666'			 \
	anchorBorderColor='666666'		 \
        hoveronEmpty='0'			 \
	> ");


var fcXMLTrailer = "<styles>                        \
  <definition>					    \
   <style name='TTipFont' type='font' isHTML='1' /> \
  </definition>					    \
  <application>					    \
   <apply toObject='TOOLTIP' styles='TTipFont' />   \
  </application>				    \
 </styles>					    \
</chart> ";
