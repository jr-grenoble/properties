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
    (
      tag: tagｰfunction
    ): chainableｰtagｰfunction /** allow chainable tag functions to preprocess template literals with other tag functions */;
    (
      stringｰliteral: string
    ): string /** allow chainable tag function to process regular strings */;
  }

  /**
   * When creating a numberingｰcounter, we pass it severall options
   */
  export interface numberingｰoptions {
    numberｰfrom?: number;
    prefix?: string;
    suffix?: string;
    prefixｰzero?: string;
    suffixｰzero?: string;
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

  interface characterｰset {
    uppercase: string[];
    lowercase: string[];
    digits?: string[];
    symbols?: { [k: string]: string };
  }

  const characterｰbounds = {
    uppercase: {
      min: "A".codePointAt(0) as number,
      max: "Z".codePointAt(0) as number,
    } as const,
    lowercase: {
      min: "a".codePointAt(0) as number,
      max: "z".codePointAt(0) as number,
    } as const,
    digit: {
      min: "0".codePointAt(0) as number,
      max: "9".codePointAt(0) as number,
    } as const,
  } as const;

  const characterｰsets: { readonly [name: string]: characterｰset } = {
    // serif (the default) must be the first entry!!
    serif: {
      uppercase: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
      lowercase: [..."abcdefghijklmnopqrstuvwxyz"],
      digits: [..."0123456789"],
    },
    circledｰenclosedｰsans: {
      uppercase: [..."ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ"],
      lowercase: [..."ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ"],
      digits: [..."⓪①②③④⑤⑥⑦⑧⑨"],
    },
    fullｰwidthｰsans: {
      uppercase: [..."ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"],
      lowercase: [..."ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ"],
      digits: [..."０１２３４５６７８９"],
      symbols: {
        $: "＄",
        _: "＿",
        "!": "！",
        "?": "？",
        "#": "＃",
        "¢": "￠",
        "£": "￡",
        "¥": "￥",
        "₩": "￦",
        "%": "％",
        "&": "＆",
        "@": "＠",
        ".": "．",
        ",": "，",
        ":": "：",
        ";": "；",
        "(": "（",
        ")": "）",
        "[": "［",
        "]": "］",
        "{": "｛",
        "}": "｝",
        "⸨": "｟",
        "⸩": "｠",
        "⸢": "「",
        "⸥": "」",
        "/": "／",
        "\\": "＼",
        "¯": "￣",
        "|": "｜",
        "¦": "￤",
        "^": "＾",
        ˆ: "＾",
        "`": "｀",
        "˜": "～",
        "~": "～",
        "'": "＇",
        '"': "＂",
        "+": "＋",
        "-": "－",
        "<": "＜",
        "=": "＝",
        ">": "＞",
        "¬": "￢",
        "*": "＊",
      },
    },
    boldｰserif: {
      uppercase: [..."𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙"],
      lowercase: [..."𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳"],
      digits: [..."𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗"],
    },
    italicｰserif: {
      uppercase: [..."𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍"],
      lowercase: [..."𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧"],
    },
    boldｰitalicｰserif: {
      uppercase: [..."𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁"],
      lowercase: [..."𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛"],
    },
    italicｰscript: {
      uppercase: [..."𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵"],
      lowercase: [..."𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏"],
    },
    boldｰitalicｰscript: {
      uppercase: [..."𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩"],
      lowercase: [..."𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃"],
    },
    frakturｰitalicｰscript: {
      uppercase: [..."𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ"],
      lowercase: [..."𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷"],
    },
    boldｰfrakturｰitalicｰscript: {
      uppercase: [..."𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅"],
      lowercase: [..."𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟"],
    },
    doubleｰstruckｰboldｰsans: {
      uppercase: [..."𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ"],
      lowercase: [..."𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫"],
      digits: [..."𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡"],
    },
    sans: {
      uppercase: [..."𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹"],
      lowercase: [..."𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓"],
      digits: [..."𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫"],
    },
    boldｰsans: {
      uppercase: [..."𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭"],
      lowercase: [..."𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇"],
      digits: [..."𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"],
    },
    italicｰsans: {
      uppercase: [..."𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡"],
      lowercase: [..."𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻"],
    },
    boldｰitalicｰsans: {
      uppercase: [..."𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕"],
      lowercase: [..."𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯"],
    },
    monospaceｰitalicｰboldｰserif: {
      uppercase: [..."𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉"],
      lowercase: [..."𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣"],
      digits: [..."𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿"],
    },
  };

  const formatter = (keywords: string[]): ((text: string) => string) => {
    // prioritize sans-serif over serif
    if (keywords.indexOf("sans") >= 0) {
      const serif = keywords.indexOf("serif");
      if (serif >= 0) keywords.splice(serif, 1);
    }
    const score = (font: string): number =>
      keywords.reduce(
        (score, keyword) => score + (font.indexOf(keyword) >= 0 ? 1 : 0),
        0
      );

    const bestｰfont = Object.keys(characterｰsets)
      .map((font) => [font, score(font)])
      .sort(
        ([, score1], [, score2]) => (score2 as number) - (score1 as number)
      )[0]?.[0];

    const characterｰset = characterｰsets[bestｰfont ?? "serif"] as characterｰset;

    return (text: string) =>
      [...text]
        .map((char: string): string => {
          const c: number = char.codePointAt(0) as number;
          switch (true) {
            case characterｰbounds.uppercase.min <= c &&
              c <= characterｰbounds.uppercase.max:
              return characterｰset.uppercase[
                c - characterｰbounds.uppercase.min
              ] as string;
            case characterｰbounds.lowercase.min <= c &&
              c <= characterｰbounds.lowercase.max:
              return characterｰset.lowercase[
                c - characterｰbounds.lowercase.min
              ] as string;
            case characterｰbounds.digit.min <= c &&
              c <= characterｰbounds.digit.max:
              return (
                (characterｰset.digits?.[
                  c - characterｰbounds.digit.min
                ] as string) ?? char
              );
            case char in (characterｰset.symbols ?? {}):
              return characterｰset.symbols?.[char] ?? char;
            default:
              return char;
          }
        })
        .join("");
  };

  export const format = (format: string): chainableｰtagｰfunction => {
    const keywords = format
      .toLowerCase()
      .replace(/\s*/, "")
      .split(/ｰ|-|\s|,|;/);

    return makeｰchainable(
      rename(
        function (
          strings: templateｰstrings,
          ...values: printableｰvalue[]
        ): string {
          const lines = textｰlines(identity(strings, ...values));
          return lines.map(formatter(keywords)).join("\n");
        },
        // rename indent function to include its parameter
        `format(${keywords})`
      )
    );
  };
  export const bold = format("bold");
  export const italic = format("italic");
  export const fraktur = format("fraktur");
  export const boldｰsans = format("bold-sans");

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

  export const arabize = ({ big = false } = {}): ((n: number) => string) => {
    const smallｰdigits: { [k: string]: string } = {
      "0": "₀",
      "1": "₁",
      "2": "₂",
      "3": "₃",
      "4": "₄",
      "5": "₅",
      "6": "₆",
      "7": "₇",
      "8": "₈",
      "9": "₉",
    };
    const mapper: (c: string) => string = big
      ? (c) => c
      : (c) => smallｰdigits[c] ?? c;
    return function digit(n: number): string {
      return [...`${n}`].map(mapper).join("");
    };
  };

  export const numberingｰschemes = {
    alpha: alphabetize({ uppercase: false }),
    Alpha: alphabetize({ uppercase: true }),
    roman: romanize({ uppercase: false }),
    Roman: romanize({ uppercase: true }),
    digit: arabize({ big: false }),
    Digit: arabize({ big: true }),
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

  export class numberingｰcounter {
    public value: number;
    private readonly stringｰpadding: boolean;
    private readonly stringize: (n: number) => string;
    private padder: (n: number) => string = arabize();
    constructor(
      private readonly options: numberingｰoptions = {} // padｰwith: string | number = " ",
    ) {
      this.value = options.numberｰfrom ?? 0;
      this.options.prefix ??= "";
      this.options.suffix ??= "";
      this.options.suffixｰzero ??= this.options.suffix;
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
        const { prefix, suffix } = n
          ? this.options
          : {
              prefix: this.options.prefixｰzero,
              suffix: this.options.suffixｰzero,
            };
        const nｰasｰstring = this.stringize(Math.abs(n));
        const padding = (
          n ? this.options.padｰwith : this.options.padｰzeroｰwith
        ) as string;

        if (this.stringｰpadding) {
          return (
            prefix +
            (sign + nｰasｰstring).padStart(
              this.options.padｰwidth as number,
              padding
            ) +
            suffix
          );
        }
        const width =
          (this.options.padｰwidth as number) -
          (n < 0 && !this.options.signｰall ? 1 : 0);
        return (
          (prefix as string) +
          sign +
          nｰasｰstring.padStart(width, padding) +
          suffix
        );
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
      return this.padder(this.value);
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
          options.prefix ??= "│";
          options.suffix ??= "│";
          options.prefixｰzero ??= "┼";
          options.suffixｰzero ??= "┼";
          options.padｰwith ??= " ";
          options.padｰzeroｰwith ??= "─";

          options.padｰwidth = maxｰpaddingｰwidth(
            options.numberｰfrom,
            lines.length,
            options.numberingｰscheme,
            options.signｰall
          );

          const index = new numberingｰcounter(options);

          return lines.map((line) => `${index.next.pad}${line}`).join("\n");
        },
        // rename indent function to include its parameters
        Object.keys(options).length === 0
          ? `numberｰlines`
          : `number(${JSON.stringify(options)})`
      )
    );
  export const numberｰlines = Tags.numbering();
}

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
    numberｰfrom: -25,
    // prefix: "«",
    // suffix: "» ",
    numberingｰscheme: "roman",
  })(Tags.wrap(40)(Tags.outdent)),
  indentｰtext
);

test(Tags.numberｰlines(Tags.wrap(40)(Tags.outdent)), indentｰtext);

test(
  Tags.italic,
  `Some text with ${Tags.boldｰsans`embedded bold`} and ${Tags.fraktur`fraktur text`}`
);
