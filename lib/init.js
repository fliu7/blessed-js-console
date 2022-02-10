var blessed = require('neo-blessed'),
    util  = require('util'),
    vm    = require('vm'),
    os    = require('os'),
    fs    = require('fs'),
    starting = false,
    started = false,
    libpath = require('path'),
    counter = 0,
    Editarea = require('./class/editarea'),
    Status;

const LogList = require('./class/log_list.js');
const { CommandLogLine, EvalOutputLogLine, ErrorLogLine } = require('./class/other_log_line.js');
const PropertyLogLine = require('./class/property_log_line.js');
const StringLogLine = require('./class/string_log_line.js');
const { multiply, subtract, esc, stripEsc } = require('./helpers');

function getPropertyValueFromPath(obj, path) {
    return path.reduce(function(a,b){
        return a && a[b];
    }, obj);
}

/**
 * Get the property names of the given object,
 * follow the prototype chain
 *
 * @param    {Object}    target
 * @return   {Array}
 */
function getPropertyNames(target) {

	var proto,
	    result;

	// Get the descriptor
	result = Object.getOwnPropertyNames(target);

	// Config wasn't found, look up the prototype chain
	if (typeof target == 'function') {
		proto = target.prototype;
	} else {
		proto = Object.getPrototypeOf(target);
	}

	if (proto) {
		return result.concat(getPropertyNames(proto));
	}

	return result;
}


/**
 * Verbosity levels
 */
const LEVELS = {
	'FATAL':     0,
	'SEVERE':    1,
	'ERROR':     2,
	'WARNING':   3,
	'TODO':      4,
	'INFO':      5,
	'DEBUG':     6,
	'HIDEBUG':   7
};

const DEFAULT_CONFIG = {
	autocomplete: {
		enabled : true,
		height  : 6
	},
	execbin: {
		evaluate_files: false
	},
	shortcuts: {
		exit: ['C-c']
	},
	caller_info: {
		stack_size: 6,
		max_filename_length: 10,
		min_length: 26
	},
	properties: {
		alike_objects  : false,
		date_format    : 'D Y-m-d H:i:s',
		show_get_value : false,
		sort           : true
	},
	strings: {
		ellipsis : '…',
		gutters: {
			// Fancy >
			input   : '\u276f ',

			// Fancy <
			output  : '\u276e ',

			// Skull
			error   : '\u2620 Error:',

			// Warning sign
			warning : '\u26a0 ',

			// Circled small letter i
			info    : '\u24D8 '
		}
	},
	output: {
		style : {
			bg: 'transparent',
			fg: 'white'
		},
		scrollbar: {
			bg: 'blue'
		}
	},
	cli: {
		style : {
			bg : 'white',
			fg : 'blue'
		},
		unselect_on_return: true
	},
	status: {
		enabled : false,
		height  : 1,
		style   : {
			bg : 'grey',
			fg : 'white'
		}
	},
	popup: {
		scrollbar: {
			bg : 'green'
		},
		border: {
			type: 'line'
		},
		style: {
			bg: 'blue',
			fg: 'white'
		},
		shadow: true
	},
	menu: {
		style : {
			bg : 'white',
			fg : 'black',
			selected : {
				bg: 'white',
				fg: 'red'
			}
		},
		button : {
			bg    : 'white',
			fg    : 235, // Shade of grey
			focus : {
				bg: 'red',
				fg: 249 // Shade of grey
			},
			hover: {
				bg: 'red',
				fg: 249 // Shade of grey
			}
		}
	},
	menu_item: {
		style: {
			bg: 240,
			fg: 231,
			hover: {
				bg: 'red',
				fg: 249
			},
			selected: {
				bg: 100
			}
		}
	},
	blessed: {
		screen: {
			smartCSR                 : true,
			fullUnicode              : true,

			// "Back Color Erase" messes with the scrollbar
			useBCE                   : false
		}
	}
}

/**
 * Create augmented versions of the `stdout` and `stderr` objects.
 */
