import { test } from '@jest/globals'
import { expect } from '@jest/globals'
import { compileVueScript } from '../../utils/script'
function testTemplate(options) {
  return `export default {
    data: () => (${options.data || '{}'}),
    computed: ${options.computed || '{}'},
    methods: ${options.methods || '{}'},
  }`
}
function outputTestTemplate(options) {
  return `Component({
  data: ${options.data || '{}'},
  methods: ${options.methods || '{}'},
  lifetimes: {
    async attached() {${options.computedMethod}}
  }
});`
}
test('computed的return应该被转换为setData', () => {
  expect(compileVueScript(testTemplate({
    computed: `{ name() { if(a) return b; if (b) return c; return d } }`
  }))).toBe(outputTestTemplate({
    data: `{
    name: null
  }`,
    methods: `{
    __computed__name() {
      if (a) return this.setData({
        name: b
      });
      if (b) return this.setData({
        name: c
      });
      return this.setData({
        name: d
      });
    }
  }`,
  computedMethod: `
      this.__computed__name();
    `
  }))
})
test('computed的定义的函数的return不应该被转换为setData', () => {
  expect(compileVueScript(testTemplate({
    computed: `{ name() { if(a) return b; if (b) return c; const fn = () => { return e }; function fn2() { return e } const fn3 = function() {return e}; return d } }`
  }))).toBe(outputTestTemplate({
    data: `{
    name: null
  }`,
    methods: `{
    __computed__name() {
      if (a) return this.setData({
        name: b
      });
      if (b) return this.setData({
        name: c
      });
      const fn = () => {
        return e;
      };
      function fn2() {
        return e;
      }
      const fn3 = function () {
        return e;
      };
      return this.setData({
        name: d
      });
    }
  }`,
  computedMethod: `
      this.__computed__name();
    `
  }))
})