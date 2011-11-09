/**
 * CrossViewJS
 * 
 * @VERSION Command Module
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
        command : "data-command",
        beforeCommandSubmission : "data-command-before-submission"
    });

    /**
     * Binds commands to View-Models.
     * 
     * @returns Nothing
     */
    function bindCommands() {
        $("a[" + CrossViewJS.options.attributes.command + "]").live("click", executeCommand);
        $("button[" + CrossViewJS.options.attributes.command + "]").live("click", executeCommand);
        $("form").live("submit", executeSubmitCommand);
    }

    function executeSubmitCommand() {
        var form = $(this);
        var before = form.attr(CrossViewJS.options.attributes.beforeCommandSubmission);
        
        if (before && invokeCommand(form, before) === false)
            return false; // Supress form submission in this case.

        var command = form.attr(CrossViewJS.options.attributes.command);
        var render = form.attr(CrossViewJS.options.attributes.form.render);
        
        if (command || render) {
            CrossViewJS.form.submit(form, function(data) {

                if (command)
                    invokeCommand(form, command, [ data ]);

                // NOTE: Render is already handled by form submission.
            });
                        
            return false;
        } else {
            return true;
        }
    }

    /**
     * Executes a command.
     * 
     * [jQuery] This MUST be used on a wrapper.
     * 
     * @returns If element should propagate.
     */
    function executeCommand() {
        var el = $(this);
        var command = el.attr(CrossViewJS.options.attributes.command);

        var newArgs = [el, command];
        
        for (var i = 0; i < arguments.length; i++)
            newArgs.push(arguments[i]);
        
        invokeCommand.apply(el, newArgs);

        return invokeCommand.apply(el, newArgs) !== false;
    }

    /**
     * Invokes a command on an element.
     * 
     * @param el
     *            jQuery element wrapper.
     * 
     * @param command
     *            Command name.
     * 
     * @param args
     *            Arguments to command.
     *            
     * @returns Command result.
     */
    function invokeCommand(el, command, args) {
        var instance = el.crossview("getViewModel");

        console.log("Executing command \"" + command + "\".");

        while (instance && !instance[command])
            instance = instance.getAncestorViewModel();

        if (instance || CrossViewJS.options.commands[command]) {
            /* Don't use args.unshift here, because "arguments" keyword
             * used to call this method doesn't have this method.
             */
            var newArgs = [el];
            
            if (args)
                for (var i = 0; i < args.length; i++)
                    newArgs.push(args[i]);
            
            if (instance)
                return instance[command].apply(instance, newArgs);
            else
                return CrossViewJS.options.commands[command].apply(null, newArgs);
        } else {
            CrossViewJS.notifyError(el, "Command not found: " + command + ".");
        }
    }

    $(bindCommands);
    
    $.extend(CrossViewJS.fn, {
        command : function(command) {
            var args = []; 
            
            for (var i = 1; i < args.length; i++)
                args.push(arguments[i]);

            
            $(this).each(function() {
                invokeCommand($(this), command, args);
            });
        }
    });
    

})(jQuery);