/**
 * CrossViewJS @VERSION
 * Command Module
 *
 * Execute commands on Model-View.
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
    $.extend(CrossViewJS.options.attributes, {
        command : "data-command"
    });
    
    /**
     * Binds commands to View-Models.
     */
    function bindCommands() {
        $("a[" + CrossViewJS.options.attributes.command + "]").live("click", executeCommand);
        $("button[" + CrossViewJS.options.attributes.command + "]").live("click", executeCommand);
        $("form[" + CrossViewJS.options.attributes.command + "]:not([" + CrossViewJS.options.attributes.form.render + "])").live("submit", executeCommand);
        $("form[" + CrossViewJS.options.attributes.command + "][" + CrossViewJS.options.attributes.form.render + "]").live("submit", executeCommandFromFormSubmission);
    }
    
    function executeCommandFromFormSubmission() {
        try {
            var form = $(this);
            var action = form.attr("action");
            var method = form.attr("method");
            var jsonArgs = form.serializeObject();
            var container;
            
            if (form.attr(view.attributes.binding))
                container = form;
            else
                container = form.parents("[" + view.attributes.binding + "]:first");
            
            container.addClass(view.css.fetching);
            
            CrossViewJS.getJSON(action, { type : method, data : jsonArgs })
                .success(function(data) {
                    container.removeClass(view.css.fetching);
                    executeCommand.apply(form, arguments);
                }).error(function() {
                    container.removeClass(view.css.fetching);
                });
        } catch (e) {
            CrossViewJS.notifyError($(this), e);
        }
        
        return false;
    }
    
    /**
     * Executes a command.
     * 
     * [jQuery] This MUST be used on a wrapper.
     */
    function executeCommand() {
        var el = $(this);
        var command = el.attr(CrossViewJS.options.attributes.command);
        var instance = el.crossview("getViewModel");

        console.log("Executing command \"" + command + "\".");

        while (instance && !instance[command])
            instance = instance.getAncestorViewModel();

        if (instance) {
            var args = [$(this)];
               
            for (var i = 0; i < arguments.length; i++)
                args.push(arguments[i]);
                 
            instance[command].apply(instance, args);
            
            return false;
        } else
            console.error("Command not found: " + command + ".");
    }

    $(bindCommands);

})(jQuery);