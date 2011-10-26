/**
 * CrossViewJS @VERSION
 * View Module
 * 
 * Render views.
 *
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
    $.extend(true, CrossViewJS, {
            options : {
                /**
                 * CSS constants.
                 */
                css : {
                    view : {
                        fetching : "mvvm-fetching",
                        loadingViewModel : "mvvm-loading",
                        error : "mvvm-error"
                    }
                },
        
                /**
                 * DOM element attributes.
                 */
                attributes: {
                    view : {
                        binding : "data-view",
                        lastRendering : "data-view-rendered",
                        withoutViewModel : "data-view-without-viewmodel",
                        className : "data-view-name"
                    }
                },
                
                /**
                 * Resource mapping.
                 */        
                resources : {
                    view : {}
                }
            },
            
            view : { }
    });
    
    /**
     * View context.
     */
    var view = {
            /**
             * Loaded templates.
             */
            templates : {}
                        
    };
    
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
        if ((!view.templates[template] || !view.templates[template].url) && CrossViewJS.options.resources.view[template]) {
            console.log("Loading template " + template + " from " + CrossViewJS.options.resources.view[template] + ".");

            view.templates[template] = {
                url : CrossViewJS.options.resources.view[template],
                loading : true,
                callback : view.templates[template] ? view.templates[template].callback || [] : []
            };
            
            if (callback)
                view.templates[template].callback.push(callback);

            var options = $.extend(null, CrossViewJS.options.ajaxDefaults, { dataType : "text" });
            
            $.ajax(CrossViewJS.getAbsoluteURL(CrossViewJS.options.resources.view[template]), options).success(function(data) {
                try {
                    console.log("Template " + template + " loaded from " + CrossViewJS.options.resources.view[template] + ". (" + view.templates[template].callback.length + " callback(s) waiting)");
                
                    CrossViewJS.template.setTemplate(template, data);
                } catch (e) {
                    CrossViewJS.notifyError($("[" + CrossViewJS.options.attributes.view.binding + "='" + template + "']"), "Can't compile template " + template + ": " + e + "\n" + data);
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
                        if (e.stack)
                            console.error(e.stack);
                        else
                            console.error(e);                        
                    }
                }
            }).error(function(x, e) {
                console.error("Error loading template \"" + template + "\" from " + CrossViewJS.options.resources.view[template] + ": " + e + ".");
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
            CrossViewJS.clearError(el);
            requireTemplate(template, function() {
                var content = CrossViewJS.template.render(template, data);
                
                el.html(content);
                el.attr(CrossViewJS.options.attributes.view.lastRendering, new Date());
        
                el.find("[" + CrossViewJS.options.attributes.viewModel.binding + "]:not([" + CrossViewJS.options.attributes.viewModel.bindId + "])").crossview("bindViewModel");
                el.find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").each(renderView);

                try {
                    el.trigger("crossview-rendered");
                } catch (e) {
                    console.error('Error invoking "crossview-rendered" event for ' + el.attr("id") + ": " + e + ".");
                    CrossViewJS.notifyError(el, e);
                }
            });
        } catch (e) {
            console.error("Error rendering data using template \"" + template + "\": " + e);
            console.error(data);
            CrossViewJS.notifyError(el, e);
        }
    }

    /**
     * Render a view for a jQuery element.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function renderView() {
        var el = $(this);
        var template = el.attr(CrossViewJS.options.attributes.view.binding);
        
        requireTemplate(template, function() {
            
            if (el.crossview("shouldHaveViewModel")) {
                console.log("Waiting view-model finish loading to render view " + el.attr("id") + ".");
                return;
            }
            
            var jsonUrl = el.attr(CrossViewJS.options.attributes.fetch.jsonUrl);
            var path = el.attr(CrossViewJS.options.attributes.fetch.jsonPath);
            var viewModelInstance = el.crossview("getViewModel");
            
            // Check if the view needs to fetch a JSON data.
            if (jsonUrl) {
                if (el.hasClass(CrossViewJS.options.css.view.fetching)) {
                    debugger;
                    console.log("Ignoring render view " + el.attr("id") + ", since it is already fetching data.");
                    return;
                }
                
                var strategy = el.attr(CrossViewJS.options.attributes.fetch.fetchMode);
    
                jsonUrl = CrossViewJS.getAbsoluteURL(jsonUrl);
                console.log("Fetching JSON data from " + jsonUrl + ".");
    
                el.addClass(CrossViewJS.options.css.view.fetching);
    
                CrossViewJS.getJSON(jsonUrl, null, strategy).success(function(data) {
                    if (!data) {
                        CrossViewJS.notifyError(el, "No data received from " + jsonUrl + ".");
                        return;
                    }
                    
                    console.log("Fetched JSON data from " + jsonUrl + ".");
                    
                    try {
                        // Traverse JSON data path...
                        data = CrossViewJS.traverseJSON(data, path);
        
                        // Use a View-Model, if available.
                        if (viewModelInstance && el.attr(CrossViewJS.options.attributes.view.withoutViewModel) != "true") {
                            console.log("Rendering " + el.attr("id") + " using " + template + " and its view-model " + viewModelInstance.instanceId + ".");
                            viewModelInstance.setData(data);
                            render(template, el, viewModelInstance.getRenderData());
                        } else {
                            console.log("Rendering " + el.attr("id") + " using " + template + " without a View-Model");
                            render(template, el, data);
                        }
                    } catch (e) {
                        CrossViewJS.notifyError(el, e);
                    }
                }).complete(function() {
                    el.removeClass(CrossViewJS.options.css.view.fetching);
                }).error(function(x, e) {
                    CrossViewJS.notifyError(el, "Cannot get JSON from " + jsonUrl + ": " + e || x);
                });
            } else if (viewModelInstance) {
                // Do basic rendering.
                console.log("Rendering " + el.attr("id") + " using " + template + " and view-model " + viewModelInstance.instanceId);
                
                try {
                    render(template, el, viewModelInstance.getRenderData());
                } catch (e) {
                    CrossViewJS.notifyError(el, e);
                }
            } else if (!el.hasClass(CrossViewJS.options.css.view.loadingViewModel)) {
                console.error("Can't render " + el.attr("id") + " because there is no view-model instanciated.");
            }
        });
    }
    
    function findAndRenderView() {
        $("[" + CrossViewJS.options.attributes.fetch.jsonUrl + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "]):not(." + CrossViewJS.options.css.view.fetching + ")").each(renderView);
    }

    /**
     * Loads templates for Views.
     */
    CrossViewJS.view.loadTemplates = function() {
        $("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").each(function() {
            var template = $(this).attr(CrossViewJS.options.attributes.view.binding);

            requireTemplate(template);
        });
    }
    
    /**
     * Render a view from a data or from its view-model.
     *  
     * @param data
     *              Data to render (optional).
     * 
     * @param template
     *              View name (optional).
     */
    CrossViewJS.fn.render = function(data, template) {
        try {
            if (data) {
                if (!template)
                    template = $(this).attr(CrossViewJS.options.attributes.view.binding);
                
                render(template, $(this), data);
            } else {
                $(this).each(renderView);
            }
        } catch (e) {
            CrossViewJS.notifyError($(this), e);
        }
    };
    
    CrossViewJS.requireTemplate = requireTemplate;

    $(findAndRenderView);

    $(window).ajaxComplete(function() {
        $(requestBinding);
        $(findAndRenderView);
    });

})(jQuery);