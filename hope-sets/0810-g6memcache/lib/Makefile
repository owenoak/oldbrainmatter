#  Makefile
#
#  Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/lib/Makefile,v $
#  Revision:  $Revision: 1.9 $
#  Date:      $Date: 2009-11-10 02:00:27 $
#  Author:    $Author: berry $
# 
#  (C) Copyright 2002-2005 Tall Maple Systems, Inc.  
#  All rights reserved.
#

include ${PROD_TREE_ROOT}/src/mk/common.mk

FILES_INSTALL_DIR=/lib/web/content/js/lib

FILES= \
	AutoUpdater.js			\
	Chart.js				\
	ClickMask.js			\
	CompositeWidgetMixin.js	\
	Control.js				\
	CookieMixin.js			\
	DataGrid.js				\
	DataWidget.js			\
	DateSelector.js			\
	Dialog.js				\
	DynaForm.js				\
	ExpanderMixin.js		\
	ItemSelector.js			\
	ListSelector.js			\
	MasterWidget.js  		\
	Menu.js					\
	Notifier.js				\
	Operator.js				\
	Page.js					\
	PopupForm.js			\
	ProtoWidget.js			\
	RangeSlider.js			\
	Section.js				\
	Slider.js				\
	TabContainer.js			\
	Tooltip.js              \
	UpdatingWidgetMixin.js	\
	prototype.extensions.js \
	g6lib.js				\

#
# Make a single JS file out of all these libraries.
# Not all pages will need them but once this file is 
# cached in the browser, we won't need to load it again.
#
g6lib.js: 	\
	ProtoWidget.js          \
	Notifier.js             \
	AutoUpdater.js          \
	DataWidget.js           \
	CookieMixin.js          \
	ExpanderMixin.js        \
	AutoUpdater.js			\
	UpdatingWidgetMixin.js	\
	ProtoWidget.js			\
	Section.js				\
	DataGrid.js				\
	Chart.js				\
	MasterWidget.js         \
	Notifier.js				\
	ClickMask.js            \
	Dialog.js               \
	DynaForm.js             \
	PopupForm.js            \
	Control.js              \
	Slider.js				\
	TabContainer.js			\
	Tooltip.js              \
	ItemSelector.js			\
	RangeSlider.js			\
	Page.js	
	../mkLib $+ > $@



include ${PROD_TREE_ROOT}/src/mk/files.mk

