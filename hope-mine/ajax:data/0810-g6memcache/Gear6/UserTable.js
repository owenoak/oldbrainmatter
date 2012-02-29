if (!window.Gear6) window.Gear6 = {};

// show an appliance user.

var U = Gear6.UserTable 
    = window.UserTable 
    = DataWidget.createMasterWidget("UserTable", "user", "users", "userTable", 
                                                 "Gear6.User", false);

Object.extend(Gear6.UserTable, 
{
	beginOperation : function(operationId, params) {
		if (this.operationPrefix) operationId = this.operationPrefix + operationId;
		if (!params) params = {};
		if (!params.target) params.target = this;
		return page.beginOperation(operationId, params);
	},

        operationsPrefix : "UserTable.", 
        updateOperation : 'UserTable.update',
    	operations : {
		//
		//	update all services on the page
		//
            'UserTable.update' : {
    			url			: '/admin/launch?script=rh&template=get_user_info',
                testUrl 	: '/test/data/user/get_user_info.js',
                onSuccess	: function(transaction, request) {
                    var user = transaction.params.target;
                }
            },
            // change/create user
            "UserTable.change" : {
			    url : "/admin/launch?script=rh&template=users&var_op=change&var_name={target.name}",
                onSuccess : function(transaction, request) {
                    console.log("saved!");
                }
            },
            // delete user
            "UserTable.delete" : {
			    url : "/admin/launch?script=rh&template=users&var_op=delete&var_name={target.name}",
                onSuccess : function(transaction, request) {
                    console.log("deleted!");
                }
            },
            // change password
            "UserTable.password" : {
			    url : "/admin/launch?script=rh&template=users&var_op=password&var_name={target.name}",
                onSuccess : function(transaction, request) {
                    console.log("password changed!");
                }
            }
        }
 });
    
//
// register the operations that we can perform
//

Page.registerUpdateOperation(UserTable.updateOperation);
Page.registerOperations(UserTable.operations);
if (UserTable.prototype.operations != undefined) {
    Page.registerOperations(UserTable.prototype.operations);
 }
