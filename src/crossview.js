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
	
	// Identify and create a wrapper for template engine.
	var templateEngine = null;
	
    function setupTemplateEngine() {
    	// jsrender - https://github.com/BorisMoore/jsrender
    	if ($.template && $.render) {
    		templateEngine = {
    				setTemplate : function(name, data) {
    					$("<script id='mvvm-template-" + name + "' type='text/x-jquery-tmpl'>" + data + "</script>").template(name);
    				},
    				render : $.render
    		};
    	}
    	// tmpl (beta) - 
    	else if ($.template && !$.render && $.tmpl) {
    		templateEngine = {
    				setTemplate : $.template,
    				render : $.tmpl
    		};
    	}
    }
    
    $(function() {
        setupTemplateEngine();
        
        if (!templateEngine)
            setTimeout(setupTemplateEngine, 150);
    });
    
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
				bindId : "data-viewmodel-instance",
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
			css : {
				fetching : "mvvm-fetching",
                loadingViewModel : "mvvm-fetching",
				error : "mvvm-error"
			},
			attributes : {
				binding : "data-view",
				lastRendering : "data-view-rendered",
				withoutViewModel : "data-view-without-viewmodel",
				jsonPath : "data-json-path",
				jsonUrl : "data-json-url"
			}
	};
	
	var link = {
			autoRegister : "mvvm-mapping"
	};
	
	var config = {
			relativePath : null
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
	 * Get an absolute URL for a path.
	 */
	function getAbsoluteURL(path) {
		if (!config.relativePath || path.indexOf("://") >= 0 || path.charAt(0) == "/")
			return path;
		else
			return config.relativePath + path;
	}
	
	/**
	 * Set a relative path for RESTful services. 
	 */
	function setRelativePath(url) {
		if (url.charAt(url.length - 1) == "/")
			config.relativePath = url;
		else
			config.relativePath = url + "/";
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
            var instanceId = ++viewModel.bindidSeq;
			
			instance = $.extend(null, {
				updateView : function() {
					this.container.find("[" + view.attributes.binding + "]").each(renderView);
				},
				
				setData : function(data) {
					this.data = data;
				},
                
                instanceId : instanceId,
                
                container : el,
                
                getRenderData : function() {
                	return this;
                },
                
                getData : function(attribute) {
                	if (!attribute) {
                		return this.data;
                	} else if (this.data) {
                		return this.data[attribute]
                	} else {
                		return container.find("[name=" + attribute + "]").val();
                	}
                }
			}, instance);
			
			viewModel.instances[instanceId] = instance; 
			el.attr(viewModel.attributes.bindId, instanceId);
			
			// Executes "initialize" method, if the view-model has one.
			if (viewModel.functions.initialize in instance) {
				$(function() { 
					try {
						instance[viewModel.functions.initialize](el, instanceId);
						clearError(el);
					} catch (e) {
						notifyError(el, e);
					}
				});
			}
            
            $(function() { el.find("[" + view.attributes.binding + "]").each(renderView); });
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
		
		if (!id && !el.attr(viewModel.attributes.binding)) {
			
			for (var parent = el.parent(); !id && parent; parent = parent.parent()) {
				id = parent.attr(viewModel.attributes.bindId);
				
				if (parent.attr(viewModel.attributes.binding))
					break;
			}
			
			if (id)
				el.attr(viewModel.attributes.bindId, id);
		}
		
		return viewModel.instances[id];
	}
	
	function getAncestorViewModel(viewModel) {
		return getViewModel(viewModel.container.parent());
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
			$(findAndBindViewModel);
		}
	}

	/**
     * Binds DOM elements to View-Models.
	 */
	function findAndBindViewModel() {
        viewModel.binding = true;
        
		try {
			$("[" + viewModel.attributes.binding + "]:not([" + viewModel.attributes.bindId + "])").each(bindViewModel);
		} finally {
			viewModel.binding = false;
		}
	}
	
	function bindViewModel() {
		try {
			var name = $(this).attr(viewModel.attributes.binding);
			
			if (viewModel.classes[name]) {					
				setViewModel($(this), name);
			} else if (viewModel.resources[name]) {
				console.log("Loading javascript for View-Model \"" + name + "\" from " + getAbsoluteURL(viewModel.resources[name]) + ".");
				
                $(this).find("[" + view.attributes.binding + "]").addClass(view.css.loadingViewModel);

				var that = $(this);
				
				$.get(getAbsoluteURL(viewModel.resources[name])).success(function(data) {
					var processedData = null;
					
					eval("processedData = " + data + ";");
												
					registerViewModel(name, processedData);					
					requestBinding();
				}).error(function(x, e) {
					console.error("Error loading javascript for View-Model \"" + name + "\" from " + getAbsoluteURL(viewModel.resources[name]) + ": " + e + ".");
				}).complete(function() {
                    that.find("." + view.css.loadingViewModel).removeClass(view.css.loadingViewModel);
                });
			} else if (loadingMapping === 0) {
				notifyError($(this), "View-Model class \"" + name + "\" not found!");
			}
		} catch (e) {
			notifyError($(this), e);
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
		$("link[rel='" + link.autoRegister + "']").each(function() {
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
				if (--loadingMapping === 0) {
					$(findAndBindViewModel);
					$(loadTemplates);
				}
			});
		});
	}
	
    /**
     * Loads templates for Views.
     */
	function loadTemplates() {		
		$("[" + view.attributes.binding + "]:not([" + view.attributes.lastRendering + "])").each(function() {
			var template = $(this).attr(view.attributes.binding);
			
			if (!view.templates[template]) {
				if (view.resources[template]) {
					console.log("Loading template " + template + " from " + view.resources[template] + ".");

                    view.templates[template] = {
                        url : view.resources[template],
                        loading : true
                    };
                    
					$.ajax({
						url : getAbsoluteURL(view.resources[template]),
						dataType : "text"
					}).success(function(data) {
						console.log("Template " + template + " loaded from " + view.resources[template] + ".");
						templateEngine.setTemplate(template, data);
						view.templates[template].loading = false;
						renderViewsFromTemplate(template);
					}).error(function(x, e) {
						console.error("Error loading template \"" + template + "\" from " + view.resources[template] + ": " + e + ".");
                        view.templates[template] = null;
					});
				}
			} else if (!view.templates[template])
				renderView(this);
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
	function renderView(el) {
        if (!el && this)
    		el = $(this);

		var template = $(this).attr(view.attributes.binding);
		var jsonUrl = $(this).attr(view.attributes.jsonUrl);
		var viewModelinstance = getViewModel($(this));
		
		function doRendering(el, data) {
			var content;
			
			try {
				content = templateEngine.render(template, data);
			} catch (e) {
				console.error("Error rendering data using template \"" + template + "\": " + e);
				console.error(data);
				notifyError(el, e);
			}
			
			el.html(content);			
			el.attr(view.attributes.lastRendering, new Date());
			
			el.find("[" + viewModel.attributes.binding + "]:not([" + viewModel.attributes.bindId + "])").each(bindViewModel);
			el.find("[" + view.attributes.binding + "']:not([" + view.attributes.lastRendering + "])").each(renderView);
		}
        
        if (!view.templates[template] || view.templates[template].loading)
            return;
		
		// Check if the view needs to fetch a JSON data.
		if (jsonUrl) {

			jsonUrl = getAbsoluteURL(jsonUrl);
			console.log("Fetching JSON data from " + jsonUrl + ".");
			
			el.addClass(view.css.fetching);
			
			$.getJSON(jsonUrl).success(function(data) {
				var path = el.attr(view.attributes.jsonPath);
				
				// Traverse JSON data path...
				if (path) {
					path = path.split(".");
					
					for (var i = 0; i < path.length; i++)
						data = data[path[i]];
				}
				
				// Use a View-Model, if available.
				if (viewModelinstance || el.attr(view.attributes.withoutViewModel) != "true") {
					console.log("Rendering " + el + " using " + template + ".");
					viewModelinstance.setData(data);
					doRendering(el, viewModelinstance.getRenderData());
				} else {
					console.log("Rendering " + el + " using " + template + " without a View-Model");
					doRendering(el, data);
				}
			}).complete(function() {
				el.removeClass(view.css.fetching);
			}).error(function(x, e) {
				notifyError(el, e);
			});
		} else if (viewModelinstance) {
			// Do basic rendering.
			console.log("Rendering " + this + " using " + template + " and view-model " + viewModelinstance.instanceId);
			doRendering($(this), viewModelinstance.getRenderData());
		} else if (!el.hasClass(view.css.loadingViewModel)) {
            console.error("Can't render " + this + " because there is no view-model instanciated.");
		}
	}

	/**
	 * Executes a command.
	 */
	function executeCommand() {
		var command = $(this).attr(viewModel.attributes.command);
		var instance = getViewModel($(this));
		
		console.log("Executing command \"" + command + "\".");
		
		while (instance && !instance[command])
			instance = getAncestorViewModel(instance);
		
		if (instance) {
			instance[command](this);
			return false;
		}
		else
			console.error("Command not found: " + command + ".");
	}

	$(autoRegister);
	$(findAndBindViewModel);
	$(bindCommands);
	$(loadTemplates);
	
	$(window).ajaxComplete(function() {
		$(findAndBindViewModel);
		$(loadTemplates);
	});

	var methods = {
		init : function(options) {
			if (options.relativePath)
				setRelativePath(options.relativePath);
		}
	};

	$.crossview = $.fn.crossview = function(method) {
	    if (methods[method]) {
            return methods[method].apply( this, Array.prototype.slice.call(arguments, 1));
	    } else if (typeof method === 'object' || ! method) {
            return methods.init.apply( this, arguments );
	    } else {
            $.error('Method ' +  method + ' does not exist on jQuery.crossview');
    	}    	  
	};
	
})(jQuery);