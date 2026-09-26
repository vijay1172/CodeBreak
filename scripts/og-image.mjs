// Regenerate public/og-image.png (1200x630 Open Graph card) with: node scripts/og-image.mjs
import sharp from "sharp";

const escape = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&apos;");

const line = (text, y, size, fill, weight = 750, family = "Manrope, 'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", spacing = "-3", x = 90) =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="${spacing}">${escape(text)}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f3f5f8"/>
  <rect x="0" y="622" width="1200" height="8" fill="#ef4444"/>
  <g transform="translate(90 46) scale(0.82)">
    <path d="M14 10h9a4 4 0 0 1 2.9 1.2l3.6 3.8H50a6 6 0 0 1 6 6v3H8v-8a6 6 0 0 1 6-6z" fill="#243352"/>
    <rect x="8" y="18" width="48" height="38" rx="6" fill="#1c2b45"/>
    <path d="M40 12 34 26l7 10-10 11 4 9" fill="none" stroke="#7f1d1d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
    <path d="M40 12 34 26l7 10-10 11 4 9" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="34" cy="26" r="2.4" fill="#ef4444"/>
    <circle cx="41" cy="36" r="2.4" fill="#ef4444"/>
    <circle cx="31" cy="47" r="2.4" fill="#ef4444"/>
  </g>
  ${line("BrokenRepo", 96, 40, "#1c2b45", 800, "Manrope, 'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", "-1", 168)}
  ${line("It’s broken.", 250, 104, "#1c3046")}
  ${line("Find out why.", 366, 104, "#2459bd")}
  ${line("Code debugging practice on real MERN repos.", 452, 34, "#475e76", 600)}
  ${line("Fix the bug. Run the hidden tests. Prove the fix.", 500, 34, "#475e76", 600)}
  ${line("15 challenges · React · Express · MongoDB · Node", 576, 24, "#53657a", 600, "ui-monospace, 'SF Mono', Menlo, monospace", "0")}
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og-image.png");
console.log("wrote public/og-image.png");
