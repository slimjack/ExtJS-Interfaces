/// <reference path="jasmine.js" />
/// <reference path="../Libs/ext-all-debug.js" />
/// <reference path="../InterfaceManager.js" />

describe('Interfaces.', function () {
    Ext.defineInterface('IBase', {
        methods: ['baseMethod'],
    });
    Ext.defineInterface('IDerived', {
        inherit: 'IBase',
        methods: ['derivedMethod']
    });
    Ext.defineInterface('IFull', {
        inherit: 'IBase',
        methods: ['method'],
        events: ['event'],
        properties: ['property', { name: 'readOnlyProperty', readOnly: true }]
    });
    Ext.defineInterface('IAnotherBase', {
        methods: ['anotherBaseMethod']
    });
    Ext.defineInterface('IAnotherDerived', {
        inherit: ['IBase', 'IAnotherBase'],
        methods: ['anotherDerivedMethod']
    });
    describe('Definition.', function () {
        it('Interface cannot be inherited from not defined interface', function () {
            expect(function () {
                Ext.defineInterface('ITest', {
                    inherit: 'INotDefined',
                    methods: ['someMethod']
                });
            }).toThrow();
        });
    });

    describe('Implementation.', function () {
        it('Not full implementation should throw an exception', function () {
            expect(function () {
                Ext.define('CorrectImplementation1', {
                    implement: 'IBase',
                    baseMethod: function () { }
                });
            }).not.toThrow();

            expect(function () {
                Ext.define('CorrectImplementation2', {
                    implement: 'IFull',
                    baseMethod: function () { },
                    method: function () { },
                    onEvent: function () { },
                    unEvent: function () { },
                    getProperty: function () { },
                    setProperty: function () { },
                    getReadOnlyProperty: function () { }
                });
            }).not.toThrow();
            expect(function () {
                Ext.define('CorrectImplementation3', {
                    implement: 'IBase',
                    baseMethod: function () {
                        return true;
                    }
                });
            }).not.toThrow();
            expect(function () {
                Ext.define('NotFullImplementation', {
                    implement: ['IBase', 'IAnotherDerived'],
                    baseMethod: function () { },
                    anotherDerivedMethod: function () { }
                });
            }).toThrow();
        });

        it('Implementation of not defined interface should throw an exception', function () {
            expect(function () {
                Ext.define('NotDefinedImplementation', {
                    implement: 'INotDefined'
                });
            }).toThrow();
        });
    });

    describe('Basic methods.', function () {
        var baseClassInstance = new Ext.Base();
        it('Instance of any class should be equipped with "as" method', function () {
            expect(baseClassInstance.$as).toBeDefined();
        });
        it('Instance of any class should be equipped with "is" method', function () {
            expect(baseClassInstance.$is).toBeDefined();
        });
        it('Instance of any class should be equipped with "isInstance" method', function () {
            expect(baseClassInstance.$equals).toBeDefined();
        });
    });

    describe('Casting.', function () {
        Ext.define('SingleImplementation', {
            implement: 'IDerived',
            baseMethod: function () {
                return true;
            },
            derivedMethod: function () {
                return true;
            }
        });

        Ext.define('MultipleImplementation', {
            implement: ['IDerived', 'IAnotherDerived'],
            baseMethod: function () {
                return true;
            },
            derivedMethod: function () {
                return true;
            },
            anotherBaseMethod: function () {
                return true;
            },
            anotherDerivedMethod: function () {
                return true;
            }
        });

        it('Instance may be casted to any of interfaces it implements', function () {
            var instance = new MultipleImplementation();
            var derivedInterface = instance.$as('IDerived');
            expect(derivedInterface).not.toBeNull();
            var anotherInterface = instance.$as('IAnotherDerived');
            expect(anotherInterface).not.toBeNull();
        });

        it('Instance may be casted only to interfaces it implements', function () {
            var instance = new SingleImplementation();
            var derivedInterface = instance.$as('IAnotherDerived');
            expect(derivedInterface).toBeNull();
        });

        it('Interface reference may be casted to any of interfaces its instance implements', function () {
            var instance = new MultipleImplementation();
            var derivedInterface = instance.$as('IDerived');
            var anotherInterface = derivedInterface.$as('IAnotherDerived');
            expect(anotherInterface).not.toBeNull();
        });

        it('Interface reference may be casted to its instance', function () {
            var instance = new MultipleImplementation();
            var interfaceRef = instance.$as('IDerived');
            expect(interfaceRef.$as('MultipleImplementation')).toEqual(instance);
        });

        it('Instance can be checked if it implements some interface', function () {
            var instance = new SingleImplementation();
            expect(instance.$is('IDerived')).toBe(true);
            expect(instance.$is('IBase')).toBe(true);
            expect(instance.$is('IAnotherDerived')).toBe(false);
        });

        it('Interface reference can be checked if it obtained from instance of specific class', function () {
            var instance = new SingleImplementation();
            var interfaceRef = instance.$as('IDerived');
            expect(interfaceRef.$is('SingleImplementation')).toBe(true);
            expect(interfaceRef.$is(SingleImplementation)).toBe(true);
            expect(interfaceRef.$is('MultipleImplementation')).toBe(false);
            expect(interfaceRef.$is(MultipleImplementation)).toBe(false);
        });

        it('Interface reference can be checked if its instance implements some interface', function () {
            var instance = new SingleImplementation();
            var interfaceRef = instance.$as('IBase');
            expect(interfaceRef.$is('IDerived')).toBe(true);
            expect(interfaceRef.$is('IBase')).toBe(true);
            expect(interfaceRef.$is('IAnotherBase')).toBe(false);
        });

        it('Instance and interface references obtained from this instance may be compared against each other', function () {
            var instance1 = new SingleImplementation();
            var instance2 = new SingleImplementation();
            var instance1IDerivedRef = instance1.$as('IDerived');
            var instance1IBaseRef = instance1.$as('IBase');
            var instance2IBaseRef = instance2.$as('IBase');

            expect(instance1IDerivedRef.$equals(instance1IBaseRef)).toBe(true);
            expect(instance1IBaseRef.$equals(instance1IDerivedRef)).toBe(true);
            expect(instance1IDerivedRef.$equals(instance1)).toBe(true);
            expect(instance1.$equals(instance1IDerivedRef)).toBe(true);
            expect(instance2.$equals(instance1IDerivedRef)).toBe(false);
            expect(instance2IBaseRef.$equals(instance1)).toBe(false);
        });

    });

    describe('Member accessing.', function () {

        Ext.define('FullImplementation', {
            implement: 'IFull',
            baseMethod: function () { },
            method: function () { },
            onEvent: function () { },
            unEvent: function () { },
            getProperty: function () { return this.property; },
            setProperty: function (value) { this.property = value; },
            getReadOnlyProperty: function () { }
        });

        it('Interface reference has methods, properties and events specified in interface and its parents', function () {
            var instance = new FullImplementation();
            var fullInterface = instance.$as('IFull');
            expect(fullInterface.baseMethod).toBeDefined();
            expect(fullInterface.method).toBeDefined();
            expect(fullInterface.onEvent).toBeDefined();
            expect(fullInterface.unEvent).toBeDefined();
            expect(fullInterface.property).toBeDefined();
            expect(fullInterface.readOnlyProperty).toBeDefined();
        });

        it('Property is a method which calls getter if called without parameters or setter if called with parameter', function () {
            var instance = new FullImplementation();
            var fullInterface = instance.$as('IFull');
            fullInterface.property(2);
            expect(fullInterface.property()).toBe(2);
        });

        it('Interface properties may be defined only with getter', function () {
            Ext.defineInterface('IProperties', {
                properties: [
                    { name: 'readOnlyProperty', readOnly: true }
                ]
            });

            Ext.define('PropertiesImplementation', {
                implement: 'IProperties',
                getReadOnlyProperty: function () { return this.property; },
                setReadOnlyProperty: function (value) { this.property = value; }
            });
            var instance = new PropertiesImplementation();
            var propertiesInterface = instance.$as('IProperties');
            instance.setReadOnlyProperty(4);
            expect(propertiesInterface.readOnlyProperty()).toBe(4);
            expect(function () { propertiesInterface.readOnlyProperty(5); }).toThrow();
        });

        it('Property setter cannot be called with more than one parameter', function () {
            var instance = new FullImplementation();
            var fullInterface = instance.$as('IFull');
            expect(function () { fullInterface.property(1, 2); }).toThrow();
        });

        it('Interface reference has only methods specified in interface definition hierarchy', function () {
            var instance = new FullImplementation();
            var fullInterface = instance.$as('IFull');
            expect(fullInterface.baseMethod).toBeDefined();
            expect(fullInterface.method).toBeDefined();
            expect(fullInterface.derivedMethod).not.toBeDefined();

            var iBaseRef = instance.$as('IBase');
            expect(iBaseRef.baseMethod).toBeDefined();
            expect(iBaseRef.anotherBaseMethod).not.toBeDefined();
            expect(iBaseRef.method).not.toBeDefined();
        });
    });
});