//https://github.com/slimjack/ExtJs-Interfaces
Ext.define("Ext.InterfaceInjector", {
    singleton: true,
    requires: ['Ext.InterfaceManager', 'Ext.ux.util.Lookup'],

    interfaceMap: new Ext.ux.util.Lookup(),
    singletons: {},
    suppressedClasses: [],
    deferredSingletons: [],

    constructor: function () {
        var me = this;
        me.callParent(arguments);

        //Injector will always inject new instance of IDependency
        Ext.defineInterface('IDependency');

        //Injector will create ISingleton once and will always inject the same instance. If class implements IDependency and ISingleton
        //it will be treated as ISingleton
        Ext.defineInterface('ISingleton', {
            inherit: 'IDependency'
        });

        me.registerInjectPreprocessor();
        me.registerDeferredSingletonPostprocessor();
        me.registerClassDefinitionInterceptor();
    },

    registerClassDefinitionInterceptor: function () {
        var me = this;
        //Register all IDependency and ISingleton classes in Deft.Injector
        Ext.Function.interceptBefore(Ext.Class, 'onBeforeCreated', function (Class, data, hooks) {
            //Abstract classes are excluded from injection container
            if (data.abstractClass) {
                return;
            }

            //suppress is the name of class to be suppressed in DI container. Suppressed class will be treated as non-registered (will never be injected)
            if (data.suppress) {
                me.suppress(data.suppress);
            }

            var superclassImplementedInterfaces = Class.superclass && Class.superclass.implement ? Class.superclass.implement : [];

            var implementedInterfaces = data.implement || superclassImplementedInterfaces;

            implementedInterfaces = Ext.Array.from(implementedInterfaces);
            //ISingleton has higher instantiation priority. So, if class has at least one ISingleton in it's hierachy, class will be treated as singleton (IDependency is ignored in this case)
            var isSingleton = false;
            Ext.Array.each(implementedInterfaces, function (implementedInterfaceName) {
                isSingleton = Ext.InterfaceManager.isDerivedFrom(implementedInterfaceName, 'ISingleton');
                if (isSingleton) {
                    return false;
                }
            });

            Ext.Array.each(implementedInterfaces, function (implementedInterfaceName) {
                if (Ext.InterfaceManager.isDerivedFrom(implementedInterfaceName, 'IDependency') && implementedInterfaceName !== 'ISingleton') {
                    me.register(implementedInterfaceName, data.$className, isSingleton);
                }
                Ext.InterfaceManager.eachParent(implementedInterfaceName, function (parentInterfaceName) {
                    if (Ext.InterfaceManager.isDerivedFrom(parentInterfaceName, 'IDependency') && parentInterfaceName !== 'ISingleton') {
                        me.register(parentInterfaceName, data.$className, isSingleton);
                    }
                });
            });
        });
    },

    registerInjectPreprocessor: function () {
        var me = this;
        //DeftJS 5 doesn't apply injectable mixin automatically. So, apply it for all classes with 'inject' section
        Ext.Class.registerPreprocessor('inject', function (Class, data, hooks, callback) {
            if (data.inject) {
                var onCreated = hooks.onCreated;
                hooks.onCreated = function () {
                    hooks.onCreated = onCreated;
                    Class.mixin('Deft.mixin.Injectable', Ext.ClassManager.get('Deft.mixin.Injectable'));
                    return hooks.onCreated.apply(this, arguments);
                };
            }
        });
    },

    registerDeferredSingletonPostprocessor: function () {
        var me = this;
        //Unlike singleton deferredSingleton is instantiated when all scripts are loaded
        //This is needed to proper injection into singletons.
        Ext.ClassManager.registerPostprocessor('deferredSingleton', function (name, cls, data, fn) {
            if (data.deferredSingleton) {
                if (data.inject) {
                    me.deferredSingletons.push({
                        className: name,
                        ctor: cls,
                        data: data,
                        createFn: fn,
                        scope: this
                    });
                } else {
                    fn.call(this, name, new cls(), data);
                }
            }
            else {
                return true;
            }
            return false;
        }, ['deferredSingleton'], 'after', 'singleton');

        Ext.onReady(function () {
            Ext.each(me.deferredSingletons, function (ds) {
                ds.createFn.call(ds.scope, ds.className, new ds.ctor(), ds.data);
            });
        });
    },

    register: function (interfaceName, className, isSingleton) {
        var me = this;
        me.interfaceMap.add(interfaceName, {
            className: className,
            isSingleton: isSingleton
        });
        var interfaceNameMany = interfaceName + "[]";
        if (!Deft.Injector.canResolve(interfaceName)) {
            var config = {};
            config[interfaceName] = {
                fn: function () {
                    return me.resolve(interfaceName);
                },
                singleton: false
            };
            Deft.Injector.configure(config);
        }
        if (!Deft.Injector.canResolve(interfaceNameMany)) {
            var config = {};
            config[interfaceNameMany] = {
                fn: function () {
                    return me.resolveAll(interfaceName);
                },
                singleton: false
            };
            Deft.Injector.configure(config);
        }
    },

    suppress: function (className) {
        var me = this;
        Ext.Array.include(me.suppressedClasses, className);
    },

    resolve: function (interfaceName) {
        var me = this;
        var result;
        me.forEachDependencyConfig(interfaceName, function (dependencyConfig) {
            if (dependencyConfig.isSingleton && Ext.isString(dependencyConfig.className) && me.singletons[dependencyConfig.className]) {
                result = me.getInstance(dependencyConfig, interfaceName);
                return false;
            }
        });
        if (!result) {
            me.forEachDependencyConfig(interfaceName, function (dependencyConfig) {
                result = me.getInstance(dependencyConfig, interfaceName);
                return false;
            });
        }
        return result;
    },

    resolveAll: function (interfaceName) {
        var me = this;
        var result = [];
        me.forEachDependencyConfig(interfaceName, function (dependencyConfig) {
            result.push(me.getInstance(dependencyConfig, interfaceName));
        });
        return result;
    },

    forEachDependencyConfig: function (interfaceName, fn) {
        var me = this;
        me.interfaceMap.eachForKey(interfaceName, function (dependencyConfig) {
            if (!Ext.isString(dependencyConfig.className) || !Ext.Array.contains(me.suppressedClasses, dependencyConfig.className)) {
                fn(dependencyConfig);
            }
        });
    },

    getInstance: function (dependencyConfig, interfaceName) {
        var me = this;
        var result;
        if (dependencyConfig.isSingleton && me.singletons[dependencyConfig.className]) {
            result = me.singletons[dependencyConfig.className];
        } else {
            var result = Ext.create(dependencyConfig.className);
            if (dependencyConfig.isSingleton) {
                me.singletons[dependencyConfig.className] = result;
            }
        }
        return result.$as(interfaceName);
    }
});
