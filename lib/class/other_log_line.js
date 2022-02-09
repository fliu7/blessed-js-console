const LogLine = require('./log_line.js');
const ArgsLogLine = require('./args_log_line.js');

const { esc } = require('../helpers');


/**
 * Lines from the CLI
 */
class CommandLogLine extends LogLine {
    constructor(logList) {
        super(logList);

        this.setGutter(esc('2;37') + this.jsConsole.config.strings.gutters.input + esc(0));
    }
}

/**
 * CLI input eval'ed lines
 */
class EvalOutputLogLine extends ArgsLogLine {
    constructor(logList) {
        super(logList);

        this.setGutter(esc('2;37') + this.jsConsole.config.strings.gutters.output + esc(0));
    }
}

/**
 * Error lines
 */
class ErrorLogLine extends ArgsLogLine {
    constructor(logList) {
        super(logList);

        this.is_error = true;

        this.setGutter(esc(91) + this.jsConsole.config.strings.gutters.error + esc(39));
    }
}

/**
 * Warning lines
 *
 */
class WarningLogLine extends ArgsLogLine {
    constructor(logList) {
        super(logList);

        this.setGutter(esc(93) + this.jsConsole.config.strings.gutters.warning + esc(39));
    }
}

/**
 * Info lines
 */
class InfoLogLine extends ArgsLogLine {
    constructor(logList) {
        super(logList);

        this.setGutter(esc(34) + this.jsConsole.config.strings.gutters.info + esc(39));
    }
}

module.exports = {
	CommandLogLine,
	EvalOutputLogLine,
	ErrorLogLine,
	WarningLogLine,  
	InfoLogLine
}
