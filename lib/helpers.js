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

    getPath: function(obj, path) {
        return path.reduce(function(a,b){
            return a && a[b];
        }, obj);
    }
};
