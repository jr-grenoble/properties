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

  export interface headerｰoptions {
    subtitle?: string;
    imageｰurl?: string;
    imageｰstyle?: imageｰstyles;
    imageｰtext?: string;
  }

  /**
   * Constructor for a CardHeader.
   *
   * @param title The required header title
   * @param subtitle?  The optional header subtitle
   * @returns
   */
  export function header(
    title: string,
    { subtitle, imageｰurl, imageｰstyle, imageｰtext }: headerｰoptions = {}
  ): GoogleAppsScript.Card_Service.CardHeader {
    const cardｰheader = CardService.newCardHeader().setTitle(title);
    if (subtitle) cardｰheader.setSubtitle(subtitle);
    if (imageｰurl) cardｰheader.setImageUrl(imageｰurl);
    if (imageｰtext) cardｰheader.setImageAltText(imageｰtext);
    if (imageｰstyle) cardｰheader.setImageStyle(imageｰstyleｰvalues[imageｰstyle]);
    return cardｰheader;
  }

  // cardｰheader(" title ", { imageｰstyle: imageｰstyle.square });
}
