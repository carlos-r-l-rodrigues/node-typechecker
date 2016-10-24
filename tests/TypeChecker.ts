import {expect} from 'chai';
import {validate, PropertyCheck, TypesCheck, TypeCheck} from '../lib/TypeChecker';

class Bar {
    @PropertyCheck()
    public description: string;
    @PropertyCheck({type: {}}) // Invalid type, validation will be skipped for this property
    public description2: string;
    @PropertyCheck({arrayType: {}}) // Invalid array type, items type validation will be disabled
    public description3: string[];
}

class Foo {
    @PropertyCheck()
    public name: string;
    @PropertyCheck({required: false})
    public age: Number;
    @PropertyCheck({type: Array, arrayType: String, nullable: true})
    public hobbies: string[];
    @PropertyCheck()
    public bar: Bar;
}

class Test {
    @TypesCheck
    public static test(input: number): number {
        return input;
    }
    @TypesCheck
    public static test2(input: number, @TypeCheck(Foo) foo: Foo, @TypeCheck(String) whatever: string): number {
        return input;
    }
}

let error: string = null;
describe('TypeChecker', () => {
    it('TypeChecker::validate Basic types', () => {
        // Validation ok
        validate('foo', String);

        // Failed validation: string !== number
        try {
            validate('foo', Number);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('Expecting number, received string "foo"');

        // Validation ok: anything matches object
        validate('foo', Object);

        // Validation skipped with no error: invalid expected type
        validate('foo', {});
    });

    it('TypeChecker::validate Array', () => {
        // Failed validation: number !== array
        try {
            validate(3, Array);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('Expecting array, received number 3');

        // Validation ok
        validate(['foo'], Array);

        // Failed validation: array items (string) don't match expected type (number)
        try {
            validate(['foo'], Array, Number);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('Expecting number, received string "foo"');
    });

    it('TypeChecker::validate Nested objects', () => {
        // Failed validation: missing required field
        const foo = new Foo();
        try {
            validate(foo, Foo);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('name: Field is required');

        // Failed validation: Invalid array items (number) while expecting string
        foo.name = 'Name';
        foo.hobbies = <any> [3, 4];
        try {
            validate(foo, Foo);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('hobbies: Expecting string, received number 3');

        // Failed validation: Non nullable property
        foo.hobbies = null;
        foo.bar = null;
        try {
            validate(foo, Foo);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('bar: Field can\'t be null');

        // Failed validation: missing required field on nested object
        const bar = new Bar();
        bar.description = 'Description';
        bar.description2 = <any> 3;
        foo.bar = bar;
        try {
            validate(foo, Foo);
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('bar -> description3: Field is required'); // Description2 validation is ignored

        // Validation ok: description3 array type is ignored
        bar.description3 = <any> [3, 4];
        validate(foo, Foo);
    });

    it('TypeChecker::TypesCheck', () => {
        // No validation called
        Test.test(5);

        // Validation called automatically thanks to decorators
        try {
            Test.test2(5, null, 'foo');
        } catch (e) {
            error = e.message;
        }
        expect(error).to.equal('name: Field is required');
    });
});