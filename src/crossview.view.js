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
(function ($) {
    $.extend(true, CrossViewJS, {
        options: {
            /**
            * CSS constants.
            */
            css: {
                view: {
                    fetching: "crossview-fetching",
                    loadingViewModel: "crossview-loadingViewModel",
                    renderingView: "crossview-loading",
                    error: "crossview-error"
                }
            },

            /**
            * DOM element attributes.
            */
            attributes: {
                view: {
                    binding: "data-view",
                    lastRendering: "data-view-rendered",
                    withoutViewModel: "data-view-without-viewmodel",
                    withoutDataPropagation: "data-view-without-datapropagation",
                    className: "data-view-name",
                    emptyView: "data-view-empty",
                    data: "data-view-data",
                    innerTemplate: "data-view-innertemplate"
                }
            },

            /**
            * Resource mapping.
            */
            resources: {
                view: {}
            }
        },

        view: {}
    });

    /**
    * View context.
    */
    var view = {
        /**
        * Loaded templates.
        */
        templates: {}

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
        if (!template) {
            if (callback) {
                callback();
            }

            return;
        }

        if ((!view.templates[template] || !view.templates[template].url) && CrossViewJS.options.resources.view[template]) {
            CrossViewJS.console.log("Loading template " + template + " from " + CrossViewJS.options.resources.view[template] + ".");

            view.templates[template] = {
                url: CrossViewJS.options.resources.view[template],
                loading: true,
                callback: view.templates[template] ? view.templates[template].callback || [] : []
            };

            if (callback)
                view.templates[template].callback.push(callback);

            var options = $.extend(null, CrossViewJS.options.ajaxDefaults, { dataType: "text" });

            $.ajax(CrossViewJS.getAbsoluteURL(CrossViewJS.options.resources.view[template]), options).success(function (data) {
                try {
                    CrossViewJS.console.log("Template " + template + " loaded from " + CrossViewJS.options.resources.view[template] + ". (" + view.templates[template].callback.length + " callback(s) waiting)");
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
                            CrossViewJS.console.error(e.stack);
                        else
                            CrossViewJS.console.error(e);
                    }
                }
            }).error(function (x, e) {
                CrossViewJS.console.error("Error loading template \"" + template + "\" from " + CrossViewJS.options.resources.view[template] + ": " + e + ".");
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
                        CrossViewJS.console.error(e.stack);
                    } else {
                        CrossViewJS.console.error(e);
                    }
                }
            }
        } else if (callback) {
            CrossViewJS.console.log("Needing template " + template + ". Waiting for registration.");
            view.templates[template] = { callback: [callback] };
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

            el.data("crossview-rendering", true);
            el.addClass(CrossViewJS.options.css.view.renderingView);

            requireTemplate(template, function() {
                // Convert to array if it isn't
                if (!data) {
                    data = [null];
                } else if (!$.isArray(data)) {
                    data = [data];
                }

                if (el.attr("id")) {
                    CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " with following data of size " + (!data ? 0 : data.length));
                }

                var requestBinding = $([]);
                var viewModel = el.crossview("getViewModel");
                var compiledTemplate = !template && el.data("data-template-code") ? CrossViewJS.template.compile(el.data("data-template-code")) : null;
				
                el.empty();
				
                for (var i = 0; i < data.length; i++) {
                    var content = null;

                    try {
                        var itemData = {parent: data, index: i, viewModel: viewModel};

                        if (template) {
                            content = CrossViewJS.template.render(template, data[i] || {}, itemData);
                        } else if (compiledTemplate) {
                            content = CrossViewJS.template.renderCompiled(compiledTemplate, data[i] || {}, itemData);
                        } else {
                            throw "How should I render element without template?";
                        }
						
                        content.appendTo(el);

                        requestBinding = requestBinding.add(content.find("[" + CrossViewJS.options.attributes.viewModel.binding + "]"))
                           .add(content.filter("[" + CrossViewJS.options.attributes.viewModel.binding + "]"));

                        content.find("[" + CrossViewJS.options.attributes.view.binding + "]")
                          .add(content.filter("[" + CrossViewJS.options.attributes.view.binding + "]"))
                          .filter(":not([" + CrossViewJS.options.attributes.view.withoutDataPropagation + "=true])")
                          .data("crossview-parent-data", data[i]);
                    } catch (e) {
                        CrossViewJS.console.error("Error rendering and appending content from template " + template + " from index " + i + " of data: " + e);
                        CrossViewJS.console.error(data[i]);

                        if (content)
                            CrossViewJS.console.error("Content:\n" + content);

                        CrossViewJS.notifyError(el, e);
                        return;
                    }
                }

                var toRender;

                try {
                    el.attr(CrossViewJS.options.attributes.view.lastRendering, new Date().getTime());
                    el.find("[" + CrossViewJS.options.attributes.fetch.textUrl + "]").crossview("loadText");
                    el.find("[" + CrossViewJS.options.attributes.fetch.htmlUrl + "]").crossview("loadHTML");

                    toRender = el.find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])")
                        .add("[" + CrossViewJS.options.attributes.view.innerTemplate + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])");
                } catch (e) {
                    CrossViewJS.console.error('Error looking for rendered children items.');
                    CrossViewJS.notifyError(el, e);
                }

                try {
                    el.trigger("crossview-rendered", [data, template]);
                } catch (e) {
                    CrossViewJS.console.error('Error invoking "crossview-rendered" event for ' + el.attr("id") + ". Template: " + template + "." + e + ".", data);
                    CrossViewJS.notifyError(el, e);
                }

                el.removeClass(CrossViewJS.options.css.view.loadingViewModel);
                el.removeClass(CrossViewJS.options.css.view.renderingView);

                requestBinding.crossview("bindViewModel");

                // Elements that need to render must be filtered since it may be changed by crossview-rendered event handlers.
                toRender.filter("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").each(renderView);
                toRender.filter("[" + CrossViewJS.options.attributes.view.innerTemplate + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").each(renderView);

                el.data("crossview-rendering", false);
            });
        } catch (e) {
            CrossViewJS.console.error("Error rendering data using template \"" + template + "\": " + e);
            CrossViewJS.console.error(data);
            el.removeClass(CrossViewJS.options.css.view.renderingView);
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

        if (el.data("crossview-rendering")) {
            return;
        }

        var temp = el.data("crossview-view-temp");
        var template = temp ? temp.template : el.attr(CrossViewJS.options.attributes.view.binding);
        
        if (!template && !el.data("data-template-code") && el.attr(CrossViewJS.options.attributes.view.innerTemplate) !== "true") {
            return;
        }
		
        if (!template && !el.data("data-template-code") && el.attr(CrossViewJS.options.attributes.view.innerTemplate) === "true") {
            el.data("data-template-code", el.html()).empty();
        } else if (!template && el.attr(CrossViewJS.options.attributes.view.innerTemplate) === "true") {
            el.empty();
        }

        el.data("crossview-rendering", true);

        var parentData = temp ? temp.data : el.data("crossview-parent-data");

        requireTemplate(template, function () {
            if (!temp && template != el.attr(CrossViewJS.options.attributes.view.binding)) {
                CrossViewJS.console.warn('View has changed from "' + template + "' to '" + el.attr(CrossViewJS.options.attributes.view.binding) + "' before renderView got template data.");
                el.data("crossview-rendering", false);

                if (el.attr(CrossViewJS.options.attributes.view.binding))
                    el.call(renderView);

                return;
            }

            var attrWithoutViewModel = el.attr(CrossViewJS.options.attributes.view.withoutViewModel);
            var withoutViewModel;
            var jsonUrl = el.attr(CrossViewJS.options.attributes.fetch.jsonUrl);

            if (attrWithoutViewModel) {
                withoutViewModel = attrWithoutViewModel == "true";
            } else if ((jsonUrl != null || parentData) && !el.attr(CrossViewJS.options.attributes.viewModel.binding) || el.attr(CrossViewJS.options.attributes.view.data)) {
                withoutViewModel = true;
            } else {
                withoutViewModel = false;
            }

            if (!withoutViewModel && el.crossview("shouldHaveViewModel")) {
                CrossViewJS.console.log("Waiting view-model finish loading to render view " + el.attr("id") + ".");
                el.data("crossview-rendering", false);
                CrossViewJS.viewModel.requestBinding(el);
                return;
            }

            el.removeData("crossview-parent-data");

            var path = el.attr(CrossViewJS.options.attributes.fetch.jsonPath);
            var viewModelInstance = el.crossview("getViewModel");

            if (!temp && el.attr(CrossViewJS.options.attributes.view.data)) {
                if (el.attr("id")) {
                    CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " and inline-data");
                }

                var data;

                try {
                    data = CrossViewJS.traverseJSON(JSON.parse(el.attr(CrossViewJS.options.attributes.view.data)), path);
                } catch (e) {
                    CrossViewJS.notifyError(el, e);
                    CrossViewJS.console.error(parentData);
                }

                if (!data || data.length === 0) {
                    var emptyView = el.attr(CrossViewJS.options.attributes.view.emptyView);

                    if (emptyView) {
                        CrossViewJS.console.log("Replacing view " + template + " with view " + emptyView + " for empty data.");
                        template = emptyView;
                    } else {
                        CrossViewJS.console.log("View " + template + " being ignored because of empty data from path " + path + ".");
                        el.data("crossview-rendering", false).empty().attr(CrossViewJS.options.attributes.view.lastRendering, new Date().getTime());
                        return;
                    }
                }

                try {
                    render(template, el, data);
                } catch (e) {
                    CrossViewJS.notifyError(el, e);
                }

                el.data("crossview-rendering", false);

            } else if (!temp && jsonUrl) { // Check if the view needs to fetch a JSON data.
                if (el.hasClass(CrossViewJS.options.css.view.fetching)) {
                    CrossViewJS.console.log("Ignoring render view " + el.attr("id") + ", since it is already fetching data.");
                    el.data("crossview-rendering", false);
                    return;
                }

                var strategy = el.attr(CrossViewJS.options.attributes.fetch.fetchMode);

                jsonUrl = CrossViewJS.getAbsoluteURL(jsonUrl);
                CrossViewJS.console.log("Fetching JSON data from " + jsonUrl + ".");

                el.addClass(CrossViewJS.options.css.view.fetching);

                CrossViewJS.getJSON.call(el, jsonUrl, null, strategy).success(function (data) {
                    CrossViewJS.console.log("Fetched JSON data from " + jsonUrl + ".");

                    try {
                        // Traverse JSON data path...
                        data = CrossViewJS.traverseJSON(data, path);

                        if (viewModelInstance && !withoutViewModel) {
                            CrossViewJS.console.log("Setting data to view-model " + viewModelInstance.instanceId + ".");
                            viewModelInstance.setData(data, el);
                        }

                        if (!data || data.length === 0) {
                            var emptyView = el.attr(CrossViewJS.options.attributes.view.emptyView);

                            if (emptyView) {
                                CrossViewJS.console.log("Replacing view " + template + " with view " + emptyView + " for empty data.");
                                template = emptyView;
                                data = withoutViewModel && viewModelInstance ? viewModelInstance.getRenderData() : null;
                            } else {
                                CrossViewJS.console.log("View " + template + " being ignored because of empty data.");
                                el.data("crossview-rendering", false).empty().attr(CrossViewJS.options.attributes.view.lastRendering, new Date().getTime());
                                return;
                            }
                        }

                        // Use a View-Model, if available.
                        if (!viewModelInstance || withoutViewModel) {
                            CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " without a View-Model");
                            render(template, el, data);
                        } else {
                            CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " and its view-model " + viewModelInstance.instanceId + ".");
                            render(template, el, viewModelInstance.getRenderData());
                        }
                    } catch (e) {
                        CrossViewJS.notifyError(el, e);
                    }
                }).complete(function () {
                    el.removeClass(CrossViewJS.options.css.view.fetching);
                    el.data("crossview-rendering", false);
                }).error(function (x, e) {
                    CrossViewJS.notifyError(el, "Cannot get JSON from " + jsonUrl + ": " + e || x);
                });
            } else if (parentData) {
                if (el.attr("id")) {
                    CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " and parent's data through " + path);
                }

                var data;

                // Remove temporary data when rendering really started.
                if (temp && temp.data) {
                    el.removeData("crossview-view-temp");
                    data = temp.data;
                } else {
                    if (temp) {
                        el.removeData("crossview-view-temp");
                    }
                    try {
                        data = CrossViewJS.traverseJSON(parentData, path);
                    } catch (e) {
                        CrossViewJS.notifyError(el, e);
                        CrossViewJS.console.error(parentData);
                    }
                }

                if (!data || data.length === 0) {
                    var emptyView = el.attr(CrossViewJS.options.attributes.view.emptyView);

                    if (emptyView) {
                        CrossViewJS.console.log("Replacing view " + template + " with view " + emptyView + " for empty data.");
                        template = emptyView;
                    } else {
                        CrossViewJS.console.log("View " + template + " being ignored because of empty data from path " + path + ".");
                        el.data("crossview-rendering", false);
                        return;
                    }
                }

                // Use a View-Model, if available.
                if (!viewModelInstance || withoutViewModel) {
                    CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " without a View-Model");
                    render(template, el, data);
                } else {
                    CrossViewJS.console.log("Setting data to view-model " + viewModelInstance.instanceId + ".");
                    viewModelInstance.setData(data, el);
                    CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " and its view-model " + viewModelInstance.instanceId + ".");
                    render(template, el, viewModelInstance.getRenderData());
                }

                el.data("crossview-rendering", false);
            } else {
                if (viewModelInstance) {
                    // Do basic rendering.
                    CrossViewJS.console.log("Rendering " + el.attr("id") + " using " + template + " and view-model " + viewModelInstance.instanceId + " and path '" + path + "'.");

                    try {
                        var data = viewModelInstance.getRenderData();

                        // Traverse JSON data path...
                        data = CrossViewJS.traverseJSON(data, path);

                        if (!data || data.length === 0) {
                            var emptyView = el.attr(CrossViewJS.options.attributes.view.emptyView);

                            if (emptyView) {
                                CrossViewJS.console.log("Replacing view " + template + " with view " + emptyView + " for empty data.");
                                template = emptyView;
                            }
                        }

                        render(template, el, data);
                    } catch (e) {
                        CrossViewJS.notifyError(el, e);
                    }
                } else if (el.crossview("shouldHaveViewModel")) {
                    CrossViewJS.console.error("Can't render " + el.attr("id") + " because there is no view-model instanciated.");
                } else {
                	render(template, el, null);
                }

                el.data("crossview-rendering", false);
            }
        });
    }

    function findAndRenderView() {
        $("[" + CrossViewJS.options.attributes.view.binding +
            "][" + CrossViewJS.options.attributes.fetch.jsonUrl + 
            "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "]):not(." + 
            CrossViewJS.options.css.view.fetching + "):not(." + CrossViewJS.options.css.view.error + ")")
			.add("[" + CrossViewJS.options.attributes.fetch.jsonUrl + "][" + CrossViewJS.options.attributes.view.innerTemplate + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "]):not(." + 
            CrossViewJS.options.css.view.fetching + "):not(." + CrossViewJS.options.css.view.error + ")")
			.each(renderView);
    }

    /**
    * Loads templates for Views.
    */
    CrossViewJS.view.loadTemplates = function () {
        $("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").each(function () {
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
    CrossViewJS.fn.render = function (data, template) {
        try {
            if (data) {
                if (!template) {
                    template = $(this).attr(CrossViewJS.options.attributes.view.binding);
                }

                $(this).data("crossview-view-temp", { data: data, template: template });
            }

            return $(this).each(renderView);
        } catch (e) {
            CrossViewJS.notifyError($(this), e);
        }
    };

    CrossViewJS.requireTemplate = requireTemplate;

    $(function () {
        $(document).ajaxComplete(function () {
            $(findAndRenderView);
        });
    });

    $(findAndRenderView);
})(jQuery);
