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
                        fetching : "crossview-fetching",
                        loadingViewModel : "crossview-loading",
                        error : "crossview-error"
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
                        className : "data-view-name",
                        emptyView : "data-view-empty"
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
            if (view.templates[template].loading) {
                view.templates[template].callback.push(callback);
            } else { 
                try {
                    callback();
                } catch (e) {
                    if (e.stack) {
                        console.error(e.stack);
                    } else {
                        console.error(e);
                    }
                }
            }
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
               console.log("Rendering " + el.attr("id") + " using " + template + " with following data of size " + (!data ? 0 : data.length));

               if (!data) {
                    data = [null];
                } else if (typeof(data.length) == "undefined" || typeof(data) != "object") {
                    data = [data];
                } else if (!data.length) {
                    data = [null];
                }

                el.empty();

                var toRender = $([]);

                for (var i = 0; i < data.length; i++) {
                    var content;

                    try {
                        var html = CrossViewJS.template.render(template, data[i]);
                        var content = $(html);
                
                        el.append(content);
                    } catch (e) {
                        console.error("Error rendering and appending content from template " + template + " from index " + i + " of data: " + e);
                        console.error(data[i]);

                        if (content)
                           console.error("Content:\n" + content);

                        CrossViewJS.notifyError(el, e);
                        return;
                    }

                    content.find("[" + CrossViewJS.options.attributes.viewModel.binding + "]:not([" + CrossViewJS.options.attributes.viewModel.bindId + "])")
                       .add(content.filter("[" + CrossViewJS.options.attributes.viewModel.binding + "]:not([" + CrossViewJS.options.attributes.viewModel.bindId + "])"))
                       .crossview("bindViewModel");

                    toRender = toRender.add(content.find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])")
                      .add(content.filter("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])"))
                      .data("crossview-parent-data", data[i]));
                }

                el.attr(CrossViewJS.options.attributes.view.lastRendering, new Date());

                try {
                    el.trigger("crossview-rendered", [ data, template ]);
                } catch (e) {
                    console.error('Error invoking "crossview-rendered" event for ' + el.attr("id") + ": " + e + ".");
                    CrossViewJS.notifyError(el, e);
                }

                // Elements that need to render must be filtered since it may be changed by crossview-rendered event handlers.
                toRender.filter("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])")
                    .each(function() {
                        if (!$(this).attr(CrossViewJS.options.attributes.viewModel.binding)) {
                            $(this).attr(CrossViewJS.options.attributes.viewModel.bindId, el.attr(CrossViewJS.options.attributes.viewModel.bindId));
                        }
                    })
                    .each(renderView).removeData("crossview-parent-data");
        
                el.find("[" + CrossViewJS.options.attributes.fetch.textUrl + "]").crossview("loadText");
                el.find("[" + CrossViewJS.options.attributes.fetch.htmlUrl + "]").crossview("loadHTML");
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
        var parentData = $(this).data("crossview-parent-data");
        
        requireTemplate(template, function() {

            var attrWithoutViewModel = el.attr(CrossViewJS.options.attributes.view.withoutViewModel);
            var withoutViewModel;
            var jsonUrl = el.attr(CrossViewJS.options.attributes.fetch.jsonUrl);

            if (attrWithoutViewModel) {
                withoutViewModel = attrWithoutViewModel == "true";
            } else if ((jsonUrl != null || parentData) && !el.attr(CrossViewJS.options.attributes.viewModel.binding)) {
                withoutViewModel = true;
            } else {
                withoutViewModel = false;
            }
            
            if (!withoutViewModel && el.crossview("shouldHaveViewModel")) {
                console.log("Waiting view-model finish loading to render view " + el.attr("id") + ".");
                return;
            }
            
            var path = el.attr(CrossViewJS.options.attributes.fetch.jsonPath);
            
            // Check if the view needs to fetch a JSON data.
            if (jsonUrl) {
                if (el.hasClass(CrossViewJS.options.css.view.fetching)) {
                    console.log("Ignoring render view " + el.attr("id") + ", since it is already fetching data.");
                    return;
                }
                
                var strategy = el.attr(CrossViewJS.options.attributes.fetch.fetchMode);
    
                jsonUrl = CrossViewJS.getAbsoluteURL(jsonUrl);
                console.log("Fetching JSON data from " + jsonUrl + ".");
    
                el.addClass(CrossViewJS.options.css.view.fetching);
    
                CrossViewJS.getJSON.call(el, jsonUrl, null, strategy).success(function(data) {
                    console.log("Fetched JSON data from " + jsonUrl + ".");
                    
                    try {
                        var viewModelInstance = el.crossview("getViewModel");
                        
                        // Traverse JSON data path...
                        data = CrossViewJS.traverseJSON(data, path);

                        if (!data || data.length === 0) {
                            var emptyView = el.attr(CrossViewJS.options.attributes.view.emptyView);

                            if (emptyView) {
                                console.log("Replacing view " + template + " with view " + emptyView + " for empty data.");
                                template = emptyView;
                            } else {
                                console.log("View " + template + " being ignored because of empty data.");
                                return;
                            }
                        }
        
                        // Use a View-Model, if available.
                        if (!viewModelInstance || withoutViewModel) {
                            console.log("Rendering " + el.attr("id") + " using " + template + " without a View-Model");
                            render(template, el, data);
                        } else {
                            console.log("Rendering " + el.attr("id") + " using " + template + " and its view-model " + viewModelInstance.instanceId + ".");
                            viewModelInstance.setData(data);
                            render(template, el, viewModelInstance.getRenderData());
                        }
                    } catch (e) {
                        CrossViewJS.notifyError(el, e);
                    }
                }).complete(function() {
                    el.removeClass(CrossViewJS.options.css.view.fetching);
                }).error(function(x, e) {
                    CrossViewJS.notifyError(el, "Cannot get JSON from " + jsonUrl + ": " + e || x);
                });
            } else if (parentData) {
                console.log("Rendering " + el.attr("id") + " using " + template + " and parent's data through " + path);

                var data;

                try {
                    data = CrossViewJS.traverseJSON(parentData, path);
                } catch (e) {
                    CrossViewJS.notifyError(el, e);
                    console.error(parentData);
                }
                
                if (!data || data.length === 0) {
                    var emptyView = el.attr(CrossViewJS.options.attributes.view.emptyView);

                    if (emptyView) {
                        console.log("Replacing view " + template + " with view " + emptyView + " for empty data.");
                        template = emptyView;
                    } else {
                        console.log("View " + template + " being ignored because of empty data from path " + path + ".");
                        return;
                    }
                }

                try {
                    render(template, el, data);
                } catch (e) {
                    CrossViewJS.notifyError(el, e);
                }
            } else {
                var viewModelInstance = el.crossview("getViewModel");

                if (viewModelInstance) {
                    // Do basic rendering.
                    console.log("Rendering " + el.attr("id") + " using " + template + " and view-model " + viewModelInstance.instanceId);
                    
                    try {
                        render(template, el, viewModelInstance.getRenderData());
                    } catch (e) {
                        CrossViewJS.notifyError(el, e);
                    }
                } else if (!el.crossview("shouldHaveViewModel")) {
                    console.error("Can't render " + el.attr("id") + " because there is no view-model instanciated.");
                }
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
