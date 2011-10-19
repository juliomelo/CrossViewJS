function clickViewModel() {
	return {
		clicks : 0,
		
		test : function() { 
			this.clicks++;
			this.updateView();
		}
	};
}
