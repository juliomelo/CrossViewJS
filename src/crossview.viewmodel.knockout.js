/**
 * CrossViewJS @VERSION
 * Model-View Module
 * 
 * Support for KnockoutJS framework.
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
    function applyBindings(target, viewModel) {
        var koBindings = $("[data-bind]", target);
                    
        koBindings.each(function() {
            var binding = $(this);
                        
            // Ensure that view-model is correct.
            if (binding.crossview("getViewModel") === viewModel) {
                try {
                    ko.applyBindings(viewModel, this);
                } catch (e) {
                    console.error("Error applying knockout bindings to view-model.");
                    CrossViewJS.notifyError(jthis, e);
                    console.error(viewModel);
                }
            }
        });        
    }
    
    if (window.ko) {
        console.log("Started CrossViewJS integration with Knockout.");

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

                $(e.target).on("crossview-rendered", function(e2) {
                    applyBindings(e2.target, instance);
                });
                
                applyBindings(e.target, instance);
       
                if (ko.mapping && (instance.useKnockoutMapping || (instance.useKnockoutMapping == null && CrossViewJS.options.viewModel.useKnockoutMapping))) { 
                    instance.__ko_mapping__ = {
                        copy : [],
                        ignore : [],
                        include : [ "_destroy" ],
                        mappedProperties : {},
                        __crossview_alreadyMapped__ : false
                    };
                    
                    if (instance.setData === CrossViewJS.options.viewModel.instancePrototype.setData) {
                        instance.setData = function(data) {
                            /* If it is not yet done, check view-model for already mapped properties,
                             * to make them updatable from knockout mapping plugin.
                             */
                            if (!this.__ko_mapping__.__crossview_alreadyMapped__) {
                                for (var field in data) {
                                    if (typeof(this[field]) == "function") {
                                        this.__ko_mapping__.mappedProperties[field] = true;
                                    }
                                }
                                
                                this.__ko_mapping__.__crossview_alreadyMapped__ = true;
                            }
                            
                            var mapped = ko.mapping.fromJS(data, this);
                            
                            // Check if mapped object is the same view-model that we provided.
                            if (mapped != this) {
                                console.error("Knockout Mapping plugin failed to update view-model.", this);
                            }
                            
                            if (!this.useKnockoutOnTemplate) {
                                CrossViewJS.options.viewModel.instancePrototype.setData.apply(this, arguments);
                            }
                        };
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
                var value = valueAccessor()();
                
                if ($(element).attr(CrossViewJS.options.attributes.view.binding) != value) {
                    $(element).attr(CrossViewJS.options.attributes.view.binding, value).crossview("render");
                }
            }
        };
        
        ko.bindingHandlers.jsonUrl = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor()();
                
                if ($(element).attr(CrossViewJS.options.attributes.fetch.jsonUrl) != value) {
                    $(element).attr(CrossViewJS.options.attributes.fetch.jsonUrl, value).crossview("render");
                }
            }
        };

        ko.bindingHandlers.jsonData = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor()();
                
                if ($(element).attr(CrossViewJS.options.attributes.view.data) != value) {
                    $(element).attr(CrossViewJS.options.attributes.view.data, value).crossview("render");
                }
            }
        };

        ko.bindingHandlers.emptyView = {
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var value = valueAccessor()();
                
                if ($(element).attr(CrossViewJS.options.attributes.view.emptyView) != value) {
                    $(element).attr(CrossViewJS.options.attributes.view.emptyView, value).crossview("render");
                }
            }
        };
    }
})(jQuery, jQuery.crossview);
