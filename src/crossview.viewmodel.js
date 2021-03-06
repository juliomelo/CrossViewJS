/**
 * CrossViewJS @VERSION
 * Model-View Module
 * 
 * Support for Model-View from MVVM pattern.
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
    /**
    * View-Model context.
    */
    var viewModel = {
        /**
        * Sequential bind id.
        */
        bindidSeq: 0,

        /**
        * Instances of view-model.
        */
        instances: [],

        /**
        * Class definitions for view-models.
        */
        classes: {
            "$root": function () {
                return {
                    getRenderData: function () { return this.data; }
                };
            }
        },

        /**
        * A prototype for model-view instances.
        */
        instancePrototype: {
            initialize: function (el, instanceid) {
            },

            updateView: function () {
                if (this.container.attr(CrossViewJS.options.attributes.view.binding)) {
                    this.container.empty().crossview("render");
                } else {
                    this.container.find("[" + CrossViewJS.options.attributes.view.binding + "]").empty().crossview("render");
                }
            },

            updateClosestView: function (el) {
                if (el.attr(CrossViewJS.options.attributes.view.binding)) {
                    el.empty().crossview("render");
                } else {
                    el.parents("[" + CrossViewJS.options.attributes.view.binding + "]:first").empty().crossview("render");
                }
            },

            renderWithJSON: function (el) {
                var targetId = el.attr(CrossViewJS.options.attributes.viewModel.renderTarget);
                var target = $("#" + targetId);

                if (!target.length) {
                    notifyError(el, "Target not found: " + targetId);
                    return;
                }

                target.empty().addClass(CrossViewJS.options.css.view.fetching);
                el.crossview("getJSON").success(function (data) {
                    CrossViewJS.console.log("Rendering " + targetId + " after command for rendering with JSON.");
                    target.crossview("render", data);
                }).complete(function () {
                    target.removeClass(CrossViewJS.options.css.view.fetching);
                });
            },

            setData: function (data) {
                this.data = data;
            },

            getRenderData: function () {
                return this.data;
            },

            getData: function (attribute) {
                if (!attribute) {
                    return this.data;
                } else if (this.data) {
                    return this.data[attribute];
                } else {
                    return this.container.find("[name=" + attribute + "]").val();
                }
            },

            /**
            * @param el    Element for reference use.
            */
            getAncestorViewModel: function (el) {
                return getAncestorViewModel(this, el || this.container);
            }
        },

        /**
        * Resouce mapping, used to load model-view classes.
        */
        resources: {},

        /**
        * Tells if binding has been requested.
        */
        binding: false
    };

    $.extend(true, CrossViewJS.options, {
        /**
        * DOM element attributes.
        */
        attributes: {
            viewModel: {
                bindId: "data-viewmodel-instance",
                binding: "data-viewmodel",
                className: "data-viewmodel-name",
                renderTarget: "data-render"
            }
        },

        resources: {
            viewModel: {}
        },

        viewModel: {
            compactThreshold: 100,
            gbThreshold: 100,
            instancePrototype: viewModel.instancePrototype
        },

        commands: viewModel.instancePrototype

    });

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
        if (!viewModel.classes[name]) {
            CrossViewJS.notifyError(el, "View-Model class not found: " + name + ".");
        } else {
            CrossViewJS.console.log("Binding " + name + " to " + el.attr("id"));

            var viewModelData = CrossViewJS.options.resources.viewModel[name];
            var instance, instanceId;

            if (!viewModelData || !viewModelData.singletonInstance) {
                instance = new viewModel.classes[name]();
                instanceId = ++viewModel.bindidSeq;

                // Instantiate a view-model class, specializing our portotype.
                for (var method in viewModel.instancePrototype)
                    if (!instance[method])
                        instance[method] = viewModel.instancePrototype[method];

                $.extend(instance, {
                    instanceId: instanceId,
                    container: el
                });

                viewModel.instances[instanceId] = instance;

                if (viewModelData && (instance.singleton || instance.flyweight)) {
                    viewModelData.singletonInstance = instance;
                    instance.container = null;
                }
            } else {
                instance = viewModelData.singletonInstance;
                instanceId = instance.instanceId
            }

            el.attr(CrossViewJS.options.attributes.viewModel.bindId, instanceId);

            // Executes "initialize" method, if the view-model has one.
            try {
                instance.initialize(el, instanceId);
                CrossViewJS.clearError(el);
            } catch (e) {
                CrossViewJS.notifyError(el, e);
            }

            el.trigger("crossview-binded", [el, instance]);

            if (el.attr(CrossViewJS.options.attributes.view.binding)) {
                el.removeClass(CrossViewJS.options.css.view.loadingViewModel).crossview("render");
            } else {
                // Since we have already instantiated the view-model, try to render its view.
                var views = el.find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.withoutViewModel + "=true]):not([" + CrossViewJS.options.attributes.view.lastRendering + "])");

                CrossViewJS.console.log(views.length + " views found. Rendering...");
                views.removeClass(CrossViewJS.options.css.view.loadingViewModel).crossview("render");

                // Look for remote data.
                var urls = el.filter("[" + CrossViewJS.options.attributes.fetch.jsonUrl + "]:not([" + CrossViewJS.options.attributes.view.binding + "]):not([" + CrossViewJS.options.attributes.view.withoutViewModel + "=true])")
                    .add($("[" + CrossViewJS.options.attributes.fetch.jsonUrl + "]:not([" + CrossViewJS.options.attributes.view.binding + "]):not([" + CrossViewJS.options.attributes.view.withoutViewModel + "=true])", el));

                CrossViewJS.console.log(urls.length + " urls found. Fetching...");
                urls.removeClass(CrossViewJS.options.css.view.loadingViewModel).crossview("render");
            }

            try {
                if (instanceId % CrossViewJS.options.viewModel.gbThreshold == 0) {
                    if (!viewModel.runningGarbageCollection) {
                        viewModel.runningGarbageCollection = true;
                        setTimeout(runGarbageCollection, 1000);
                    }
                }
            } catch (e) {
                CrossViewJS.console.error("Can't run garbage collection: " + e);
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
        var id = el.attr(CrossViewJS.options.attributes.viewModel.bindId);

        if (!id && !el.attr(CrossViewJS.options.attributes.viewModel.binding)) {
            for (var parent = el.parent(); !id && parent.length; parent = parent.parent()) {
                if (parent.attr(CrossViewJS.options.attributes.viewModel.bindId) || parent.attr(CrossViewJS.options.attributes.viewModel.binding)) {
                    id = parent.attr(CrossViewJS.options.attributes.viewModel.bindId);
                    break;
                }
            }

            if (id)
                el.attr(CrossViewJS.options.attributes.viewModel.bindId, id);
        }

        return id ? viewModel.instances[id] : null;
    }

    /**
    * Checks if an element should have an associated view-model,
    * but it have not been loaded yet.
    */
    function shouldHaveViewModel(el) {
        if (el.attr(CrossViewJS.options.attributes.view.withoutViewModel)) {
            return false;
        }

        var id = el.attr(CrossViewJS.options.attributes.viewModel.bindId);
        var found = false;

        if (!id && !el.attr(CrossViewJS.options.attributes.viewModel.binding)) {
            for (var parent = el.parent(); !id && parent.length; parent = parent.parent()) {
                id = parent.attr(CrossViewJS.options.attributes.viewModel.bindId);

                if (parent.attr(CrossViewJS.options.attributes.viewModel.binding)) {
                    found = true;
                    break;
                }
            }

            if (id)
                el.attr(CrossViewJS.options.attributes.viewModel.bindId, id);
        } else
            found = true;

        return found && !id;
    }

    /**
    * Gets the overriden view-model, which is a view-model instance of
    * its ancestor.
    */
    function getAncestorViewModel(viewModel, el) {
        if (viewModel.container) {
            return getViewModel(viewModel.container.parent());
        } else if (el) {
            var ancestor;
            var search = "[" + CrossViewJS.options.attributes.viewModel.bindId + "=" + viewModel.instanceId + "]";

            ancestor = el.parents(search + ":last").parent();

            if (ancestor.length == 0) {
                ancestor = el.parent();
            }

            return getViewModel(ancestor);
        } else {
            throw "Cannot get ancestor view-model of a flyweight or singleton view-model, without knowing its container.";
        }
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
    function requestBinding(el) {
        if (!viewModel.binding || el) {
            if (!el) {
                viewModel.binding = true;
            }

            CrossViewJS.console.log("Finding view-model to bind...");

            try {
                var selector = "[" + CrossViewJS.options.attributes.viewModel.binding + "]:not([" + CrossViewJS.options.attributes.viewModel.bindId + "])";

                if (el) {
                    el.filter(selector).each(bindViewModel);
                    $(selector, el).each(bindViewModel);
                } else {
                    $(selector).each(bindViewModel);
                }
            } finally {
                if (!el) {
                    viewModel.binding = false;
                }
            }
        }
    }

    /**
    * Bind a view-model to an element.
    * 
    * [jQuery] This MUST be used on a wrapper.
    */
    function bindViewModel() {

        if ($(this).attr(CrossViewJS.options.attributes.viewModel.bindId) != null)
            return;

        try {
            var name = $(this).attr(CrossViewJS.options.attributes.viewModel.binding);

            if (viewModel.classes[name]) {
                CrossViewJS.console.log("Binding View-Model \"" + name + "\" to " + $(this).attr("id"));
                setViewModel($(this), name);
            } else if (CrossViewJS.options.resources.viewModel[name]) {
                $(this).find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.withoutViewModel + "='true'])").addClass(CrossViewJS.options.css.view.loadingViewModel);

                var that = $(this);

                var ajaxOptions = $.extend(null, CrossViewJS.options.ajaxDefaults, {
                    dataType: "script"
                });

                var viewModelData = CrossViewJS.options.resources.viewModel[name];

                if (viewModelData.initialized) {
                    CrossViewJS.console.log("Needing " + name + " view-model that is already initialized but not registered. Waiting...");
                    return;
                }

                // Check if viewModelData is a URL string or an object.
                if (typeof (viewModelData) == "string") {
                    CrossViewJS.options.resources.viewModel[name] = viewModelData = { href: viewModelData };
                }

                var viewModelURL = viewModelData.href;

                if (viewModelData.charset) {
                    ajaxOptions.scriptCharset = viewModelData.charset;
                    CrossViewJS.console.log("Using " + ajaxOptions.scriptCharset + " charset for " + viewModelURL + ".");
                }

                viewModelData.initialized = true;
                viewModelURL = CrossViewJS.getAbsoluteURL(viewModelURL);

                CrossViewJS.console.log("Loading javascript for View-Model \"" + name + "\" from " + viewModelURL + ".");

                $.ajax(viewModelURL, ajaxOptions).success(function (data) {
                    var classDefinition = CrossViewJS.traverseJSON(window, name);

                    if (!classDefinition || classDefinition === window)
                        throw "Undefined class " + name + ", even after having loaded " + viewModelURL;

                    registerViewModel(name, classDefinition);
                }).error(function (x, e) {
                    CrossViewJS.options.resources.viewModel[name] = null;
                    CrossViewJS.console.error("Error loading javascript for View-Model \"" + name + "\" from " + viewModelURL + ": " + e + ".");
                }).complete(function () {
                    var viewModel = getViewModel(that);
                    
                    if (viewModel && (viewModel.singleton || viewModel.flyweight)) {
                        $("[" + CrossViewJS.options.attributes.viewModel.bindId + "=" + viewModel.instanceId + "] ." + CrossViewJS.options.css.view.loadingViewModel).each(function () {
                            if (!shouldHaveViewModel($(this)))
                                $(this).removeClass(CrossViewJS.options.css.view.loadingViewModel);
                        });
                    } else {
                        that.find("." + CrossViewJS.options.css.view.loadingViewModel).each(function () {
                            if (!shouldHaveViewModel($(this)))
                                $(this).removeClass(CrossViewJS.options.css.view.loadingViewModel);
                        });
                    }
                });
            } else if (CrossViewJS.loadingMapping === 0) {
                var htmlClass = CrossViewJS.traverseJSON(window, name);

                if (htmlClass && htmlClass !== window) {
                    registerViewModel(name, htmlClass);
                    bindViewModel.apply(this, arguments);
                    return;
                }

                throw "View-Model class \"" + name + "\" not found!";
            }
        } catch (e) {
            CrossViewJS.notifyError($(this), e);
        }
    }

    function runGarbageCollection() {
        var free = [];

        CrossViewJS.console.log("Running garbage collection from CrossViewJS. (" + viewModel.bindidSeq + " slots)");

        for (var i = 1; i <= viewModel.bindidSeq; i++) {
            if (viewModel.instances[i] && !$("[" + CrossViewJS.options.attributes.viewModel.bindId + "=" + i + "]").length) {
                CrossViewJS.console.log("Releasing view-model instance " + i + ".");
                viewModel.instances[i] = null;
                free.push(i);
            } else if (!viewModel.instances[i]) {
                CrossViewJS.console.log("Slot " + i + " is free.");
                free.push(i);
            }
        }

        if (free.length > CrossViewJS.options.viewModel.compactThreshold) {
            CrossViewJS.console.log("Compacting instances...");

            while (free.length) {
                var idx = free.pop();

                // If idx is from the last element, just remove it.
                if (idx != viewModel.bindidSeq) {
                    CrossViewJS.console.log("Moving instance " + viewModel.bindidSeq + " to " + idx + ".");
                    viewModel.instances[idx] = viewModel.instances[viewModel.bindidSeq];
                    $("[" + CrossViewJS.options.attributes.viewModel.bindId + "=" + viewModel.bindidSeq + "]")
                        .attr(CrossViewJS.options.attributes.viewModel.bindId, idx);
                    viewModel.instances[idx].instanceId = idx;
                }

                viewModel.bindidSeq--;
                viewModel.instances.pop();
            }
        }

        viewModel.runningGarbageCollection = false;
    }

    $.extend(CrossViewJS.fn, {
        shouldHaveViewModel: function () { return shouldHaveViewModel(this); },
        getViewModel: function () { return getViewModel(this); },
        bindViewModel: function () { this.each(bindViewModel); },
        setViewModelData: function (data) {
            this.each(function () { getViewModel($(this)).setData(data, $(this)); });
        }
    });

    $.extend(true, CrossViewJS, {
        viewModel: {
            requestBinding: requestBinding,
            runGarbageCollection: runGarbageCollection
        }
    });

    $(function () { requestBinding(); });

})(jQuery, jQuery.crossview);
