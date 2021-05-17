/**
 * Cards.ts
 *
 * Author: Jean-René Bouvier.
 *
 * Copyright (c) Jean-René Bouvier, from 2021 on.
 *
 * The author hereby grants Facts Haven SAS and its affiliates the right to use and perform any derivative works
 *
 * This is a library module, used to simplify access to the Google Apps Script card service
 *
 * - Refer to the [API](https://developers.google.com/apps-script/reference/card-service)
 *
 * - Refer to the [guide](https://developers.google.com/workspace/add-ons/concepts/card-interfaces)
 *
 * @module Cards
 */

// Google Apps Script does not support modules, hence we use namespaces.
// When GAS supports modules, we'll need to remove namespaces and replace them by
// corresponding import statements.
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Cards {
  /**
   * Style types
   */
  /** Use the {@link displayｰstyles} enum to set values of `displayｰstyle` type */
  export type displayｰstyle = GoogleAppsScript.Card_Service.DisplayStyle;
  /** Use the {@link imageｰstyles} enum to set values of `imageｰstyle` type */
  export type imageｰstyle = GoogleAppsScript.Card_Service.ImageStyle;

  /**
   * Image styles are an enum ersatzt to specify how a header must crop images:
   * either with a `circle` or with a `square`.
   *
   * They allows you to write:
   * ```
   * import { cardｰheader, imageｰstyles } from "Cards.ts";
   *
   * const h = new cardｰheader( "Header title", {
   *    imageｰurl: "https://my.server.com/my/images/favorite.png",
   *    imageｰstyle: imageｰstyles.circle
   * });
   * ```
   * instead of having to use the heavier `GoogleAppsScript.Card_Service.ImageStyle.CIRCLE`.
   */
  export const imageｰstyles = {
    circle: GoogleAppsScript.Card_Service.ImageStyle.CIRCLE,
    square: GoogleAppsScript.Card_Service.ImageStyle.SQUARE,
  } as const;

  /**
   * Display styles are an enum ersatzt to specify how a header must be displayed:
   * either with a `peek` card or in `replace` mode.
   *
   * They allows you to write:
   * ```
   * import { card, cardｰheader, displayｰstyles } from "Cards.ts";
   *
   * const c = new card( new cardｰheader("HEADER"), {
   *    displayｰstyle: displayｰstyles.peek
   * });
   * ```
   * instead of having to use the heavier `GoogleAppsScript.Card_Service.DisplayStyle.PEEK`.
   */
  export const displayｰstyles = {
    peek: GoogleAppsScript.Card_Service.DisplayStyle.PEEK,
    replace: GoogleAppsScript.Card_Service.DisplayStyle.REPLACE,
  } as const;

  /** Card header optional parameters */
  export type headerｰoptions = {
    /** the header subtitle */
    subtitle?: string;
    /** the image URL or data URL */
    imageｰurl?: string;
    /** the image cropping style */
    imageｰstyle?: imageｰstyle;
    /** the image alternate text */
    imageｰaltｰtext?: string;
  };

  /** Encapsulate a card header   */
  export class cardｰheader {
    private required: { title: string };
    private optional: Required<headerｰoptions>;
    /** The constructed card header */
    public readonly cardｰheader: GoogleAppsScript.Card_Service.CardHeader;
    /**
     * Build a card header accessible as cardｰheader
     *
     * @param title - The required header title
     * @param headerｰoptions - The named optional parameters
     */
    constructor(title: string, headerｰoptions: headerｰoptions = {}) {
      this.required = { title };
      this.optional = {
        subtitle: "",
        imageｰaltｰtext: "",
        imageｰurl: "",
        imageｰstyle: imageｰstyles.square,
        ...headerｰoptions,
      };
      this.cardｰheader = CardService.newCardHeader().setTitle(
        this.required.title
      );
      // Only set meaningful header options (ignore nullish values)
      if (headerｰoptions.subtitle)
        this.cardｰheader.setSubtitle(this.optional.subtitle);
      if (headerｰoptions.imageｰurl)
        this.cardｰheader.setImageUrl(this.optional.imageｰurl);
      if (headerｰoptions.imageｰaltｰtext)
        this.cardｰheader.setImageAltText(this.optional.imageｰaltｰtext);
      if (headerｰoptions.imageｰstyle)
        this.cardｰheader.setImageStyle(this.optional.imageｰstyle);
    }
    /**
     ** Accessors (possibly replace this by generated getters and setters)
     **/
    /** Get/set header title */
    get title(): string {
      return this.required.title;
    }
    set title(title: string) {
      this.cardｰheader.setTitle((this.required.title = title));
    }
    /** Get/set header subtitle */
    get subtitle(): string {
      return this.optional.subtitle;
    }
    set subtitle(subtitle: string) {
      this.cardｰheader.setSubtitle((this.optional.subtitle = subtitle));
    }
    /** Get/set header image URL (data or regular) */
    get imageｰurl(): string {
      return this.optional.imageｰurl;
    }
    set imageｰurl(imageｰurl: string) {
      this.cardｰheader.setImageUrl((this.optional.imageｰurl = imageｰurl));
    }
    /** Get/set header image alternate text */
    get imageｰaltｰtext(): string {
      return this.optional.imageｰaltｰtext;
    }
    set imageｰaltｰtext(imageｰaltｰtext: string) {
      this.cardｰheader.setImageAltText(
        (this.optional.imageｰaltｰtext = imageｰaltｰtext)
      );
    }
    /** Get/set header image alternate text */
    get imageｰstyle(): imageｰstyle {
      return this.optional.imageｰstyle;
    }
    set imageｰstyle(imageｰstyle: imageｰstyle) {
      this.cardｰheader.setImageStyle((this.optional.imageｰstyle = imageｰstyle));
    }
  }

  /**
   * Encapsulate a fixed card footer
   */
  export class cardｰfooter {}

  export class cardｰaction {}
  export class cardｰsection {}

  /**
   * Card optional parameters
   */
  // constructor trick: a class is both a type and a value
  class cardｰoptionｰinterface {
    constructor(
      public header?: cardｰheader,
      public peeker?: cardｰheader,
      public footer?: cardｰfooter,
      public name?: string,
      public displayｰstyle?: displayｰstyle,
      public sections?: cardｰsection[],
      public actions?: cardｰaction[]
    ) {}
  }
  // if we need the card option keys as an object, we can get them as:
  //   const cardｰoptionｰkeys = Object.keys(new cardｰoptionｰinterface());
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface cardｰoptions extends cardｰoptionｰinterface {}

  /**
   * Encapsulate a card
   */
  export class card {
    private optional: cardｰoptions = {};
    public readonly card: GoogleAppsScript.Card_Service.Card;
    /**
     * Build a card (accessible via the object's card property)
     *
     * @constructor build a card
     * @param {cardｰheader} [header] - The optional card header
     * @param {cardｰheader} [peeker] - The optional card header for peeking
     * @param {cardｰfooter} [footer] - The optional fixed footer
     * @param {string} [name] - The optional card name, used to pop cards
     * @param {displayｰstyles} [displayｰstyle] - The optional display style, i.e. how to show the card
     * @param {cardｰsection[]} [sections] - The optional card sections, in the order they show on the card
     * @param {cardｰaction[]} [actions] - The optional card actions, in the order they show on the card menu
     */
    constructor({
      header,
      peeker,
      footer,
      name,
      displayｰstyle,
      sections,
      actions,
    }: cardｰoptions = {}) {
      const cardｰbuilder = CardService.newCardBuilder();
      if (header)
        cardｰbuilder.setHeader((this.optional.header = header).cardｰheader);
      if (peeker)
        cardｰbuilder.setPeekCardHeader(
          (this.optional.peeker = peeker).cardｰheader
        );
      if (footer)
        // ⚠️ TODO ! set footer
        this.optional.footer = footer;
      if (name) cardｰbuilder.setName((this.optional.name = name));
      this.card = cardｰbuilder.build();
      if (displayｰstyle)
        // ⚠️ TODO ! set display style
        this.optional.displayｰstyle = displayｰstyle;
      if (sections)
        // ⚠️ TODO ! set sections
        this.optional.sections = sections;
      if (actions)
        // ⚠️ TODO ! set actions
        this.optional.actions = actions;
    }
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const c = new Cards.cardｰheader(" title ", {
  imageｰstyle: Cards.imageｰstyles.square,
});
