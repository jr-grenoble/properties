/**
 * Tags.ts
 *
 * Author: Jean-René Bouvier.
 *
 * Copyright (c) Jean-René Bouvier, from 2021 on.
 *
 * The author hereby grants Facts Haven SAS and its affiliates the right to use and perform any derivative works
 *
 * This is a library module that provides various tag functions to modify template literals.
 *
 * - Refer to [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
 *
 * - Refer also to the much more complete [common-tags](https://github.com/zspecza/common-tags) package.
 *
 *
 * Tag functions take one mandatory parameter, a `templateｰstrings` array of string literals, and optional printable values.
 * By default (cf. the `identity` tag), the template string is rendederd by interleaving the printable values between the template
 *  string literals. Hence, a proper call to a tag function must pass one more string literal than there are values.
 *
 * @module Tags is a collection of chainable tags for template string literals
 */

/**
 * @todo
 * Google Apps Script does not support modules, hence we use namespaces.
 * When GAS supports modules, we must replace them by corresponding import statements.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Tags {
  /**
   * The `templateｰstrings` type is basically an array of readonly strings augmented with a raw property that stores
   * the same string literals unprocessed for escape sequence.
   */
  interface templateｰstrings extends ReadonlyArray<string> {
    raw: readonly string[]; // actually this is already in the TemplateStringsArray, we put it here for documentation
  } // alias for template string arrays
  /**
   * Tag functions must be passed printable expressions for substitution parameters
   */
  export interface printableｰvalue {
    toString(): string;
  }
  /**
   * With the above definitions, a basic tag function conforms to this type.
   */
  interface tagｰfunction {
    (strings: templateｰstrings, ...values: printableｰvalue[]): string;
  }
  /**
   * We extend tag functions so that they can be chained and also so that you can call them on regular strings.
   */
  export interface chainableｰtagｰfunction extends tagｰfunction {
    (tag: tagｰfunction): chainableｰtagｰfunction;
    (stringｰliteral: string): string;
  }
  /**
   * Split text into lines, removing trailing white space and double blank lines
   *
   * @param text - the original text
   * @returns an array of lines without trailing whitespace
   */
  const textｰlines = (text: string): string[] =>
    text
      // split into lines
      .split("\n")
      // trim lines at end
      .map((line) => line.replace(/\s*$/, ""))
      // fold multiple spaces
      .map((line) => line.replace(/(\S)\s+/g, "$1 "))
      // remove double blank lines
      .reduce(
        (
          textｰlines: string[],
          line: string,
          index: number,
          source: string[]
        ): string[] =>
          line || (index > 0 && source[index - 1]?.trim()) // useless ?. accessor, due to TS limitation
            ? // if the line is not blank or if it is the first one after a blank one, we keep it
              textｰlines.concat(line)
            : // otherwise, we skip it
              textｰlines,
        []
      );
  /**
   * Compute the minimum indentation level (in number of space characters) of a set of lines.
   * If lines start with non-blank characters, this is 0.
   * Otherwise, this is the minimum amount of spaces before any non-blank character.
   *
   * @param lines - the set of lines
   * @returns the minimum indentation
   */

  const minｰindentation = (lines: string[]): number =>
    lines
      // ignore blank lines
      .filter((line) => line.trim())
      // keep leading space…
      .map((line) => line.match(/ */))
      // …and count how many space characters there are
      .map((spaces) => (spaces && spaces[0]?.length) ?? 0)
      // then find the minimum indentation level
      .reduce(
        (min: number, indentation: number) =>
          indentation < min ? indentation : min,
        Infinity // start big to compute the minimum
      );

  /**
   * Turn a `(string, ...value) => string` tag function into a function that can accept a
   * chainable tag function in lieu of its string parameter and return a chainable tag function.
   * Furthermore, this makes the tag function callable on regular strings.
   *
   * Assuming you have 2 tag functions, `tag` and `parametrizedｰtag`, the second one taking a numeric parameter,
   * makeｰchainable allows you to call them as follows:
   *
   * ```typescript
   * // regular use:
   * console.log ( tag`Sample text with some ${expression} in it`);
   * console.log ( parametrizedｰtag(4)`Sample text with some ${expression} in it`);
   * // string based use:
   * console.log ( tag(`Sample text with some ${expression} in it`));
   * console.log ( parametrizedｰtag(4)(`Sample text with some ${expression} in it`));
   * // or more likely:
   * const msg = `Sample text with some ${expression} in it`;
   * console.log(tag(msg));
   * console.log(parametrizedｰtag(4)(msg));
   * // combining them, applying the parametrizedｰtag first:
   * console.log(tag(parametrizedｰtag(4))`Sample text with some ${expression} in it`)
   * // or applying the tag first, then the parametrized tag, and then reapplying the tag:
   * console.log(tag(parametrizedｰtag(4)(tag))`Sample text with some ${expression} in it`)
   * ```
   * @param tag - the tag function to be made chainable and callable on strings
   * @returns a chainable and string callable tag function
   */
  export const makeｰchainable = (tag: tagｰfunction): chainableｰtagｰfunction => {
    // rename a tag function
    const rename = (
      func: chainableｰtagｰfunction | tagｰfunction,
      name: string
    ) => Object.defineProperty(func, "name", { value: name });
    // Record the name of the chainable tag
    const name = tag.name ?? "anoymousｰtag";
    // The return function has 3 overload signatures:
    function chainable(
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string;
    function chainable(tag: tagｰfunction): chainableｰtagｰfunction;
    function chainable(stringｰliteral: string): string;
    // Here is the overloaded function implementation
    function chainable(
      stringsｰorｰtag: tagｰfunction | string | templateｰstrings,
      ...values: printableｰvalue[]
    ): tagｰfunction | string {
      switch (typeof stringsｰorｰtag) {
        case "function": {
          // eslint-disable-next-line no-inner-declarations
          function composite(
            s: templateｰstrings,
            ...v: printableｰvalue[]
          ): string {
            return tag`${(stringsｰorｰtag as tagｰfunction)(s, ...v)}`;
          }
          rename(composite, `${name}(${stringsｰorｰtag.name})`);
          return composite;
          // return (s: templateｰstrings, ...v: printableｰvalue[]) : string =>
          //   tag`${(stringsｰorｰtag as tagｰfunction)(s, ...v)}`;
        }
        case "string":
          return tag`${stringsｰorｰtag}`;
        default:
          return tag(stringsｰorｰtag as templateｰstrings, ...values);
      }
    }
    rename(chainable, name);
    return chainable;
  };

  /**
   * The identity tag is not very useful, except to zip strings and values together.
   * This module uses it internally to stitch string literals and substitution expression.
   *
   * @returns a string that interleaves values into the strings array
   */
  export const identity: chainableｰtagｰfunction = makeｰchainable(
    function identity(
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      // make sure we have a value corresponding to each string in strings
      values.push("");
      // zip strings and values together
      return strings.reduce(
        (text: string, s: string, i: number) => `${text}${s}${values[i]}`,
        ""
      );
    }
  );

  /**
   * The `raw` tag is identical to [`String.raw`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw).
   * It isn't chainable with other tag functions, because these other
   * tag functions typically process escape characters. However, if raw is the
   * only tag or the deepest one (the first to be applied), escape characters
   * come out unprocessed.
   *
   * @param {templateｰstrings} strings - an array of string literals (this array is equipped with the raw property)
   * @param {printableｰvalue[]} values... - the expressions to be substituted in the output
   * @returns a string that interleaves values into the strings array
   *
   * Note that if you use raw as a function, you must pass it an object with the raw property, along with values
   * to be substituted between iterations of that raw property, cf.
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw#using_string.raw).
   *
   * Use `raw` either directly or nested the deepest in other tags, e.g.
   *
   * ```typescript
   * console.log ( raw`This is line1\nAnd this is line {1+1}` );
   * // => This is line1\nAnd this is line 2
   * console.log ( identity(raw)`This is line1\nAnd this is line {1+1}` );
   * // => This is line1\nAnd this is line 2
   * // but note that:
   * console.log ( raw(identity)`This is line1\nAnd this is line {1+1}` );
   * // This is line 1
   * // And this is line 2
   * ```
   */
  export const raw: tagｰfunction = String.raw;

  /**
   * The `paragraph` tag removes duplicate blank lines and returns a set of paragraphs separated by single blank lines.
   * @returns a string that interleaves values into the strings array and that removes extraneous blank lines.
   */
  export const paragraph: chainableｰtagｰfunction = makeｰchainable(
    function paragraph(
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      // split text into lines and stitch them with a single blank line inbetween
      return textｰlines(identity(strings, ...values))
        .filter((line) => line.trim())
        .join("\n\n");
    }
  );

  /**
   * The `fold` tag removes line breaks. If you want to remove first level indentation too,
   * @see {@link outdent} to remove first level indentation, e.g. with `fold(outdent)`
   * @see {@link flush} to remove all indentation, e.g. with `fold(flush)`.
   */
  export const fold: chainableｰtagｰfunction = makeｰchainable(function fold(
    strings: templateｰstrings,
    ...values: printableｰvalue[]
  ): string {
    return textｰlines(identity(strings, ...values)).join("");
  });

  /**
   * The `flush`tag removes all leading spaces (flushes text left).
   * @see {@link outdent} to remove only the first level of indentation.
   */
  export const flush: chainableｰtagｰfunction = makeｰchainable(function flush(
    strings: templateｰstrings,
    ...values: printableｰvalue[]
  ): string {
    return textｰlines(identity(strings, ...values))
      .map((line) => line.trim())
      .join("\n");
  });

  /**
   * The `outdent`tag removes first level indentation.
   * @see {@link flush} to remove all indentation.
   */
  export const outdent: chainableｰtagｰfunction = makeｰchainable(
    function outdent(
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      const lines = textｰlines(identity(strings, ...values));
      // compute the minimum indentation across texy lines
      const indentation = minｰindentation(lines);
      // remove that minimum indentation from all lines
      return lines.map((line) => line.slice(indentation)).join("\n");
    }
  );
  /**
   *
   * @param args The `indent` tag adds indentation to each line.
   * @see {@link outdent} and {@link flush} for relatede functions.
   */
  export const indent = (n: number): chainableｰtagｰfunction =>
    makeｰchainable(function indent(
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      const lines = textｰlines(identity(strings, ...values));
      if (n >= 0) {
        // just add n spaces at head of lines
        const spaces = " ".repeat(n);
        return lines.map((line) => spaces.concat(line)).join("\n");
      }
      // if negative n, remove -n spaces capped by min indentation
      const indentation = Math.min(-n, minｰindentation(lines));
      return lines.map((line) => line.slice(indentation)).join("\n");
    });
  /**
   * @todo THE MOST COMPLEX tag is to wrap lines to a max line length
   */
  export const wrap: chainableｰtagｰfunction = identity;
}

const log = (...args: Tags.printableｰvalue[]) =>
  console.log(
    args.reduce(
      (text: string, value: Tags.printableｰvalue) =>
        text.concat(value.toString()),
      ""
    )
  );
const test = (tag: Tags.chainableｰtagｰfunction, text: string): void => {
  log("\n———Test\n", tag.name, "=>", tag`${text}`, "<=");
};
const text = `
    Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

          Second lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    Unindented duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

    Third lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    
    
    
    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\t\n
    ≤There's a tab-newline just before this,
    then a real newline followed by a tab-newline-tab»\t\n\t
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                More indented lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                `;
test(Tags.paragraph, text);
test(Tags.outdent, text);
test(Tags.flush, text);
test(Tags.fold, text);
test(Tags.identity(Tags.fold(Tags.flush)), text);
test(Tags.indent(10)(Tags.outdent), text);
test(Tags.indent(-3), text);
test(
  // Tags.identity,
  Tags.makeｰchainable(Tags.raw),
  Tags.raw`
        This is a test\n\n\t\nWe are computing π:     
        (and by the    way, \t    this ain't easy)




${Math.PI}
`
);
