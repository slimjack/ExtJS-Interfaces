/// <reference path="jasmine.js" />
/// <reference path="../Libs/ext-all-debug.js" />
/// <reference path="../Libs/deft-debug.js" />
/// <reference path="../Libs/ext-utils-all.js" />
/// <reference path="../InterfaceManager.js" />
/// <reference path="../InterfaceInjector.js" />

describe('InterfaceInjector.', function () {
    describe('Basics.', function () {
        it('By default there are two interfaces IDependency and ISingleton already defined.', function () {
            expect(function () {
                Ext.defineInterface('ITest1', {
                    inherit: 'IDependency'
                });
                Ext.defineInterface('ITest2', {
                    inherit: 'ISingleton'
                });
            }).not.toThrow();
        });
        it('ISingleton is derived from IDependency', function () {
            Ext.define('SingletonImplementation', {
                implement: 'ISingleton'
            });
            var instance = new SingletonImplementation();
            expect(instance.$is('ISingleton')).toBe(true);
            expect(instance.$is('IDependency')).toBe(true);
        });
    });

    describe('Injection.', function () {
        Ext.defineInterface('IBaseDependency', {
            inherit: 'IDependency'
        });
        Ext.defineInterface('IBaseSingleton', {
            inherit: 'ISingleton'
        });
        Ext.define('BaseDependencyClass', {
            implement: ['IBaseDependency']
        });
        Ext.define('BaseSingletonClass', {
            implement: ['IBaseSingleton']
        });

        it('Instance of class derived from IDependency ancestor may be injected by means of Deft DI container', function () {
            Ext.define('SingleInjectionTest', {
                inject: {
                    baseDependencyInstance: 'IBaseDependency'
                }
            });
            var instance = new SingleInjectionTest();
            expect(instance.baseDependencyInstance).toBeDefined();
            expect(instance.baseDependencyInstance).not.toBeNull();
            expect(instance.baseDependencyInstance.$is('IBaseDependency')).toBe(true);
            expect(instance.baseDependencyInstance.$is(BaseDependencyClass)).toBe(true);
        });

        it('Instances of all classes derived from IDependency ancestor may be injected by means of Deft IOC', function () {
            Ext.define('AnotherBaseDependencyClass', {
                implement: ['IBaseDependency']
            });
            Ext.define('MultiInjectionTest', {
                inject: {
                    baseDependencyInstances: 'IBaseDependency[]'
                }
            });
            var instance = new MultiInjectionTest();
            expect(Ext.isArray(instance.baseDependencyInstances)).toBe(true);
            expect(instance.baseDependencyInstances.length).toEqual(2);
            expect(instance.baseDependencyInstances[0].$is('IBaseDependency')).toBe(true);
            expect(instance.baseDependencyInstances[1].$is('IBaseDependency')).toBe(true);
        });

        it("If class implements IDependency but not ISingleton each time it is injected new instance is created", function () {
            Ext.define('DependencyInjectionTest', {
                inject: {
                    baseDependencyInstance: 'IBaseDependency'
                }
            });
            var instance1 = new DependencyInjectionTest();
            var instance2 = new DependencyInjectionTest();
            expect(instance1.baseDependencyInstance).not.toEqual(instance2.baseDependencyInstance);
        });

        it("If class implements ISingleton each time it is injected the same single instance is used", function () {
            Ext.define('SingletonInjectionTest', {
                inject: {
                    baseSingletonInstance: 'IBaseSingleton'
                }
            });
            var instance1 = new SingletonInjectionTest();
            var instance2 = new SingletonInjectionTest();
            expect(instance1.baseDependencyInstance).toEqual(instance2.baseDependencyInstance);
        });

        it("Class can suppress another class while injecting", function () {
            Ext.define('SingletonInjectionTest', {
                inject: {
                    baseSingletonInstance: 'IBaseSingleton'
                }
            });
            var singletonTestInstance = new SingletonInjectionTest();
            expect(singletonTestInstance.baseSingletonInstance.$is(BaseSingletonClass)).toBe(true);

            Ext.define('SuppressBaseSingletonClass', {
                implement: 'IBaseSingleton',
                suppress: 'BaseSingletonClass'
            });
            Ext.define('SuppressInjectionTest', {
                inject: {
                    baseSingletonInstance: 'IBaseSingleton'
                }
            });
            var instance = new SuppressInjectionTest();
            expect(instance.baseSingletonInstance.$is(SuppressBaseSingletonClass)).toBe(true);
            expect(instance.baseSingletonInstance.$is(BaseSingletonClass)).toBe(false);
        });
    });
});
