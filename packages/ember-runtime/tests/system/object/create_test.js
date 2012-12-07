/*globals TestObject:true */

module('Ember.Object.createWithMixins');

test("Creates a new object that contains passed properties", function() {

  var called = false;
  var obj = Ember.Object.createWithMixins({
    prop: 'FOO',
    method: function() { called=true; }
  });

  //console.log(Ct.dump(obj));
  equal(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
  obj.method();
  ok(called, 'method executed');

});

// ..........................................................
// WORKING WITH MIXINS
//

test("Creates a new object that includes mixins and properties", function() {

  var MixinA = Ember.Mixin.create({ mixinA: 'A' });
  var obj = Ember.Object.createWithMixins(MixinA, { prop: 'FOO' });

  equal(Ember.get(obj, 'mixinA'), 'A', 'obj.mixinA');
  equal(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
});

// ..........................................................
// LIFECYCLE
//

test("Configures _super() on methods with override", function() {
  var completed = false;
  var MixinA = Ember.Mixin.create({ method: function() {} });
  var obj = Ember.Object.createWithMixins(MixinA, {
    method: function() {
      this._super();
      completed = true;
    }
  });

  obj.method();
  ok(completed, 'should have run method without error');
});

test("Calls init if defined", function() {
  var completed = false;
  var obj = Ember.Object.createWithMixins({
    init: function() {
      this._super();
      completed = true;
    }
  });

  ok(completed, 'should have run init without error');
});

test("Calls all mixin inits if defined", function() {
  var completed = 0;
  var Mixin1 = Ember.Mixin.create({
    init: function() { this._super(); completed++; }
  });

  var Mixin2 = Ember.Mixin.create({
    init: function() { this._super(); completed++; }
  });

  Ember.Object.createWithMixins(Mixin1, Mixin2);
  equal(completed, 2, 'should have called init for both mixins.');
});

test('creating an object with required properties', function() {
  var ClassA = Ember.Object.extend({
    foo: Ember.required()
  });

  var obj = ClassA.createWithMixins({ foo: 'FOO' }); // should not throw
  equal(Ember.get(obj,'foo'), 'FOO');
});


// ..........................................................
// BUGS
//

test('create should not break observed values', function() {

  var CountObject = Ember.Object.extend({
    value: null,

    _count: 0,

    reset: function() {
      this._count = 0;
      return this;
    },

    valueDidChange: Ember.observer(function() {
      this._count++;
    }, 'value')
  });

  var obj = CountObject.createWithMixins({ value: 'foo' });
  equal(obj._count, 0, 'should not fire yet');

  Ember.set(obj, 'value', 'BAR');
  equal(obj._count, 1, 'should fire');
});

test('bindings on a class should only sync on instances', function() {
  TestObject = Ember.Object.createWithMixins({
    foo: 'FOO'
  });

  var Class, inst;

  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });

    inst = Class.createWithMixins();
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding');
  equal(Ember.get(inst, 'foo'), 'FOO', 'should sync binding');

});


test('inherited bindings should only sync on instances', function() {
  TestObject = Ember.Object.createWithMixins({
    foo: 'FOO'
  });

  var Class, Subclass, inst;

  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });
  });

  Ember.run(function() {
    Subclass = Class.extend();
    inst = Subclass.createWithMixins();
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(Ember.get(inst, 'foo'), 'FOO', 'should sync binding on inst');

  Ember.run(function() {
    Ember.set(TestObject, 'foo', 'BAR');
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(Ember.get(inst, 'foo'), 'BAR', 'should sync binding on inst');

});

test("created objects should not share a guid with their superclass", function() {
  ok(Ember.guidFor(Ember.Object), "Ember.Object has a guid");

  var objA = Ember.Object.createWithMixins(),
      objB = Ember.Object.createWithMixins();

  ok(Ember.guidFor(objA) !== Ember.guidFor(objB), "two instances do not share a guid");
});

module('Ember.Object.fastCreate');

test("simple properties are set", function() {
  var o = Ember.Object.fastCreate({ohai: 'there'});
  equal(o.get('ohai'), 'there');
});

test("calls computed property setters", function() {
  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function(key, val) {
      if (arguments.length === 2) { return val; }
      return "this is not the value you're looking for";
    })
  });

  var o = MyClass.fastCreate({foo: 'bar'});
  equal(o.get('foo'), 'bar');
});

test("sets up mandatory setters for watched simple properties", function() {
  var MyClass = Ember.Object.extend({
    foo: null,
    bar: null,
    fooDidChange: Ember.observer(function() {}, 'foo')
  });

  var o = MyClass.fastCreate({foo: 'bar', bar: 'baz'});
  equal(o.get('foo'), 'bar');

  var descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
  ok(descriptor.set, 'Mandatory setter was setup');

  descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
  ok(!descriptor.set, 'Mandatory setter was not setup');
});

test("calls setUnknownProperty if defined", function() {
  var setUnknownPropertyCalled = false;

  var MyClass = Ember.Object.extend({
    setUnknownProperty: function(key, value) {
      setUnknownPropertyCalled = true;
    }
  });

  var o = MyClass.fastCreate({foo: 'bar'});
  ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});
