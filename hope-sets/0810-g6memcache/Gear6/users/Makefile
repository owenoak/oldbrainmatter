#  Makefile
#
#  Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/Gear6/users/Makefile,v $
#  Revision:  $Revision: 1.2 $
#  Date:      $Date: 2009-09-15 23:38:25 $
#  Author:    $Author: berry $
# 
#  (C) Copyright 2002-2005 Tall Maple Systems, Inc.  
#  All rights reserved.
#

include ${PROD_TREE_ROOT}/src/mk/common.mk

FILES_INSTALL_DIR=/lib/web/content/js/Gear6/users

FILES= \
	users.js	 \
	UserTable.js \
	User.js		 \
	page.js 	 \



users.js: \
          ../Page.js \
          ../UserTable.js \
          UserTable.js \
          ../User.js \
          ../User.editor.js \
          ../User.password.js \
          User.js \
          page.js
	../../mkLib $+ > $@


include ${PROD_TREE_ROOT}/src/mk/files.mk



