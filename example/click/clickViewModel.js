function clickViewModel() {
    this.clicks = 0;
}

clickViewModel.prototype.test = function() {
    this.clicks++;
    this.updateView();
};
