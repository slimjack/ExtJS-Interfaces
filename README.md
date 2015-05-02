![](/icon.png)ExtJS-Interfaces
================

Introduces the concept of interfaces into ExtJs.
Extension consists of 2 parts:
- Interface Manager - the core
- Interface Injector - utilizes Deft.Injector for interface injection

Tested with ExtJS 5.0.1 and DeftJS5

#Dependencies
**ExtJS-Interfaces** depends on [**ExtJS-Utils**](https://github.com/slimjack/ExtJS-Utils)

##Interface Manager
**Ext.InterfaceManager** provides functionality for registering of interfaces and defining their implementations. It also extends Ext.Base class with methods to work with interfaces.

###Interface definition

To define interface use **Ext.defineInterface**:
```js
Ext.defineInterface('IBase', {
    methods: ['method1', 'method2']
});
```

To derive interface specify parents in **inherit** config:
```js
Ext.defineInterface('IBase2', {
    methods: 'method3'
});
Ext.defineInterface('IDerived', {
    inherit: ['IBase', 'IBase2'],
    methods: 'derivedMethod'
});
Ext.defineInterface('IDerived2', {
    inherit: 'IBase',
    methods: 'derivedMethod2'
});
```

Interfaces also support definition of events and properties:
```js
Ext.defineInterface('IEventsProperties', {
    events: ['myEvent'],
    properties: [
        'myProperty',
        { name: 'readOnlyProperty', readOnly: true }
    ]
});
```
If interface definition has event named *myEvent*, then this event will be presented in interface with two methods: *onMyEvent* and *unMyEvent*. These methods have almost the same signature as methods *on* and *un* of Ext.util.Observable with the difference that they don't accept event name.

If interface definition has property named *myProperty*, then this property will be presented in interface with method *myProperty*. If interface property is called with no parameters, it works like a getter. If it is called with one parameter, it works like a setter. **readOnly** properties can be called only as getter.

###Interface implementation

To specify that class implements interface use **implement** config in class definition:
```js
Ext.define('BaseImplementation', {
    implement: 'IBase',
    method1: function () {
        console.log('method1');
    },
    method2: function () {
        console.log('method2');
    }
});
Ext.define('MultiImplementation', {
    implement: ['IBase', 'IDerived'],
    method1: function () {
        console.log('method1');
    },
    method2: function () {
        console.log('method2');
    },
    method3: function () {
        console.log('method3');
    },
    derivedMethod: function () {
        console.log('derivedMethod');
    }
});
```
If class doesn't implement all methods of all specified interfaces, an exception will be thrown.

If interface is defined with events, then implementation must have an appropriate *on...* and *un...* methods. If interface is defined with properties, then implementation must have an appropriate *get...* and *set...* methods.
```js
Ext.define('EventsProperties', {
    implement: 'IEventsProperties',
    mixins: {
        observable: 'Ext.util.Observable'
    },

    constructor: function () {
        this.mixins.observable.constructor.call(this);
        this.myProperty = null;
        this.readOnlyProperty = null;
    },

    onMyEvent: function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('myEvent');
        this.on.apply(this, args);
    },

    unMyEvent: function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('myEvent');
        this.un.apply(this, args);
    },

    getMyProperty: function () {
        return this.myProperty;
    },

    setMyProperty: function (value) {
        this.myProperty = value;
    },

    getReadOnlyProperty: function () {
        return this.readOnlyProperty;
    }
});
```

###In action

All interfaces and classes  have 3 methods: **$as**, **$is** and **$equals**. **$** is used to avoid conflicts with existing methods.

Casting class instance to interface:
```js
var classInstance = new MultiImplementation();
var baseInterface = classInstance.$as('IBase');
//baseInterface has only 2 methods 'method1' and 'method2'
baseInterface.method1();
baseInterface.method3();//exception: undefined is not a function
```

Casting interface to another interface:
```js
var base2Interface = baseInterface.$as('IBase2');
base2Interface.method3();
var derived2Interface = baseInterface.$as('IDerived2');
//derived2Interface will be null because MultiImplementation class doesn't implement IDerived2
```

Casting interface to class instance:
```js
//class may be specified as constructor or as string 'MultiImplementation'
var anotherClassInstanceReference = base2Interface.$as(MultiImplementation);
anotherClassInstanceReference === classInstance;//true
```

To check if interface or class instance can be casted to some interface or class use **$is** method:
```js
classInstance.$is('IBase');//true
classInstance.$is('IDerived2');//false
base2Interface.$is('IDerived');//true
base2Interface.$is('MultiImplementation');//true
base2Interface.$is('IDerived2');//false
```

To compare interface references or class instance references use **$equals** method:
```js
var anotherClassInstance = new MultiImplementation();
var anotherBaseInterface = anotherClassInstance.$as('IBase');

classInstance.$equals(base2Interface);//true
classInstance.$equals(baseInterface);//true
classInstance.$equals(anotherBaseInterface);//false
baseInterface.$equals(classInstance);//true
baseInterface.$equals(base2Interface);//true
baseInterface.$equals(anotherBaseInterface);//false
baseInterface.$equals(anotherClassInstance);//false
```
Equality means that compared interfaces belong to the same class instance

##Interface Injector
**Ext.InterfaceInjector** extends DeftJs injection system with ability to inject interface instances. It defines 2 interfaces: **IDependency** and **ISingleton** (derived from **IDependency**).

To define injectable interface it must be derived from IDependency or ISingleton:
```js
Ext.defineInterface('IBase', {
    inherit: 'IDependency',
    methods: ['method1', 'method2']
});
Ext.defineInterface('IDerived', {
    inherit: 'IBase',
    methods: 'derivedMethod'
});
Ext.define('BaseImplementation', {
    implement: 'IBase',
    method1: function () {
        console.log('method1');
    },
    method2: function () {
        console.log('method2');
    }
});
Ext.define('DerivedImplementation', {
    implement: 'IDerived',
    method1: function () {
        console.log('method1 in DerivedImplementation');
    },
    method2: function () {
        console.log('method2 in DerivedImplementation');
    },
    derivedMethod: function () {
        console.log('derivedMethod');
    }
});
```

To inject interface implementation use **inject** config:
```js
Ext.define('SingleInjectionTest', {
    inject: {
        derivedInstance: 'IDerived'
    },
    test: function () {
        this.derivedInstance.derivedMethod();
    }
});
var instance = new SingleInjectionTest();
instance.test();//will print 'derivedMethod' in console
```

To inject all implementations of some interface specify '**[]**':
```js
Ext.define('MultiInjectionTest', {
    inject: {
        baseInstances: 'IBase[]'
    },
    test: function () {
        Ext.Array.each(this.baseInstances, function (instance) {
            instance.method1();
        });
    }
});
var instance = new MultiInjectionTest();
instance.test();
//console:
//method1
//method1 in DerivedImplementation
```

To define a singleton with injected interfaces use **deferredSingleton** config instead of **singleton**:
```js
Ext.define('SingletonWithInjectionTest', {
    deferredSingleton: true,
    inject: {
        derivedInstance: 'IDerived'
    },
    test: function () {
        this.derivedInstance.derivedMethod();
    }
});
```
Deferred singleton is instantiated only when all scripts are loaded.

To suppress implementation use **suppress** config in class definition:
```js
Ext.defineInterface('ILogger', {
    inherit: 'ISingleton',
    methods: 'log'
});
Ext.define('DefaultLogger', {
    implement: 'ILogger',
    log: function (msg) {
        alert(msg);
    }
});
Ext.define('LoggerTest', {
    test: function () {
        Deft.Injector.resolve('ILogger').log('test');
    }
});
var instance = new SingleInjectionTest();
instance.test();//will show alert window
Ext.define('ConsoleLogger', {
    implement: 'ILogger',
    suppress: 'DefaultLogger',
    log: function (msg) {
        console.log(msg);
    }
});
instance.test();//will print 'test' to console
```
