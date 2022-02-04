const { esc } = require('../helpers');

module.exports = function defineLogLine(Janeway) {

	/**
	 * Lines from the CLI
	 */
    class CommandLogLine extends Janeway.LogLine {
        constructor(logList) {
            super(logList);

            this.setGutter(esc('2;37') + this.janeway.config.strings.gutters.input + esc(0));
        }
    }

	/**
	 * CLI input eval'ed lines
	 */
    class EvalOutputLogLine extends Janeway.ArgsLogLine {
        constructor(logList) {
            super(logList);

            this.setGutter(esc('2;37') + this.janeway.config.strings.gutters.output + esc(0));
        }
    }

	/**
	 * Error lines
	 */
    class ErrorLogLine extends Janeway.ArgsLogLine {
        constructor(logList) {
            super(logList);

            this.is_error = true;

            this.setGutter(esc(91) + this.janeway.config.strings.gutters.error + esc(39));
        }
    }

	/**
	 * Warning lines
	 *
	 */
    class WarningLogLine extends Janeway.ArgsLogLine {
        constructor(logList) {
            super(logList);

            this.setGutter(esc(93) + this.janeway.config.strings.gutters.warning + esc(39));
        }
    }

	/**
	 * Info lines
	 */
    class InfoLogLine extends Janeway.ArgsLogLine {
        constructor(logList) {
            super(logList);

		    this.setGutter(esc(34) + this.janeway.config.strings.gutters.info + esc(39));
        }
    }

	Janeway.CommandLogLine = CommandLogLine;
	Janeway.EvalOutputLogLine = EvalOutputLogLine;
	Janeway.ErrorLogLine = ErrorLogLine;
	Janeway.WarningLogLine = WarningLogLine;
	Janeway.InfoLogLine = InfoLogLine;
};
