/**
 * Author: Jean-René Bouvier.
 * Copyright (c) Jean-René Bouvier, from 2021 on
 * The author hereby grants Facts Haven SAS and its affiliates the right to use and perform any derivative works
 *
 * This is the main entry point module.
 * By convention, public functions are rooted in the module.
 * Module private functions (i.e. not callable by the client) are located in the object named after the module.
 * @module
 */

type Card = GoogleAppsScript.Card_Service.Card;
type ActionResponse = GoogleAppsScript.Card_Service.ActionResponse;
type FormInputWrapper = Record<"", Record<string, unknown>>;

interface Event {
  hostApp: string;
  commonEventObject: {
    platofrm: "WEB" | "IOS" | "ANDROID";
    formsInputs: Record<string, FormInputWrapper>;
    hostApp: "GMAIL" | "CALENDAR" | "DRIVE" | "DOCS" | "SHEETS" | "SLIDES";
  };
}

interface Module {
  rootｰcard: (e: Event) => Card;
}

const modules: Array<Module> = [];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onｰeditorｰopened(e: Event): Array<Card> {
  const app = e?.commonEventObject?.hostApp;
  console.log(app);
  // create cards for each module
  return modules.map((module) => module.rootｰcard(e));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function popｰtoｰroot(_unused_e: Event): ActionResponse {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot())
    .build();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onｰfilesｰselected(_unused_e: Event): Card {
  // Dummy statement
  return CardService.newCardBuilder().build();
}
