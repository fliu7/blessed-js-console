const { toPaddedString, strlen, stripEsc, esc } = require('../helpers');

/**
 * A generic line of text in the log list output
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.5
 *
 * @param    {LogList}   logList   The parent LogList instance
 */

class LogLine {

    constructor(logList) {

        // The LogList we belong to
        this.logList = logList;

        this.jsConsole = this.logList.jsConsole;

        // Children lines (multiple instanceof LogLine)
        this.children = [];

        // Selecter char position
        this.selected_char_position = null;

        // The index of this line (set by logList)
        this._index = null;

        // The stripped-of-colour gutter
        this._gutter = '  ';

        // The coloured gutter content
        this._colouredGutter = '  ';

        this._fileinfo = '';

        this._colouredFileinfo = '';

        // The simple string representation of this line
        this._string = '';

        // The coloured string
        this._coloured = '';

        // Parent line (instanceof LogLine)
        this._parent = null;

        // How many times this has been seen
        this._seen = 1;
    }

    get index() {
        return this._index;
    }

    set index(val) {
        this._index = val;
    }

    get gutter() {
        return this._gutter;
    }

    set gutter(val) {
        this._gutter = val;
    }

    get colouredGutter() {
        return this._colouredGutter;
    }

    set colouredGutter(val) {
        this._colouredGutter = val;
    }

    get fileinfo() {
        return this._fileinfo;
    }

    set fileinfo(val) {
        this._fileinfo = val;
    }

    get colouredFileinfo() {
        return this._colouredFileinfo;
    }

    set colouredFileinfo(val) {
        this._colouredFileinfo = val;
    }

    get string() {
        return this._string;
    }

    set string(val) {
        this._string = val;
    }

    get coloured() {
        return this._coloured;
    }

    set coloured(val) {
        this._coloured = val;
    }

    get parent() {
        return this._parent;
    }

    set parent(val) {
        this._parent = val;
    }

    get seen() {
        return this._seen;
    }

    set seen(val) {
        this._seen = val;
    }

    render() {
        // Set the line again
        this.logList._setLine(this.index, this.toString(this.selected_char_position));

        // And request a render
        this.logList.render();
    }

    /**
     * Actually output a string to the screen (insert)
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.1
     * @version  0.1.1
     *
     * @param    {Number}   index
     * @param    {String}   str
     */
    _setLine(index, str) {
        return this.logList._setLine(index, str);
    }

    _insertLine(index, str) {
        return this.logList._insertLine(index, str);
    }

    /**
     * Set the (plain) string value
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {String}   str
     */
    set(str, gutter) {
        this.string = String(str);

        if (typeof gutter !== 'undefined') {
            this.setGutter(gutter);
        }
    }

    /**
     * Compare new arguments to this line
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.2.0
     * @version  0.2.0
     */
    compare(args, type, options) {
        return false;
    }

    /**
     * Add repeat counter
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.2.0
     * @version  0.2.0
     */
    addRepeat(nr) {
        this.seen += nr;

        if (this.fileObject) {
            this.fileObject.seen = this.seen;
            this.fileObject.last_seen = new Date();
        }
    }

    /**
     * Set the (coloured) gutter
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {String}   str
     */
    setGutter(str) {
        this.colouredGutter = String(str);
        this.gutter = stripEsc(this.colouredGutter);
    }

    /**
     * Set the fileinfo
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.3
     * @version  0.1.3
     *
     * @param    {Object}   info
     */
    setFileinfo(info) {

        if (typeof info == 'string') {
            this.colouredFileinfo = ' ' + info;
        } else {

            // Add the time info first
            this.colouredFileinfo = ' ' + esc(90, '[') + esc(1, toPaddedString(info.time.getHours(), 2) + ':' + toPaddedString(info.time.getMinutes(), 2) + ':' + toPaddedString(info.time.getSeconds(), 2)) + esc(90, ']');

            // Then add the file info
            this.colouredFileinfo += ' ' + esc(90, '[') + esc(1, info.file + ':' + info.line) + esc(90, ']');

            this.file = info.file;
            this.fileline = info.line;
        }

        this.fileinfo = stripEsc(this.colouredFileinfo);
    }

