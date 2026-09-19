"use client";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
const theme = EditorView.theme({
  "&": { fontSize: "13px", backgroundColor: "var(--card)", color: "var(--foreground)" },
  ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", lineHeight: "1.8", padding: "16px 0", caretColor: "var(--primary)" },
  ".cm-gutters": { backgroundColor: "var(--editor-gutter)", color: "var(--code-comment)", border: "none", paddingRight: "8px" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--editor-active)" },
  ".cm-cursor": { borderLeftColor: "var(--primary)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "var(--selection)" },
  ".cm-scroller": { overflowX: "hidden" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--editor-active)", border: "none", color: "var(--primary)" },
});
const highlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syntax-keyword)" },
  { tag: [tags.string, tags.regexp], color: "var(--success)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--destructive)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--primary)" },
  { tag: tags.comment, color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [tags.tagName, tags.typeName], color: "var(--syntax-type)" },
  { tag: tags.propertyName, color: "var(--syntax-property)" },
]));
export function CodeEditor({ path, value, editable, onChange }: { path: string; value: string; editable: boolean; onChange: (value: string) => void }) {
  const language = path.endsWith(".json") ? json() : path.endsWith(".html") ? html() : path.endsWith(".css") ? css() : javascript({ jsx: true });
  return <CodeMirror key={path} aria-label={"Code editor for " + path} value={value} height="460px" theme={theme} editable={editable}
    extensions={[language, highlight, EditorView.lineWrapping, EditorView.contentAttributes.of({ "aria-label": "Code editor for " + path })]}
    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, bracketMatching: true, indentOnInput: true, autocompletion: true }}
    indentWithTab onChange={onChange}/>;
}
