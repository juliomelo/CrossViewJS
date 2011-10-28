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
    $.extend(true, CrossViewJS, {
        options : {
            attributes : {
                form : {
                    render : "data-form-render",
                    renderMode : "data-form-render-mode"
                }
            },
            
            form : {
                defaultRenderMode : "view-model"
            }
        },
        
        form : {}
    });

    /**
     * Render strategies definition.
     */
    var renderModes = {};            

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
                renderContext.target.crossview("render", data, renderContext.targetView);
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
                    
                if (!viewModelInstance)
                    viewModelInstance = setViewModel(renderContext.target, "$formSubmission");
            
                viewModelInstance.setData(data);
                renderContext.target.crossview("render");
            });

    /**
     * Submit a form and render its result to a specific view.
     * 
     * [jQuery] This MUST be used on a wrapper.
     * 
     * @return Event should propagate.
     */
    function renderFromFormSubmission() {
        var form = $(this);
        
        // Split targets and identify views for rendering.
        var targetsIds = form.attr(CrossViewJS.options.attributes.form.render).split(",");
        var targets = [];
        
        for (var i = 0; i < targetsIds.length; i++) {
            targets[i] = {
                    id : targetsIds[i],
                    el : $("#" + $.trim(targetsIds[i]))
            };
            targets[i].view = form.attr(CrossViewJS.options.attributes.view.className) || targets[i].el.attr(CrossViewJS.options.attributes.view.binding); 

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
            var renderMode = form.attr(CrossViewJS.options.attributes.form.renderMode);
            
            if (!renderModes[renderMode]) {
                CrossViewJS.notifyError(form, "Unknown render mode: " + renderMode + ".");
                return false;
            }
            
            $(targets).each(function() { this.el.addClass(CrossViewJS.options.css.view.fetching); });
                
            CrossViewJS.getJSON(action, { type : method, data : jsonArgs }, fetchMode)
                .success(function(data) {
                    try {
                        var path = form.attr(CrossViewJS.options.attributes.fetch.jsonPath);

                        if (path)
                            data = CrossViewJS.traverseJSON(data, path);

                        $(targets).each(function() {
                            try {
                                var renderData = {
                                        form : form,
                                        target : this.el,
                                        targetId : this.id,
                                        targetView : this.view,
                                        jsonArgs : jsonArgs,
                                        data : data
                                };
        
                                CrossViewJS.requireTemplate(this.view, function() {
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
                    } catch (e) {
                        $(targets).each(function() { CrossViewJS.notifyError(this.el, e); });
                    }
                })
                .error(function(x, e) {
                    $(targets).each(function() {
                        renderData.target.removeClass(CrossViewJS.options.css.view.fetching);
                        CrossViewJS.notifyError(this.el, e);
                    });
                });
        } catch (e) {
            $(targets).each(function() { CrossViewJS.notifyError(this.el, e); });
        }

        return false;
    }
    
    /**
     * Binds form submission that will render on an explicit target view.
     */
    function bindFormRender() {
        $("form[" + CrossViewJS.options.attributes.form.render + "]").live("submit", renderFromFormSubmission);
    }
    
    $(bindFormRender);
})(jQuery);