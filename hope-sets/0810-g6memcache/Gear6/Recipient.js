var Recipient = Gear6.Recipient = Class.create(DataWidget, 
{
	klass 				: "Gear6.Recipient",
    operationPrefix : "Gear6.Recipient.",
	operations : {
     	 "Gear6.Recipient.saveRecipient" : {
			url : '/admin/launch?script=xg',
            evalJS : false,
            onSuccess : function(transaction, request) {
                var recipient = transaction.params.target;
                recipient.flashMessage(recipient.recipientSaveSucceeded);
                recipient.scheduleRedraw();
            }
        },
		"Gear6.Recipient.deleteRecipient" : {
			url : '/admin/launch?script=xg',
            evalJS : false,
            method : 'post-noencode',
            parameters	: "",  // to be filled in by onDeleteRecipient
            onSuccess : function(transaction, request) {
                var recipient = transaction.params.target;
                recipient.flashMessage(recipient.deleteRecipientSucceeded);
                // oh this is ugly but we have to destroy the RecipientTable's cached recipient
                // so they don't get redrawn, since they no longer exist.
                //
                // NOTE array can be sparse if recipients have been deleted since the page 
                // loaded.  This explains the test against undefined.
                for (i = 0; i < Gear6.RecipientTable.Instances[0].recipients.length; i++) {
                    if (Gear6.RecipientTable.Instances[0].recipients[i] != undefined) {
                        if (recipient.data.name == Gear6.RecipientTable.Instances[0].recipients[i].data.name) {
                            // take him out of the table
                            Gear6.RecipientTable.Instances[0].recipients.splice(i,1);

                            break;
                        }
                    }
                }
                // Also delete the recipient from the Recipient object instances list
                for (i = 0; i < Gear6.Recipient.Instances.length; i++) {
                    if (Gear6.Recipient.Instances[i] != undefined) {
                        if (Gear6.Recipient.Instances[i].data.name == recipient.data.name) {
                            Gear6.Recipient.Instances.splice(i,1);
                            break;
                        }
                    }
                }
                page.update();
            }
        }
	},
	
	data : {
        name  	       : "",
        get_detail     : false,
        get_infos      : false,
        get_failures   : false
	},

    deleteXMLPostTemplate : new Template(
        "<xg-request> \
          <set-request> \
           <nodes> \
            <node> \
                <name>/email/notify/recipients/#{data.name}</name> \
                <subop>delete</subop> \
            </node> \
           </nodes> \
          </set-request> \
        </xg-request> \
    ")
});


// register the operations that we can perform
Page.registerOperations(Gear6.Recipient.operations);
Page.registerOperations(Gear6.Recipient.prototype.operations);
