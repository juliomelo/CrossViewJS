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

        $(window).bind("crossview-binded", function(e, el, instance) {
            if (instance.useKnockout || (instance.useKnockout == null || CrossViewJS.options.viewModel.useKnockout)) {
                ko.applyBindings(instance, e.target);
               
                if (ko.mapping && instance.useKnockoutMapping) { 
                    if (instance.setData === CrossViewJS.options.viewModel.instancePrototype.setData) {
                        instance.setData = function(data) {
                            ko.mapping.fromJS(data, this);
                            
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
    	    	$(element).attr(CrossViewJS.options.attributes.view.binding, valueAccessor()()).crossview("render");
    	    }
    	};
        
        ko.bindingHandlers.jsonUrl = {
    	    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
    	    	$(element).attr(CrossViewJS.options.attributes.fetch.jsonUrl, valueAccessor()()).crossview("render");
    	    }
    	};

        ko.bindingHandlers.jsonData = {
    	    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
    	    	$(element).attr(CrossViewJS.options.attributes.view.data, valueAccessor()()).crossview("render");
    	    }
    	};

        ko.bindingHandlers.emptyView = {
    	    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
    	    	$(element).attr(CrossViewJS.options.attributes.view.emptyView, valueAccessor()()).crossview("render");
    	    }
    	};
    }
})(jQuery, jQuery.crossview);
