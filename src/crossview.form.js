/**
 * CrossViewJS @VERSION
 * Default Form Submission View-Model Module
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

    /**
     * Render strategies definition.
     */
    var renderModes = {};
    
    /**
     * Submit a form and render its result to a specific view.
     * 
     * @param form
     *          Form jQuery element wrapper.
     *          
     * @param callback
     *          Callback function on success.
     *          
     * @return Nothing
     */
    function submitForm(form, callback) {
        
        var render = form.attr(CrossViewJS.options.attributes.form.render);
        
        // Split targets and identify views for rendering.
        var targetsIds = render ? render.split(",") : [];
        var targets = [];
        
        for (var i = 0; i < targetsIds.length; i++) {
            targets[i] = {
                    id : targetsIds[i],
                    el : $("#" + $.trim(targetsIds[i]))
            };
            targets[i].view = form.attr(CrossViewJS.options.attributes.view.className) || targets[i].el.attr(CrossViewJS.options.attributes.view.binding); 
            targets[i].emptyView = form.attr(CrossViewJS.options.attributes.view.emptyView) || targets[i].el.attr(CrossViewJS.options.attributes.view.emptyView);

            if (!targets[i].el.length) {
                CrossViewJS.notifyError(form, "Target element not found: " + targetsIds[i] + ".");
                return false;
            }
            
            if (!targets[i].view) {
                var error = 'Undefined view for target element "' + targetsIds[i] + '".';
                CrossViewJS.notifyError(targets[i].el, error);
                return false;
            }
            
            CrossViewJS.requireTemplate(targets[i].view);
        }
        
        // Do rendering.
        try {
            var fetchMode = form.attr(CrossViewJS.options.attributes.fetch.fetchMode);            
            var action = form.attr("action");
            var method = form.attr("method");
            var jsonArgs = form.serializeObject();
            var renderMode = form.attr(CrossViewJS.options.attributes.form.renderMode) || CrossViewJS.options.form.defaultRenderMode;
            
            if (render && !renderModes[renderMode]) {
                CrossViewJS.notifyError(form, "Unknown render mode: " + renderMode + ".");
                return false;
            }
            
            if (render)
                $(targets).each(function() { this.el.addClass(CrossViewJS.options.css.view.fetching); });
            else
                form.crossview("getViewModel").container.addClass(CrossViewJS.options.css.view.fetching);
            
            console.log("Submitting form to " + action);
                            
            CrossViewJS.getJSON.call(form, action, { type : method, data : jsonArgs }, fetchMode)
                .success(function(data) {
                    if (data)
                        console.log("Data received from " + action);
                    else
                        console.log("No data received from " + action);
                    
                    try {
                        var path = form.attr(CrossViewJS.options.attributes.fetch.jsonPath);
                        
                        if (path)
                            data = CrossViewJS.traverseJSON(data, path);

                        try {
                            if (render)
                                $(targets).each(function() {
                                    try {
                                        var renderData = {
                                                form : form,
                                                target : this.el,
                                                targetId : this.id,
                                                targetView : data && data.length !== 0 ? this.view : (this.emptyView || this.view),
                                                jsonArgs : jsonArgs ,
                                                data : (this.emptyView && (!data || data.length === 0) ? [null] : data)
                                        };

                                        try {
                                            this.el.trigger("crossview-form-render", [renderData]);
                                        } catch (e) {
                                            CrossViewJS.notifyError(this.el, e);
                                        }

                                        CrossViewJS.requireTemplate(renderData.targetView, function() {
                                            renderData.target.removeClass(CrossViewJS.options.css.view.fetching);
                                            renderModes[renderMode].apply(form, [renderData]);
                                        });
                                    } catch (e) {
                                        $(targets).each(function() {
                                            renderData.target.removeClass(CrossViewJS.options.css.view.fetching);
                                            CrossViewJS.notifyError(this.el, e);
                                        });
                                    }
                                });
                            else
                                form.crossview("getViewModel").container.removeClass(CrossViewJS.options.css.view.fetching);                                
                        } finally {
                            if (callback)
                                callback(data);
                        }
                    } catch (e) {
                        $(targets).each(function() { CrossViewJS.notifyError(this.el, e); });
                    }
                })
                .error(function(x, e) {
                    CrossViewJS.notifyError(form, e);
                    
                    if (render)
                        $(targets).each(function() {
                            renderData.target.removeClass(CrossViewJS.options.css.view.fetching);
                            CrossViewJS.notifyError(this.el, e);
                        });
                    else
                        form.crossview("getViewModel").container.removeClass(CrossViewJS.options.css.view.fetching);
                });
        } catch (e) {
            $(targets).each(function() { CrossViewJS.notifyError(this.el, e); });
        }
    }
    
    $.extend(true, CrossViewJS, {
        options : {
            attributes : {
                form : {
                    render : "data-form-render",
                    renderMode : "data-form-render-mode",
                    replaceUrl : "data-form-replace-target-url"
                }
            },
            
            form : {
                defaultRenderMode : "default"
            },
            
            commands : {
                submit : submitForm
            }
        },
        
        form : {}
    });
            

    CrossViewJS.form.registerRenderMode = function(name, callback) {
        renderModes[name] = callback;
    };

    /**
     * Appends rendered html to a target.
     */
    CrossViewJS.form.registerRenderMode(
            "append", function(renderContext) {
                var path = renderContext.target.attr(CrossViewJS.options.attributes.fetch.jsonPath);
                var html = $("<div/>");
                
                for (var attribute in CrossViewJS.options.attributes.view) {
                    var value = renderContext.target.attr(CrossViewJS.options.attributes.view[attribute]);
                    
                    if (value)
                        html.attr(CrossViewJS.options.attributes.view[attribute], value);
                }
                
                var data = CrossViewJS.traverseJSON(renderContext.data, path);
                html.crossview("render", data, renderContext.targetView);
                
                if (html.children().length > 1)
                    renderContext.target.append(html);
                else {
                    var child = html.children();
                    
                    child.attr(CrossViewJS.options.attributes.view.lastRendering, html.attr(CrossViewJS.options.attributes.view.lastRendering));
                    renderContext.target.append(html.children());
                    html.remove();
                }
            });
                    
    /**
     * Replaces the content of a view, rendering it directly using the
     * data.
     */
    CrossViewJS.form.registerRenderMode(
            "replace", function(renderContext) {
                var path = renderContext.target.attr(CrossViewJS.options.attributes.fetch.jsonPath);
                var data = CrossViewJS.traverseJSON(renderContext.data, path);
                
                if (renderContext.form.attr(CrossViewJS.options.attributes.form.replaceUrl) == "true") {
                    if (renderContext.form.attr("method").toUpperCase() != "GET") {
                        CrossVIewJS.notifyError(renderContext.form, "Cannot replace URL for other method than GET.");
                        return;
                    }
                    
                    var url = renderContext.form.attr("action");
                    var firstArgument = true;
                    
                    for (var arg in renderContext.jsonArgs) {
                        if (firstArgument) {
                            firstArgument = false;
                            url += "?";
                        } else {
                            url += "&";
                        }
                        url += encodeURIComponent(arg) + "=" + encodeURIComponent(renderContext.jsonArgs[arg]);
                    }
                    
                    renderContext.target.attr(CrossViewJS.options.attributes.fetch.jsonUrl, url);
                }
                
                renderContext.target.crossview("render", data, renderContext.targetView);                
            });
            
    /**
     * Sets data to the view-model and use it to render the target.
     * In this case, the data still stored on view-model instance
     * after the view is rendered.
     */
    CrossViewJS.form.registerRenderMode(
            "default", function(renderContext) {
                var viewModelInstance;
                var attrWithoutViewModel = renderContext.target.attr(CrossViewJS.options.attributes.view.withoutViewModel);
                var withoutViewModel;

                if (attrWithoutViewModel) {
                    withoutViewModel = attrWithoutViewModel == "true";
                } else if ((jsonUrl != null || parentData) && !renderContext.target.attr(CrossViewJS.options.attributes.viewModel.binding) || renderContext.target.attr(CrossViewJS.options.attributes.view.data)) {
                    withoutViewModel = true;
                } else {
                    withoutViewModel = false;
                }

                if (!withoutViewModel && renderContext.target.crossview("shouldHaveViewModel")) {
                    viewModelInstance = renderContext.target.crossview("getViewModel");
                } else {
                    viewModelInstance = null;
                }

                if (!viewModelInstance) {
                     renderContext.target.crossview("render", renderContext.data, renderContext.targetView);
                } else {
                     viewModelInstance.setData(renderContext.data);
                     renderContext.target.crossview("render");
                }
            });

     /**
     * Sets data to the view-model and use it to render the target.
     * In this case, the data still stored on view-model instance
     * after the view is rendered.
     */
    CrossViewJS.form.registerRenderMode(
            "view-model", function(renderContext) {
                var viewModelInstance;
            
                viewModelInstance = renderContext.target.crossview("getViewModel");
                    
                if (!viewModelInstance) {
                    viewModelInstance = setViewModel(renderContext.target, "$root");
                }

                viewModelInstance.setData(renderContext.data);
                renderContext.target.crossview("render");
            });
    
    CrossViewJS.form.submit = submitForm;
    
})(jQuery);

