const { InfoLogLine, WarningLogLine, ErrorLogLine } = require('./other_log_line.js');
const ArgsLogLine = require('./args_log_line.js');

const newline_rx = /\n|\r\n|\r/g;

function range(length) {
    var range = Array(length);

    for (var idx = 0; idx < length; idx++) {
        range[idx] = idx;
    }

    return range;
}

/**
 * The class that controls the `blessed` output box
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.0
 *
 * @param    {Screen}   screen   The screen on which every node renders
 * @param    {Box}      box      Box widget, with scrollable behaviour
 */
class LogList {

    constructor(jsConsole, screen, box) {

        // Main jsConsole instance
        this.jsConsole = jsConsole;

        // The main screen
        this.screen = screen;

        // The output box
        this.box = box;

        // The list of lines, these map to the actual lines in the box
        this.list = [];

        // The line that is currently selected
        this.selectedLine = null;

        // The last logged line
        this.lastLoggedLine = null;
    }

    /**
     * Sanitize lines before outputting
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.2
     * @version  0.3.4
     *
     * @param    {Number}   index
     * @param    {String}   str
     */
    sanitize(str) {

        // Get the string content of the line
        str = str.toString();

        // Don't print newlines
        // @todo: better newline handling
        str = str.replace(newline_rx, '\u23CE ');

        return str;
    }

    /**
     * Actually output a string to the screen (insert)
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.1
     * @version  0.1.2
     *
     * @param    {Number}   index
     * @param    {String}   str
     */
    _setLine(index, str) {
        this.box.setLine(index, this.sanitize(str));
    }

    /**
     * Actually output a string to the screen
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.1
     * @version  0.1.2
     *
     * @param    {Number}   index
     * @param    {String}   str
     */
    _insertLine(index, str) {
        this.box.insertLine(index, this.sanitize(str));
    }

    /**
     * Push a line onto the output box.
     * Does not render the screen.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {LogLine}  line    The line instance to add
     * @param    {Boolean}  defer   If true, content will be set on next tick
     */
    pushLine(line, defer) {

        var that = this,
            length;

        // Store it in our list
        length = this.list.push(line);

        // Set the id in the list
        line.index = length-1;

        // Add it to the screen box (still need to call render)
        if (!defer) {
            this._setLine(line.index, line);

            return;
        }

        setImmediate(function deferAndRenderLine() {
            that._setLine(line.index, line);

            // Scroll and/or render
            that.jsConsole.scrollAlong();
        });
    }

    /**
     * Inject a line into the box, after the given index.
     * Does not render the screen.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {LogLine}  line         The line instance to add
     * @param    {Number}   afterIndex   The index the new line should go after
     */
    insertAfter(line, afterIndex) {

        var that  = this,
            index = afterIndex + 1;

        this.list.splice(index, 0, line);

        // Set the id
        line.index = index;

        for (let i = index+1; i < this.list.length; i++) {
            this.list[i].index += 1;
        }

        this._insertLine(index, line);
    }

    /**
     * Reindex the internal list,
     * re-assigns the id of every line.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {Number}   start   Index to start with
     */
    reIndex(start) {

        var i;

        if (typeof start !== 'number') {
            start = 0;
        }

        for (i = start; i < this.list.length; i++) {
            this.list[i].index = i;
        }
    }

    /**
     * Remove a line (and all its children) from the visible `curses` screen.
     * After this, the screen gets rendered.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {Number}   indexToRemove
     */
    removeLine(indexToRemove) {

        var indices,
            line,
            i;

        line = this.list[indexToRemove];

        if (line) {
            // Lines can have children, those also need to be removed
            indices = line.getAllIndices();
            this.clearLines(indices);

            this.render();
        }
    }

    /**
     * Remove the given indices from the `list` and screen.
     * Render still needs to be called.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.2.0
     *
     * @param    {Array}   indices   An array of indices
     */
    clearLines(indices) {

        var index,
            line,
            min,
            i;

        indices.sort(function(a, b) {
            return a - b;
        });

        // Get the minimum index
        min = indices[0];

        // Reverse them
        indices.reverse();

        for (i = 0; i < indices.length; i++) {

            index = indices[i];

            // Get the line we're going to remove
            line = this.list[index];

            // If that line was selected, unselect it now
            if (line && line == this.current_selection) {
                line.unselect();
            }

            // Delete the line from the output box
            this.box.deleteLine(index);

            // Delete the line from the array
            this.list.splice(index, 1);
        }

        // Reindex the list
        this.reIndex(min);
    }