    /**
     * Convert the absolute x-position into a relative one,
     * without the gutter length
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.3.4
     *
     * @param    {Number}   absX
     */
    getRelativeX(absX) {
        return absX - (strlen(this.gutter) || 0) - (strlen(this.fileinfo) || 0);
    }

    /**
     * Return the (coloured) representation of this line's contents
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.3.4
     *
     * @param    {Number}   x   On what (plain) char position was clicked
     */
    getContentString(x) {

        var str = '';

        // If an x is provided, this means this line was clicked
        // so the colours should be inverted
        if (x != null) {
            str = esc(7);
        }

        str += this.string;

        if (x != null) {
            str += esc(27);
        }

        return str;
    }

    /**
     * Return a (coloured) representation of this line,
     * including prefix and postfix gutter
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.3.4
     *
     * @param    {Number}   x   On what (plain) char position was clicked
     */
    toString(x) {

        var str;

        // Workaround needed because blessed can't handle
        // emojis properly (even with this it still doesn't really)
        if (x != null) {
            this.had_selection = true;

            if (strlen(this.colouredGutter) != this.colouredGutter.length) {
                this.add_extra_gutter_string = true;
            }
        }

        str = this.colouredGutter;

        if (this.add_extra_gutter_string) {
            str += ' ';
        }

        str += this.colouredFileinfo;
        str += ' ' + this.getContentString(x);

        return str;
    }

    /**
     * Select this line
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.2.5
     *
     * @param    {Number}   x   On what (plain) char position was clicked
     */
    select(x) {

        // Unselect any previously selected line
        if (this.logList.selectedLine) {
            this.logList.selectedLine.unselect(this);
        }

        // Remember the selected char position
        this.selected_char_position = x;

        // Select this line as the newly selected one
        this.logList.selectedLine = this;

        // Set the line string
        this._setLine(this.index, this.toString(x));

        return this;
    }

    /**
     * Unselect this line
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.2.5
     *
     * @param    {LogLine}   newSelectedLine
     */
    unselect(newSelectedLine) {

        // Remove the reference to this object in the logList parent
        this.logList.selectedLine = null;

        // Unset the selected char position
        this.selected_char_position = null;

        // Remove our child lines if needed
        if (!newSelectedLine || this === newSelectedLine || !newSelectedLine.isDescendantOf(this)) {

            if (this.parent) {
                return this.parent.unselect(newSelectedLine);
            }

            // Remove all children (this can be perfected later)
            this.logList.clearLines(this.getChildIndices());

            this.children.length = 0;
        }

        this._setLine(this.index, this.toString());
    }

    /**
     * This line receives a drag event
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.3.0
     * @version  0.3.0
     *
     * @param    {Object}   start
     * @param    {Object}   end
     */
    mouseDrag(start, end) {
        // Only implemented in certain loglines
    }

    /**
     * See if this is a descendant of the given line.
     * This checks the entire parent line.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {LogLine}   possibleAncestor
     */
    isDescendantOf(possibleAncestor) {

        // If the item has no parent it's false for sure
        if (!this.parent) {
            return false;
        }

        if (this.parent === possibleAncestor) {
            return true;
        }

        return this.parent.isDescendantOf(possibleAncestor);
    }

    /**
     * See if this is a child of the given line.
     * Checks only the parent.
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     *
     * @param    {LogLine}   possibleParent
     *
     * @return   {Boolean}   True if this is a child, false if it's not
     */
    isChildOf(possibleParent) {

        if (this.parent && this.parent === possibleParent) {
            return true;
        }

        return false;
    }

    /**
     * Return an array of indices of this line and all its children
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     */
    getAllIndices() {

        var child,
            arr,
            i;

        arr = [];

        if (typeof this.index === 'number') {

            // The first to remove is this line itself
            arr.push(this.index);

            // Now get all the indices of the children
            for (i = 0; i < this.children.length; i++) {
                arr = arr.concat(this.children[i].getAllIndices());
            }
        }

        return arr;
    }

    /**
     * Get all the child indices (recursively)
     *
     * @author   Jelle De Loecker   <jelle@develry.be>
     * @since    0.1.0
     * @version  0.1.0
     */
    getChildIndices() {

        var arr,
            i;

        arr = [];

        // Now get all the indices of the children
        for (i = 0; i < this.children.length; i++) {
            arr = arr.concat(this.children[i].getAllIndices());
        }

        return arr;
    }
}

module.exports = LogLine;
