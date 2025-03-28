import { createEffect, createMemo, createRoot } from 'solid-js';
import { createLazyMemo } from '@solid-primitives/memo';

export const DISPOSE = '__dispose__';
export const EFFECTS_MAP = '__effects_map__';
export const EFFECT_METHODS = '__effect_methods__';

export interface IReactive {
  [DISPOSE]?: () => void;
  [EFFECTS_MAP]?: Map<string, () => void>;
  [EFFECT_METHODS]?: Set<string>;
  destroy: () => void;
  onDestroy?: () => void;
}

interface WithEffectMethods {
  [EFFECT_METHODS]?: Set<string>;
}

type Constructor<T = object> = new (...args: any[]) => T;

// Store effect methods at the class level
function registerEffect(target: any, propertyKey: string) {
  if (!target.constructor[EFFECT_METHODS]) {
    target.constructor[EFFECT_METHODS] = new Set<string>();
  }
  target.constructor[EFFECT_METHODS].add(propertyKey);
}

// Effect decorator
export function effect(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  // Register this method as an effect
  registerEffect(target, propertyKey);

  descriptor.value = function (this: IReactive, ...args: any[]) {
    if (!this[DISPOSE]) {
      throw new Error('Class must be decorated with @reactive to use @effect');
    }

    // Initialize effects map if it doesn't exist
    if (!this[EFFECTS_MAP]) {
      this[EFFECTS_MAP] = new Map<string, () => void>();
    }

    // Clean up previous effect if it exists
    const cleanup = this[EFFECTS_MAP].get(propertyKey);
    if (cleanup) {
      cleanup();
      this[EFFECTS_MAP].delete(propertyKey);
    }

    // Create new effect
    createRoot((dispose) => {
      createEffect(() => {
        originalMethod.apply(this, args);
      });

      // Store dispose function for cleanup
      this[EFFECTS_MAP]?.set(propertyKey, dispose);
      return dispose;
    });
  };

  return descriptor;
}

// Memo decorator
export function memo(options?: { isLazy: boolean }) {
  return function memoInternal(
    _: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const memoKey = Symbol(`memo_${propertyKey}`);
    const memoFn = options?.isLazy ? createLazyMemo : createMemo;

    descriptor.value = function (this: IReactive, ...args: any[]) {
      if (!this[DISPOSE]) {
        throw new Error('Class must be decorated with @reactive to use @memo');
      }

      // Initialize memo if not already created
      if (!(this as any)[memoKey]) {
        createRoot((dispose) => {
          (this as any)[memoKey] = memoFn(() =>
            originalMethod.apply(this, args)
          );

          // Store dispose function
          if (!this[EFFECTS_MAP]) {
            this[EFFECTS_MAP] = new Map<string, () => void>();
          }
          this[EFFECTS_MAP].set(propertyKey, dispose);

          return dispose;
        });
      }

      return (this as any)[memoKey]();
    };

    return descriptor;
  };
}

// Root decorator
export function reactive<T extends Constructor>(Base: T & WithEffectMethods) {
  return class extends Base implements IReactive {
    declare [DISPOSE]?: () => void;
    declare [EFFECTS_MAP]?: Map<string, () => void>;
    declare destroy: () => void;
    declare onDestroy?: () => void;

    constructor(...args: any[]) {
      super(...args);

      // Create root and store dispose function
      this[DISPOSE] = createRoot((dispose) => {
        return dispose;
      });

      // Initialize effects map
      this[EFFECTS_MAP] = new Map<string, () => void>();

      // Auto-run all effects
      const effectMethods = (Base[EFFECT_METHODS] as Set<string>) || new Set();
      for (const methodName of effectMethods) {
        if (typeof this[methodName as keyof this] === 'function') {
          (this[methodName as keyof this] as () => void).call(this);
        }
      }

      // Add or wrap destroy method
      this.destroy = function () {
        // Clean up all effects and memos
        if (this[EFFECTS_MAP]) {
          for (const cleanup of this[EFFECTS_MAP].values()) {
            cleanup();
          }
          this[EFFECTS_MAP].clear();
        }

        // Call root dispose
        if (this[DISPOSE]) {
          this[DISPOSE]();
        }

        // Call onDestroy if it exists
        this.onDestroy?.call(this);
      };
    }
  };
}

export function getter(options?: { isLazy: boolean }) {
  return function getterInternal(
    _: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalGet = descriptor.get;
    const memoKey = Symbol(`memo_${propertyKey}`);
    const memoFn = options?.isLazy ? createLazyMemo : createMemo;

    if (!originalGet) {
      throw new Error('@memoGetter can only be applied to getter properties.');
    }
    descriptor.get = function (this: IReactive) {
      if (!this[DISPOSE]) {
        throw new Error(
          'Class must be decorated with @reactive to use @memoGetter'
        );
      }

      // Initialize memo if not already created
      if (!(this as any)[memoKey]) {
        createRoot((dispose) => {
          (this as any)[memoKey] = memoFn(() => originalGet.call(this));

          // Initialize effects map if it doesn't exist
          if (!this[EFFECTS_MAP]) {
            this[EFFECTS_MAP] = new Map<string, () => void>();
          }

          // Store dispose function for cleanup
          this[EFFECTS_MAP].set(propertyKey, dispose);

          return dispose;
        });
      }

      // Return the memoized value
      return (this as any)[memoKey]();
    };

    return descriptor;
  };
}
