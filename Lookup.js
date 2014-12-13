Ext.define('Ext.util.Lookup', {
    statics: {
        fromArray: function (array, keySelector, valueSelector) {
            var lookup = new Ext.util.Lookup();
            valueSelector = valueSelector || function(item) { return item; };
            Ext.Array.forEach(array, function (item) {
                lookup.add(keySelector(item), valueSelector(item));
            });
            return lookup;
        }
    },

    constructor: function () {
        this.map = {};
    },

    add: function (key, value) {
        var me = this;
        if (!me.map[key]) {
            me.map[key] = [];
        }
        me.map[key].push(value);
    },

    remove: function (key, value) {
        var me = this;
        if (me.map[key]) {
            Ext.Array.remove(me.map[key], value);
        }
    },

    removeAll: function () {
        var me = this;
        me.map = {};
    },

    removeKey: function (key) {
        var me = this;
        if (me.map[key]) {
            delete me.map[key];
        }
    },

    get: function (key) {
        var me = this;
        return me.map[key];
    },

    clear: function () {
        var me = this;
        me.map = {};
    },

    each: function (fn, scope) {
        var me = this;
        var keepIterating;
        Ext.Object.each(me.map, function (key, group) {
            Ext.Array.each(group, function (value) {
                return keepIterating = fn.call(scope, value, key);
            });
            return keepIterating;
        });
    },

    eachForKey: function (key, fn, scope) {
        var me = this;
        if (me.map[key]) {
            Ext.Array.each(me.map[key], function (value) {
                return fn.call(scope, value);
            });
        }
    },

    eachKey: function (fn, scope) {
        var me = this;
        Ext.Object.each(me.map, function (key, group) {
            return fn.call(scope, key, group);
        });
    }
});