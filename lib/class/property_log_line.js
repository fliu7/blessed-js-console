const ArgsLogLine = require('./args_log_line.js');
const { multiply, esc } = require('../helpers');

function isPrimitive(test) {
    return test !== Object(test);
}

/**
 * A line representing a property of a parent object
 */
class PropertyLogLine extends ArgsLogLine { 

    constructor(logList) {

        super(logList);

        // The parent object
        this.object = null;

        // The key of the parent object
        this.key = null;

        // The string representation
        this.key_string = null;

        // The level
        this.level = 0;

        // If this is enumerable
        this.enumerable = null;

        // True of this line represents a getter
        this.is_getter = false;

        // True if this line has a symbol as a key
        this.is_symbol = false;
    }

    /**
     * Set the parent object & name of the property this line is representing
     *
     * @param    {Mixed}            object       The actual value
     * @param    {String}           key          The actual key of the property
     * @param    {Boolean|Object}   enumerable   Is this enumerable?
     * @param    {Number}           level
     */
    set(object, key, enumerable, level) {

        var descriptor;

        this.object = object;
        this.key = key;
        this.level = level || 0;

        if (enumerable && typeof enumerable == 'object') {
            descriptor = enumerable;
            this.descriptor = descriptor;
            this.enumerable = descriptor.enumerable;
            this.is_getter = !!descriptor.get;
            this.is_symbol = !!descriptor.symbol;

            if (this.is_symbol) {
                this.key = descriptor.symbol;
            }
        } else {
            this.enumerable = enumerable;
        }

        if (!this.is_symbol && typeof this.key == 'symbol') {
            this.is_symbol = true;
        }

        if (this.is_symbol) {
            this.key_string = String(this.key).slice(7, -1);
        } else {
            this.key_string = this.key;
        }
    }

    /**
     * Get the clicked on argument
     *
     * @param    {Number}   x   On what (plain) char position was clicked
     */
    getArgByX(absX) {
        return this.getValueByKey();
    }

    getValueByKey(key) {

        if (key == null) {
            key = this.key;
        }

        let value;
        try {
            if (this.is_getter && this.parent.key == '__proto__' && this.key == key) {
                value = this.descriptor;
            } else {
                value = this.object[this.key];
            }
        } catch (err) {
            value = '[ERROR getting value "' + String(key) + '"]';
        }

        return value;
    }

    /**
     * Get the string value to show
     *
     */
    getStringValue() {

        var result = '',
            value,
            temp;

        if (this.is_getter) {
            if (this.parent.key == '__proto__') {
                value = this.descriptor;
            } else if (this.jsConsole.config.properties.show_get_value) {
                value = this.object[this.key];
            } else {
                if (this.got_getter_value) {
                    value = this.getter_value;
                } else {
                    return this.jsConsole.config.strings.ellipsis;
                }
            }
        } else {
            value = this.getValueByKey();
        }

        if (isPrimitive(value)) {
            result = JSON.stringify(value);
        } else if (typeof value === 'function') {

            // Stringify the source code to escape newlines
            temp = JSON.stringify(value+'');

            // Return everything between the quotes
            result = temp.slice(1, temp.length-1);
        } else {

            try {
                temp = this.getInstanceIdentifier(value);

                if (temp != 'null' && temp != 'undefined') {
                    temp += ' ' + this.getInlineInspect(value);
                }
            } catch (err) {
                try {
                    temp = '' + err +value;
                } catch (err) {
                    temp = '[Could not stringify]';
                }
            }

            result = temp;
        }

        return result;
    }

    /**
     * Select this line
     */
    select(absX, level) {

        var result;

        if (this.is_getter) {
            this.got_getter_value = true;
            this.getter_value = this.getValueByKey();
        }

        if (!this.open) {
            if (typeof level !== 'number') {
                level = this.level + 1 || 1;
            }

            result = super.select(absX, level);
        }

        // Remember this property log line is already open
        this.open = true;

        return result;
    }

    /**
     * Return the (coloured) representation of this line's contents
     *
     * @param    {Number}   x   On what (plain) char position was clicked
     */
    getContentString(x) {

        var length,
            colour,
            strVal,
            temp,
            key,
            str;

        if (this.enumerable) {
            colour = '1;95';
        } else {
            colour = 35;
        }

        strVal = this.getStringValue();

        str = '   ' + multiply('  ', this.level);

        if (this.first_line) {
            if (this.opens_array) {
                str += '[ ';
            } else {
                str += '{ ';
            }
        } else {
            str += '  ';
        }

        if (this.is_getter) {
            str += esc(90, '(get)', 39) + ' ';
        }

        if (this.is_symbol) {
            key = '';

            str += esc(90, 'Symbol(', 39) + esc(colour, this.key_string, 39) + esc(90, ')', 39);
        } else {
            key = this.key_string;
        }

        if (this.longest_key) {
            if (this.is_getter) {
                length = this.longest_key;
            } else {
                length = this.longest_key + 6;
            }

            // Limit the length to 20
            if (length > 20) {
                length = 20;
            }

            if (this.is_symbol) {
                length = length - 8 - this.key_string.length;
            }

            key = key.padEnd(length, ' ');
        }

        str += esc(colour, key, 39) + esc(0) + ' : ' + strVal;

        if (this.last_line) {
            if (this.closes_array) {
                str += ' ]';
            } else {
                str += ' }';
            }
        }

        return str;
    }
}

module.exports = PropertyLogLine;
