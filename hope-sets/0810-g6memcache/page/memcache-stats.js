
//
// customize the Chart object for the working of this page
//
var MemcacheChart = Class.create(Chart, {
     klass    : "MemcacheChart",
 
     baseUrl    : '/admin/launch?script=rh&template=memcache-get-xml',
     initializeProperties : function($super) {
         $super();
         if (this.chds == null) {
             // master chart
             this.applianceURL = this.baseUrl + "&var_op=series";
             this.serviceURL  = this.baseUrl + "&var_op=series&var_service=";
             this.width    = (Prototype.Browser.IE ? "680" : "100%");
             this.height   = "300";
   
         } else {
             this.applianceURL = this.baseUrl + "&var_op=ops&var_mcop=" + this.chds;
             this.serviceURL  = this.baseUrl + "&var_op=ops&var_mcop=" + this.chds + "&var_service=";
             this.width    = (Prototype.Browser.IE ? "320" : "100%");
             this.height   = "150";
         } 
     },

     getUpdateUrl : function() {
         return (currentService == "Appliance" ? this.applianceURL : this.serviceURL + currentService);
     }
     });

function selectService(svc) {
    currentService = svc;

    // update the elements which hold the name of the service
    var title = (currentService == "Appliance" ? " Web Cache Appliance" : " service '"+currentService+"'");
    $$(".serviceTitle").invoke("update", title);

    if (packages[svc] == "memcached-gear6") {
        Sections.syncSection.show();
    } else {
        Sections.syncSection.hide();
    }

    MemcacheCharts.invoke("update");
}

var statsTabs = new TabContainer({
    id : "statsTabs",
 
     onselect : selectService,
 
     children : []
}).draw();

statsTabs.addChild(
 new Section({
     id    : "masterSection",
             cookieId  : "masterSection",
             templateId   : "ChartMasterSectionTemplate",
             children  : [
                          new MemcacheChart({ 
                              parentId:"masterSection_Master", 
                                      id    : "Master", 
                                      chds  : null,
                                      title : "Overall Statistics for" })
                          ]
             }),
 
 new Section({
     id    : "getsHitsSection",
             cookieId  : "getsHitsSection",
             templateId   : "ChartSectionTemplate",
             expanded  : false,
             children  : [
                          new MemcacheChart({ 
                              parentId:"getsHitsSection_Get_Hits", 
                                      id    : 'Get_Hits',
                                      chds  : 'get_hits',
                                      title : "Get Hits/sec for" }),
                          new MemcacheChart({ 
                              parentId:"getsHitsSection_Get_Misses", 
                                      id    : 'Get_Misses', 
                                      chds  : 'get_misses', 
                                      title : "Get Misses/sec for" })
                          ]
             }),
 
 new Section({
     id    : "getsSection",
             cookieId  : "getsSection",
             templateId   : "ChartSectionTemplate",
             expanded  : false,
             children  : [
                          new MemcacheChart({ parentId:"getsSection_Gets",  id: 'Gets',     chds: 'cmd_get', title: "Gets/sec for" }),
                          new MemcacheChart({ parentId:"getsSection_Sets",   id: 'Sets',     chds: 'cmd_set', title: "Sets/sec for" })
                          ]
              }),
 
 new Section({
     id    : "bytesSection",
     cookieId  : "bytesSection",
     templateId   : "ChartSectionTemplate",
     expanded  : false,
     children  : [
        new MemcacheChart({ 
            parentId:"bytesSection_Bytes_Written",   
            id: 'Bytes_Written',  
            chds: 'bytes_written', 
            title: "Bytes Sent/sec for" }),
        new MemcacheChart({ 
            parentId:"bytesSection_Bytes_Read",   
            id: 'Bytes_Read',  
            chds: 'bytes_read', 
            title: "Bytes Received/sec for" })
        ]
 }),
 
 new Section({
     id    : "evictionsSection",
     cookieId  : "evictionsSection",
     templateId   : "ChartSectionTemplate",
     expanded  : false,
     children  : [
          new MemcacheChart({ 
              parentId:"evictionsSection_Evictions",  
              id: 'Evictions',   
              chds: 'evictions',   
              title: "Evictions/sec for" }),
          new MemcacheChart({ 
              parentId:"evictionsSection_Items",  
              id: 'Items',  
              chds: 'curr_items',  
              title: "Items for" })
          ]
 }),
 
 new Section({
     id    : "itemsSection",
     cookieId  : "itemsSection",
     templateId   : "ChartSectionTemplate",
     expanded  : false,
     children  : [
          new MemcacheChart({ 
              parentId:"itemsSection_Connection_Structures",   
              id: 'Connection_Structures',
              chds: 'connection_structures',  
              title: "Connection Structures for" }),
          new MemcacheChart({ 
              parentId:"itemsSection_Connections",   
              id: 'Connections',  
              chds: 'curr_connections', 
              title: "Connections for" })
          ]
 }),
 
 new Section({
    id         : "syncSection",
    cookieId   : "syncSection",
    templateId : "ChartSectionTemplate",
    expanded   : false,
    children   : [
        new MemcacheChart({ 
            parentId :"syncSection_sync_queue_size1", 
            id: 'Sync_Queue_Size1',
            chds: 'sync_queue_size1', 
            title: "Sync Queue size (instance 1) for" }),
        new MemcacheChart({ 
            parentId:"syncSection_sync_items_processed2",    
            id: 'Sync_Items_Processed2',   
            chds: 'sync_queue_size2',  
            title: "Sync Queue size (instance 2) for" })
    ]
  })
);

// add tabs for all of the services
for (var i = 0; i < services.length; i++) {
    var service = services[i];
    statsTabs.addTab({ tabid:service, title:service, selected:(currentService == service) });
 }
