[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

Note: this file is hardlinked into the root project directory.

# Properties

**Properties** is a [Google Apps Script Add-on](https://developers.google.com/workspace/add-ons/how-tos/building-gsuite-addons) that allows users to view and edit file properties.

File properties fall in two categories:

1. Drive properties associated with the [Advanced Drive Service](https://developers.google.com/apps-script/advanced/drive#adding_custom_properties); such properties can be accessed outside of Apps Script, but there are [hard limits](https://developers.google.com/drive/api/v2/reference/properties) on such properties, in particular, the combined key and value string length must be kept under 124 bytes and there can't be more than 100 such properties per file.
2. Script properties accessible only via the Google Apps Script [Properties Service](https://developers.google.com/apps-script/reference/properties), i.e. restricted to Google editors (document). Such properties are not shared between scipts, meaning that you cannot use them to communicate across add-ons and applications. Refer to the [script properties guide](https://developers.google.com/apps-script/guides/properties) for a better understanding of these properties.

This application allows for viewing and editing both types of properties. However, the usefulness of modifying script properties is limited, as no other application can use these properties. On the other hand, the add-on can be used as a [library](https://developers.google.com/apps-script/guides/libraries), so that other add-ons can allow users to view and edit script properties.

# Usage

# Project structure

The project uses [clasp](https://github.com/google/clasp) and of course git. The repository is [jr-grenoble/clasp](https://github.com/jr-grenoble/clasp). Access from my Mac requires a personal access token.

    .
    ├── assets                  # Static images, data…
    ├── dist                    # Source files
    ├── docs                    # Documentation files
    ├── libs                    # Libraries
    ├── tests                   # Automated tests
    ├── tools                   # Tools | URLs for tools
    ├── LICENSE.md              # License & copyright
    └── README.md               # Hard link to docs

The project uses [typedoc](https://typedoc.org/) for documentation.
