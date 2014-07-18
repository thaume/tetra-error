/*jshint -W052*/
/*jshint -W098*/
var fs = require('fs'),
  http = require('http'),
  _ = require('lodash'),
  utils = require('./utils');

var HOME = process.env.HOME || process.env.USERPROFILE,
  CWD = process.cwd();

function BetterStack(stack, contextLinesCount) {
  this.contextLinesCount = contextLinesCount || 5;

  // Prepare the stack
  var result = [],
    lines = stack.split('\n');

  _.each(lines, function (line) {
    if (line.indexOf(CWD) > 0) {
      result.push(line.replace(CWD, '.'));
    } else if (line.indexOf(HOME) > 0) {
      result.push(line.replace(HOME, '~'));
    } else {
      result.push(line);
    }
  });
  this.stack = result;
}

BetterStack.prototype.injectSource = function () {
  var newLines = [],
    cache = {}, _this = this,
    regex, lineObj, matches, file, text;

  var lines = this.stack;

  lines.shift();
  _.each(lines, function (line) {
    lineObj = {
      frame: line
    };
    regex = (line.indexOf('(') > 0) ? /\((.*):(\d+):(\d+)\)/ : /at (.*):(\d+):(\d+)/;
    matches = regex.exec(line);
    if (matches) {
      file = matches[1];
      if (file.indexOf(HOME) === 0) {
        file = file.replace('~', HOME);
      }

      text = cache[file];
      if (!text) {
        try {
          text = fs.readFileSync(file, 'utf8');
        } catch (err) {
          text = 'Source code not found';
        }

        cache[file] = text;
      }
      lineObj.code = _this._pushLine(text, matches);

    }
    newLines.push(lineObj);
  });

  return newLines;
};

BetterStack.prototype._pushLine = function (text, matches) {
  var textLines = text.split('\n'),
    linenum = parseInt(matches[2]),
    code = [],
    _this = this;

  _.each(textLines, function (line, index) {
    if (index >= (linenum - 1 - _this.contextLinesCount) && (index < linenum - 1)) {
      code.push({
        linenum: index + 1,
        code: textLines[index]
      });
    } else if (index === linenum - 1) {
      code.push({
        linenum: index + 1,
        code: textLines[index],
        isErrorLine: true
      });
      if (_this.contextLinesCount <= 0) {
        return false;
      }
    } else if ((index > linenum - 1) && (index < linenum + _this.contextLinesCount)) {
      code.push({
        linenum: index + 1,
        code: textLines[index]
      });
      if (index === (linenum - 1 + _this.contextLinesCount)) {
        return false;
      }
    }
  });

  return utils.alignLeft(code);
};

exports.handle = function (options) {

  options = options || {};

  var contextLinesCount = options.contextLinesCount;

  process.on('uncaughtException', function (err) {
    return console.error('Uncaught exception', '' + err.message + '\n' + err.stack);
  });

  return function (err, req, res, next) {
    var status, name, accept, betterStack, errObj;

    // Output the err unchanged to the console
    console.error(err.message + '\n' + err.stack);

    // Setup the err object
    if (typeof err === 'number') {
      status = err;
      name = http.STATUS_CODES[status];
      err = new Error(name);
      err.name = name;
      err.status = status;
    } else if (typeof err === 'string') {
      name = err;
      status = 500;
      err = new Error(name);
      err.name = name;
      err.status = status;
    }

    // Configure the response
    if (err.status) {
      res.statusCode = err.status;
    }
    if (res.statusCode < 400) {
      res.statusCode = 500;
    }
    accept = req.headers.accept || '';

    // Setup new error object
    if (err instanceof Error) {
      betterStack = new BetterStack(err.stack, contextLinesCount);
      errObj = {
        message: err.message,
        stack: betterStack.injectSource()
      };
    } else if (err) {
      if (typeof err === 'string') {
        errObj = {
          message: err,
          stack: null
        };
      } else {
        errObj = {
          message: JSON.stringify(err),
          stack: null
        };
      }
    } else {
      errObj = {
        message: '(empty error)',
        stack: null
      };
    }

    if (~accept.indexOf('html')) {
      return fs.readFile(__dirname + '/../public/main.css', 'utf8', function (e, style) {
        return fs.readFile(__dirname + '/../public/error.html', 'utf8', function (e, html) {
          var stack;
          stack = utils.formatHtml(errObj.stack);
          html = html.replace('{style}', style)
            .replace('{stack}', stack)
            .replace('{title}', err.constructor.name)
            .replace('{statusCode}', res.statusCode)
            .replace(/\{error\}/g, utils.htmlEscape(errObj.message));
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.end(html);
        });
      });
    } else if (~accept.indexOf('json')) {
      return res.json(errObj);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      return res.end(JSON.stringify(errObj));
    }

  };
};
