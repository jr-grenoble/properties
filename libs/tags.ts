/**
 * @module Tags - a collection of chainable tags for template string literals
 *
 * @author Jean-René Bouvier
 *
 * @copyright (c) Jean-René Bouvier, from 2021 on.
 * The author hereby grants Facts Haven SAS and its affiliates the right to use and perform any derivative works
 *
 * This is a library module that provides various tag functions to modify template literals.
 *
 * - Refer to [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
 *
 * - Refer also to the much more complete [common-tags](https://github.com/zspecza/common-tags) package.
 *
 * @overview
 * Tags allow for prefixing template literals, e.g. as in
 * ```typescript
 * identity`Some ${expression} followed by text`⁠
 * ```
 *
 * Tag function implementations take one mandatory parameter, a `templateｰstrings` array of string literals, and optional printable values.
 * By default (cf. the `identity` tag), the template string is rendederd by interleaving the printable values between the template
 *  string literals. Hence, a proper call to a tag function must pass one more string literal than there are values.
 *
 * Chainable tag functions allow for composing tags to perform more complex tasks, as in
 * ```typescript
 * indent(4)(paragraph)`Some ${expression}`⁠
 * ```
 * They can also work on a regular string parameter, when using the regular function call, as in
 * ```typescript
 * indent(4)(paragraph)("Some string")
 * ```
 * See the {@linkcode chainableｰtagｰfunction} type for further explanations.
 *
 * | Types                             | Description                                                                                                   |
 * | :-------------------------------- | :------------------------------------------------------------------------------------------------------------ |
 * | {@linkcode chainableｰtagｰfunction}| A tag function that also accepts another tag function or a string as a parameter, for chaining or direct call |
 * | {@linkcode tagｰfunction}          | A function that can be applied to a template string, i.e. that can prefix such a string                       |
 * | {@linkcode templateｰstrings}      | Array of readonly strings, augmented with a raw property to iterate over raw equivalent of these strings      |
 * | {@linkcode printableｰvalue}       | Any expression that produces a printable result, i.e. that can be called with `.toString()`                   |
 *
 */

