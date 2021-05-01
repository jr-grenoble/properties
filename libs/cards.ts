/**
 * Author: Jean-René Bouvier.
 * Copyright (c) Jean-René Bouvier, from 2021 on
 * The author hereby grants Facts Haven SAS and its affiliates the right to use and perform any derivative works
 *
 * This is a library module, used to simplify access to the Google Apps Script card service
 * • Refer to the API:
 *   https://developers.google.com/apps-script/reference/card-service
 * • Refer to the guide:
 *   https://developers.google.com/workspace/add-ons/concepts/card-interfaces
 */

// Google Aoos Script does not support modules, hence we use namespaces.
// When GAS supports modules, we'll need to remove namespaces and replace them by
// corresponding import statements.
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Cards {
  /**
   * Shortcuts to name image styles;
   * as we don't know how Google implements enums, we make no assumptions
   */
  export enum imageｰstyles {
    circle = "circle image style",
    square = "square image style",
  }
  const imageｰstyleｰvalues = {};
  imageｰstyleｰvalues[imageｰstyles.circle] = CardService.ImageStyle.CIRCLE;
  imageｰstyleｰvalues[imageｰstyles.square] = CardService.ImageStyle.SQUARE;

  /**
   * Card header optional parameters
   */
  // constructor trick: a class is both a type and a value,
  class headerｰoptionｰinterface {
    constructor(
      public subtitle?: string,
      public imageｰurl?: string,
      public imageｰstyle?: imageｰstyles,
      public imageｰaltｰtext?: string
    ) {}
  }
  const headerｰoptionｰkeys = Object.keys(new headerｰoptionｰinterface());
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface headerｰoptions extends headerｰoptionｰinterface {}

  /**
   * Encapsulate a card header
   */
  export class header {
    private required = { title: "" };
    private optional: headerｰoptions = {};
    public readonly cardｰheader: GoogleAppsScript.Card_Service.CardHeader;
    /**
     * @constructor builds a card header
     * @param title The required header title
     * @param [subtitle] The optional header subtitle
     * @param [imageｰurl] The optional image (server or data URL)
     * @param [imageｰtext] The optional image alternate text
     * @param [imageｰstyle] The optional image style
     */
    constructor(
      title: string,
      { subtitle, imageｰurl, imageｰstyle, imageｰaltｰtext }: headerｰoptions = {}
    ) {
      this.cardｰheader = CardService.newCardHeader().setTitle(
        (this.required.title = title)
      );
      if (subtitle)
        this.cardｰheader.setSubtitle((this.optional.subtitle = subtitle));
      if (imageｰurl)
        this.cardｰheader.setImageUrl((this.optional.imageｰurl = imageｰurl));
      if (imageｰaltｰtext)
        this.cardｰheader.setImageAltText(
          (this.optional.imageｰaltｰtext = imageｰaltｰtext)
        );
      if (imageｰstyle)
        this.cardｰheader.setImageStyle(
          imageｰstyleｰvalues[(this.optional.imageｰstyle = imageｰstyle)]
        );
    }
    /**
     ** Accessors
     **/
    /**
     * Get/set header title
     * @type {String} The header title
     */
    get title(): string {
      return this.required.title;
    }
    set title(title: string) {
      this.cardｰheader.setTitle((this.required.title = title));
    }
    /**
     * Get/set header subtitle
     * @type {String} The header subtitle
     */
    get subtitle(): string {
      return this.optional.subtitle || "";
    }
    set subtitle(subtitle: string) {
      this.cardｰheader.setSubtitle((this.optional.subtitle = subtitle));
    }
    /**
     * Get/set header image URL (data or regular)
     * @type {String} The header image URL
     */
    get imageｰurl(): string {
      return this.optional.imageｰurl || "";
    }
    set imageｰurl(imageｰurl: string) {
      this.cardｰheader.setImageUrl((this.optional.imageｰurl = imageｰurl));
    }
    /**
     * Get/set header image alternate text
     * @type {String} The header image alternate text
     */
    get imageｰaltｰtext(): string {
      return this.optional.imageｰaltｰtext || "";
    }
    set imageｰaltｰtext(imageｰaltｰtext: string) {
      this.cardｰheader.setImageAltText(
        (this.optional.imageｰaltｰtext = imageｰaltｰtext)
      );
    }
    /**
     * Get/set header image alternate text
     * @type {String} The header image alternate text
     */
    get imageｰstyle(): imageｰstyles {
      return this.optional.imageｰstyle || imageｰstyles.square;
    }
    set imageｰstyle(imageｰstyle: imageｰstyles) {
      this.cardｰheader.setImageAltText(
        imageｰstyleｰvalues[(this.optional.imageｰstyle = imageｰstyle)]
      );
    }
  }

  // cardｰheader(" title ", { imageｰstyle: imageｰstyle.square });
}
