var _ = require('lodash');

function tabToSpaces(str, spaceCount) {
  var chars = str.split(''),
    result = '',
    spaces, i;

  spaceCount = spaceCount || 8;

  _.each(chars, function (char) {
    if (char === '\t') {
      spaces = spaceCount - (result.length % spaceCount);
      for (i = 0; i < spaces; i++) {
        result += ' ';
      }
    } else {
      result += char;
    }
  });

  return result;
}

function padLeft(str, len) {
  var fill = len - str.length,
    pad = '',
    i;

  if (fill > 0) {
    for (i = 0; i < fill; i++) {
      pad += ' ';
    }

    return pad + str;
  }

  return pad;
}

function htmlEscape(s) {
  return String(s).replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function alignLeft(lines) {
  var left = Number.MAX_VALUE,
    i;

  _.each(lines, function (line) {
    line.code = tabToSpaces(line.code);
    for (i = 0; i < line.code.length; i++) {
      if (line.code.charAt(i) !== ' ') {
        left = Math.min(left, i);
      }
    }
  });

  return _.map(lines, function (line) {
    line.code = line.code.slice(left);
    return line;
  });
}

function formatHtml(frames) {
  var result = '',
    parentAttr, attr;
  if (_.isArray(frames) && frames.length) {
    _.each(frames, function (frame, index) {
      parentAttr = (index === 0) ? ' class="first"' : '';
      result += '<li' + parentAttr + '><div class="frame">' + htmlEscape(frame.frame) + '</div>';
      if (frame.code && frame.code.length) {
        result += ' <ul class="source">';
        _.each(frame.code, function (line) {
          attr = (line.isErrorLine) ? ' class="error-line"' : '';
          result += ' <li' + attr + '>';
          result += '<pre><span class="line">' + padLeft(line.linenum.toString(), 4) + '</span> <span class="code">' + htmlEscape(line.code) + '</span></pre></li>';
        });
        result += '</ul>';
      }
      result += '</li>';
    });
  }

  return result;
}

exports.tabToSpaces = tabToSpaces;
exports.padLeft = padLeft;
exports.alignLeft = alignLeft;
exports.formatHtml = formatHtml;
exports.htmlEscape = htmlEscape;