    /**
     * Clear the entire screen
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     */
    clearScreen() {

        var i;

        if (this.list.selectedLine) {
            this.list.selectedLine.unselect();
        }

        // Remove all lines
        this.list.length = 0;

        // Clear the screen
        this.box.setContent('');
        this.render();
    }

    /**
     * Remove top lines
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.2.0
     * @version  0.2.0
     *
     * @param    {Number}   line_count   Amount of lines to remove from the top
     * @param    {Boolean}  do_render    Set to false to not render the screen
     */
    clearTop(line_count, do_render) {
        this.clearLines(range(line_count));

        if (do_render !== false) {
            this.render();
        }
    }

    /**
     * Handle a click on the given line_index,
     * call the #select() method of the clicked line.
     *
     * Renders the screen.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.3.0
     *
     * @param    {Number}   line_index  Absolute index of clicked line
     * @param    {Number}   x           Absolute x position (`screen`)
     * @param    {Number}   y           Absolute y position (`screen`)
     */
    click(line_index, x, y) {
        // mouseDown & mouseUp are better suited now
    }

    /**
     * Handle a mousedown on the given line_index
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.3.0
     * @version  0.3.0
     *
     * @param    {Number}   line_index  Absolute index of clicked line
     * @param    {Number}   x           Absolute x position (`screen`)
     * @param    {Number}   y           Absolute y position (`screen`)
     */
    mouseDown(line_index, x, y) {
        var line = this.list[line_index];

        if (line) {
            this.current_selected_line = line;
            this.current_selection = line.select(x);
            this.render();
        } else {
            this.current_selection = null;
            this.current_selected_line = null;
        }

        // Expose the current selection as the $0 global
        this.jsConsole.vm_context.$0 = this.current_selection;
    }

    /**
     * Handle a mousemove on the given line_index
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.3.0
     * @version  0.3.0
     *
     * @param    {Number}   line_index  Absolute index of clicked line
     * @param    {Number}   x           Absolute x position (`screen`)
     * @param    {Number}   y           Absolute y position (`screen`)
     */
    mouseMove(line_index, x, y) {
        // Handling mousemoves?
    }

    /**
     * Handle a drag event
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.3.0
     * @version  0.3.0
     *
     * @param    {Object}   start
     * @param    {Object}   end
     */
    mouseDrag(start, end) {
        var start_line = this.list[start.line_index],
            end_line   = this.list[end.line_index];

        start.line = start_line;
        end.line = end_line;

        if (end_line) {
            end_line.mouseDrag(start, end);
        }
    }

    /**
     * Handle a mouseup on the given line_index
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.3.0
     * @version  0.3.0
     *
     * @param    {Number}   line_index  Absolute index of clicked line
     * @param    {Number}   x           Absolute x position (`screen`)
     * @param    {Number}   y           Absolute y position (`screen`)
     */
    mouseUp(line_index, x, y) {
        // Mouseup listeners
    }

    /**
     * Render the output box and parent screen.
     * Will only render once every 70ms
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.4
     */
    waiting = false;
    render() {
        if (!this.waiting) {
            this.box.render();
            this.screen.render();
            this.waiting = true;
            const that = this;
            setTimeout(function () {
                that.waiting = false;
            }, 70);
        }
    }

    /**
     * `console.NAME` handler
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.2.2
     *
     * @param    {Array}   args   The arguments to print out
     * @param    {String}  type   The type of message [log]
     * @param    {Object}  options
     *
     * @return   {LogLine}
     */
    consoleLog(args, type, options) {

        var line,
            last,
            same;

        // Get the last line
        last = this.lastLoggedLine;

        if (last) {
            same = last.compare(args, type, options);

            if (same) {

                last.addRepeat(1);

                // Only args log lines have a dissect method
                if (typeof last.dissect == 'function') {
                    last.dissect();
                    this._setLine(last.index, last);
                    this.render();
                }

                // Don't print the same line twice
                return last;
            }
        }

        // Create a new LogLine instance to construct the string
        switch (type) {

            case 'info':
                line = new InfoLogLine(this);
                break;

            case 'warn':
                line = new WarningLogLine(this);
                break;

            case 'error':
                line = new ErrorLogLine(this);
                break;

            default:
                line = new ArgsLogLine(this);
                break;
        }

        if (options && options.info) {
            line.setFileinfo(options.info);
        }

        // Remove the top 100 lines if the list is getting too long,
        // but don't render immediately
        if (this.list.length > 1100) {
            this.clearTop(100, false);
        }

        line.set(args);

        this.pushLine(line, true);

        this.lastLoggedLine = line;

        return line;
    }
}

module.exports = LogList;
