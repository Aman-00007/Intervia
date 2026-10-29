import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useState } from "react";

function getAppTheme(): "light" | "dark" {
  const app = document.querySelector(".app");
  return app?.classList.contains("dark") ? "dark" : "light";
}

export function MonacoEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [theme, setTheme] = useState<"light" | "dark">(() => getAppTheme());

  useEffect(() => {
    const app = document.querySelector(".app");
    if (!app) return;

    const syncTheme = () => setTheme(getAppTheme());
    syncTheme();

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === "attributes")) {
        syncTheme();
      }
    });

    observer.observe(app, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleEditorDidMount: OnMount = (editor) => {
    editor.focus();
    editor.updateOptions({
      cursorBlinking: "blink",
      cursorSmoothCaretAnimation: "off",
      smoothScrolling: false,
      wordWrap: "on",
      lineNumbers: "on",
      lineNumbersMinChars: 4,
      minimap: { enabled: false },
      renderLineHighlight: "line",
    });
  };

  const activeTheme = theme === "dark" ? "intervia-dark" : "intervia-light";

  return (
    <div className="monaco-editor-shell" aria-label="Code editor shell">
      <Editor
        height="420px"
        language="python"
        value={value}
        theme={activeTheme}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onMount={handleEditorDidMount}
        loading={<div className="editor-loading">Loading editor…</div>}
        beforeMount={(monaco) => {
          monaco.editor.defineTheme("intervia-light", {
            base: "vs",
            inherit: true,
            rules: [
              { token: "keyword", foreground: "7B41D9" },
              { token: "string", foreground: "13795B" },
              { token: "number", foreground: "1F2937" },
              { token: "comment", foreground: "6B7280" },
              { token: "type", foreground: "7B41D9" },
              { token: "identifier", foreground: "111827" },
            ],
            colors: {
              "editor.background": "#F7F8FA",
              "editor.foreground": "#111827",
              "editorCursor.foreground": "#7B41D9",
              "editor.selectionBackground": "#E1D7FF",
              "editor.inactiveSelectionBackground": "#F0E7FF",
              "editor.lineHighlightBackground": "#F1F5F9",
              "editor.lineHighlightBorder": "#E5E7EB",
              "editorLineNumber.foreground": "#6B7280",
              "editorLineNumber.activeForeground": "#111827",
              "editorLineNumber.dimmedForeground": "#6B7280",
              "editorGutter.background": "#EEF1F4",
              "editorGutter.border": "#D9E0E5",
              "editorIndentGuide.background": "#DDE3E8",
              "editorIndentGuide.activeBackground": "#B7C1C8",
              "editorWidget.background": "#FFFFFF",
              "editorWidget.border": "#D6DCE2",
              "scrollbarSlider.background": "#BCC7CF",
              "scrollbarSlider.hoverBackground": "#9AA7B3",
              "scrollbarSlider.activeBackground": "#7F8E9B",
            },
          });

          monaco.editor.defineTheme("intervia-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "keyword", foreground: "C49CFF" },
              { token: "string", foreground: "8EE6D8" },
              { token: "number", foreground: "EAF3F3" },
              { token: "comment", foreground: "7B8A8A" },
              { token: "type", foreground: "C49CFF" },
              { token: "identifier", foreground: "EAF3F3" },
            ],
            colors: {
              "editor.background": "#050D10",
              "editor.foreground": "#ECF3F3",
              "editorCursor.foreground": "#B88CFF",
              "editor.selectionBackground": "#2A1F36",
              "editor.inactiveSelectionBackground": "#1D2B2F",
              "editor.lineHighlightBackground": "#0C171A",
              "editor.lineHighlightBorder": "#1B2A2D",
              "editorLineNumber.foreground": "#70807D",
              "editorLineNumber.activeForeground": "#EAF3F3",
              "editorLineNumber.dimmedForeground": "#70807D",
              "editorGutter.background": "#0A1217",
              "editorGutter.border": "#1F2B30",
              "editorIndentGuide.background": "#1A2B2D",
              "editorIndentGuide.activeBackground": "#334448",
              "editorWidget.background": "#111C20",
              "editorWidget.border": "#2A3940",
              "editorSuggestWidget.background": "#121F22",
              "editorSuggestWidget.border": "#2A3940",
              "scrollbarSlider.background": "#334E55",
              "scrollbarSlider.hoverBackground": "#3A5A61",
              "scrollbarSlider.activeBackground": "#4E707B",
            },
          });
        }}
        options={{
          automaticLayout: true,
          fontFamily: '"DM Mono", "SFMono-Regular", Consolas, monospace',
          fontSize: 12,
          lineHeight: 24,
          letterSpacing: 0,
          padding: { top: 18, bottom: 18 },
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: "line",
          lineNumbersMinChars: 4,
          wordWrap: "on",
          stickyScroll: { enabled: false },
          fixedOverflowWidgets: false,
          contextmenu: true,
          glyphMargin: false,
          folding: false,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          smoothScrolling: false,
          cursorBlinking: "blink",
          selectOnLineNumbers: true,
          matchBrackets: "always",
          renderWhitespace: "selection",
          links: false,
          autoIndent: "full",
          tabSize: 4,
          insertSpaces: true,
          bracketPairColorization: { enabled: true },
          lineNumbers: "on",
          roundedSelection: false,
          fontLigatures: false,
        }}
      />
    </div>
  );
}
