// Regenerate public/og-image.png (1200x630 Open Graph card) with: node scripts/og-image.mjs
import sharp from "sharp";

const escape = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&apos;");

const line = (text, y, size, fill, weight = 750, family = "Manrope, 'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", spacing = "-3") =>
  `<text x="90" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="${spacing}">${escape(text)}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f3f5f8"/>
  <rect x="0" y="622" width="1200" height="8" fill="#2459bd"/>
  ${line("</> BrokenRepo", 96, 40, "#2459bd", 800, "ui-monospace, 'SF Mono', Menlo, monospace", "0")}
  ${line("It’s broken.", 250, 104, "#1c3046")}
  ${line("Find out why.", 366, 104, "#2459bd")}
  ${line("Code debugging practice on real MERN repos.", 452, 34, "#475e76", 600)}
  ${line("Fix the bug. Run the hidden tests. Prove the fix.", 500, 34, "#475e76", 600)}
  ${line("15 challenges · React · Express · MongoDB · Node", 576, 24, "#53657a", 600, "ui-monospace, 'SF Mono', Menlo, monospace", "0")}
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og-image.png");
console.log("wrote public/og-image.png");
