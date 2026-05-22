import DisableDevtool from 'disable-devtool';

import { SITE_URL } from '../data/constants';

const canonicalHostname = new URL(SITE_URL).hostname;
const protectedHostnames = new Set([canonicalHostname, `www.${canonicalHostname}`]);

if (import.meta.env.PROD && protectedHostnames.has(window.location.hostname)) {
  DisableDevtool({
    disableMenu: true,
    disableSelect: false,
    disableInputSelect: false,
    disableCopy: false,
    disableCut: false,
    disablePaste: false,
    clearLog: false,
  });
}