/**
 * @todo
 * Google Apps Script does not support modules, hence we use namespaces.
 * When GAS supports modules, we must replace them by corresponding import statements.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Tags {
  // Type definitions /////////////////////////////////////////////////////////
  // Basic types and interfaces for tag functions.                           //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The `templateｰstrings` type is basically an array of readonly strings augmented with a raw property that stores
   * the same string literals unprocessed for escape sequence.
   */
  export interface templateｰstrings extends ReadonlyArray<string> {
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
  export interface tagｰfunction {
    (strings: templateｰstrings, ...values: printableｰvalue[]): string;
  }
  /**
   * We extend tag functions so that they can be chained and also so that you can call them on regular strings.
   * When you compose chaianable tags, the innermost (deepest) tag is applied first, followed by tags of lesser depth,
   * until the outermost tag is called. For instance, in
   *
   * ```typescript
   * indent(-2)(paragraph(outdent))`
   *      This is some text.
   *      This line has the same indentation as the previous one.
   *          This line has deeper indentation.
   *          This one too.
   *
   *
   *      This line has the initial indentation level.
   *      And this is the last line.
   *      `;
   * ```
   */
  export interface chainableｰtagｰfunction extends tagｰfunction {
    (tag: tagｰfunction): chainableｰtagｰfunction;
    (stringｰliteral: string): string;
  }

  /**
   *
   */

  export interface numberingｰoptions {
    numberｰfrom?: number;
    prefix?: string;
    suffix?: string;
    padｰwidth?: number;
    padｰwith?: string | number;
    padｰzeroｰwith?: string | number;
    numberingｰscheme?: keyof typeof numberingｰschemes;
    signｰall?: boolean;
  }

  // Utility functions ////////////////////////////////////////////////////////
  // Common code across tag functions; some of this is generic though.       //
  /////////////////////////////////////////////////////////////////////////////

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
   * Rename a function
   * @param func - the function to rename
   * @param name - the new name
   * @returns the modified function
   */
  const rename = <funcｰtype>(func: funcｰtype, name: string): funcｰtype =>
    Object.defineProperty(func, "name", { value: name });

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
  const makeｰchainable = (tag: tagｰfunction): chainableｰtagｰfunction => {
    // Record the name of the chainable tag, refusing nullish names
    const tagｰname = tag.name || "anoymousｰtag";
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
          rename(composite, `${tagｰname}(${stringsｰorｰtag.name})`);
          return composite;
        }
        case "string":
          return tag`${stringsｰorｰtag}`;
        default:
          return tag(stringsｰorｰtag as templateｰstrings, ...values);
      }
    }
    rename(chainable, tagｰname);
    return chainable;
  };

  // Tag functions ////////////////////////////////////////////////////////////
  // We define chainable tag functions below.                                //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The identity tag is not very useful, except to zip strings and values together.
   * This module uses it internally to stitch string literals and substitution expression.
   *
   * @returns a string that interleaves values into the strings array
   */
  export const identity: chainableｰtagｰfunction = makeｰchainable(
    rename(function (
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
    },
    "identity")
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
  export const raw: tagｰfunction = rename(String.raw, "raw");

  /**
   * The `paragraph` tag removes duplicate blank lines and returns a set of paragraphs separated by single blank lines.
   * @returns a string that interleaves values into the strings array and that removes extraneous blank lines.
   */
  export const paragraph: chainableｰtagｰfunction = makeｰchainable(
    rename(function (
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      // split text into lines and stitch them with a single blank line inbetween
      return textｰlines(identity(strings, ...values))
        .filter((line) => line.trim())
        .join("\n\n");
    },
    "paragraph")
  );

  /**
   * The `fold` tag removes line breaks. If you want to remove first level indentation too,
   * @see {@link outdent} to remove first level indentation, e.g. with `fold(outdent)`
   * @see {@link flush} to remove all indentation, e.g. with `fold(flush)`.
   */
  export const fold: chainableｰtagｰfunction = makeｰchainable(
    rename(function (
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      return textｰlines(identity(strings, ...values)).join("");
    },
    "fold")
  );

  /**
   * The `flush`tag removes all leading spaces (flushes text left).
   * @see {@link outdent} to remove only the first level of indentation.
   */
  export const flush: chainableｰtagｰfunction = makeｰchainable(
    rename(function (
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      return textｰlines(identity(strings, ...values))
        .map((line) => line.trim())
        .join("\n");
    },
    "flush")
  );

  /**
   * The `outdent`tag removes first level indentation.
   * @see {@link flush} to remove all indentation.
   */
  export const outdent: chainableｰtagｰfunction = makeｰchainable(
    rename(function (
      strings: templateｰstrings,
      ...values: printableｰvalue[]
    ): string {
      const lines = textｰlines(identity(strings, ...values));
      // compute the minimum indentation across texy lines
      const indentation = minｰindentation(lines);
      // remove that minimum indentation from all lines
      return lines.map((line) => line.slice(indentation)).join("\n");
    },
    "outdent")
  );

  /**
   * The `indent` tag adds indentation to each line.
   * @see {@link outdent} and {@link flush} for related functions.
   */
  export const indent = (n: number): chainableｰtagｰfunction =>
    makeｰchainable(
      rename(
        function (
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
        },
        // rename indent function to include its parameter
        `indent(${n})`
      )
    );
  /**
   * @todo THE MOST COMPLEX tag is to wrap lines to a max line length
   *
   */
  /** @todo, use this function whenever we need indentation; is this a candidate for a tag? */
  const indentation = (line: string) => /^\s*/.exec(line)?.[0]?.length ?? 0;
  type lineｰwithｰindent = {
    indent: number;
    line: string;
  };
  /** @todo move where appropriate; is this a candidate for a tag? */
  const split =
    (n: number) =>
    (lineｰwithｰindent: lineｰwithｰindent): string[] => {
      if (lineｰwithｰindent.line.length <= n) return [lineｰwithｰindent.line];
      let i = lineｰwithｰindent.line.lastIndexOf(" ", n);
      if (i < 0 || i < lineｰwithｰindent.indent)
        i = lineｰwithｰindent.line.indexOf(" ", n);
      if (i < 0) return [lineｰwithｰindent.line]; // can't split line
      return [
        lineｰwithｰindent.line.substr(0, i),
        ...split(n)({
          indent: lineｰwithｰindent.indent,
          line:
            " ".repeat(lineｰwithｰindent.indent) +
            lineｰwithｰindent.line.substr(i + 1),
        }),
      ];
    };
  export const wrap = (n: number): chainableｰtagｰfunction =>
    makeｰchainable(
      rename(function (
        strings: templateｰstrings,
        ...values: printableｰvalue[]
      ): string {
        let [currentｰindentation, previousｰindentation] = [-1, -1];
        return (
          textｰlines(identity(strings, ...values))
            /** @todo create tag function for this */
            // fold multiple whitespaces into one
            .map((line) => line.replace(/\b\s+/g, " "))
            // remove trailing whitespace
            .map((line) => line.replace(/\s$/, ""))
            // join lines that have identical indentation, setting blank lines to empty lines
            .reduce(
              (lines: lineｰwithｰindent[], line: string): lineｰwithｰindent[] => {
                // update indentation levels
                [previousｰindentation, currentｰindentation] = [
                  currentｰindentation,
                  indentation(line),
                ];
                // preserve blank lines
                if (line.length <= currentｰindentation) {
                  // reset indentation level so that nothing gets appended to blank line
                  currentｰindentation = -1;
                  return lines.concat({ indent: 0, line: "" });
                }
                // handle indentation changes by starting a new line
                if (previousｰindentation !== currentｰindentation)
                  return lines.concat({
                    indent: currentｰindentation,
                    line,
                  });
                // handle identical indentation by joining with previous line;
                // because initial indentation levels are impossible, we are guaranteed to have a previous line
                (lines[lines.length - 1] as lineｰwithｰindent).line +=
                  line.replace(/^\s*/, " ");
                return lines;
              },
              []
            )
            // split lines longer than n characters
            .map(split(n))
            .flat()
            .join("\n")
        );
      },
      `wrap(${n})`)
    );

  export const alphabetize = ({ uppercase = false } = {}): ((
    n: number,
    s?: string
  ) => string) => {
    // ancillary function to generate alphabetic numbering functions
    const alphaｰbase = (uppercase ? "A" : "a").charCodeAt(0);
    return function alpha(n: number, s = ""): string {
      // tail recursive
      return n < 1
        ? s
        : alpha(
            Math.floor((n - 1) / 26),
            String.fromCharCode(((n - 1) % 26) + alphaｰbase) + s
          );
    };
  };

  export const romanize = ({ uppercase = true } = {}): ((
    n: number,
    s?: string
  ) => string) => {
    /**
     * Note that the roman literals below are not Unicode roman digits, but latin letters, as per Unicode recommendation
     * @todo, explain this further. See {@link [Wikipedia](https://en.wikipedia.org/wiki/Roman_numerals)}
     */
    type literal = readonly [string, number];
    const literals: readonly literal[] = (
      [
        ["M", 1000],
        ["CM", 900],
        ["D", 500],
        ["CD", 400],
        ["C", 100],
        ["XC", 90],
        ["L", 50],
        ["XL", 40],
        ["X", 10],
        ["IX", 9],
        ["V", 5],
        ["IV", 4],
        ["I", 1],
      ] as literal[]
    ).map(([roman, arabic]: literal) => [
      uppercase ? roman : roman?.toLowerCase(),
      arabic,
    ]);
    return function roman(n: number, s = ""): string {
      if (n < 0) return "-" + roman(-n, s);
      for (const [key, val] of literals) {
        if (n >= val) {
          return roman(n - val, s + key);
        }
      }
      return s;
    };
  };

  export const arabize = (n: number): string => `${n}`;

  export const numberingｰschemes = {
    alpha: alphabetize({ uppercase: false }),
    Alpha: alphabetize({ uppercase: true }),
    roman: romanize({ uppercase: false }),
    Roman: romanize({ uppercase: true }),
    digit: arabize,
  };

  export const maxｰpaddingｰwidth = (
    from: number,
    length: number,
    scheme: keyof typeof numberingｰschemes = "digit",
    signed = false
  ): number => {
    const sign = from < 0 || signed ? 1 : 0;
    const max = Math.max(Math.abs(from), Math.abs(length));
    const base = {
      alpha: Math.log(26),
      digit: Math.log(10),
      roman: [1, 2, 3, 8, 18, 28, 38, 88, 188, 288, 388, 888, 1888, 2888, 3888],
    }[(scheme ?? "digit").toLocaleLowerCase()];
    if (typeof base === "number") return sign + Math.ceil(Math.log(max) / base);
    return sign + (base as number[]).findIndex((element) => element > max);
  };

  export class counter {
    public value: number;
    private readonly stringｰpadding: boolean;
    private readonly stringize: (n: number) => string;
    private padder: (n: number) => string = arabize;
    constructor(
      private readonly options: numberingｰoptions = {} // padｰwith: string | number = " ",
    ) {
      this.value = options.numberｰfrom ?? 0;
      this.options.prefix ??= "";
      this.options.suffix ??= "";
      this.options.padｰwidth ??= 0;
      this.options.padｰwith = `${options.padｰwith ?? " "}`;
      this.options.padｰzeroｰwith = `${
        options.padｰzeroｰwith ?? this.options.padｰwith
      }`;
      this.options.signｰall ??= false;
      this.stringｰpadding = isNaN(parseInt(this.options.padｰwith));
      this.stringize = numberingｰschemes[options.numberingｰscheme ?? "digit"];
      // build padding function
      this.padder = (n: number) => {
        const sign = this.options.signｰall
          ? ["-", "±", "+"][Math.sign(n) + 1]
          : n < 0
          ? "-"
          : "";
        const nｰasｰstring = this.stringize(Math.abs(n));
        const padding = (
          n ? this.options.padｰwith : this.options.padｰzeroｰwith
        ) as string;

        if (this.stringｰpadding) {
          return (sign + nｰasｰstring).padStart(
            this.options.padｰwidth as number,
            padding
          );
        }
        const width =
          (this.options.padｰwidth as number) -
          (n < 0 && !this.options.signｰall ? 1 : 0);
        return sign + nｰasｰstring.padStart(width, padding);
      };
    }
    get reset(): this {
      this.value = this.options.numberｰfrom ?? 0;
      return this; // for chaining
    }
    get next(): this {
      this.value++;
      return this; // for chaining
    }
    get raw(): string {
      return this.stringize(this.value);
    }
    get pad(): string {
      return `${this.options.prefix}${this.padder(this.value)}${
        this.options.suffix
      }`;
    }
  }

  /**
   * The `numbering` tag adds numbering to each line.
   * @param numberｰfrom - where to start numbering from
   * @param suffix - numbering suffix
   * @param padｰwith - what to pad numbers to the left
   * @param padｰwidth - width of padded numbering, defaults to number of digits
   * @returns numbered lines
   * @see {@link outdent} and {@link flush} for related functions.
   */
  export const numbering = (
    options: numberingｰoptions = {}
  ): chainableｰtagｰfunction =>
    makeｰchainable(
      rename(
        function (
          strings: templateｰstrings,
          ...values: printableｰvalue[]
        ): string {
          const lines = textｰlines(identity(strings, ...values));
          options.numberｰfrom ??= 0;
          options.suffix ??= ". ";
          options.padｰwith ??= " ";

          options.padｰwidth = maxｰpaddingｰwidth(
            options.numberｰfrom,
            lines.length,
            options.numberingｰscheme,
            options.signｰall
          );

          const index = new counter(options);

          return lines.map((line) => `${index.next.pad}${line}`).join("\n");
        },
        // rename indent function to include its parameters
        `number(${JSON.stringify(options)})`
      )
    );
}

