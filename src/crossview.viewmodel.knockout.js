/**
 * CrossViewJS @VERSION
 * Model-View Module
 * 
 * Support for KnockoutJS framework.
 *
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2011 J�lio C�sar e Melo
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
    CrossViewJS.knockout = {
        applyBindings: function(viewModel, element) {
            var backup, preventedBinding;
            
            if ($(element).data("crossview-knockout.bind") === viewModel.instanceId) {
                return;
            }
            
            CrossViewJS.console.log("Applying knockout bindings to view-model " + viewModel.instanceId);
            
            try {
                if ($(element).is("select[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])")) {
                    postponedRendering($(element));
                }
                
                $("select[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])", element).each(function() {
                    postponedRendering($(this));
                });
                
                try {
                    ko.applyBindings(viewModel, element);
                    $(element).find("[" + CrossViewJS.options.attributes.viewModel.bindId + "]")
                            .filter(function() {
                                // Exclude children that is being rendered.
                                return $(this).data("crossview-rendering") !== true;
                            }).andSelf().data("crossview-knockout.bind", viewModel.instanceId);
                } catch (e) {
                    // Let's remove any other binded child.
                    preventedBinding = preventBinding(element);
                    
                    try {
                        // Since KnockoutJS 3.0.0, we cannot reapply bindings without cleaning node.
                        if (ko.cleanNode) {
                            backup = ko.utils.domNodeDisposal.cleanExternalData;
                            // Prevent cleaning jQuery data.
                            ko.utils.domNodeDisposal.cleanExternalData = function() {
                            };
                            try {
                                ko.cleanNode(element);
                            } finally {
                                ko.utils.domNodeDisposal.cleanExternalData = backup;
                            }
                        }
                        ko.applyBindings(viewModel, element);
                        $(element).find("[" + CrossViewJS.options.attributes.viewModel.bindId + "]").andSelf().data("crossview-knockout.bind", viewModel.instanceId);
                    } finally {
                        restoreElements(preventedBinding);
                    }
                }
            } catch (e) {
                CrossViewJS.console.error("Error applying knockout bindings to view-model " + viewModel.instanceId);
                CrossViewJS.notifyError($(element), e);
                CrossViewJS.console.error(viewModel);
            }

            $("[data-bind*=foreach] [" + CrossViewJS.options.attributes.viewModel.binding + "]", element).each(function() {
                if (!$(this).data("crossview-knockout.bind")) {
                    $(this).data("crossview-knockout.bind", viewModel.instanceId);
                }
            });
        }
    };
    
    function postponedRendering(element) {
        var el = $(element);
        
        if (!el.data("crossview-knockout.rendering")) {
            var val = el.val();
            
            if (!val) {
                return;
            }
            
            el.empty().data("crossview-knockout.rendering", true);

            setTimeout(function() {
                el.removeData("crossview-knockout.rendering");
                
                if (el.is("select")) {
                    /* If this is a select and is being rendered,
                     * its value option may not exist before rendering.
                     * If so, let's reset the value after rendering.
                     */
                    function setValue() {
                        if (el.find("[" + CrossViewJS.options.attributes.view.binding + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").length === 0
                            && el.find("[" + CrossViewJS.options.attributes.view.innerTemplate + "]:not([" + CrossViewJS.options.attributes.view.lastRendering + "])").length === 0) {
                            if (el.val() !== val) {
                                el.val(val);
                            }
                        } else {
                            el.one("crossview-rendered", setValue);
                        }
                    }
                     
                    el.one("crossview-rendered", setValue);
                }
                
                el.crossview("render");
            }, 1);
        }
    }
    
    /**
     * Remove from DOM elements that have already binded to knockout from a
     * root element.
     * 
     * @param {type} element Root element.
     * @returns {Array} Data used to future restore.
     */
    function preventBinding(element) {
        var protected = [];
        
        $("[" + CrossViewJS.options.attributes.viewModel.bindId + "]", element).each(function() {
            var el = $(this);
            if (el.data("crossview-knockout.bind")) {
                protected.push({ domElement: this, parent: el.parent(), prev: el.prev() });
            }
        });
        
        $(protected).each(function() {
            CrossViewJS.console.debug("Protecting ", this);
            $(this.domElement).remove();
        });
        
        CrossViewJS.console.log(protected.length + " elements protected");
        
        return protected;
    }
    
    /**
     * Restore elements removed from binding prevention.
     * 
     * @param {type} protected Data generated by preventBinding function.
     */
    function restoreElements(protected) {
        var i, item;
        
        CrossViewJS.console.log("Restoring " + protected.length + " elements");
        
        for (i = 0; i < protected.length; i++) {
            item = protected[i];
            if (item.prev) {
                item.prev.after(item.domElement);
            } else if (item.parent.children().length === 0) {
                item.parent.append(item.domElement);
            } else {
                item.parent.children(":first").before(item.domElement);
            }
        }
    }

    function applyBindings(target, viewModel) {
        var koBindings = $("[data-bind]", target);

        koBindings.each(function() {
            var binding = $(this);

            // Ensure that view-model is correct.
            if (binding.crossview("getViewModel") === viewModel) {
                CrossViewJS.knockout.applyBindings(viewModel, this);
            }
        });
    }

    if (window.ko) {
        CrossViewJS.console.log("Started CrossViewJS integration with Knockout.");

        if (CrossViewJS.options.viewModel.useKnockout !== false) {
            CrossViewJS.options.viewModel.useKnockout = true;
        }

        if (CrossViewJS.options.viewModel.useKnockoutMapping !== false) {
            CrossViewJS.options.viewModel.useKnockoutMapping = true;
        }

        if (CrossViewJS.options.viewModel.useKnockoutOnTemplate != true) {
            CrossViewJS.options.viewModel.useKnockoutOnTemplate = false;
        }

        $(document).on("crossview-binded", function(e, el, instance) {
            if (instance.useKnockout || (instance.useKnockout == null && CrossViewJS.options.viewModel.useKnockout)) {

                el.on("crossview-rendered", function(e2) {
                    applyBindings($(e2.target), instance);
                });

                applyBindings(el, instance);

                if (ko.mapping && (instance.useKnockoutMapping || (instance.useKnockoutMapping == null && CrossViewJS.options.viewModel.useKnockoutMapping))) {
                    instance.__ko_mapping__ = {
                        copy: [],
                        ignore: [],
                        include: ["_destroy"],
                        mappedProperties: {},
                        __crossview_alreadyMapped__: false
                    };

                    if (instance.setData === CrossViewJS.options.viewModel.instancePrototype.setData) {
                        instance.setData = function(data, el) {
                            /* If it is not yet done, check view-model for already mapped properties,
                             * to make them updatable from knockout mapping plugin.
                             */
                            if (!this.__ko_mapping__.__crossview_alreadyMapped__) {
                                for (var field in data) {
                                    if (typeof (this[field]) == "function") {
                                        this.__ko_mapping__.mappedProperties[field] = true;
                                    }
                                }

                                this.__ko_mapping__.__crossview_alreadyMapped__ = true;
                            }

                            var mapped = ko.mapping.fromJS(data, this);

                            // Check if mapped object is the same view-model that we provided.
                            if (mapped != this) {
                                CrossViewJS.console.error("Knockout Mapping plugin failed to update view-model.", this);
                            }

                            if (!this.useKnockoutOnTemplate) {
                                CrossViewJS.options.viewModel.instancePrototype.setData.apply(this, arguments);
                            }
                        };
                        
                        // Is there already a data?
                        if (instance.data) {
                            instance.setData(instance.data, el);
                        }
                    }

                    if (instance.useKnockoutOnTemplate && instance.getRenderData === CrossViewJS.options.viewModel.instancePrototype.getRenderData) {
                        instance.getRenderData = function() {
                            return this;
                        };
                    }
                }
            }
        });

        // Add custom bindings for CrossView attributes.
        ko.bindingHandlers.view = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor();

                if (typeof value === "function") {
                    value = value();
                }

                if ($(element).attr(CrossViewJS.options.attributes.view.binding) != value) {
                    $(element).attr(CrossViewJS.options.attributes.view.binding, value);
                    postponedRendering(element);
                }
            }
        };
        
        ko.bindingHandlers.viewModel = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor();

                if (typeof value === "function") {
                    value = value();
                }

                if ($(element).attr(CrossViewJS.options.attributes.viewModel.binding) != value) {
                    $(element).attr(CrossViewJS.options.attributes.viewModel.binding, value);
                    $(element).removeAttr(CrossViewJS.options.attributes.viewModel.bindId);
                    postponedRendering(element);
                }
            }
        };

        ko.bindingHandlers.jsonUrl = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor(), el = $(element);

                if (typeof value === "function") {
                    value = value();
                }

                if (el.attr(CrossViewJS.options.attributes.fetch.jsonUrl) != value) {
                    el.attr(CrossViewJS.options.attributes.fetch.jsonUrl, value);
                    postponedRendering(element);
                }
            }
        };

        ko.bindingHandlers.jsonPath = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor();

                if (typeof value === "function") {
                    value = value();
                }

                if ($(element).attr(CrossViewJS.options.attributes.fetch.jsonPath) != value) {
                    $(element).attr(CrossViewJS.options.attributes.fetch.jsonPath, value);
                    postponedRendering(element);
                }
            }
        };

        ko.bindingHandlers.jsonData = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor();

                if (typeof value === "function") {
                    value = value();
                }

                if ($(element).attr(CrossViewJS.options.attributes.view.data) != value) {
                    if (typeof (value) === "string") {
                        $(element).attr(CrossViewJS.options.attributes.view.data, value);
                        postponedRendering(element);
                    } else {
                        $(element).attr(CrossViewJS.options.attributes.view.data, JSON.stringify(value));
                        postponedRendering(element);
                    }
                }
            }
        };

        ko.bindingHandlers.viewModelData = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor(), viewModel;

                if (typeof value === "function") {
                    value = value();
                }

                if ($(element).attr(CrossViewJS.options.attributes.view.data) != value) {
                    viewModel = $(element).crossview("getViewModel");

                    if (viewModel) {
                        viewModel.setData(value);
                        postponedRendering(element);
                    } else {
                        $(element).one("crossview-binded", function(ev, el, viewModel) {
                            viewModel.setData(value);
                        });
                    }
                }
            }
        };

        ko.bindingHandlers.emptyView = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor();

                if (typeof value === "function") {
                    value = value();
                }

                if ($(element).attr(CrossViewJS.options.attributes.view.emptyView) != value) {
                    $(element).attr(CrossViewJS.options.attributes.view.emptyView, value);
                    postponedRendering(element);
                }
            }
        };
    }
})(jQuery, jQuery.crossview);
