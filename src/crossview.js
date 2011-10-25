 * CrossViewJS
(function($) {

    if (!$) {
        throw "jQuery not found!";
    }

    // Identify and create a wrapper for template engine.
    var templateEngine = null;

    /**
     * Identifies loaded template engine and creates a wrapper for it.
     */
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

    /**
     * View-Model context.
     */
    var viewModel = {
            /**
             * Sequential bind id.
             */
            bindidSeq : 0,
            
            /**
             * Instances of view-model.
             */
            instances : [],
            
            /**
             * Class definitions for view-models.
             */
            classes : {
                "$formSubmission" : function() {
                    return  {
                        getRenderData : function() { return this.data; }
                    };
                }
            },
            
            /**
             * A prototype for model-view instances.
             */
            instancePrototype : {
                initialize : function(el, instanceid) {
                },
                
                updateView : function() {
                	if (this.container.attr(view.attributes.binding)) {
                		this.container.empty();
                		this.container.each(renderView);
                	} else {
                		this.container.find("[" + view.attributes.binding + "]").empty();
                		this.container.find("[" + view.attributes.binding + "]").each(renderView);
                	}
                },

                setData : function(data) {
                    this.data = data;
                },

                getRenderData : function() {
                    return this;
                },

                getData : function(attribute) {
                    if (!attribute) {
                        return this.data;
                    } else if (this.data) {
                        return this.data[attribute];
                    } else {
                        return this.container.find("[name=" + attribute + "]").val();
                    }
                }
            },
            
            /**
             * Resouce mapping, used to load model-view classes.
             */
            resources : {},

            /**
             * Tells if binding has been requested.
             */
            binding : false,

            /**
             * CSS constants.
             */
            css : {
                error : "mvvm-error"
            },

            /**
             * DOM element attributes.
             */
            attributes : {
                error : "data-viewmodel-error",
                bindId : "data-viewmodel-instance",
                binding : "data-viewmodel",
                command : "data-command",
                className : "data-viewmodel-name"
            }
    };

    /**
     * View context.
     */
    var view = {
            /**
             * Loaded templates.
             */
            templates : {},
            
            /**
             * Resource mapping.
             */
            resources : {},
            
            /**
             * CSS constants.
             */
            css : {
                fetching : "mvvm-fetching",
                loadingViewModel : "mvvm-loading",
                error : "mvvm-error"
            },
            
            /**
             * DOM element attributes.
             */
            attributes : {
                binding : "data-view",
                lastRendering : "data-view-rendered",
                withoutViewModel : "data-view-without-viewmodel",
                jsonPath : "data-json-path",
                jsonUrl : "data-json-url",
                fetchMode : "data-fetch-mode",
                className : "data-view-name",
                render : "data-view-render",
                renderMode : "data-view-render-mode"
            },
            
            /**
             * Render strategies definition.
             */
            renderStrategies : {
                /**
                 * Appends rendered html to a target.
                 */
                append : function(renderContext) {
                    var path = renderContext.target.attr(view.attributes.jsonPath);
                    var html = $("<div/>");
                    
                    for (var attribute in view.attributes) {
                        var value = renderContext.target.attr(view.attributes[attribute]);
                        
                        if (value)
                            html.attr(view.attributes[attribute], value);
                    }
                    
                    var data = traverseJSON(renderContext.data, path);
                    render(viewName, html, data);
                    
                    if (html.children().length > 1)
                        renderContext.target.append(html);
                    else {
                        var child = html.children();
                        
                        child.attr(view.attributes.lastRendering, html.attr(view.attributes.lastRendering));
                        renderContext.target.append(html.children());
                        html.remove();
                    }
                },
                
                /**
                 * Sets data to the view-model and use it to render the target.
                 * In this case, the data still stored on view-model instance
                 * after the view is rendered.
                 */
                "view-model" : function(renderContext) {
                    var viewModelInstance;
                
                    viewModelInstance = getViewModel(renderContext.target);
                        
                    if (!viewModelInstance)
                        viewModelInstance = setViewModel(renderContext.target, "$formSubmission");

                    viewModelInstance.setData(data);
                    renderContext.target.each(renderView);
                },
                
                /**
                 * Replaces the content of a view, rendering it directly using the
                 * data.
                 */
                replace : function(renderContext) {
                    var path = renderContext.target.attr(view.attributes.jsonPath);
                    
                    var data = traverseJSON(renderContext.data, path);
                    render(renderContext.viewName, renderContext.target, data);
                }
            }
    };

    /**
     * Link names constants.
     */
    var link = {
            autoRegister : "mvvm-mapping",
            view : "mvvm-view"
    };

    /**
     * User configuration.
     */
    var config = {
            relativePath : null,
            ajaxDefautls : {
                cache : false
            }
    };

    /**
     * Set error notification on an element.
     * 
     * @param el
     *          jQuery element wrapper.
     * 
     * @param exception
     *          Message error.
     */
    function notifyError(el, exception) {
        el.addClass(viewModel.css.error);
        el.attr(viewModel.attributes.error, exception);

        if (!exception)
            debugger;
        
        console.error(exception);

        if (exception.stack)
        	console.error(exception.stack);
    }

    /**
     * Unset error notification from an element.
     * 
     * @param el
     *          jQuery element wrapper.
     */
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
     * Set a relative path for RESTful services. This is used in attributes
     * like data-json-url.
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
     * 
     * @param name
     *              Class name of a View-Model.
     */
    function setViewModel(el, name) {
        if (!viewModel.classes[name])
            notifyError(el, "View-Model class not found: " + name + ".");
        else {
            console.log("Binding " + name + " to " + el.attr("id"));

            var instance = new viewModel.classes[name]();
            var instanceId = ++viewModel.bindidSeq;

            // Instantiate a view-model class, specializing our prototype.
            for (var method in viewModel.instancePrototype)
            	if (!instance[method])
            		instance[method] = viewModel.instancePrototype[method];

            $.extend(instance, {
            	instanceId : instanceId,
                container : el
            });
            
            viewModel.instances[instanceId] = instance;
            el.attr(viewModel.attributes.bindId, instanceId);

            // Executes "initialize" method, if the view-model has one.
            $(function() {
                try {
                    instance.initialize(el, instanceId);
                    clearError(el);
                } catch (e) {
                    notifyError(el, e);
                }
            });

            if (el.attr(view.attributes.binding)) {
                el.each(renderView);
            } else {
	            // Since we have already instantiated the view-model, try to render its view.
	            var views = el.find("[" + view.attributes.binding + "]:not([" + view.attributes.withoutViewModel + "=true])");
	            
	            console.log(views.length + " found. Rendering...");
	            views.removeClass(view.css.loadingViewModel).each(renderView);
            }
            
            return instance;
        }
    }

    /**
     * Gets an instance of a View-Model for an DOM element. If the element
     * itself does not have a view-model binded, get recursively from its
     * ancestors.
     * 
     * This method stop traversing the ancestor til root element if it
     * find one that have a binding, but still not instantiated. In this case,
     * it returns nll.
     *
     * @param el
     *             jQuery element wrapper.
     * 
     * @return
     *              View-model instance for an DOM element.
     */
    function getViewModel(el) {
        var id = el.attr(viewModel.attributes.bindId);

        if (!id && !el.attr(viewModel.attributes.binding)) {
            for (var parent = el.parent(); !id && parent.length; parent = parent.parent()) {
                id = parent.attr(viewModel.attributes.bindId);

                if (parent.attr(viewModel.attributes.binding))
                    break;
            }

            if (id)
                el.attr(viewModel.attributes.bindId, id);
        }

        return id ? viewModel.instances[id] : null;
    }
    
    /**
     * Checks if an element should have an associated view-model,
     * but it have not been loaded yet.
     */
    function shouldHaveViewModel(el) {
        var id = el.attr(viewModel.attributes.bindId);
        var found = false;

        if (!id && !el.attr(viewModel.attributes.binding)) {
            for (var parent = el.parent(); !id && parent.length; parent = parent.parent()) {
                id = parent.attr(viewModel.attributes.bindId);

                if (parent.attr(viewModel.attributes.binding)) {
                    found = true;
                    break;
                }
            }

            if (id)
                el.attr(viewModel.attributes.bindId, id);
        } else
            found = true;

        return found && !id;
    }

    /**
     * Gets the overriden view-model, which is a view-model instance of
     * its ancestor.
     */
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
    
            console.log("Finding view-model to bind...");
    
            try {
                $("[" + viewModel.attributes.binding + "]:not([" + viewModel.attributes.bindId + "])").each(bindViewModel);
            } finally {
                viewModel.binding = false;
            }
        }
    }

    /**
     * Bind a view-model to an element.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function bindViewModel() {
        
        if ($(this).hasClass(viewModel.attributes.bindId))
            return;

        try {
            var name = $(this).attr(viewModel.attributes.binding);

            if (viewModel.classes[name]) {
                console.log("Binding View-Model \"" + name + "\" to " + $(this).attr("id"));
                setViewModel($(this), name);
            } else if (viewModel.resources[name]) {
                console.log("Loading javascript for View-Model \"" + name + "\" from " + getAbsoluteURL(viewModel.resources[name]) + ".");

                $(this).find("[" + view.attributes.binding + "]").addClass(view.css.loadingViewModel);

                var that = $(this);
                
                var ajaxOptions = $.extend(null, config.ajaxDefautls, {
                	dataType : "script"
                });

                $.ajax(getAbsoluteURL(viewModel.resources[name]), ajaxOptions).success(function(data) {
                	var classDefinition = traverseJSON(window, name);
                	
                	if (!classDefinition || classDefinition === window)
                	    throw "Undefined class " + name + ", even after having loaded " + viewModel.resources[name];
                	
                    registerViewModel(name, classDefinition);
                }).error(function(x, e) {
                    viewModel.resources[name] = null;
                    console.error("Error loading javascript for View-Model \"" + name + "\" from " + getAbsoluteURL(viewModel.resources[name]) + ": " + e + ".");
                }).complete(function() {
                    that.find("." + view.css.loadingViewModel).each(function () {
                        if (!shouldHaveViewModel($(this)))
                            $(this).removeClass(view.css.loadingViewModel);
                    });
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
        $("form[" + viewModel.attributes.command + "][" + view.attributes.render + "]").live("submit", executeCommand);
        $("form[" + viewModel.attributes.command + "][action]:not([" + view.attributes.render + "])").live("submit", executeCommandFromFormSubmission);
    }

    /**
     * Binds form submission that will render on an explicit target view.
     */
    function bindFormRender() {
        $("form[" + view.attributes.render + "]").live("submit", renderFromFormSubmission);
    }
    
    /**
     * Gets a JSON from an URL using an conversion strategy (i.e. YQL).
     */
    function getJSON(url, options, strategy) {
        var completeCallback = null;
        var errorCallback = null;
        var successCallback = null;
        
        if (!strategy)
            strategy = "default";
        
        options = $.extend(null, config.ajaxDefautls, options);
        
        var run = {
            complete : function(callback) {
                completeCallback = callback;
                return this;
            }, error : function(callback) {
                errorCallback = callback;
                return this;
            }, success : function(callback) {
                successCallback = callback;
                return this;
            }
        };
        
        var jsonStrategy = {
            "yql-xml" : function(data) {
                return data.query.results;
            }, "yql" : function(data) {
                return data.query.results.json;
            }
        };
        
        var urlStrategy = {
            "yql-xml" : function(url, options) {
                if (options && options.data) {
                    var isFirst = true;
                    
                    if (url.indexOf("?") < 0) {
                        url += "?";
                    }
                        
                    for (var item in options.data) {
                        if (options.data[item]) {
                            if (isFirst)
                                isFirst = false;
                            else
                                url += "&";
                                
                            url += encodeURIComponent(item) + "=" + encodeURIComponent(options.data[item]);
                        }
                    }    
                    
                    options.data = null;
                }
                
                return "http://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20xml%20where%20url%3D%22" +
                    encodeURIComponent(url) + "%22";
            },
        "yql" : function(url, options) {
                if (options && options.data) {
                    var isFirst = true;
                    
                    if (url.indexOf("?") < 0) {
                        url += "?";
                    }
                        
                    for (var item in options.data) {
                        if (options.data[item]) {
                            if (isFirst)
                                isFirst = false;
                            else
                                url += "&";
                                
                            url += encodeURIComponent(item) + "=" + encodeURIComponent(options.data[item]);
                        }
                    }    
                    
                    options.data = null;
                }
                
                return "http://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20json%20where%20url%3D%22" +
                    encodeURIComponent(url) + "%22";
            }
        };
        
        if (urlStrategy[strategy])
            url = urlStrategy[strategy](url, options);
        
        url = getAbsoluteURL(url);
        
        $.ajax(url, options)
            .complete(function() { if (completeCallback) completeCallback(arguments); })
            .error(function() { if (errorCallback) errorCallback(arguments); })
            .success(function(data) {
                if (jsonStrategy[strategy])
                    data = jsonStrategy[strategy](data);
                successCallback(data, Array.prototype.slice.call(arguments, 1));
            });
        
        return run;
    }

    function executeCommandFromFormSubmission() {
        try {
            var form = $(this);
            var action = form.attr("action");
            var method = form.attr("method");
            var jsonArgs = form.serializeObject();
                        
            $.ajax(getAbsoluteURL(action), { type : method, data : jsonArgs })
                .success(function(data) {
                    executeCommand.apply(form, arguments);
                });
        } catch (e) {
            notifyError($(this), e);
        }
        
        return false;
    }

    /**
     * Submit a form and render its result to a specific view.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function renderFromFormSubmission() {
        var renderData = { form : $(this) };
        
        renderData.targetId = renderData.form.attr(view.attributes.render);
        renderData.target = $("#" + renderData.targetId);
        
        if (!renderData.target.length) {
            console.error("Target element not found: " + renderData.targetId + ".");
            return false;
        }

        try {
            renderData.renderMode = renderData.form.attr(view.attributes.renderMode) || "replace";

            if (!view.renderStrategies[renderData.renderMode]) {
                console.error("Unknown render mode: " + renderData.renderMode + ".");
                return false;
            }

            renderData.strategy = renderData.form.attr(view.attributes.fetchMode);
            renderData.action = renderData.form.attr("action");
            renderData.method = renderData.form.attr("method");
            renderData.targetView = renderData.target.attr(view.attributes.binding) || renderData.form.attr(view.attributes.className);
            
            if (!renderData.targetView) {
                var error = 'Undefined view for target element "' + renderData.targetId + '".';
                notifyError(renderData.target, error);
                return false;
            }
            
            renderData.target.addClass(view.css.fetching);
            renderData.viewName = renderData.target.attr(view.attributes.binding) || renderData.form.attr(view.attributes.className);
            renderData.jsonArgs = renderData.form.serializeObject();
                
            requireTemplate(renderData.targetView, function() {
                getJSON(renderData.action, { type : renderData.method, data : renderData.jsonArgs }, renderData.strategy)
                    .success(function(data) {
                        try {
                            var path = renderData.form.attr(view.attributes.jsonPath);
                            
                            if (path)
                                renderData.data = traverseJSON(data, path);
                            else
                                renderData.data = data;

                            console.log("Rendering " + renderData.targetId + " from form " + renderData.form.attr("id") + " submission.");
                            
                            view.renderStrategies[renderData.renderMode].apply(renderData.form, [renderData]);
                        } catch (e) {
                            notifyError(renderData.target, e);
                        }
                    })
                    .complete(function() {
                        renderData.target.removeClass(view.css.fetching);
                    })
                    .error(function(x, e) {
                        notifyError(renderData.target, e);
                    });
            });
        } catch (e) {
            notifyError(renderData.target, e);
        }

        return false;
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
                $.extend(viewModel.resources, json.viewModel);
                $.extend(view.resources, json.view);
                $(loadTemplates);
            }).error(function(x, e) {
                console.error("Failed to load View-Model class mapping from " + href + ".");
                throw e;
            }).complete(function() {
                if (--loadingMapping === 0) {
                    requestBinding();
                }
            });
        });

        $("link[rel='" + link.view + "']").each(function() {
            var href = $(this).attr("href");
            var name = $(this).attr(view.attributes.className);

            if (!name)
                name = extractNameFromUrl(href);

            console.log("Registering template for view \"" + name + "\" on " + href + ".");
            view.resources[name] = href;
        });
        
        $(loadTemplates);
    }

    /**
     * Extract file name (without file extension) from an URL.
     */
    function extractNameFromUrl(url) {
        var idx = url.lastIndexOf("/");

        if (idx >= 0)
            url = url.substr(idx + 1);

        idx = url.lastIndexOf(".");

        if (idx >= 0)
            url = url.substr(0, idx);

        return url;
    }

    /**
     * Loads templates for Views.
     */
    function loadTemplates() {
        $("[" + view.attributes.binding + "]:not([" + view.attributes.lastRendering + "])").each(function() {
            var template = $(this).attr(view.attributes.binding);

            requireTemplate(template);
        });
    }

    /**
     * Execute a callback function after ensuring that a template has been loaded.
     * 
     * @param template
     *              Template that should be loaded.
     * 
     * @param callback
     *              Callback function invoked after template loading or if it
     *              is already loaded.
     */
    function requireTemplate(template, callback) {
        if ((!view.templates[template] || !view.templates[template].url) && view.resources[template]) {
            console.log("Loading template " + template + " from " + view.resources[template] + ".");

            view.templates[template] = {
                url : view.resources[template],
                loading : true,
                callback : view.templates[template] ? view.templates[template].callback || [] : []
            };
            
            if (callback)
                view.templates[template].callback.push(callback);

            var options = $.extend(null, config.ajaxDefautls, { dataType : "text" });
            
            $.ajax(getAbsoluteURL(view.resources[template]), options).success(function(data) {
                try {
                    console.log("Template " + template + " loaded from " + view.resources[template] + ". (" + view.templates[template].callback.length + " callback(s) waiting)");
                
                    templateEngine.setTemplate(template, data);
                } catch (e) {
                    notifyError($("[" + view.attributes.binding + "='" + template + "']"), "Can't compile template " + template + ": " + e + "\n" + data);
                    view.templates[template] = null;
                    return;
                }
                
                view.templates[template].loading = false;
                
                // Invoke callbacks.
                while (view.templates[template].callback.length) {
                    var cb = view.templates[template].callback.pop();
                    try {
                        cb();
                    } catch (e) {
                        console.error(e);
                    }
                }
            }).error(function(x, e) {
                console.error("Error loading template \"" + template + "\" from " + view.resources[template] + ": " + e + ".");
                view.templates[template] = null;
            });
        } else if (view.templates[template] && callback) {
            if (view.templates[template].loading)
                view.templates[template].callback.push(callback);
            else 
                callback();
        } else if (callback) {
            if (template == null) {
                throw "Template undefined!";
            }
            
            console.log("Needing template " + template + ". Waiting for registration.");
            view.templates[template] = { callback : [ callback ] };
        }
    }

    /**
     * Renders a data into an element using a template.
     * 
     * @param template
     *          Template name
     * 
     * @param el
     *          jQuery element wrapper
     * 
     * @param data
     *          Data passed to template.
     */
    function render(template, el, data) {
        try {
            clearError(el);
            requireTemplate(template, function() {
                var content = templateEngine.render(template, data);
                
                el.html(content);
                el.attr(view.attributes.lastRendering, new Date());
        
                el.find("[" + viewModel.attributes.binding + "]:not([" + viewModel.attributes.bindId + "])").each(bindViewModel);
                el.find("[" + view.attributes.binding + "]:not([" + view.attributes.lastRendering + "])").each(renderView);

                try {
                	el.trigger("crossview-rendered");
                } catch (e) {
                	console.error('Error invoking "crossview-rendered" event for ' + el.attr("id") + ": " + e + ".");
                	notifyError(el, e);
                }

                /* Triggers pagecreate event if jQuery Mobile is present,
                 * so it can bind those rendered elements.
                 */
                if ($.mobile) {
                	try {
                		var page = $($.mobile.activePage);
                		
                		if (page.get(0) === el.get(0) || page.has(el)) {
                			console.log("Invoking jQuery Mobile bindings on " + el.attr("id") + ".");
                			el.trigger("pagecreate");
                		}
                	} catch (e) {
                		console.log("Error invoking pagecreate for $.mobile: " + e + ".");
                	}
                }
            });
        } catch (e) {
            console.error("Error rendering data using template \"" + template + "\": " + e);
            console.error(data);
            notifyError(el, e);
        }
    }

    /**
     * Render a view for a jQuery element.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function renderView() {
        var el = $(this);
        
        var template = el.attr(view.attributes.binding);
        
        requireTemplate(template, function() {
            
            if (shouldHaveViewModel(el)) {
                console.log("Waiting view-model finish loading to render view " + el.attr("id") + ".");
                return;
            }
            
            var jsonUrl = el.attr(view.attributes.jsonUrl);
            var path = el.attr(view.attributes.jsonPath);
            var viewModelInstance = getViewModel(el);
            
            // Check if the view needs to fetch a JSON data.
            if (jsonUrl) {
                if (el.hasClass(view.css.fetching)) {
                    console.log("Ignoring render view " + el.attr("id") + ", since it is already fetching data.");
                    return;
                }
                
                var strategy = el.attr(view.attributes.fetchMode);
    
                jsonUrl = getAbsoluteURL(jsonUrl);
                console.log("Fetching JSON data from " + jsonUrl + ".");
    
                el.addClass(view.css.fetching);
    
                getJSON(jsonUrl, null, strategy).success(function(data) {
                    if (!data) {
                        notifyError(el, "No data received from " + jsonUrl + ".");
                        return;
                    }
                    
                    console.log("Fechted JSON data from " + jsonUrl + ".");
                    
                    try {
                        // Traverse JSON data path...
                        data = traverseJSON(data, path);
        
                        // Use a View-Model, if available.
                        if (viewModelInstance && el.attr(view.attributes.withoutViewModel) != "true") {
                            console.log("Rendering " + el.attr("id") + " using " + template + " and its view-model " + viewModelInstance.instanceId + ".");
                            viewModelInstance.setData(data);
                            render(template, el, viewModelInstance.getRenderData());
                        } else {
                            console.log("Rendering " + el.attr("id") + " using " + template + " without a View-Model");
                            render(template, el, data);
                        }
                    } catch (e) {
                        notifyError(el, e);
                    }
                }).complete(function() {
                    el.removeClass(view.css.fetching);
                }).error(function(x, e) {
                    notifyError(el, "Cannot get JSON from " + jsonUrl + ": " + e || x);
                });
            } else if (viewModelInstance) {
                // Do basic rendering.
                console.log("Rendering " + el.attr("id") + " using " + template + " and view-model " + viewModelInstance.instanceId);
                
                try {
                    // TODO: CHECK
                    //var data = viewModelInstance.getRenderData(path);
                    //render(template, el, traverseJSON(data, path));
                    render(template, el, viewModelInstance.getRenderData());
                } catch (e) {
                    notifyError(el, e);
                }
            } else if (!el.hasClass(view.css.loadingViewModel)) {
                console.error("Can't render " + el.attr("id") + " because there is no view-model instanciated.");
            }
        });
    }
    
    /**
     * Traverse JSON through a specified path.
     * 
     * @param data
     *              JSON object that will be traversed.
     * 
     * @param path
     *              Path to traverse.
     * 
     * @return
     *              Reached object.
     */
    function traverseJSON(data, path) {
        if (path) {
            path = path.split(".");
        
            for (var i = 0; i < path.length; i++)
                data = data[path[i]];
        }
        
        return data;
    }

    /**
     * Executes a command.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function executeCommand() {
        var command = $(this).attr(viewModel.attributes.command);
        var instance = getViewModel($(this));

        console.log("Executing command \"" + command + "\".");

        while (instance && !instance[command])
            instance = getAncestorViewModel(instance);

        if (instance) {
        	var args = [$(this)];
        	
        	for (var i = 0; i < arguments.length; i++)
        		args.push(arguments[i]);
        	
            instance[command].apply(instance, args);
            
            return false;
        }
        else
            console.error("Command not found: " + command + ".");
    }
    
    function findAndRenderView() {
        $("[" + view.attributes.jsonUrl + "]:not([" + view.attributes.lastRendering + "]):not(." + view.css.fetching + ")").each(renderView);
    }

    $(autoRegister);
    $(bindCommands);
    $(bindFormRender);
    $(findAndRenderView);

    $(window).ajaxComplete(function() {
        $(requestBinding);
        $(findAndRenderView);
    });

    var methods = {
        init : function(options) {
            if (options.relativePath)
                setRelativePath(options.relativePath);
        },
        
        registerRenderMode : function(name, callback) {
            view.renderStrategies[name] = callback;
        },
        
        /**
         * Render a view from a data or from its view-model.
         *  
         * @param data
         *              Data to render (optional).
         * 
         * @param template
         *              View name (optional).
         */
        render : function(data, template) {
            try {
                if (data) {
                    if (!template)
                        template = $(this).attr(view.attributes.binding);
                    
                    render(template, $(this), data);
                } else {
                    renderView.apply(this);
                }
            } catch (e) {
                notifyError($(this), e);
            }
        },
        
        setViewModelData : function(data) {
        	getViewModel($(this)).setData(data);
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

    if (!$.fn.serializeObject) {
        $.fn.serializeObject = function()
        {
            var o = {};
            var a = this.serializeArray();
            $.each(a, function() {
                if (o[this.name] !== undefined) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            return o;
        };
    }

})(jQuery);