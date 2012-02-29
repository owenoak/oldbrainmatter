var User = Gear6.User = Class.create(DataWidget, 
{
	klass 				: "Gear6.User",
    operationPrefix : "Gear6.User.",
	operations : {
     	 "Gear6.User.saveUser" : {
			url : '/admin/launch?script=rh&template=get_user_info'
                    +"&var_op=save",
            onSuccess : function(transaction, request) {
                var user = transaction.params.target;
                user.flashMessage(user.userSaveSucceeded);
                user.scheduleRedraw();
            }
        },
		"Gear6.User.deleteUser" : {
			url : "/admin/launch?script=rh&template=get_user_info"
                +"&var_op=delete&var_name=#{target.data.id}",
			parameters	: {
				'var_change'  : 'delete',
				'var_service' : '#{target.data.id}',
				'action10'    : 'config-form-list',
				'd_row_sdfsd' : 'row_#{target.data.id}',
				'v_row_sdfsd' : '/auth/passwd/user/#{target.data.id}',
				'c_row_sdfsd' : '-',
				'e_row_sdfsd' : 'false',
				'f_row_sdfsd' : 'on',
                'remove'      : 'DELETE+USER'
            },
            onSuccess : function(transaction, request) {
                var user = transaction.params.target;
                user.flashMessage(user.deleteUserSucceeded);
                // oh this is ugly but we have to destroy the UserTable's cached user
                // so they don't get redrawn, since they no longer exist.
                //
                // NOTE array can be sparse if users have been deleted since the page 
                // loaded.  This explains the test against undefined.
                for (i = 0; i < Gear6.UserTable.Instances[0].users.length; i++) {
                    if (Gear6.UserTable.Instances[0].users[i] != undefined) {
                        if (user.data.id == Gear6.UserTable.Instances[0].users[i].data.id) {
                            // take him out of the table, both by index and by ID
                            delete Gear6.UserTable.Instances[0].users[i];
                            delete Gear6.UserTable.Instances[0].users[user.data.id];
                            break;
                        }
                    }
                }
                // Also delete the user from the User object instances list
                for (i = 0; i < Gear6.User.Instances.length; i++) {
                    if (Gear6.User.Instances[i] != undefined) {
                        if (Gear6.User.Instances[i].data.id == user.data.id) {
                            delete Gear6.User.Instances[i];
                            break;
                        }
                    }
                }
                // user.scheduleRedraw();
                page.update();
            }
        },
     	 "Gear6.User.savePassword" : {
            url : '/admin/launch?script=rh&template=get_user_info&var_op=password',
            onSuccess : function(transaction, request) {
                var user = transaction.params.target;
                user.flashMessage(user.userPasswordSucceeded);
                user.scheduleRedraw();
            }
        }
	},
	
	data : {
        
            id  	  : "",
            firstName : "",
            lastName  : "",
            email     : "",
            enabled   : true,
            password  : "",
            role      : 'monitor'
	},
	
	//
	//	messages
	//
	messages : {
        role : {
            admin        : "admin",
            monitor      : "monitor",
            unprivileged : "unprivileged"
    	}
    }
});


// register the operations that we can perform
Page.registerOperations(Gear6.User.operations);
Page.registerOperations(Gear6.User.prototype.operations);
