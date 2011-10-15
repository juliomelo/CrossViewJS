/**
 * A MVVM library.
 * 
 * @author Júlio César e Melo
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
	 * Cria uma instância de View-Model para o wrapper do elemento DOM.
	 * 
	 * @param el
	 * 				Wrapper do jQuery para o elemento do DOM.
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
	 * Obtém uma instância do View-Model relativa ao elemento do DOM.
	 * 
	 * @param el
	 * 				Wrapper do jQuery para o elemento do DOM.
	 */
	function getViewModel(el) {
		var id = el.attr(viewModel.attributes.bindId);
		
		if (!id) {
			id = el.parents("[" + viewModel.attributes.bindId + "]:first").attr(viewModel.attributes.bindId);
			el.attr(viewModel.attributes.bindId, id);
		}
		
		return viewModel.instances[id];
	}

	function registerViewModel(name, prototype) {
		viewModel.classes[name] = prototype || eval(name);
		requestBinding();
	}
	
	function requestBinding() {
		if (!viewModel.binding) {
			viewModel.binding = true;
			$(bindViewModel);
		}
	}

	/**
	 * Vincula os elementos do DOM ao View-Model.
	 */
	function bindViewModel() {
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
														
							viewModel.classes[name] = processedData;
							
							setViewModel(that, name);
						}).error(function(x, e) {
							console.error("Error loading javascript for View-Model \"" + name + "\" from " + viewModel.resources[name] + ": " + e + ".");
						});
					} else if (loadingMapping == 0) {
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
	 * Vincula os comandos nos elementos DOM ao View-Model.
	 */
	function bindCommands() {
		$("a[" + viewModel.attributes.command + "]").live("click", executeCommand);
		$("button[" + viewModel.attributes.command + "]").live("click", executeCommand);
		$("form[" + viewModel.attributes.command + "]").live("submit", executeCommand);
	}
	
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
	
	function renderViewsFromTemplate(template) {
		$("[" + view.attributes.binding + "='" + template + "']:not([" + view.attributes.lastRendering + "])").each(renderView);
	}
	
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