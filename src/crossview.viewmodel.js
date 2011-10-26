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
(function($) {
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
                    this.container.find("[" + CrossViewJS.options.attributes.view.binding + "]").empty().crossview("render");
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
                },
                
                getAncestorViewModel : function() {
                    return getAncestorViewModel(this);
                }
            },
            
            /**
             * Resouce mapping, used to load model-view classes.
             */
            resources : {},

            /**
             * Tells if binding has been requested.
             */
            binding : false
    };
    
    $.extend(true, CrossViewJS.options, {
        /**
         * DOM element attributes.
         */
        attributes : {
            viewModel : {
                bindId : "data-viewmodel-instance",
                binding : "data-viewmodel",
                className : "data-viewmodel-name"
            }
        },
        
        resources : {
            viewModel : {}
        }
        
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
            console.log("Binding " + name + " to " + el.attr("id"));

            var instance = new viewModel.classes[name]();
            var instanceId = ++viewModel.bindidSeq;

            // Instantiate a view-model class, specializing our portotype.
            for (var method in viewModel.instancePrototype)
                if (!instance[method])
                    instance[method] = viewModel.instancePrototype[method];
           
           $.extend(instance, {
              instanceId : instanceId,
                container : el
            });
                   
            viewModel.instances[instanceId] = instance;
            el.attr(CrossViewJS.options.attributes.viewModel.bindId, instanceId);

            // Executes "initialize" method, if the view-model has one.
            $(function() {
                try {
                    instance.initialize(el, instanceId);
                    CrossViewJS.clearError(el);
                } catch (e) {
                    CrossViewJS.notifyError(el, e);
                }
            });

            if (el.attr(CrossViewJS.options.attributes.view.binding)) {
                el.each(renderView);
            } else {
                // Since we have already instantiated the view-model, try to render its view.
                var views = el.find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.withoutViewModel + "=true])");
                
                console.log(views.length + " found. Rendering...");
                views.removeClass(CrossViewJS.options.css.view.loadingViewModel).crossview("render");
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
                id = parent.attr(CrossViewJS.options.attributes.viewModel.bindId);

                if (parent.attr(CrossViewJS.options.attributes.viewModel.binding))
                    break;
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
                $("[" + CrossViewJS.options.attributes.viewModel.binding + "]:not([" + CrossViewJS.options.attributes.viewModel.bindId + "])").each(bindViewModel);
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
        
        if ($(this).hasClass(CrossViewJS.options.attributes.viewModel.bindId))
            return;

        try {
            var name = $(this).attr(CrossViewJS.options.attributes.viewModel.binding);

            if (viewModel.classes[name]) {
                console.log("Binding View-Model \"" + name + "\" to " + $(this).attr("id"));
                setViewModel($(this), name);
            } else if (CrossViewJS.options.resources.viewModel[name]) {
                console.log("Loading javascript for View-Model \"" + name + "\" from " + CrossViewJS.getAbsoluteURL(CrossViewJS.options.resources.viewModel[name]) + ".");

                $(this).find("[" + CrossViewJS.options.attributes.view.binding + "]").addClass(CrossViewJS.options.css.view.loadingViewModel);

                var that = $(this);
                
                var ajaxOptions = $.extend(null, CrossViewJS.options.ajaxDefaults, {
                    dataType : "script"
                });

                $.ajax(CrossViewJS.getAbsoluteURL(CrossViewJS.options.resources.viewModel[name]), ajaxOptions).success(function(data) {
                    var classDefinition = CrossViewJS.traverseJSON(window, name);
                    
                    if (!classDefinition || classDefinition === window)
                        throw "Undefined class " + name + ", even after having loaded " + CrossViewJS.options.resources.viewModel[name];
                    
                    registerViewModel(name, classDefinition);
                }).error(function(x, e) {
                    CrossViewJS.options.resources.viewModel[name] = null;
                    console.error("Error loading javascript for View-Model \"" + name + "\" from " + CrossViewJS.getAbsoluteURL(CrossViewJS.options.resources.viewModel[name]) + ": " + e + ".");
                }).complete(function() {
                    that.find("." + CrossViewJS.options.css.view.loadingViewModel).each(function () {
                        if (!shouldHaveViewModel($(this)))
                            $(this).removeClass(CrossViewJS.options.css.view.loadingViewModel);
                    });
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

    $.extend(CrossViewJS.fn, {
        shouldHaveViewModel : function() { shouldHaveViewModel(this); },
        getViewModel : function() { return getViewModel(this); },
        bindViewModel : function() { this.each(bindViewModel); },
        setViewModelData : function(data) {
            this.each(function() { getViewModel($(this)).setData(data); });
        }
    });
    
    $.extend(true, CrossViewJS, {
        viewModel : {
            requestBinding : requestBinding
        }
    });
    
    $(requestBinding);

})(jQuery, jQuery.crossview);