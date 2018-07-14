const expect = require('chai').expect;
const tokens = require('../../../lib/dsl/lexer').tokens;
const getSyntacticAutoCompleteSuggestions = require('../../../lib/dsl/api').getSyntacticAutoCompleteSuggestions;
const parse = require('../../../lib/dsl/api').parse;

describe('JDL DSL API', () => {
  context('when wanting an AST', () => {
    context('with a valid input', () => {
      let ast;

      before(() => {
        ast = parse('@service(serviceClass) entity A {field String}');
      });

      it('returns an AST', () => {
        expect(ast.entities).to.have.lengthOf(1);
        expect(ast.entities[0]).to.deep.eql({
          name: 'A',
          tableName: 'A',
          annotations: [{ option: 'service', method: 'serviceClass', type: 'BINARY' }],
          body: [
            {
              name: 'field',
              type: 'String',
              validations: [],
              javadoc: null
            }
          ],
          javadoc: null
        });
      });
    });

    context('with a lexing error', () => {
      let parseInvalidToken;

      before(() => {
        parseInvalidToken = () => parse('entity ± {');
      });

      it('throws an error with the offset information', () => {
        expect(parseInvalidToken).to.throw('offset: 7');
      });

      it('throws an error with the unexpected character', () => {
        expect(parseInvalidToken).to.throw('±');
      });
    });

    context('with a parsing error', () => {
      context('with an unexpected token', () => {
        let parseWrongClosingBraces;

        before(() => {
          parseWrongClosingBraces = () => parse('entity Person { ]');
        });

        it('throws an error with position information', () => {
          expect(parseWrongClosingBraces).to
            .throw()
            .and.to.have.property('message')
            .that.includes('line: 1')
            .that.includes('column: 17');
        });

        it('throws an error with typeof MismatchTokenException', () => {
          expect(parseWrongClosingBraces).to.throw('MismatchedTokenException');
        });
      });

      context('with a missing token at EOF', () => {
        let parseMissingClosingBraces;

        before(() => {
          parseMissingClosingBraces = () => parse('entity Person {');
        });

        it('throws an error with typeof MismatchTokenException', () => {
          expect(parseMissingClosingBraces).to.throw('MismatchedTokenException');
        });

        it('throws an error without any location information', () => {
          // The 'EOF' token that is found instead of the expected '}' is a virtual token
          // It has no location information to report, An error (api.js) handler may choose
          // to manually add the last line/column in that case.
          expect(parseMissingClosingBraces).to.not.throw('line: 1');
        });
      });
    });

    context('with a semantic validation error', () => {
      it('throws an error', () => {
        // lower case entityName first char
        const invalidInput = 'entity person { }';
        expect(() => parse(invalidInput)).to.throw(/.+\/\^\[A-Z][^]+line: 1.+column: 8/);
      });
    });
  });

  context('when wanting an auto-completion', () => {
    context('with an empty text', () => {
      let result;

      before(() => {
        result = getSyntacticAutoCompleteSuggestions('');
      });

      it('provides suggestions', () => {
        expect(result).to.have.lengthOf(18);
        expect(result).to.have.members([
          tokens.AT,
          tokens.APPLICATION,
          tokens.NAME,
          tokens.ENTITY,
          tokens.RELATIONSHIP,
          tokens.ENUM,
          tokens.DTO,
          tokens.SERVICE,
          tokens.SEARCH,
          tokens.MICROSERVICE,
          tokens.COMMENT,
          tokens.PAGINATE,
          tokens.SKIP_CLIENT,
          tokens.SKIP_SERVER,
          tokens.NO_FLUENT_METHOD,
          tokens.ANGULAR_SUFFIX,
          tokens.FILTER,
          tokens.CLIENT_ROOT_FOLDER
        ]);
      });
    });
    context('with a custom start rule', () => {
      let result;

      before(() => {
        const input = 'lastName string ';
        result = getSyntacticAutoCompleteSuggestions(
          input,
          'fieldDeclaration'
        );
      });

      it('provides suggestions', () => {
        expect(result).to.have.lengthOf(4);
        // Note that because we are using token Inheritance with the MIN_MAX_KEYWORD an auto-complete provider would have
        // to translate this to concrete tokens (MIN/MAX/MAX_BYTES/MIN_BYTES/...)
        expect(result).to.have.members([
          tokens.REQUIRED,
          tokens.MIN_MAX_KEYWORD,
          tokens.PATTERN,
          tokens.COMMENT
        ]);
      });
    });
    context('with a default start rule', () => {
      let result;

      before(() => {
        const input = 'entity person { lastName string ';
        result = getSyntacticAutoCompleteSuggestions(input);
      });

      it('provides suggestions', () => {
        expect(result).to.have.lengthOf(7);
        expect(result).to.have.members([
          tokens.REQUIRED,
          tokens.MIN_MAX_KEYWORD,
          tokens.PATTERN,
          // Note that this will have more suggestions than the previous spec as there is a deeper rule stack.
          tokens.COMMA,
          tokens.RCURLY,
          tokens.COMMENT,
          tokens.NAME
        ]);
      });
    });
  });
});
