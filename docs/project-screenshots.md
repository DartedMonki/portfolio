# Project screenshots

Refreshed on 31 October 2026. Screenshots show the actual application interfaces.
Authenticated screens use fictional customers, accounts, orders, invoices, and
attendance records in isolated local copies of the source repositories.

| Project                | Source                               | Revision                                   | Screens                                                               |
| ---------------------- | ------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------- |
| Asianet Smart WFM      | `technovaid/asianet-dtx-wfm-app`     | `c305928f66371761934f74f052ac970feaac54bb` | Ongoing work orders, work order details, installation activity filter |
| GradePlus App          | `technovaid/asianet-isp-csp`         | `a3d678f768d49bde1a93fe47c1894db4df5c9054` | Customer home, installation orders, subscription billing              |
| GradePlus Dashboard    | `technovaid/asianet-isp-rsp`         | `b5949700df312345ce7fc03f839878f0548b7c2e` | Analytics dashboard, customer directory, invoices                     |
| GEP Media              | `DartedMonki/alto-lms`               | `96de70f00032c961dfc63c5e62201913e3ea1e36` | Administration dashboard, ebook management, QR attendance             |
| GEP Media landing page | <https://www.gepmedia.id/>           | Live deployment at capture time            | Landing page                                                          |
| Pura Pura Bike         | <https://pura-pura-bike.vercel.app/> | Live deployment at capture time            | Home, activities, collaborators, statistics, contact                  |

Mobile screens were captured at 390 × 844 CSS pixels, desktop screens at
1440 × 900, with a device pixel ratio of 2. Flutter captures use the existing
screens with mock providers, following the applications' widget-test patterns.
Dashboard captures replace session and API data locally. No production accounts
or backend writes are involved.

The WFM capture uses Flutter 3.38.9 because the repository's Flutter 3.29.3 pin
conflicts with its `intl ^0.20.2` dependency. GradePlus uses its pinned Flutter
3.41.4. Capture-only entrypoints and mock authentication are kept outside this
repository.

PNG sources live in `public/images/`. Each screenshot has matching AVIF and WebP
variants in `public/images/optimized/`, at widths of 256 (`sm`), 480 (`md`), and
640 (`lg`) pixels. Desktop PNGs are resized to 1440 pixels wide; mobile PNGs retain
their 780-pixel capture width. Images preserve their full aspect ratio.

For future refreshes, capture the current source or live deployment, wait for
fonts, data, images, and entrance animations to finish, and inspect every screen.
Regenerate all six optimized variants whenever replacing a PNG so the gallery
cannot serve an older screenshot. Keep captions and descriptions aligned with
the captured screens in `src/data/projects.ts`.
