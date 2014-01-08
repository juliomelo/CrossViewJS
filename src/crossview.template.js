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
    // Identify and create a wrapper for template engine.
    CrossViewJS.template = null;

    /**
     * Identifies loaded template engine and creates a wrapper for it.
     */
    function setupTemplateEngine() {
        // jsrender - https://github.com/BorisMoore/jsrender
        if ($.templates && $.render) {
            CrossViewJS.template = {
					templates : {},
                    setTemplate : function(template, templateCode) { 
						this.templates[template] = $.templates(templateCode);
					},
                    render : function(template, data) { return $(this.templates[template](data)); },
					renderDirectly : function(templateCode, data) {
						return $($.templates(templateCode)(data));
					},
					compile : function(templateCode) { return $.templates(templateCode); },
					renderCompiled : function(compiledTemplateCode, data) {
						return $(compiledTemplateCode(data));
					}
            };
        }
        // tmpl (beta) -
        else if ($.template && !$.render && $.tmpl) {
            CrossViewJS.template = {
                    setTemplate : $.template,
                    render : $.tmpl,
					renderDirectly : $.tmpl,
					compile : function(templateCode) { return templateCode; },
					renderCompiled : $.tmpl
            };
        }
    }

    $(function() {
        setupTemplateEngine();

        if (!CrossViewJS.template) {
            setTimeout(setupTemplateEngine, 150);
		}
    });

})(jQuery);
