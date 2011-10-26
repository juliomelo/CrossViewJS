/**
 * CrossViewJS @VERSION
 * jQuery Mobile Support Module
 * 
 * Add support for jQuery Mobile.
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
    $(function() {
        if ($.mobile) {
            $("[" + CrossViewJS.options.attributes.view.binding + "]").live("crossview-rendered", function() {            
                try {
                    var page = $($.mobile.activePage);
                    
                    if (page.get(0) === el.get(0) || page.has(el)) {
                        /* Triggers pagecreate event if jQuery Mobile is present,
                         * so it can bind its rendered elements and customize UI.
                         */
                        console.log("Invoking jQuery Mobile bindings on " + el.attr("id") + ".");
                        el.trigger("pagecreate");
                    }
               } catch (e) {
                   console.log("Error invoking pagecreate for $.mobile: " + e + ".");
               }
            });
        }
    });
})(jQuery);