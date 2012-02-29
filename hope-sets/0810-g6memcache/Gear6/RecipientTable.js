if (!window.Gear6) window.Gear6 = {};

// show an appliance alert recipient.

var U = Gear6.RecipientTable 
    = window.RecipientTable 
    = DataWidget.createMasterWidget("RecipientTable", "recipient", "recipients", "recipientTable", 
                                                 "Gear6.Recipient", false);

Object.extend(Gear6.RecipientTable, 
{
	beginOperation : function(operationId, params) {
		if (this.operationPrefix) operationId = this.operationPrefix + operationId;
		if (!params) params = {};
		if (!params.target) params.target = this;
		return page.beginOperation(operationId, params);
	},

        operationsPrefix : "RecipientTable.", 
        updateOperation : 'RecipientTable.update',
    	operations : {
		//
		//	update all services on the page
		//
            'RecipientTable.update' : {
                url : '/admin/launch?script=xg&name=/email/notify/recipients/**',
                evalJS : false, // we're getting XML. don't "eval" it
                method : 'get',
                onSuccess	: function(transaction, request) {
                    var xml = transaction.responseXML;
                    var table = Gear6.RecipientTable.byId('recipientTable', true);
                    forEachTag(xml, "node", function(node){
                               var c = parseXMLChildren(node);
                               if (c.type=="string" && c.value.length > 0) {
                                   table.setRecipient(c.value, {"name": c.value});
                               } else {
                                   var a = c.name.split("/");
                                   //    /email/notify/recipients/bob@foo.com/get_detail
                                   // 0      1    2           3         4         5
                                   var prop = a[5];
                                   var data = new Object;
                                   data[prop] = c.value;
                                   table.setRecipientData(a[4], data);
                               }
                           });
                }
            } 
        }
 });
    
//
// register the operations that we can perform
//

Page.registerUpdateOperation(RecipientTable.updateOperation);
Page.registerOperations(RecipientTable.operations);
if (RecipientTable.prototype.operations != undefined) {
    Page.registerOperations(RecipientTable.prototype.operations);
 }
