module.exports = {
    objectCopy: function(src, deep) {
        var dest = {};
        if (typeof src !== 'object') {
            return src;
        }
        Object.keys(src).forEach(function(key) {
            if (!deep || typeof src !== 'object') {
                dest[key] = src[key];
            } else {
                dest[key] = this.objectCopy(src[key], deep);
            }
        }.bind(this));
        return dest;
    }
};