export const numberｰlines = Tags.numbering();

const log = (...args: Tags.printableｰvalue[]) =>
  console.log(
    args.reduce(
      (text: string, value: Tags.printableｰvalue) =>
        text.concat(value.toString()),
      ""
    )
  );
const test = (
  tag: Tags.chainableｰtagｰfunction | Tags.tagｰfunction,
  text: string
): void => {
  log("\n———Test---\n", tag.name, "\n=>\n", tag`${text}`, "\n<=\n");
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
test(Tags.identity(Tags.indent(-3)), text);
test(
  // Tags.identity,
  Tags.raw,
  Tags.raw`
        This is a test\n\n\t\nWe are computing π:     
        (and by the    way, \t    this ain't easy)




${Math.PI}
`
);

const indentｰtext = `
        This line as minimally indented.
        The next one is also minimal.
                This is some fairly long text: Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                This is the deepest.
                This line has the same indentation as the previous one.
                It is indented by 8 spaces compared to the minimum level.
        We are back at minimal level.
        And we stay there.
            This line is deeper indented.
            It has a depth of 4 spaces.
            This one too.
            And that one too.
    
    
        This line has the initial indentation level.
        And this is the last line before a newline.
        `;
test(
  Tags.numbering({
    padｰwith: " ",
    numberｰfrom: -29,
    prefix: "«",
    suffix: "» ",
    numberingｰscheme: "roman",
  })(Tags.wrap(40)(Tags.outdent)),
  indentｰtext
);
