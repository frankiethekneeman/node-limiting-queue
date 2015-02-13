var defaults = require('./defaults');
function objectCopy(src, deep) {
    var dest = {};
    if (typeof src !== 'object') {
        return src;
    }
    Object.keys(src).forEach(function(key) {
        if (!deep || typeof src !== 'object') {
            dest[key] = src[key];
        } else {
            dest[key] = objectCopy(src[key], deep);
        }
    }.bind(this));
    return dest;
}

function Options = function(src) {
    Object.keys(src).forEach(function(key) {
        if (!deep || typeof src !== 'object') {
            dest[key] = src[key];
        } else {
            dest[key] = objectCopy(src[key], deep);
        }
    };
}

Options.prototype = defaults;

module.exports = {
    objectCopy: objectCopy
    , Options: Options
};
