"use client";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
const theme = EditorView.theme({
  "&": { fontSize: "13px", backgroundColor: "#fff", color: "#1c3046" },
  ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", lineHeight: "1.8", padding: "16px 0", caretColor: "#2459bd" },
  ".cm-gutters": { backgroundColor: "#f0f3f7", color: "#62748a", border: "none", paddingRight: "8px" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#eaf0fa" },
  ".cm-cursor": { borderLeftColor: "#2459bd" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#cbdcf5" },
  ".cm-scroller": { overflowX: "hidden" },
  ".cm-foldPlaceholder": { backgroundColor: "#eaf0fa", border: "none", color: "#2459bd" },
});
const highlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: "#7134a5" },
  { tag: [tags.string, tags.regexp], color: "#196e50" },
  { tag: [tags.number, tags.bool, tags.null], color: "#ac3b27" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#2459bd" },
  { tag: tags.comment, color: "#62748a", fontStyle: "italic" },
  { tag: [tags.tagName, tags.typeName], color: "#964322" },
  { tag: tags.propertyName, color: "#195e75" },
]));
export function CodeEditor({ path, value, editable, onChange }: { path: string; value: string; editable: boolean; onChange: (value: string) => void }) {
  const language = path.endsWith(".json") ? json() : path.endsWith(".html") ? html() : path.endsWith(".css") ? css() : javascript({ jsx: true });
  return <CodeMirror key={path} aria-label={"Code editor for " + path} value={value} height="460px" theme={theme} editable={editable}
    extensions={[language, highlight, EditorView.lineWrapping, EditorView.contentAttributes.of({ "aria-label": "Code editor for " + path })]}
    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, bracketMatching: true, indentOnInput: true, autocompletion: true }}
    indentWithTab onChange={onChange}/>;
}
