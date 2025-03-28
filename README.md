# Solid Reactivity Decorators
A collection of decorators to make your classes reactive, using SolidJS.


## Why?
* Core to reactive applications is the ability to react to changes in dependencies.
* When building a reactive application that is not a web application, there aren't many options for libraries.
* This library provides a decorator interface for creating reactive classes, and keeps the code clean and readable.

## Installation

NOTE: solid-js@1.x is a peer dependency.
```bash
npm install solid-reactivity-decorators solid-js
```

## Usage

```ts
import { createSignal } from 'solid-js';
import { reactive, effect, memo, getter } from 'solid-reactivity-decorators';

@reactive
class MyClass implements Reactive {
  declare destroy: () => void;
  nameSignal = createSignal('Dan');
  
  @effect
  doStuff() {
    console.log('Doing stuff', this.name);
  }

  @memo({ isLazy: true })
  getName() {
    console.log('lazy memo', this.name);
    return this.nameSignal[0]();
  }

  @memo({ isLazy: false })
  getName2() {
    console.log('non-lazy memo', this.name);
    return this.nameSignal[0]();
  }

  @getter({ isLazy: false })
  get name() {
    console.log('getter is', this.nameSignal[0]());
    return this.nameSignal[0]();
  }
  
  set name(value: string) {
    this.nameSignal[1](value);
  }
}

const myClass = new MyClass();
// getter is Dan
// Doing stuff Dan
// non-lazy memo Dan
myClass.name = 'Daniel';
// getter is Dan
// 'Doing stuff', Daniel
// non-lazy memo Daniel
myClass.getName();
// lazy memo Daniel
```

## API

### `@reactive`
This decorator is required on a class that uses the other decorators.
* Creates a SolidJS root
* Handles the `onDestroy` lifecycle method
* Tracks the effects created in the class
* Class will throw if it is not decorated with this decorator

### `@effect`
* Creates a SolidJS effect
* Will be run when any of the signals used in the method are updated

### `@memo({ isLazy?: boolean = false } = { isLazy: false })`
* Creates a SolidJS memo
* Will be run when any of the signals used in the method are updated
* Can be configured to be lazy with the `isLazy` option, so that it only runs when called directly, and not every time dependencies are updated.

### `@getter({ isLazy?: boolean = false } = { isLazy: false })`
* Same as `memo` but used for getters