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
                html.crossview("render", data, viewName);
                
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
                renderContext.target.crossview("render", data, renderContext.viewName);
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
                renderContext.target.each(renderView);
            });

    /**
     * Submit a form and render its result to a specific view.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function renderFromFormSubmission() {
        var renderData = { form : $(this) };
        
        renderData.targetId = renderData.form.attr(CrossViewJS.options.attributes.form.render);
        renderData.target = $("#" + renderData.targetId);
        
        if (!renderData.target.length) {
            CrossViewJS.notifyError(renderData.form, "Target element not found: " + renderData.targetId + ".");
            debugger;
            return false;
        }

        try {
            renderData.renderMode = renderData.form.attr(CrossViewJS.options.attributes.form.renderMode) || CrossViewJS.options.form.defaultRenderMode;

            if (!renderModes[renderData.renderMode]) {
                CrossViewJS.notifyError(renderData.target, "Unknown render mode: " + renderData.renderMode + ".");
                return false;
            }

            renderData.strategy = renderData.form.attr(CrossViewJS.options.attributes.fetch.fetchMode);
            renderData.action = renderData.form.attr("action");
            renderData.method = renderData.form.attr("method");
            renderData.targetView = renderData.target.attr(CrossViewJS.options.attributes.view.binding) || renderData.form.attr(CrossViewJS.options.attributes.view.className);
            
            if (!renderData.targetView) {
                var error = 'Undefined view for target element "' + renderData.targetId + '".';
                CrossViewJS.notifyError(renderData.target, error);
                return false;
            }
            
            renderData.target.addClass(CrossViewJS.options.css.view.fetching);
            renderData.viewName = renderData.target.attr(CrossViewJS.options.attributes.view.binding) || renderData.form.attr(CrossViewJS.options.attributes.view.className);
            renderData.jsonArgs = renderData.form.serializeObject();
                
            CrossViewJS.requireTemplate(renderData.targetView, function() {
                CrossViewJS.getJSON(renderData.action, { type : renderData.method, data : renderData.jsonArgs }, renderData.strategy)
                    .success(function(data) {
                        try {
                            var path = renderData.form.attr(CrossViewJS.options.attributes.fetch.jsonPath);
                            
                            if (path)
                                renderData.data = CrossViewJS.traverseJSON(data, path);
                            else
                                renderData.data = data;
                                
                            renderModes[renderData.renderMode].apply(renderData.form, [renderData]);
                        } catch (e) {
                            CrossViewJS.notifyError(renderData.target, e);
                        }
                    })
                    .complete(function() {
                        renderData.target.removeClass(CrossViewJS.options.css.view.fetching);
                    })
                    .error(function(x, e) {
                        CrossViewJS.notifyError(renderData.target, e);
                    });
            });
        } catch (e) {
            CrossViewJS.notifyError(renderData.target, e);
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