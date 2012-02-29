#  Makefile
#
#  Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/Makefile,v $
#  Revision:  $Revision: 1.14 $
#  Date:      $Date: 2009-09-18 00:26:54 $
#  Author:    $Author: berry $
# 
#  (C) Copyright 2002-2005 Tall Maple Systems, Inc.  
#  All rights reserved.
#

include ${PROD_TREE_ROOT}/src/mk/common.mk

FILES_INSTALL_DIR=/lib/web/content/js

FILES= \
	library.js        \
	.htaccess         \
	cSliderEventHandler.js	\
	cSlider.js	      \
	cSliderLibCrossBrowser.js	\
	popupmenu.js	  \
	script.js	      \
	validation.js     \
	sortTable.js      \
	percent_bar.js    \
	configUtils.js    \
	upgrade.js        \
	prototype.js      \
	scriptaculous.js  \
	builder.js        \
	effects.js        \
	dragdrop.js       \
	controls.js       \
	slider.js         \
	FusionCharts.js   \

SUBDIRS=  \
	lib   \
	Gear6


library.js: script.js validation.js sortTable.js percent_bar.js prototype.js \
		lib/prototype.extensions.js \
		scriptaculous.js builder.js effects.js dragdrop.js \
        controls.js slider.js 
	./mkLib $+ > $@

include ${PROD_TREE_ROOT}/src/mk/files.mk

