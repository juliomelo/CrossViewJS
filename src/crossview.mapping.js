/**
 * CrossViewJS @VERSION
 * Mapping Module
 *
 * Maps view and view-models, providing on-demand resources loading.
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
     * Tells if mapping is being loaded.
     */
    CrossViewJS.loadingMapping = 0;
    
    function loadMapping(href) {
        console.log("Loading CrossView mapping from " + href + ".");

        CrossViewJS.loadingMapping++;

        $.getJSON(href).success(function(json) {
            $.extend(CrossViewJS.options.resources.viewModel, json.viewModel);
            $.extend(CrossViewJS.options.resources.view, json.view);
            $(CrossViewJS.view.loadTemplates);
        }).error(function(x, e) {
            console.error("Failed to load View-Model class mapping from " + href + ".");
            throw e;
        }).complete(function() {
            if (--CrossViewJS.loadingMapping === 0) {
                $(CrossViewJS.viewModel.requestBinding);
            }
        });    
    }
    
    /**
     * Read HTML links of MVVM bindings and do auto-register.
     */
    function autoRegister() {
        $("link[rel='" + CrossViewJS.options.link.autoRegister + "']").each(function() {
            loadMapping($(this).attr("href"));
        });

        $("link[rel='" + CrossViewJS.options.link.view + "']").each(function() {
            var href = $(this).attr("href");
            var name = $(this).attr(CrossViewJS.options.attributes.view.className);

            if (!name)
                name = extractNameFromUrl(href);

            console.log("Registering template for view \"" + name + "\" on " + href + ".");
            CrossViewJS.options.resources.view[name] = href;
        });
        
        $(CrossViewJS.view.loadTemplates);
    }

    /**
     * Extract file name (without file extension) from an URL.
     */
    function extractNameFromUrl(url) {
        var idx = url.lastIndexOf("/");

        if (idx >= 0)
            url = url.substr(idx + 1);

        idx = url.lastIndexOf(".");

        if (idx >= 0)
            url = url.substr(0, idx);

        return url;
    }
        
    $(autoRegister);
    
    CrossViewJS.loadMapping = loadMapping;

})(jQuery);
