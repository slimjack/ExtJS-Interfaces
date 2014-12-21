//https://github.com/slimjack/ExtJs-Interfaces
Ext.define("Ext.InterfaceManager", {
    singleton: true,
    interfaceDefinitions: {},

    constructor: function () {
        var me = this;
        me.callParent(arguments);
        me.extendExtBase();
        me.registerPreprocessor();
    },

    //region Public

    //Registers new interface
    //config.inherit (string or array of strings) - parent interface names 
    //config.methods (string or array of strings) - names of interface's methods
    define: function (interfaceName, config) {
        var me = this;
        config = config || {};

        if (me.interfaceDefinitions[interfaceName]) {
            Ext.Error.raise('Interface "' + interfaceName + '" already defined');
        }
        me.interfaceDefinitions[interfaceName] = me.createInterfaceDefinition(config);
    },

    //Checks if instance implements specified interface
    instanceImplements: function (instance, interfaceName) {
        var me = this;

        if (!me.interfaceDefinitions[interfaceName]) {
            Ext.Error.raise('Interface "' + interfaceName + '" is not defined');
        }

        if (Ext.Array.contains(instance.implement, interfaceName)) {
            return true;
        }

        if (!Ext.isArray(instance.implement)) {
            return false;
        }

        var result = false;
        Ext.Array.each(instance.implement, function (implementedInterfaceName) {
            result = me.inherits(implementedInterfaceName, interfaceName);
            if (result) {
                return false;
            }
        });
        return result;
    },

    //Checks if interface is derived from specified interface
    isDerivedFrom: function (targetInterfaceName, parentInterfaceName) {
        var me = this;

        if (!me.interfaceDefinitions[targetInterfaceName]) {
            Ext.Error.raise('Interface "' + targetInterfaceName + '" is not defined');
        }
        if (!me.interfaceDefinitions[parentInterfaceName]) {
            Ext.Error.raise('Interface "' + parentInterfaceName + '" is not defined');
        }

        return me.inherits(targetInterfaceName, parentInterfaceName);
    },

    //Iterates through all parent interfaces of specified interface
    //fn - a function which accept parent interface name. To stop iterating fn should return false.
    eachParent: function (interfaceName, fn) {
        var me = this;
        if (me.interfaceDefinitions[interfaceName]) {
            Ext.Array.each(me.interfaceDefinitions[interfaceName].parents, function (parentInterfaceName) {
                if (fn(parentInterfaceName) === false) {
                    return false;
                }
                me.eachParent(parentInterfaceName, fn);
            });
        }
    },
    //endregion

    //region Private
    createInterfaceDefinition: function (config) {
        var me = this;
        config.events = Ext.Array.from(config.events);
        config.properties = Ext.Array.from(config.properties);
        config.methods = Ext.Array.from(config.methods);
        config.inherit = Ext.Array.from(config.inherit);
        Ext.Array.forEach(config.inherit, function (name) {
            config.methods = config.methods.concat(me.interfaceDefinitions[name].methods);
            config.properties = config.properties.concat(me.interfaceDefinitions[name].properties);
            config.events = config.events.concat(me.interfaceDefinitions[name].events);
        });
        config.methods = Ext.Array.unique(config.methods);
        config.properties = me.normalizeProperties(config.properties);
        config.events = Ext.Array.unique(config.events);
        return {
            parents: config.inherit,
            methods: config.methods,
            properties: config.properties,
            events: config.events
        };
    },

    normalizeProperties: function (properties) {
        var result = [];
        Ext.Array.forEach(properties, function (property) {
            if (Ext.isString(property)) {
                property = { name: property };
            }
            if (Ext.Array.findBy(result, function (p) { return p.name === property.name; })) {
                return;
            }
            result.push(property);
        });
        return result;
    },

    getInterface: function (classInstance, interfaceName) {
        var me = this;
        classInstance._interfaces = classInstance._interfaces || {};
        if (classInstance._interfaces[interfaceName]) {
            return classInstance._interfaces[interfaceName];
        }
        if (!me.instanceImplements(classInstance, interfaceName)) {
            return null;
        }
        var $interface = {
            _interfaceName: interfaceName,
            //Casts interface to another interface or to class instance
            $as: function (interfaceOrClassName) {
                if (Ext.isFunction(interfaceOrClassName) || window[interfaceOrClassName]) {
                    var ctorToCompare = Ext.isFunction(interfaceOrClassName) ? interfaceOrClassName : window[interfaceOrClassName];
                    return classInstance instanceof ctorToCompare ? classInstance : null;
                } else {
                    return classInstance.$as(interfaceOrClassName);
                }
            },
            //Checks if interface may be casted to specified class or interface
            $is: function (interfaceOrClassName) {
                return classInstance.$is(interfaceOrClassName);
            },
            //Checks if another interface or class instance belongs to the same class instance
            $equals: function (interfaceOrClassInstance) {
                return classInstance.$equals(interfaceOrClassInstance);
            }
        };
        me.bindInterface($interface, classInstance);
        classInstance._interfaces[interfaceName] = $interface;
        return $interface;
    },

    bindInterface: function ($interface, classInstance) {
        var me = this;
        var interfaceDefinition = me.interfaceDefinitions[$interface._interfaceName];
        Ext.Array.forEach(interfaceDefinition.methods, function (methodName) {
            me.bindInterfaceMethod($interface, classInstance, methodName);
        });
        Ext.Array.forEach(interfaceDefinition.events, function (eventName) {
            var capitalizedEventName = Ext.String.capitalize(eventName);
            me.bindInterfaceMethod($interface, classInstance, 'on' + capitalizedEventName);
            me.bindInterfaceMethod($interface, classInstance, 'un' + capitalizedEventName);
        });
        Ext.Array.forEach(interfaceDefinition.properties, function (property) {
            me.bindInterfaceProperty($interface, classInstance, property);
        });
    },

    bindInterfaceProperty: function ($interface, classInstance, property) {
        var capitalizedPropertyName = Ext.String.capitalize(property.name);
        var getter = classInstance['get' + capitalizedPropertyName];
        if (!Ext.isFunction(getter)) {
            Ext.Error.raise('"' + classInstance.$className + '" has no getter implementation for "' + $interface._interfaceName + '.' + property.name + '" property.');
        }
        if (property.onlyGet) {
            $interface[property.name] = function () {
                if (arguments.length) {
                    Ext.Error.raise('"' + $interface._interfaceName + '.' + property.name + '" property defined as onlyGet. Thus it cannot be used to set value');
                }
                return getter.call(classInstance);
            }
        } else {
            var setter = classInstance['set' + capitalizedPropertyName];
            if (!Ext.isFunction(setter)) {
                Ext.Error.raise('"' + classInstance.$className + '" has no setter implementation for "' + $interface._interfaceName + '.' + property.name + '" property.');
            }
            $interface[property.name] = function (value) {
                if (arguments.length > 1) {
                    Ext.Error.raise('"' + $interface._interfaceName + '.' + property.name + '" property cannot be called with more than one parameter');
                }
                if (arguments.length) {
                    setter.call(classInstance, value);
                } else {
                    return getter.call(classInstance);
                }
            }
        }

    },

    bindInterfaceMethod: function ($interface, classInstance, methodName) {
        if (Ext.isFunction(classInstance[methodName])) {
            $interface[methodName] = Ext.bind(classInstance[methodName], classInstance);
        } else {
            Ext.Error.raise('"' + classInstance.$className + '" has no implementation for "' + $interface._interfaceName + '.' + methodName + '".');
        }
    },

    inherits: function (targetInterfaceName, parentInterfaceName) {
        var me = this;
        var result = false;
        me.eachParent(targetInterfaceName, function (targetParentInterfaceName) {
            result = targetParentInterfaceName === parentInterfaceName;
            if (result) {
                return false;
            }
        });
        return result;
    },

    validateImplementations: function (targetClass) {
        var me = this;
        if (!targetClass.implement) {
            return;
        }
        var interfacesToValidate = targetClass.implement;
        Ext.Array.forEach(interfacesToValidate, function (interfaceName) {
            if (!me.interfaceDefinitions[interfaceName]) {
                Ext.Error.raise('Interface "' + interfaceName + ' is not defined');
            }
            var interfaceMethods = me.interfaceDefinitions[interfaceName].methods;
            Ext.Array.each(interfaceMethods, function (methodName) {
                if (!Ext.isFunction(targetClass[methodName])) {
                    Ext.Error.raise('"' + targetClass.$className + '" has no implementation for "' + interfaceName + '.' + methodName + '".');
                }
            });
        });
    },

    registerPreprocessor: function () {
        var me = this;
        Ext.Class.registerPreprocessor('implement', function (Class, data, hooks, callback) {
            data.implement = Ext.Array.from(data.implement);

            var mergedClassDefinition = Ext.apply({}, data, Class.superclass);
            me.validateImplementations(mergedClassDefinition);

            if (Class.superclass && Class.superclass.implement) {
                data.implement = Ext.Array.union(data.implement, Class.superclass.implement);
            }
        });
    },

    extendExtBase: function () {
        var me = this;
        //Add basic interface access methods to all classes
        Ext.Base.addMembers({
            //Casts class instance to specified interface
            $as: function (interfaceName) {
                return me.getInterface(this, interfaceName);
            },
            //Checks if class instance is of specified class or may be casted to specified interface
            $is: function (interfaceOrClassName) {
                if (Ext.isFunction(interfaceOrClassName) || window[interfaceOrClassName]) {
                    var ctorToCompare = Ext.isFunction(interfaceOrClassName) ? interfaceOrClassName : window[interfaceOrClassName];
                    return this instanceof ctorToCompare;
                } else {
                    return me.instanceImplements(this, interfaceOrClassName);
                }
            },
            //Checks if interface belongs to this class instance or specified class instance is this class instance
            $equals: function (interfaceOrClassInstance) {
                return (interfaceOrClassInstance === this) || (this._interfaces && this._interfaces[interfaceOrClassInstance._interfaceName] === interfaceOrClassInstance);
            }
        });
    }
    //endregion
});

Ext.defineInterface = Ext.bind(Ext.InterfaceManager.define, Ext.InterfaceManager);
