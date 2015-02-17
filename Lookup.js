Ext.define('Ext.util.Lookup', {
    statics: {
        fromArray: function(array, keySelector, valueSelector) {
            var lookup = new Ext.util.Lookup();
            valueSelector = valueSelector || function(item) { return item; };
            Ext.Array.forEach(array, function(item) {
                lookup.add(keySelector(item), valueSelector(item));
            });
            return lookup;
        }
    },

    constructor: function(lookup) {
        var me = this;
        me.map = {};
        if (lookup) {
            lookup.each(function (value, key) {
                me.add(key, value);
            });
        }
    },

    add: function(key, value) {
        var me = this;
        if (!me.map[key]) {
            me.map[key] = [];
        }
        me.map[key].push(value);
    },

    remove: function(key, value) {
        var me = this;
        if (me.map[key]) {
            if (Ext.isArray(value)) {
                var predicate = value;
                value = Ext.Array.findBy(me.map[key], predicate);
            }
            Ext.Array.remove(me.map[key], value);
        }
    },

    contains: function (key, value) {
        var me = this;
        if (me.map[key]) {
            return Ext.Array.contains(me.map[key], value);
        }
        return false;
    },

    find: function (key, predicate) {
        var me = this;
        if (me.map[key]) {
            return Ext.Array.findBy(me.map[key], predicate);
        }
    },

    removeAll: function() {
        var me = this;
        me.map = {};
    },

    removeKey: function(key) {
        var me = this;
        if (me.map[key]) {
            delete me.map[key];
        }
    },

    get: function(key) {
        var me = this;
        return me.map[key];
    },

    clear: function() {
        var me = this;
        me.map = {};
    },

    clone: function() {
        var me = this;
        return new Ext.util.Lookup(me);
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