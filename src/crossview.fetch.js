/**
 * CrossViewJS @VERSION
 * Template Module
 * 
 * Wraps template engines for rendering views.
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
    $.extend(true, CrossViewJS.options, {
            attributes : {
                fetch : {
                    jsonPath : "data-json-path",
                    jsonUrl : "data-json-url",
                    fetchMode : "data-fetch-mode"
                }
            }
    });
    
    $.fn.crossview.getJSON = function(url, options) {
        var el = $(this);
        var mode = el.attr(CrossViewJS.options.attributes.fetch.fetchMode);
        
        if (!url)
            url = el.attr(CrossViewJS.options.attributes.fetch.jsonUrl);
        
        return CrossViewJS.getJSON(url, options, mode);
    };
    
    /**
     * Gets a JSON from an URL using an conversion strategy (i.e. YQL).
     */
    CrossViewJS.getJSON = function(url, options, mode, path) {
        var completeCallback = null;
        var errorCallback = null;
        var successCallback = null;
        
        if (!mode)
            mode = "default";
        
        options = $.extend(null, CrossViewJS.options.ajaxDefaults, { dataType : "json" }, options);
        
        url = CrossViewJS.getAbsoluteURL(url);
        
        var run = {
            complete : function(callback) {
                completeCallback = callback;
                return this;
            }, error : function(callback) {
                errorCallback = callback;
                return this;
            }, success : function(callback) {
                successCallback = callback;
                return this;
            }
        };
        
        var modes = {
                "default" : {
                    getResultJSON : function(data) { return data; },
                    transformURL : function(url, options) { return url; }
                },
                
                "yql-xml" : {
                    getResultJSON : function(data) {
                        return data.query.results;
                    },
                    
                    transformURL : function(url, options) {
                        if (options && options.data) {
                            var isFirst = true;
                            
                            if (url.indexOf("?") < 0) {
                                url += "?";
                            }
                                
                            for (var item in options.data) {
                                if (options.data[item]) {
                                    if (isFirst)
                                        isFirst = false;
                                    else
                                        url += "&";
                                        
                                    url += encodeURIComponent(item) + "=" + encodeURIComponent(options.data[item]);
                                }
                            }    
                            
                            options.data = null;
                        }
                        
                        return "http://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20xml%20where%20url%3D%22" +
                            encodeURIComponent(url) + "%22";
                    }
                },
                
                "yql" : {
                    getResultJSON : function(data) {
                        return data.query.results.json;
                    },
                    
                    transformURL : function(url, options) {
                        if (options && options.data) {
                            var isFirst = true;
                            
                            if (url.indexOf("?") < 0) {
                                url += "?";
                            }
                                
                            for (var item in options.data) {
                                if (options.data[item]) {
                                    if (isFirst)
                                        isFirst = false;
                                    else
                                        url += "&";
                                        
                                    url += encodeURIComponent(item) + "=" + encodeURIComponent(options.data[item]);
                                }
                            }    
                            
                            options.data = null;
                        }
                        
                        return "http://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20json%20where%20url%3D%22" +
                            encodeURIComponent(url) + "%22";
                    }
                }
        };
        
        var modeInstance = modes[mode];
        
        if (!modeInstance)
            throw "Unknown mode " + mode + ".";
        
        url = modeInstance.transformURL(url, options);
        
        $.ajax(url, options)
            .complete(function() { if (completeCallback) completeCallback(arguments); })
            .error(function() { if (errorCallback) errorCallback(arguments); })
            .success(function(data) {
                data = modeInstance.getResultJSON(data, options);
                
                if (path)
                    data = CrossViewJS.traversePath(data, path);
                
                successCallback(data, Array.prototype.slice.call(arguments, 1));
            });
        
        return run;
    }

})(jQuery);