#  Makefile
#
#  Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/Gear6/recipients/Makefile,v $
#  Revision:  $Revision: 1.1 $
#  Date:      $Date: 2009-09-15 21:54:35 $
#  Author:    $Author: berry $
# 
#  (C) Copyright 2002-2005 Tall Maple Systems, Inc.  
#  All rights reserved.
#

include ${PROD_TREE_ROOT}/src/mk/common.mk

FILES_INSTALL_DIR=/lib/web/content/js/Gear6/recipients

FILES= \
	recips.js           \
	Recipient.js 		\
	RecipientTable.js 	\
	page.js

recips.js: ../Page.js  \
		../RecipientTable.js  \
        ../recipients/RecipientTable.js  \
        ../Recipient.js  \
        ../Recipient.editor.js  \
        Recipient.js  \
        page.js  
	../../mkLib $+ > $@



include ${PROD_TREE_ROOT}/src/mk/files.mk



