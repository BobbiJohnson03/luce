import { THEME_STORAGE_KEY } from "./ThemeProvider";

/**
 * Runs synchronously before the page paints so the correct palette is applied
 * up front — no flash of the wrong theme. Dark is the safe fallback if anything
 * is missing or throws. Kept dependency-free and tiny on purpose.
 */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(
    THEME_STORAGE_KEY,
  )};var p=localStorage.getItem(k);if(p!=='light'&&p!=='dark'&&p!=='system'){p='dark';}var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=p==='system'?(d?'dark':'light'):p;var e=document.documentElement;e.setAttribute('data-theme',r);e.style.colorScheme=r;}catch(e){var el=document.documentElement;el.setAttribute('data-theme','dark');el.style.colorScheme='dark';}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
