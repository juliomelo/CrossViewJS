/**
 * CrossViewJS @VERSION
 *
 * A presentation library that facilitates view integration with RESTful
 * services, considering a Model View View-Model (MVVM) approach.
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
var CrossViewJS = window["CrossViewJS"] = {};

CrossViewJS.console = window.console || {};
CrossViewJS.console.log = CrossViewJS.console.log || function(){};
CrossViewJS.console.warn = CrossViewJS.console.warn || function(){};
CrossViewJS.console.error = CrossViewJS.console.error || function(){};
CrossViewJS.console.info = CrossViewJS.console.info || function(){};

(function($) {

    if (!$) {
        throw "jQuery not found!";
    }
    
    var constants = {
            attributes : {
                error : "data-crossview-error"
            },
            
            css : {
                error : "crossview-error"
            }
    };

    $.extend(CrossViewJS, {    
        /**
         * User configuration.
         */
        options : {
                relativePath : null,
                ajaxDefaults : {
                    cache : false
                },

                /**
                 * Link names constants.
                 */
                link : {
                        autoRegister : "crossview-mapping",
                        view : "crossview-view"
                }
        },
        
    
        /**
         * Set error notification on an element.
         * 
         * @param el
         *          jQuery element wrapper.
         * 
         * @param exception
         *          Message error.
         */
        notifyError : function(el, exception) {
            el.addClass(constants.css.error);
            el.attr(constants.attributes.error, exception);
    
            if (exception) {
                CrossViewJS.console.error(exception.stack || exception);
            }
            
            el.trigger("crossview-error", [ el, exception ]);
        },
    
        /**
         * Unset error notification from an element.
         * 
         * @param el
         *          jQuery element wrapper.
         */
        clearError : function(el) {
            el.removeClass(constants.css.error);
            el.attr(constants.attributes.error, null);
        },
    
        /**
         * Get an absolute URL for a path.
         */
        getAbsoluteURL : function(path) {
	    if (!this.options.relativePath || path.charAt(0) == "/") {
	        return path;
            } else {
  	        var idx = this.options.relativePath ? path.indexOf("://") : -1;

                if (idx > 0) {
 	            var idxQuery = path.indexOf("?");
		
		    if (idxQuery < 0 || idxQuery > idx)
                        return path;
                    else
                        return this.options.relativePath + path;
		} else {
		    return this.options.relativePath + path;
		}
	    }
        },
        
        /**
         * Traverse JSON through a specified path.
         * 
         * @param data
         *              JSON object that will be traversed.
         * 
         * @param path
         *              Path to traverse.
         * 
         * @return
         *              Reached object.
         */
        traverseJSON : function(data, path) {
            if (path) {
                path = path.split(".");
            
                for (var i = 0; data && i < path.length; i++) {
                    data = data[path[i]];
                }
            }
            
            return data;
        },
    
        /**
         * Set a relative path for RESTful services. This is used in attributes
         * like data-json-url.
         */
        setRelativePath : function(url) {
            if (url.charAt(url.length - 1) == "/")
                this.options.relativePath = url;
            else
                this.options.relativePath = url + "/";
        },
                
        init : function(options) {
            $.extend(true, CrossViewJS.options, options);
            
            if (options.relativePath)
                CrossViewJS.setRelativePath(options.relativePath);
        },
        
        fn : {}
    });

    $.crossview = function(method) {
        if (CrossViewJS[method]) {
            return CrossViewJS[method].apply( this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return CrossViewJS.init.apply( this, arguments );
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.fn.crossview');
        }
    };

    $.fn.crossview = function(method) {
        if (CrossViewJS.fn[method]) {
            return CrossViewJS.fn[method].apply( this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return CrossViewJS.init.apply( this, arguments );
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.crossview');
        }
    };
    
    if (!$.fn.serializeObject) {
        $.fn.serializeObject = function()
        {
            var o = {};
            var a = this.serializeArray();
	    var container = this;
            $.each(a, function() {
                var parts = this.name.split('.'), i, obj = o, name = parts[parts.length - 1];
                
                for (i = 0; i < parts.length - 1; i++) {
                    if (obj[parts[i]] === undefined) {
                        obj = obj[parts[i]] = {};
                    } else {
                        obj = obj[parts[i]];
                    }
                }
                
                if (obj[name] !== undefined) {
                    if (!obj[name].push) {
                        obj[name] = [obj[name]];
                    }
                    obj[name].push(this.value || '');
                } else if (container.filter("[name='" + this.name + "']").attr("data-json-force-array") == "true"
                    || $("[name='" + this.name + "']", container).attr("data-json-force-array") == "true") {
                    obj[name] = [this.value || ''];
                } else {
                    obj[name] = this.value || '';
                }
            });
            return o;
        };
    }

})(jQuery);
