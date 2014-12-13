Ext.define("Ext.InterfaceManager", {
    singleton: true,
    registeredInterfaces: {},

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

        if (me.registeredInterfaces[interfaceName]) {
            Ext.Error.raise('Interface "' + interfaceName + '" already defined');
        }
        config.methods = Ext.Array.from(config.methods);
        config.inherit = Ext.Array.from(config.inherit);
        Ext.Array.forEach(config.inherit, function (name) {
            config.methods = config.methods.concat(me.registeredInterfaces[name].methods);
        });
        config.methods = Ext.Array.unique(config.methods);
        me.registeredInterfaces[interfaceName] = {
            methods: config.methods,
            parents: config.inherit
        };
    },

    //Checks if instance implements specified interface
    instanceImplements: function (instance, interfaceName) {
        var me = this;

        if (!me.registeredInterfaces[interfaceName]) {
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

        if (!me.registeredInterfaces[targetInterfaceName]) {
            Ext.Error.raise('Interface "' + targetInterfaceName + '" is not defined');
        }
        if (!me.registeredInterfaces[parentInterfaceName]) {
            Ext.Error.raise('Interface "' + parentInterfaceName + '" is not defined');
        }

        return me.inherits(targetInterfaceName, parentInterfaceName);
    },

    //Iterates through all parent interfaces of specified interface
    //fn - a function which accept parent interface name. To stop iterating fn should return false.
    eachParent: function (interfaceName, fn) {
        var me = this;
        if (me.registeredInterfaces[interfaceName]) {
            Ext.Array.each(me.registeredInterfaces[interfaceName].parents, function (parentInterfaceName) {
                if (fn(parentInterfaceName) === false) {
                    return false;
                }
                me.eachParent(parentInterfaceName, fn);
            });
        }
    },
    //endregion

    //region Private
    getInterface: function (classInstance, interfaceName) {
        var me = this;
        classInstance.interfaces = classInstance.interfaces || {};
        if (classInstance.interfaces[interfaceName]) {
            return classInstance.interfaces[interfaceName];
        }
        if (!me.instanceImplements(classInstance, interfaceName)) {
            return null;
        }
        var interfaceMethods = me.registeredInterfaces[interfaceName].methods;
        var interface_ = {
            $interfaceName: interfaceName,
            //Casts interface to another interface or to class instance
            as: function (interfaceOrClassName) {
                if (Ext.isFunction(interfaceOrClassName) || window[interfaceOrClassName]) {
                    var ctorToCompare = Ext.isFunction(interfaceOrClassName) ? interfaceOrClassName : window[interfaceOrClassName];
                    return classInstance instanceof ctorToCompare ? classInstance : null;
                } else {
                    return classInstance.as(interfaceOrClassName);
                }
            },
            //Checks if interface may be casted to specified class or interface
            is: function (interfaceOrClassName) {
                return classInstance.is(interfaceOrClassName);
            },
            //Checks if another interface or class instance belongs to the same class instance
            isTheSameAs: function (interfaceOrClassInstance) {
                return classInstance.isTheSameAs(interfaceOrClassInstance);
            }
        };

        Ext.Array.forEach(interfaceMethods, function (methodName) {
            if (Ext.isFunction(classInstance[methodName])) {
                interface_[methodName] = Ext.bind(classInstance[methodName], classInstance);
            } else {
                Ext.Error.raise('"' + classInstance.$className + '" has no implementation for "' + interfaceName + '.' + methodName + '".');
            }
        });
        classInstance.interfaces[interfaceName] = interface_;
        return interface_;
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
            if (!me.registeredInterfaces[interfaceName]) {
                Ext.Error.raise('Interface "' + interfaceName + ' is not defined');
            }
            var interfaceMethods = me.registeredInterfaces[interfaceName].methods;
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
            as: function (interfaceName) {
                return me.getInterface(this, interfaceName);
            },
            //Checks if class instance is of specified class or may be casted to specified interface
            is: function (interfaceOrClassName) {
                if (Ext.isFunction(interfaceOrClassName) || window[interfaceOrClassName]) {
                    var ctorToCompare = Ext.isFunction(interfaceOrClassName) ? interfaceOrClassName : window[interfaceOrClassName];
                    return this instanceof ctorToCompare;
                } else {
                    return me.instanceImplements(this, interfaceOrClassName);
                }
            },
            //Checks if interface belongs to this class instance or specified class instance is this class instance
            isTheSameAs: function (interfaceOrClassInstance) {
                return (interfaceOrClassInstance === this) || (this.interfaces && this.interfaces[interfaceOrClassInstance.$interfaceName] === interfaceOrClassInstance);
            }
        });
    }
    //endregion
});

Ext.defineInterface = Ext.bind(Ext.InterfaceManager.define, Ext.InterfaceManager);