const outputs = {};
try {
	outputs.stdin = process.stdin;
	outputs.stdout = Object.create(process.stdout);
	outputs.stderr = Object.create(process.stderr);

	outputs.stdout.write = process.stdout.write;
	outputs.stderr.write = process.stderr.write;
} catch (err) {
}

class JsConsole {

constructor() {

	// Open popup boxes
	this.open_popups = {};

	// Current cli history index
	this.cli_history_index = -1;

	// The stashed cli input
	this.cli_stash = '';

	// Empty options objects (Gets overwritten on `start`)
	this.options = {};

    // Has the user scrolled manually?
    this.scrolled_manually = false;

    this.cli_history = [];
}


/**
 * The console width
 */
get screen_width() {
	if (this.main_screen && this.main_screen.width) {
		return this.main_screen.width;
	}

	return process.stdout.columns || 80;
}

set screen_width(width) {
	var has_changed = false;

	if (this.main_screen.width != width) {
		has_changed = true;
	}

	if (process.stdout.columns != width) {
		process.stdout.columns = width;
	}

	if (has_changed) {
		this.screen.program.cols = width;
		this.output.width = width;
		this.bottom.width = width;
		this.status.width = width;
		this.form.width = width;
		this.menu.width = width;
		this.cli.width = width;
		this.redraw();
	}
}

/**
 * The console height
 */
get screen_height() {

	if (this.main_screen && this.main_screen.height) {
		return this.main_screen.height;
	}

	return process.stdout.rows || 24;
}

set screen_height(height) {

	var has_changed = false;

	if (this.main_screen.height != height) {
		has_changed = true;
	}

	if (process.stdout.height != height) {
		process.stdout.height = height;
	}

	if (has_changed) {
		this.screen.program.rows = height;
		this.output.height = height - (3 + this.status.height);
		this.redraw();
	}
}

/**
 * Set the terminal tab title
 */
setTitle(title) {

	var cmd;

	// Create the command string if a title is given
	if (typeof title == 'string') {
		cmd = String.fromCharCode(27) + ']0;' + title + String.fromCharCode(7);
		this._title_has_been_set = true;
		this._title = title;
	} else {
		// Revert the title
		cmd = String.fromCharCode(27) + ']2;' + String.fromCharCode(7);
		this._title_has_been_set = false;
		this._title = '';
	}

	this.writeToOuput(cmd);
}

writeToOuput(cmd) {

	if (this.main_screen && this.main_screen.options && this.main_screen.options.output) {
		this.main_screen.options.output.write(cmd);
	} else {
		outputs.stdout.write(cmd);
	}
}

debug(message) {
	var str;

	if (message instanceof Error) {
		str = message.message + '\n' + message.stack;
	} else {
		str = util.inspect(message, {colors: true});
	}

	fs.appendFileSync('/tmp/jsconsole.debug.log', str + '\n');
}

redraw() {
	this.screen.realloc();
	this.screen.render();
}


/**
 * Extract info from a single stack line
 *
 * @param   {String}   caller_line   The string
 *
 * @return  {Object}   An object containing the info
 */
extractLineInfo(caller_line) {

	var result,
	    index,
	    clean,
	    temp;

	// Get the index
	index = caller_line.indexOf('at ');

	// Get the error line, without the '  at ' part
	clean = caller_line.slice(index+2, caller_line.length);

	result = /^ (.*?) \((.*?):(\d*):(\d*)\)/.exec(clean);

	// If nothing was found, it's probably an anonymous function
	if (!result) {
		temp = /(.*?):(\d*):(\d*)/.exec(clean);

		if (!temp) {
			temp = ['unknown', 'unknown', 'unknown', 'unknown'];
		}

		result = ['', 'anonymous', temp[1], temp[2], temp[3]];
	}

	return {
		name: result[1],
		path: result[2],
		file: result[2].split(libpath.sep).pop(),
		line: result[3],
		char: result[4]
	};
}

/**
 * Get info on the caller: what line this function was called from
 * This is done by creating an error object, which in its turn creates
 * a stack trace string we can manipulate
 *
 * @param   {Integer}   level   Skip x many callers
 *
 * @return  {Object}    An object contain caller info
 */
getCallerInfo(level, err) {

	var caller_line,
	    stack,
	    copy,
	    key,
	    msg,
	    obj,
	    def,
	    ar,
	    i;

	if (err && err.type === 'callerInfo') {

		// Shallow clone the object
		err = Object.assign({}, err);

		if (typeof err.level !== 'undefined') {
			for (key in err.stack[err.level]) {
				err[key] = err.stack[err.level][key];
			}
		}

		return err;
	}

	if (typeof level === 'undefined') level = 0;

	level += 6;

	if (typeof err == 'string') {
		msg = err;
		err = undefined;
	}

	if (!err) {

		def = Error.stackTraceLimit;

		// Set the stacktracelimit, we don't need anything above the wanted level
		Error.stackTraceLimit = 1 + level;

		if (this.config && this.config.caller_info.stack_size > Error.stackTraceLimit) {
			Error.stackTraceLimit = this.config.caller_info.stack_size;
		}

		err = new Error(msg);

		// Now reset the stacktracelimit to its default
		Error.stackTraceLimit = def;
	}

	// Some errors don't have a stack
	stack = err.stack || '';

	// Turn the stack string into an array
	ar = stack.split('\n');

	// Get the caller line
	caller_line = ar[level - 3];

	if (!caller_line) {
		caller_line = ar[ar.length-1];
	}

	obj = this.extractLineInfo(caller_line);
	obj.text = stack;

	obj.stack = [];

	copy = ar.splice(0);

	// Remove the first entry in the array
	copy.shift();

	for (i = 0; i < copy.length; i++) {
		obj.stack.push(this.extractLineInfo(copy[i]));
	}

	obj.err = err;
	obj.message = err.message;
	obj.name = err.name;
	obj.type = 'callerInfo';
	obj.seen = 1;

	return obj;
}

/**
 * Indent text
 */
indent(text, skipText, skipFirstLine) {

	var lines        = text.split('\n'),
	    visibleCount = stripEsc(skipText).length,
	    hiddenCount  = skipText.length,
	    difference   = hiddenCount - visibleCount,
	    maxWidth,
	    uselength,
	    lineNr,
	    line,
	    length,
	    hiddenLength,
	    visibleLength,
	    result;

	if (typeof skipFirstLine === 'undefined') skipFirstLine = true;
	if (skipFirstLine) {
		skipFirstLine = 1;
	} else {
		skipFirstLine = 0;
	}

	for (i = 0; i < lines.length; i++) {

		if (i == 0 && skipFirstLine){
			maxWidth = this.screen_width + difference;
		} else {
			lines[i] = multiply(' ', visibleCount) + lines[i];
			maxWidth = this.screen_width;
		}

		line = lines[i];

		hiddenLength = line.length;
		visibleLength = stripEsc(line).length;

		if (visibleLength > this.screen_width) {
			lines[i] = line.substring(0, maxWidth) + '\n' + multiply(' ', visibleCount) + line.substring(maxWidth);
		}
	}

	return lines.join('\n');
}

/**
 * Output messages
 */
print(type, args, options) {

	var i,
	    info,
	    level,
	    trace,
	    result,
	    output;

	if (!options) {
		options = {};
	}

	if (typeof options.verbosity == 'undefined') {
		options.verbosity = LEVELS.INFO;
	}

	level = options.level || 0;

	if (options.err) {
		level -= 3;
	}

	info = this.getCallerInfo(options.level, options.err);
	options.info = info;
	info.time = new Date();

	if (this.logList) {
		result = this.logList.consoleLog(args, type, options);
	}

	if (!this.logList || this.options.output_to_stdout) {
		trace = esc(90, '[') + type + esc(90, '] ') + esc(90, '[') + esc(1, info.file + ':' + info.line) + esc(90, '] ');
		output = trace;

		if (result) {
			// If result is truthy, a file object was added
			// to the arguments, so we need to skip that
			i = 1;
		} else {
			i = 0;
		}

		for (; i < args.length; i++) {

			if (args[i] && typeof args[i] != 'string') {
				args[i] = util.inspect(args[i], {colors: true});
			}

			output += ' ';

			if (typeof args[i] != 'string') {
				output += util.inspect(args[i], {colors: true});
			} else {
				output += args[i];
			}
		}

		// Remove colours when terminal doesn't support them
		if (!process.env.COLORTERM && !this.options.keep_color) {
			output = stripEsc(output);
		}

		if (this.options.change_indent !== false) {
			try {
				output = this.indent(output, trace);
			} catch (err) {
				outputs.stdout.write(String(err) + '\n');
			}
		}

		outputs.stdout.write(output);
		outputs.stdout.write('\n');
	}

	return result;
}

/**
 * Scroll the main window
 *
 * @param    {Number}  direction
 * @param    {Boolean} force_render   Set to true to render immediately
 */
scroll(direction, force_render) {

	var before,
	    after;

	if (direction == null) {
		direction = 1;
	}

	before = this.logList.box.getScrollPerc();
	this.logList.box.scroll(direction);
	after = this.logList.box.getScrollPerc();

	// Undo scroll if nothing changed
	if (before == 0 && after == 0) {
		this.logList.box.scroll(0 - direction);
	}

	if (force_render) {
		this.logList.render();
	}
}

/**
 * Keep the newest line in screen, unless the user has scrolled away
 */
scrollAlong() {

    if (!this.scrolled_manually) {
        this.scroll(1);
    }

    this.logList.render();
}

/**
 * Show a popup
 *
 * @param    {String}   id       The unique id (only 1 can be open at a time)
 * @param    {Object}   options
 *
 * @return   {ListBox}
 */
popup(id, options) {

	var list;

	if (!options) {
		if (this.open_popups[id]) {
			this.open_popups[id].destroy();
		}

		this.screen.render();
		return;
	}

	if (!options.position) {
		options.position = {};
	}

	if (options.position.bottom == null) {
		options.position.bottom = 2 + this.config.status.height;
	}

	if (options.position.height == null) {
		options.position.height = 6;
	}

	if (this.open_popups[id]) {
		this.open_popups[id].destroy();
	}

	// Create a new list
	list = this.blessed.list({
		//bottom: 2,
		position: options.position,
		items: options.items,
		mouse: true, // Allow selecting items with the mouse
		scrollbar: this.config.popup.scrollbar,
		border: this.config.popup.border,
		shadow: this.config.popup.shadow,
		style: this.config.popup.style
	});

	// Store the popup under its unique id
	this.open_popups[id] = list;

	// Add it to the screen
	this.screen.append(list);

	// Make sure it's in the front
	list.setFront();

	// Render the screen
	this.screen.render();

	return list;
}

/**
 * Show the autocomplete
 *
 * @param    {String}   cmd   The current content of the CLI
 * @param    {Object}   key   The last key pressed
 */
autocomplete(cmd, key) {

	var pieces,
	    target,
	    hidden,
	    width,
	    items,
	    item,
	    last,
	    left,
	    list,
	    keys,
	    key,
	    i;

	if (this.config.autocomplete.enabled === false) {
		return;
	}

	if (!cmd || !key) {
		this.autocomplete_list = this.popup('autocomplete', false);
        this.screen.render();
        return;
	}

	this.autocomplete_prefix = null;
	pieces = cmd.split('.');
	items = [];
	left = 1 + cmd.length;

    if (pieces.length == 1) {
        target = this._context;
        last = cmd;
    } else {
        last = pieces.pop();
        target = getPropertyValueFromPath(this._context, pieces);

        this.autocomplete_prefix = pieces.join('.') + '.';
    }

	if (target) {

		// First: get its own keys
		keys = Object.keys(target);

		// Now get all the hidden ones
		hidden = subtract(getPropertyNames(target), keys);

        const lastLC = last.toLowerCase();

		for (i = 0; i < keys.length; i++) {
			item = keys[i];

			if (!last || item.toLowerCase().startsWith(lastLC)) {
				items.push(item);
			}
		}

		for (i = 0; i < hidden.length; i++) {
			item = hidden[i];

			if (!last || item.toLowerCase().startsWith(lastLC)) {
				items.push(item);
			}
		}
	}

	width = 0;

	for (i = 0; i < items.length; i++) {
		if (items[i] && items[i].length > width) {
			width = items[i].length;
		}
	}

	if (cmd.trim() && items.length) {
		list = this.popup('autocomplete', {
			position: {
				left   : left,
				height : Math.min(this.config.autocomplete.height, items.length + 2),
				width  : width + 4
			},
			items : items
		});
	} else {
		list = this.popup('autocomplete', false);
	}

	this.autocomplete_list = list;
}

/**
 * Create a blessed screen
 *
 * @param    {Object}     options
 */
createScreen(options) {

	var screen,
	    def;

	if (!this.config) {
		this.config = DEFAULT_CONFIG;
	}

	if (this.config.blessed && this.config.blessed.screen) {
		def = this.config.blessed.screen;
	}

	// Add screen default options
	options = Object.assign({}, def, options);

	// Create the screen
	screen = blessed.screen(options);

	return screen;
}

start(context, customEval) {

	var that = this,
	    status_height,
	    scrolledUp = false,
	    listeners,
	    logList,
	    bottom,
	    output,
	    screen,
	    status,
	    menu,
	    form,
	    cli,
	    to;

	this.options = {};
    this._context = vm.createContext(context || globalThis);
	this._context.clear = null; // add "clear" to global context
    this._customEval = customEval;

	if (screen == null && (started || starting)) {
		return;
	}

	starting = true;

	if (screen == null && !process.stdout.isTTY) {
		return console.error('Could not start, not a valid TTY terminal');
	}

	// Get the program isntance
	this.program = blessed.program();

	// Get the user configuration
	this.config = DEFAULT_CONFIG;

    if (screen == null) {
        screen = this.createScreen({
            output : outputs.stdout,
            error  : outputs.stderr
        });
    }

    if (!this.main_screen) {
        this.main_screen = screen;
    }

    if (this.config.status.enabled) {
        status_height = this.config.status.height || 1;
    } else {
        status_height = 0;
        this.config.status.height = 0;
    }

    // Create the interface boxes
    bottom = blessed.box({
        bottom: 0 + status_height,
        width: '100%',
        content: '▶',
        height: 2,
        style: this.config.cli.style
    });

    form = blessed.form({
        width: '100%',
        left: 2,
        content: 'FORM',
        style: this.config.cli.style
    });

    menu = blessed.listbar({
        top    : 0,
        left   : 0,
        width  : '100%',
        height : 1,
        mouse  : true,
        style  : this.config.menu.style
    });

    status = blessed.box({
        bottom : 0,
        width  : '100%',
        height : status_height,
        tags   : true,
        style  : this.config.status.style
    });

    output = blessed.box({
        top: 1,
        bottom: (2 + status_height),
        left: 0,
        width: '100%',
        height: screen.height - (3 + status_height),
        scrollable: true,
        alwaysScroll: true, // Don't turn this off, or it breaks
        content: '',
        wrap: false,
        scrollbar: this.config.output.scrollbar,
        style: this.config.output.style
    });

    cli = Editarea({
        width: '100%',
        left: 0,
        bottom: 0,
        top: 0,
        style: this.config.cli.style,
        //inputOnFocus: true,
        mouse: true
    });

    // Store elements in the object
    this.blessed = blessed;
    this.screen = screen;
    this.output = output;
    this.bottom = bottom;
    this.status = status;
    this.form = form;
    this.menu = menu;
    this.cli = cli;

    // Create the LogList instance
    logList = new LogList(this, screen, output);
    this.logList = logList;

	/**
	 * Keep a reference to the original `console.log`
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	console._log = console.log;

	/**
	 * Hijack console.log
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	console.log = function log() {
		that.print('info', arguments, {level: 1});
	};

	/**
	 * Hijack console.dir
	 * (Currently the same as log)
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	console.dir = function dir() {
		that.print('dir', arguments, {level: 1});
	};

	/**
	 * Hijack console.info
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	console.info = function info() {
		that.print('info', arguments, {level: 1});
	};

	/**
	 * Hijack console.warn
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	console.warn = function warn() {
		that.print('warn', arguments, {level: 1});
	};

	/**
	 * Hijack console.error
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	console.error = function error() {
		that.print('error', arguments, {level: 1});
	};

	// Prepare to hijack stdout & stderr `write` functions
	to = {
		stdout: process.stdout.write,
		stderr: process.stderr.write
	};

	/**
	 * Hijack stderr output
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	process.stderr.write = function stderrWrite(string, encoding, fd) {
		that.print('error', [''+string]);
	};

	/**
	 * Hijack stdout output
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 */
	process.stdout.write = function stdoutWrite(string, encoding, fd) {
		that.print('info', [''+string]);
	};

	/**
	 * Listen for resize events
	 * (The `screen` should also emit a resize event, but it never does)
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.3.3
	 * @version  0.3.3
	 */
	process.stdout.on('resize', function onResize() {
		that.screen_width = process.stdout.columns;
		that.screen_height = process.stdout.rows;
	});

	/**
	 * Handle mouse events (scrolling)
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.1.4
	 */
	output.on('mouse', function onMouse(e) {

		var scrolled = false;

		if (e.action == 'wheelup') {
			output.scroll(-5);
			scrolledUp = true;
			scrolled = true;
		} else if (e.action == 'wheeldown') {
			output.scroll(5);
			scrolledUp = false;
			scrolled = true;
		}

		if (scrolled) {
			that.scrolled_manually = true;

			if (output.getScrollPerc() == 100) {
				that.scrolled_manually = false;
			}

			logList.render();
		}
	});

	/**
	 * Handle mouse clicks
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.3.0
	 */
	output.on('click', function onClick(data) {

		var line_index,
		    scroll;

		scroll = that.logList.box.childBase;
		line_index = scroll + data.y - 1;

		logList.click(line_index, data.x, data.y);
	});

	/**
	 * Handle mouse down events
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.3.0
	 * @version  0.3.0
	 */
	output.on('mousedown', function onMouseDown(data) {

		var line_index,
		    scroll;

		scroll = that.logList.box.childBase;
		line_index = scroll + data.y - 1;

		// If we're already pressing down,
		// mousemove won't fire, but this will!
		if (that.mouse_down) {

			// So emit a mousemove event first
			logList.mouseMove(line_index, data.x, data.y);

			let start = that.mouse_down_start;
			let end = {
				line_index : line_index,
				x          : data.x,
				y          : data.y
			};

			// See if we need to reverse the elements
			if (end.y < start.y) {
				start = end;
				end = that.mouse_down_start;
			} else if (end.y == start.y && end.x < start.x) {
				start = end;
				end = that.mouse_down_start;
			}

			logList.mouseDrag(that.mouse_down_start, end);

			return;
		}

		// Indicate the mouse is down
		that.mouse_down = true;

		// Remember where the mousedown event started
		that.mouse_down_start = {
			line_index : line_index,
			x          : data.x,
			y          : data.y
		};

		logList.mouseDown(line_index, data.x, data.y);
	});

	/**
	 * Handle mousemove events
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.3.0
	 * @version  0.3.0
	 */
	output.on('mousemove', function onMouseMove(data) {

		var line_index,
		    scroll,
		    start,
		    end;

		scroll = that.logList.box.childBase;
		line_index = scroll + data.y - 1;

		logList.mouseMove(line_index, data.x, data.y);
	});

	/**
	 * Handle mouse up events
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.3.0
	 * @version  0.3.0
	 */
	output.on('mouseup', function onMouseUp(data) {

		var line_index,
		    scroll;

		// The mouse is no longer down
		that.mouse_down = false;
		that.mouse_down_start = null;

		scroll = that.logList.box.childBase;
		line_index = scroll + data.y - 1;

		logList.mouseUp(line_index, data.x, data.y);
	});

    function setCliValue(value, b) {
        cli.setValue(value, b);
    }

	/**
	 * Enter the currently selected value in the autocomplete list into the CLI
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.5
	 * @version  0.2.0
	 */
	function selectAutocomplete() {

		var temp,
		    path;

		// Get the selected item
		temp = that.autocomplete_list.getItem(that.autocomplete_list.selected);

		// Get the path before the last dot
		path = that.autocomplete_prefix || '';

		if (temp && temp.content) {
			// Set the value and move to the end
			setCliValue(path + temp.content, true);
			that.autocomplete();

            return true;
		}

        return false;
	}

    function deleteWord(cmd) {
		var wordRegex = /\w+\s*$/
		var matches = cmd.match(wordRegex)
		if (matches && matches.length && matches[0]) {
			return cmd.replace(wordRegex, '')
		}

		return cmd.slice(0, -1);
	}

	var current_keypress_time = 0,
	    last_keypress_time = 0,
	    current_key = null,
	    last_key = null;
    let autocomplete_focused = false;

	/**
	 * Handle input of the CLI
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.2.5
	 */
	cli.on('keypress', function onKeypress(e, key) {

		var key_speed,
		    temp,
		    dir,
		    cmd,
		    id;

		// Set the last keypress time to the old value of the "current" one
		last_keypress_time = current_keypress_time;
		last_key = current_key;

		// Get the time of the current keypress
		current_keypress_time = Date.now();
		current_key = key.name;

		// Calculate the key speed
		key_speed = current_keypress_time - last_keypress_time;

		// Enters appear as an "enter" first and a "return" afterwards,
		// ignore those second returns
		if (key.name == 'return' && last_key == 'enter') {
            setCliValue(cli.getValue().replace(/\n$/, ''), true);
			that.autocomplete();
			return;
		}

		if (key.name == 'pagedown') {
			that.scroll(20, true);
		} else if (key.name == 'pageup') {
			that.scroll(-20, true);
		} else if (key.name == 'enter' && key_speed > 24) {
			cmd = cli.getValue().trim();

			if (autocomplete_focused && that.autocomplete_list) {
				selectAutocomplete();
				return;
			}

			// Reset the index
			that.cli_history_index = -1;

			// Clear out the stash
			that.cli_stash = '';

			// Clear the CLI anyway, we don't want returns in the input
			// but it still happens, this way it'll limit to 1 return
			cli.clearValue();

			// Return if the cmd is empty
			if (!cmd) {
				return;
			}

			// If the new command differs from the last one, unshift it onto the array
			if (cmd != that.cli_history[0]) {
				that.cli_history.unshift(cmd);
			}

			if (cmd == 'clear') {
				logList.clearScreen();

				setImmediate(function() {

					// Unselect currently selected line
					if (that.config.cli.unselect_on_return) {
						that.unselect();
					}

					// Clear cli
					cli.clearValue();
					cli.render();
				});
				return;
			} else if (cmd == 'exit') {
				process.exit();
			}

			that.evaluate(cmd);
		} else {
			if (key.ch == '.' && autocomplete_focused) {
				if (that.autocomplete_list) {
					selectAutocomplete();
				}
			}

            if (key.name == 'tab') {
                if (that.autocomplete_list) {
                    selectAutocomplete();

                    setImmediate(function() {
                        setCliValue(cli.getValue().replace(/\t$/, ''), true);
                    });
                }
                autocomplete_focused = false;
                return;
            }

			cmd = cli.getValue();

			if (key.code || key.name == 'escape') {
				// Ignore keys with codes

				// If the autocomplete list is open, listen to the arrow keys
				if (that.autocomplete_list) {
					if (key.name == 'up') {
						autocomplete_focused = true;
						that.autocomplete_list.up(1);
						that.autocomplete_list.render();
					} else if (key.name == 'down') {
						autocomplete_focused = true;
						that.autocomplete_list.down(1);
					} else if (key.name == 'escape') {
						autocomplete_focused = false;
						that.autocomplete();
					}

					screen.render();
				} else {

					// If the autocomplete popup is not open,
					// arrow keys should cycle through the CLI history
					if (key.name == 'up') {
						dir = 1;
					} else if (key.name == 'down') {
						dir = -1;
					}

					if (dir) {

						// If the current index is -1, stash the current input
						if (that.cli_history_index == -1 && cmd) {
							that.cli_stash = cmd;
						}

						id = that.cli_history_index + dir;

						if (id == -1) {
							that.cli_history_index = -1;
							setCliValue(that.cli_stash, true);
						} else if (that.cli_history[id] != null) {

							// Get the history entry
							temp = that.cli_history[id];

							// Set the new index
							that.cli_history_index = id;

							// Set the value in the cli
							setCliValue(temp, true);
						}

						screen.render();
					}
				}

				return;
			} else if (key.name === 'backspace') {
				cmd = cmd.slice(0, -1);
			} else if (key.full === 'C-w') {
				cmd = deleteWord(cmd)
				setCliValue(cmd, true);
				screen.render()
			} else {
				cmd += e;
			}
			that.autocomplete(cmd, key);
			autocomplete_focused = false;
		}
	});

	// Prepare the screen contents and render
	screen.append(bottom);
	screen.append(menu);
	screen.append(output);

	if (status_height) {
		screen.append(status);
	}

	bottom.append(form);
	form.append(cli);

	// Quit on a shortcut (Control-C by default)
	cli.key(that.config.shortcuts.exit || ['C-c'], function exitNow(ch, key) {
		return process.exit(0);
	});

	// The CLI is always in focus
	cli.readInput(function recurse(result) {
		cli.readInput(recurse);
	});

	/**
	 * Cleanup on exit
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.2.0
	 * @version  0.2.5
	 */
	function exitHandler(err) {
		screen.destroy();
	}

	// Do something when app is closing
	process.on('exit', exitHandler);

	// Catch Ctrl+c
	process.on('SIGINT', exitHandler);

	this._createMenu();

	screen.render();
}

_createMenu() {

	blessed.box({
		parent    : this.menu,
		mouse     : true,
		autoFocus : false,
		name      : 'help',
		content   : 'Help',
		shrink    : true,
		padding   : {
			left  : 1,
			right : 1
		},
		style     : this.config.menu.button
	}).on('click', function () {
		console.log('Help: $o(id) - query object by id');
	});
}

/**
 * Unselect the line that is currently selected
 */
unselect() {
	if (this.logList.selectedLine) {
		this.logList.selectedLine.unselect();
	}
}

/**
 * Evaluate code
 */
async evaluate(source) {

	let logList = this.logList;

	// Create a line for the input command
	let commandLine = new CommandLogLine(logList);
	commandLine.set(esc('38;5;74', source));

	// Add it to the logList
	logList.pushLine(commandLine);

	try {
		let expect_promise = false,
		    result,
		    code;

		if (/\bawait\b/.test(source)) {
			code = '(async function() { return (' + source + ')}())';
			expect_promise = true;
		} else {
			code = source;
		}

        if (this._customEval) {
            result = this._customEval(code);
        } else {
            const script = new vm.Script(code, { filename: 'CLI' });
            result = script.runInContext(this._context);
        }

		// Create a line for the output
		let evalLine = new EvalOutputLogLine(logList);

		if (expect_promise) {
			evalLine.set([esc('38;5;240', 'Awaiting promise...')]);
		} else {
			evalLine.set([result]);
		}

		logList.insertAfter(evalLine, commandLine.index);

		if (expect_promise) {
			result = await result;
			evalLine.set([result]);
			evalLine.render();
		}

	} catch (err) {
		let errorLine = new ErrorLogLine(logList);
		errorLine.set([err]);

		logList.insertAfter(errorLine, commandLine.index);
	}

	// Even though the input has been cleared,
	// the return gets added afterwards
	// So we need to make sure that happens
    await new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, 1);
    });

	// Unselect currently selected line
	if (this.config.cli.unselect_on_return) {
		this.unselect();
	}

	// Clear cli
	this.cli.clearValue();
	this.cli.render();

	// Scroll along if needed
	this.scrollAlong();
}

createPropertyLine() {
    return new PropertyLogLine(this.logList);
}

createStringLine() {
    return new StringLogLine(this.logList);
}

} // class JsConsole 

const jsConsole = new JsConsole();

module.exports = jsConsole;
