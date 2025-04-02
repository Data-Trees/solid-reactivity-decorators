import { effect, getter, type IReactive, memo, reactive, signal } from './main';

const countWatch = vi.fn();
const count2Watch = vi.fn();
const destroyWatch = vi.fn();
const destroyWatch2 = vi.fn();
const count3Watch = vi.fn();
const count4Watch = vi.fn();

@reactive
class Example implements IReactive {
  declare destroy: () => void;

  @signal count: number = 0;

  @memo()
  getCount() {
    count2Watch();
    return this.count;
  }

  @getter()
  get count2() {
    count3Watch();
    return this.count;
  }

  setCount(value: number) {
    this.count = value;
  }

  @effect
  watchCount() {
    countWatch(this.getCount());
  }

  increment() {
    this.setCount(this.getCount() + 1);
    this.watchCount();
  }

  onDestroy() {
    destroyWatch();
  }
}

class ExtendedExample extends Example {
  @memo()
  getCount2() {
    return this.count;
  }

  @memo({ isLazy: true })
  getCount3() {
    count3Watch();
    return this.count;
  }

  @getter({ isLazy: true })
  get count4() {
    count4Watch();
    return this.count;
  }

  onDestroy() {
    super.onDestroy();
    destroyWatch2();
  }
}

describe('decorators', () => {
  beforeEach(() => {
    destroyWatch.mockClear();
    destroyWatch2.mockClear();
    countWatch.mockClear();
    count2Watch.mockClear();
    count3Watch.mockClear();
    count4Watch.mockClear();
  });

  it('should not throw errors', async () => {
    const example = new Example();

    await Promise.resolve();

    expect(example.getCount()).toBe(0);
    expect(countWatch).toHaveBeenCalledTimes(1);
    expect(countWatch).toHaveBeenCalledWith(0);

    example.setCount(5); // Triggers effect

    await Promise.resolve();

    expect(countWatch).toHaveBeenCalledTimes(2);
    expect(countWatch).toHaveBeenCalledWith(5);

    example.destroy();

    await Promise.resolve();
    expect(example.count).toBe(5);
    expect(example.getCount()).toBe(5);
    expect(example.count2).toBe(5);
    expect(destroyWatch).toHaveBeenCalledTimes(1);
  });

  it('supports extending classes', async () => {
    const instance = new ExtendedExample();
    expect(instance.getCount2()).toBe(0);
    expect(countWatch).toHaveBeenCalledTimes(1);
    instance.setCount(4);
    expect(instance.getCount2()).toBe(4);
    instance.destroy();
    expect(destroyWatch2).toHaveBeenCalledTimes(1);
    expect(destroyWatch).toHaveBeenCalledTimes(1);
  });

  it('supports non-lazy memos', async () => {
    const instance = new Example();
    expect(count2Watch).toHaveBeenCalledTimes(1);
    instance.setCount(5);
    expect(count2Watch).toHaveBeenCalledTimes(2);
  });

  it('supports lazy memos', async () => {
    const instance = new ExtendedExample();
    instance.setCount(5);
    expect(count3Watch).toHaveBeenCalledTimes(0);
    expect(instance.getCount3()).toBe(5);
    expect(count3Watch).toHaveBeenCalledTimes(1);
  });

  it('supports non-lazy getters', async () => {
    const instance = new Example();
    expect(count2Watch).toHaveBeenCalledTimes(1);
    instance.setCount(5);
    expect(count2Watch).toHaveBeenCalledTimes(2);
  });

  it('supports lazy getters', async () => {
    const instance = new ExtendedExample();
    instance.setCount(5);
    expect(count4Watch).toHaveBeenCalledTimes(0);
    expect(instance.count4).toBe(5);
    expect(count4Watch).toHaveBeenCalledTimes(1);
  });
});
