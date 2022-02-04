const { esc } = require('../helpers');

module.exports = function pagingLogLine(Janeway) {

    class PagingLogLine extends Janeway.PropertyLogLine {

        constructor(logList) {
            super(logList);
        }

        pagination() {
            return this.parent.pagination || {};
        }

        /**
         * Return the (coloured) representation of this line's contents
         *
         * @param    {Number}   x   On what (plain) char position was clicked
         */
        getContentString(x) {

            var result,
                page_nr,
                start,
                prev,
                next;

            prev = '« Previous page';
            next = 'Next page »';

            page_nr = 'Page ' + (this.pagination.page + 1) + ' of ' + (Math.ceil(this.pagination.max_page) + 1);

            start = '    ' + page_nr + ' ';

            // We need to remember the "button" indexes
            this.prev_button = [start.length, start.length + prev.length];

            result = esc('2', start) + esc('30;47', prev);

            // Only add the "next" button if there is a next page
            if (this.pagination.max_page >= this.pagination.page) {
                result += '  ' + esc('30;47', next);
                this.next_button = [this.prev_button[1] + 2, this.prev_button[1] + next.length + 2];
            }

            return result;
        }

        /**
         * Select this line
         *
         * @param    {Number}   x   On what (plain) char position was clicked
         */
        select(absX, level) {

            var index = absX - 3;

            if (this.next_button && index >= this.next_button[0] && index <= this.next_button[1]) {
                this.pagination.page++;
            } else if (index >= this.prev_button[0] && index <= this.prev_button[1]) {
                this.pagination.page--;

                if (this.pagination.page < 0) {
                    this.pagination.page = 0;
                }
            } else {
                return;
            }

            this.parent.select(this.parent.selected_abs_x);
        }

    }

	Janeway.PagingLogLine = PagingLogLine;
};
