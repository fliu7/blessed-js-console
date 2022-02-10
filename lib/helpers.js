/**
 * Simple function to enter terminal colour codes
 *
 * @param    {Number|String}  code  The code(s) to escape
 * @param    {String}         str   If given: Add string and reset code
 *
 * @return   {String}
 */
function esc(code, str, endcode) {

	var result = '\u001b[' + code + 'm';

	if (typeof str !== 'undefined') {

		if (typeof endcode === 'undefined') {
			endcode = 0;
		}

		result += str + esc(endcode);
	}

	return result;
}

/**
 * Strip terminal colour escape sequences from a string
 *
 * @param    {String}  str       The string containing escape sequences
 * @param    {Boolean} literal   Remove literal representations in strings
 *
 * @return   {String}
 */
function stripEsc(str, literal) {
	var result = str.replace(/\u001b\[(\d\;?)+m/g, '');

	if (literal) {
		result = result.replace(/\\u001(?:b|B)\[(\d\;?)+m/, '');
	}

	return result;
}

module.exports = {
    toPaddedString: function(number, length) {
        var string = number.toString(10);
        return string.padStart(length, '0');
    },

    multiply: function(string, count) {
        return string.repeat(count);
    },

    subtract: function(a, b) {
        return a.filter(function(n) {
            return !b.includes(n)
        });
    },

    strlen: function(str) {
        return str.length;
    },

    esc,

    stripEsc
};
