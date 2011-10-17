/**
 * A MVVM library.
 * 
 * @author Júlio César e Melo
 * 
 * The MIT License (MIT)
 * 
 * Copyright (c) 2011 Júlio César e Melo
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function($) {

	if (!$) {
		throw "jQuery not found!";
	}
	
	if (!$.template) {
		$.getScript("https://raw.github.com/BorisMoore/jsviews/master/jsrender.js");

	}
	if (!window.console) console = {};
	console.log = console.log || function(){};
	console.warn = console.warn || function(){};
	console.error = console.error || function(){};
	console.info = console.info || function(){};
	
	/**
	 * Tells if mapping is being loaded. 
	 */
	var loadingMapping = 0;
	
	var viewModel = {
			bindidSeq : 0,
			instances : [],
			classes : {},
			resources : {},
			
			/**
			 * Tells if binding has been requested.
			 */
			binding : false,
			
			css : {
				error : "mvvm-error"
			},
			
			attributes : {
				error : "data-viewmodel-error",
				bindId : "data-viewmodel-bindid",
				binding : "data-viewmodel",
				command : "data-command",
				className : "data-viewmodel-name"
			},
			
			functions : {
				initialize : "initialize"
			}
	};
	
	var view = {
			templates : {},
			resources : {},
			attributes : {
				binding : "data-view",
				lastRendering : "data-view-rendered"
			}
	};
	
	function notifyError(el, exception) {
		el.addClass(viewModel.css.error);
		el.attr(viewModel.attributes.error, exception);
		
		console.error(exception);
	}
	
	function clearError(el) {
		el.removeClass(viewModel.css.error);
		el.attr(viewModel.attributes.error, null);
	}
	
	/**
     * Creates an instance of View-Model for a jQuery DOM element wrapper.
	 * 
	 * @param el
	 *              jQuery element wrapper.
	 */
	function setViewModel(el, name) {
		if (!viewModel.classes[name])
			notifyError(el, "View-Model class not found: " + name + ".");
		else {
			console.log("Binding " + name + " to " + el);	

			var instance = new viewModel.classes[name]();
			
			instance = $.extend(null, {
				updateView : function() {
					el.find("[" + view.attributes.binding + "]").each(renderView);
				}
			}, instance);
			
			viewModel.instances[viewModel.bindidSeq] = instance; 
			el.attr(viewModel.attributes.bindId, viewModel.bindidSeq++);
			
			// Se o View-Model tiver um método "initialize", então o executa.
			if (viewModel.functions.initialize in instance) {
				$(function() { 
					try {
						instance[viewModel.functions.initialize]();
						clearError(el);
					} catch (e) {
						notifyError(el, e);
					}
				});
			}
		}
	}
	
	/**
     * Gets an instance of the View-Model for an DOM element.
	 * 
	 * @param el
	 *             jQuery element wrapper.
	 */
	function getViewModel(el) {
		var id = el.attr(viewModel.attributes.bindId);
		
		if (!id) {
			id = el.parents("[" + viewModel.attributes.bindId + "]:first").attr(viewModel.attributes.bindId);
			el.attr(viewModel.attributes.bindId, id);
		}
		
		return viewModel.instances[id];
	}

    /**
     * Registers a View-Model class.
     */
	function registerViewModel(name, prototype) {
		viewModel.classes[name] = prototype;
		requestBinding();
	}
	
    /**
     * Initiates View-Model binding if it isn't already started.
     */
	function requestBinding() {
		if (!viewModel.binding) {
			viewModel.binding = true;
			$(bindViewModel);
		}
	}

	/**
     * Binds DOM elements to View-Models.
	 */
	function bindViewModel() {
        viewModel.binding = true;
        
		try {
			$("[" + viewModel.attributes.binding + "]:not([" + viewModel.attributes.bindId + "])").each(function() {
				try {
					var name = $(this).attr(viewModel.attributes.binding);
					
					if (viewModel.classes[name]) {					
						setViewModel($(this), name);
					} else if (viewModel.resources[name]) {
						console.log("Loading javascript for View-Model \"" + name + "\" from " + viewModel.resources[name] + ".");
						
						var that = $(this);
						
						$.get(viewModel.resources[name]).success(function(data) {
							var processedData = null;
							
							eval("processedData = " + data + ";");
														
							registerViewModel(name, processedData);					
							setViewModel(that, name);
						}).error(function(x, e) {
							console.error("Error loading javascript for View-Model \"" + name + "\" from " + viewModel.resources[name] + ": " + e + ".");
						});
					} else if (loadingMapping === 0) {
						console.error("View-Model class \"" + name + "\" not found!");
					}
				} catch (e) {
					notifyError($(this), e);
				}
			});
		} finally {
			viewModel.binding = false;
		}
	}	

	/**
	 * Binds commands to View-Models.
	 */
	function bindCommands() {
		$("a[" + viewModel.attributes.command + "]").live("click", executeCommand);
		$("button[" + viewModel.attributes.command + "]").live("click", executeCommand);
		$("form[" + viewModel.attributes.command + "]").live("submit", executeCommand);
	}
	
    /**
     * Read HTML links of MVVM bindings and do auto-register.
     */
	function autoRegister() {
		$("link[rel='mvvm-mapping']").each(function() {
			var href = $(this).attr("href");
			
			console.log("Loading View-Model class mapping from " + href + ".");
			
			loadingMapping++;
			
			$.getJSON(href).success(function(json) {
				viewModel.resources = json.viewModel;
				view.resources = json.view;
			}).error(function(x, e) {
				console.error("Failed to load View-Model class mapping from " + href + ".");
				throw e;
			}).complete(function() {
				if (--loadingMapping == 0) {
					$(bindViewModel);
					$(loadTemplates);
				}
			});
		});
	}
	
    /**
     * Loads templates for Views.
     */
	function loadTemplates() {		
		if (!$.template) {			
			console.log("$.template does not exist!");
			return;
		}
		
		$("[" + view.attributes.binding + "]:not([" + view.attributes.lastRendering + "])").each(function() {
			var template = $(this).attr(view.attributes.binding);
			
			if (!view.templates[template]) {
				if (view.resources[template]) {
					console.log("Loading template " + template + " from " + view.resources[template] + ".");
					view.templates[template] = view.resources[template];
					$.get(view.resources[template]).success(function(data) {
						console.log("Template " + template + " loaded from " + view.resources[template] + ".");
						$("<script id='mvvm-template-" + template + "' type='text/x-jquery-tmpl'>" + data + "</script>").template(template);
						view.templates[template].loading = false;
						renderViewsFromTemplate(template);
					});
				}
			} else if (!view.templates[template])
				renderView();
		});
	}

    /**
     * Render views that use a specific template.
     */
	function renderViewsFromTemplate(template) {
		$("[" + view.attributes.binding + "='" + template + "']:not([" + view.attributes.lastRendering + "])").each(renderView);
	}
	
    /**
     * Render a view for a jQuery element.
     */
	function renderView() {
		var template = $(this).attr(view.attributes.binding);
		
		console.log("Rendering " + this + " using " + template);
		$(this).attr(view.attributes.lastRendering, new Date());
		$(this).html($.render(template, getViewModel($(this))));
	}

	/**
	 * Executes a command.
	 */
	function executeCommand() {
		var command = $(this).attr(viewModel.attributes.command);
 
		getViewModel($(this))[command](this);
	}

	$(autoRegister);
	$(bindViewModel);
	$(bindCommands);
	$(loadTemplates);
	
	$(window).ajaxComplete(function() {
		$(bindViewModel);
		$(loadTemplates);
	});

})(jQuery);