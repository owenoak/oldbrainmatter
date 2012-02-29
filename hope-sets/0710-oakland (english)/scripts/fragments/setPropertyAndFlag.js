		
		protected function _setPropertyAndFlag(turnOn, _fromParent, flag, onMethod, offMethod) {
			_fromParent = _fromParent != true;
			var flagWasSet = _fromParent ? !show : this.parentsFlagIsSet(flag),
				wasShown = this[flag] != true && flagWasSet
			;
			if (!_fromParent) {
				if (show) 	delete this[flag];
				else		this[hidden] = true;
			}
			var isShown = this[flag] != true && flagWasSet;
			if (isShown == wasShown) return;
			
			var childMethod = isShown ? onMethod, offMethod;
			this.setFlag(flag, !isShown);
			this.forEachChild(childMethod, true);
			this.fireEvent(childMethod);			
		}
		
