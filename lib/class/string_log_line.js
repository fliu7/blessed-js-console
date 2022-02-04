const { toPaddedString, multiply, esc } = require('../helpers');

module.exports = function stringLogLine(Janeway) {

	/**
	 * A single string line
	 */
    class StringLogLine extends Janeway.PropertyLogLine {

        constructor(logList) {
            super(logList);
        }

        /**
         * Return the (coloured) representation of this line's contents
         *
         * @param    {Number}   x   On what (plain) char position was clicked
         */
        getContentString(x) {

            var colour,
                strVal,
                value,
                temp,
                str;

            // Get the string line
            value = this.object[this.key];
            strVal = ''+value;
            colour = '1;90';

            str = '    ' + multiply('  ', this.level);

            str += esc(colour, toPaddedString(Number(this.key), 2), 39) + esc(0) + ' ' + strVal + esc(0);

            return str;
        }

    }

	Janeway.StringLogLine = StringLogLine;
};
