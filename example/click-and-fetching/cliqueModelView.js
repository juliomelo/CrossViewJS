function teste() {
	return {
		cliques : 0,
		
		testar : function() { 
			this.cliques++;
			this.updateView();
		}
	};
}
