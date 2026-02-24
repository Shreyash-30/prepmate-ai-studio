/**
 * MonacoEditor Component
 * Code editor with syntax highlighting, themes, and keyboard shortcuts
 * Non-blocking inline assist with Ctrl+Space
 */

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Zap, ChevronDown } from 'lucide-react';

interface MonacoEditorProps {
  defaultValue?: string;
  language?: string;
  theme?: 'light' | 'dark';
  onChange?: (value: string) => void;
  onInlineAssist?: (code: string, cursorLine: number) => void;
  loading?: boolean;
  height?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
}

// Monaco is loaded via CDN in index.html
declare global {
  namespace monaco {
    namespace editor {
      function create(
        container: HTMLElement,
        options: any
      ): any;
    }
    namespace languages {
      function register(language: any): void;
      function setMonarchTokensProvider(language: string, grammar: any): void;
    }
  }
}

export function MonacoEditor({
  defaultValue = '',
  language = 'python',
  theme: externalTheme,
  onChange,
  onInlineAssist,
  loading = false,
  height = '400px',
  readOnly = false,
  showLineNumbers = true,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const { theme: contextTheme } = useTheme();
  const [assistLoading, setAssistLoading] = useState(false);
  const [showAssistDropdown, setShowAssistDropdown] = useState(false);

  const currentTheme = externalTheme || contextTheme || 'light';
  const monacoTheme = currentTheme === 'dark' ? 'vs-dark' : 'vs';

  // Initialize Monaco editor
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;
    if (!(window as any).monaco) {
      console.warn('Monaco not loaded yet');
      return;
    }

    const editor = (window as any).monaco.editor.create(containerRef.current, {
      value: defaultValue,
      language,
      theme: monacoTheme,
      fontSize: 14,
      fontFamily: 'Fira Code, monospace',
      readOnly,
      lineNumbers: showLineNumbers ? 'on' : 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      'bracketPairColorization.independentColorPoolPerBracketType': true,
    });

    editorRef.current = editor;

    // Handle content changes
    const disposable = editor.onDidChangeModelContent(() => {
      onChange?.(editor.getValue());
    });

    return () => {
      disposable.dispose();
    };
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && (window as any).monaco) {
      (window as any).monaco.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editorRef.current) return;

    const disposable = editorRef.current.onKeyDown((e: any) => {
      // Ctrl+Space for inline assist
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 32) { // Spacebar
        e.preventDefault();
        const cursor = editorRef.current.getPosition();
        const code = editorRef.current.getValue();
        
        if (onInlineAssist && !assistLoading) {
          setAssistLoading(true);
          onInlineAssist(code, cursor.lineNumber).finally(() => {
            setAssistLoading(false);
          });
        }
        setShowAssistDropdown(true);
      }
    });

    return () => disposable.dispose();
  }, [onInlineAssist, assistLoading]);

  return (
    <div className="relative w-full rounded-lg border border-border overflow-hidden bg-background">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between bg-muted px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {language.charAt(0).toUpperCase() + language.slice(1)} • Line: 1
          </span>
        </div>
        <button
          onClick={() => setShowAssistDropdown(!showAssistDropdown)}
          disabled={loading || assistLoading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium 
                     bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 
                     transition-colors"
          title="Ctrl+Space for inline assist"
        >
          <Zap className="h-3 w-3" />
          Assist
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Monaco container */}
      <div ref={containerRef} style={{ height }} className="relative" />

      {/* Assist dropdown (non-blocking) */}
      {showAssistDropdown && (
        <div className="absolute bottom-0 right-0 z-10 bg-popover border border-border rounded-lg 
                        shadow-lg p-2 min-w-[200px] max-w-[300px]">
          <div className="text-xs text-muted-foreground px-2 py-1">
            {assistLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                Analyzing code...
              </div>
            ) : (
              <div>
                <p className="font-medium mb-1">💡 Inline Assist</p>
                <p className="text-muted-foreground">
                  Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Space</kbd> for suggestions
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-5">
          <div className="text-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent 
                            animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonacoEditor;
