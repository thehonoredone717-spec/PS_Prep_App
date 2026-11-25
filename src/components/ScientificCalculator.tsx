import { Calculator, Delete, GripHorizontal, History, RotateCcw, X } from 'lucide-react';
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { UILanguage } from '../types/quiz';

interface ScientificCalculatorProps {
  lang: UILanguage;
  open: boolean;
  onClose: () => void;
}

type AngleUnit = 'DEG' | 'RAD';

interface CalcHistoryEntry {
  expr: string;
  result: string;
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'id'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

function factorial(n: number): number {
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || n > 170) {
    throw new Error('Math Error');
  }
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

function formatResult(num: number): string {
  if (!Number.isFinite(num)) {
    throw new Error('Math Error');
  }
  if (Object.is(num, -0) || Math.abs(num) < 1e-13) {
    return '0';
  }
  const clean = Number(num.toPrecision(12));
  if (Math.abs(clean) >= 1e12 || (Math.abs(clean) > 0 && Math.abs(clean) < 1e-7)) {
    return clean.toExponential(8).replace(/\.?0+e/, 'e');
  }
  return String(clean);
}

function tokenize(raw: string): Token[] {
  const s = raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/\s+/g, '');

  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (/\d|\./.test(ch)) {
      let numStr = '';
      let dotSeen = false;
      while (i < s.length && (/\d/.test(s[i]) || (s[i] === '.' && !dotSeen))) {
        if (s[i] === '.') dotSeen = true;
        numStr += s[i];
        i++;
      }
      // Scientific notation like 1.5e-4 or 2e3 (only when 'e' is followed by digit or +/-digit)
      if (
        i < s.length &&
        (s[i] === 'e' || s[i] === 'E') &&
        ((i + 1 < s.length && /\d/.test(s[i + 1])) ||
          (i + 2 < s.length && (s[i + 1] === '+' || s[i + 1] === '-') && /\d/.test(s[i + 2])))
      ) {
        numStr += s[i++];
        if (s[i] === '+' || s[i] === '-') {
          numStr += s[i++];
        }
        while (i < s.length && /\d/.test(s[i])) {
          numStr += s[i++];
        }
      }
      const val = Number(numStr);
      if (Number.isNaN(val)) throw new Error('Syntax Error');
      tokens.push({ type: 'num', value: val });
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let id = '';
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        id += s[i];
        i++;
      }
      tokens.push({ type: 'id', value: id.toLowerCase() });
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if ('+-*/^%!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error('Syntax Error');
  }

  // Insert implicit multiplication where mathematically natural:
  // e.g. 2pi, 2(3), (2)(3), pi(2), 2sin(30), 2ans
  const withImplicit: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const cur = tokens[idx];
    const prev = withImplicit[withImplicit.length - 1];
    if (prev) {
      const prevIsValue =
        prev.type === 'num' ||
        prev.type === 'rparen' ||
        (prev.type === 'op' && (prev.value === '!' || prev.value === '%')) ||
        (prev.type === 'id' && (prev.value === 'pi' || prev.value === 'e' || prev.value === 'ans'));
      const curStartsFactor = cur.type === 'lparen' || cur.type === 'id' || cur.type === 'num';
      if (prevIsValue && curStartsFactor) {
        withImplicit.push({ type: 'op', value: '*' });
      }
    }
    withImplicit.push(cur);
  }

  return withImplicit;
}

function evaluateExpression(raw: string, angleUnit: AngleUnit, ansValue: number): string {
  if (!raw.trim()) return '0';
  const tokens = tokenize(raw);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  const toRad = (v: number) => (angleUnit === 'DEG' ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (angleUnit === 'DEG' ? (v * 180) / Math.PI : v);

  function parseExpression(): number {
    let left = parseTerm();
    while (true) {
      const t = peek();
      if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
        consume();
        const right = parseTerm();
        left = t.value === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (true) {
      const t = peek();
      if (t?.type === 'op' && (t.value === '*' || t.value === '/')) {
        consume();
        const right = parsePower();
        if (t.value === '/') {
          if (right === 0) throw new Error('Math Error');
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    const t = peek();
    if (t?.type === 'op' && t.value === '^') {
      consume();
      const exp = parsePower(); // right-associative
      const res = Math.pow(base, exp);
      if (!Number.isFinite(res)) throw new Error('Math Error');
      return res;
    }
    return base;
  }

  function parseUnary(): number {
    const t = peek();
    if (t?.type === 'op' && t.value === '-') {
      consume();
      return -parseUnary();
    }
    if (t?.type === 'op' && t.value === '+') {
      consume();
      return parseUnary();
    }
    return parsePostfix();
  }

  function parsePostfix(): number {
    let val = parsePrimary();
    while (true) {
      const t = peek();
      if (t?.type === 'op' && t.value === '!') {
        consume();
        val = factorial(val);
      } else if (t?.type === 'op' && t.value === '%') {
        consume();
        val = val / 100;
      } else {
        break;
      }
    }
    return val;
  }

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new Error('Syntax Error');

    if (t.type === 'num') {
      consume();
      return t.value;
    }

    if (t.type === 'lparen') {
      consume();
      const val = parseExpression();
      const close = peek();
      if (close?.type !== 'rparen') throw new Error('Syntax Error');
      consume();
      return val;
    }

    if (t.type === 'id') {
      consume();
      const name = t.value;
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      if (name === 'ans') return ansValue;

      const argToken = peek();
      let arg: number;
      if (argToken?.type === 'lparen') {
        consume();
        arg = parseExpression();
        const close = peek();
        if (close?.type !== 'rparen') throw new Error('Syntax Error');
        consume();
      } else {
        arg = parseUnary();
      }

      switch (name) {
        case 'sin':
          return Math.sin(toRad(arg));
        case 'cos':
          return Math.cos(toRad(arg));
        case 'tan': {
          const rad = toRad(arg);
          if (Math.abs(Math.cos(rad)) < 1e-14) throw new Error('Math Error');
          return Math.tan(rad);
        }
        case 'asin':
          if (arg < -1 || arg > 1) throw new Error('Math Error');
          return fromRad(Math.asin(arg));
        case 'acos':
          if (arg < -1 || arg > 1) throw new Error('Math Error');
          return fromRad(Math.acos(arg));
        case 'atan':
          return fromRad(Math.atan(arg));
        case 'sqrt':
          if (arg < 0) throw new Error('Math Error');
          return Math.sqrt(arg);
        case 'cbrt':
          return Math.cbrt(arg);
        case 'log':
          if (arg <= 0) throw new Error('Math Error');
          return Math.log10(arg);
        case 'ln':
          if (arg <= 0) throw new Error('Math Error');
          return Math.log(arg);
        case 'abs':
          return Math.abs(arg);
        case 'exp':
          return Math.exp(arg);
        default:
          throw new Error('Syntax Error');
      }
    }

    throw new Error('Syntax Error');
  }

  const value = parseExpression();
  if (pos !== tokens.length) throw new Error('Syntax Error');
  return formatResult(value);
}

export function ScientificCalculator({ lang, open, onClose }: ScientificCalculatorProps) {
  const [expr, setExpr] = useState<string>('');
  const [display, setDisplay] = useState<string>('0');
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [ans, setAns] = useState<number>(0);
  const [justEvaluated, setJustEvaluated] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [calcHistory, setCalcHistory] = useState<CalcHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [secondMode, setSecondMode] = useState<boolean>(false);

  // Draggable position offset
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const uz = lang === 'uz';

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.origX + dx,
      y: dragRef.current.origY + dy,
    });
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const appendToken = useCallback(
    (token: string, continueAfterEval = false) => {
      setErrorText(null);
      if (justEvaluated) {
        if (continueAfterEval) {
          setExpr(`ANS${token}`);
        } else {
          setExpr(token);
        }
        setJustEvaluated(false);
        return;
      }
      setExpr((prev) => prev + token);
    },
    [justEvaluated]
  );

  const handleClear = useCallback(() => {
    setExpr('');
    setDisplay('0');
    setErrorText(null);
    setJustEvaluated(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setErrorText(null);
    if (justEvaluated) {
      setJustEvaluated(false);
    }
    setExpr((prev) => {
      if (!prev) return '';
      const fnSuffixes = ['asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'abs(', 'ANS'];
      for (const suf of fnSuffixes) {
        if (prev.endsWith(suf)) {
          return prev.slice(0, -suf.length);
        }
      }
      return prev.slice(0, -1);
    });
  }, [justEvaluated]);

  const handleEvaluate = useCallback(() => {
    if (!expr.trim()) return;
    try {
      const resultStr = evaluateExpression(expr, angleUnit, ans);
      const numeric = Number(resultStr);
      setDisplay(resultStr);
      if (Number.isFinite(numeric)) {
        setAns(numeric);
      }
      setCalcHistory((prev) => [{ expr, result: resultStr }, ...prev].slice(0, 6));
      setJustEvaluated(true);
      setErrorText(null);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Error');
    }
  }, [expr, angleUnit, ans]);

  const handleNegate = useCallback(() => {
    setErrorText(null);
    if (justEvaluated) {
      setExpr(`-(${display})`);
      setJustEvaluated(false);
      return;
    }
    setExpr((prev) => {
      if (!prev) return '-';
      if (prev.startsWith('-(') && prev.endsWith(')')) {
        return prev.slice(2, -1);
      }
      return `-(${prev})`;
    });
  }, [display, justEvaluated]);

  // Keyboard support ONLY when calculator panel itself is focused
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!el.contains(document.activeElement)) return;
      if (/^[0-9.()]$/.test(e.key)) {
        e.preventDefault();
        appendToken(e.key, false);
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/' || e.key === '^') {
        e.preventDefault();
        const mapped = e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key === '-' ? '−' : e.key;
        appendToken(mapped, true);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, appendToken, handleEvaluate, handleBackspace, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={uz ? 'Ilmiy kalkulyator' : 'Scientific Calculator'}
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      className="fixed bottom-4 left-4 z-[60] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-300 bg-slate-900 text-white shadow-2xl select-none sm:w-[368px]"
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        className="flex cursor-grab items-center justify-between border-b border-slate-800 bg-slate-950/90 px-3.5 py-2.5 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-teal-400" aria-hidden="true" />
          <span className="text-xs font-bold tracking-wide text-slate-100">
            {uz ? 'Ilmiy kalkulyator' : 'Scientific Calculator'}
          </span>
          <GripHorizontal className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAngleUnit((u) => (u === 'DEG' ? 'RAD' : 'DEG'))}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono-num text-[11px] font-bold text-teal-300 hover:bg-slate-700"
            title={uz ? 'Burchak birligi: DEG / RAD' : 'Angle unit: DEG / RAD'}
          >
            {angleUnit}
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className={`rounded-md p-1 transition-colors ${
              showHistory ? 'bg-teal-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title={uz ? 'Hisoblar tarixi' : 'History'}
            aria-label={uz ? 'Hisoblar tarixi' : 'History'}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOffset({ x: 0, y: 0 });
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title={uz ? 'Joyini tiklash' : 'Reset position'}
            aria-label={uz ? 'Joyini tiklash' : 'Reset position'}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-rose-600 hover:text-white"
            title={uz ? 'Yopish' : 'Close'}
            aria-label={uz ? 'Yopish' : 'Close'}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="max-h-32 overflow-y-auto border-b border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs">
          {calcHistory.length === 0 ? (
            <p className="py-1 text-slate-500">
              {uz ? 'Hali hisob-kitoblar yo‘q' : 'No calculations yet'}
            </p>
          ) : (
            <div className="space-y-1">
              {calcHistory.map((item, idx) => (
                <button
                  key={`${item.expr}-${idx}`}
                  type="button"
                  onClick={() => {
                    setExpr(item.result);
                    setDisplay(item.result);
                    setJustEvaluated(false);
                    setShowHistory(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-slate-800"
                >
                  <span className="truncate font-mono-num text-slate-400">{item.expr}</span>
                  <span className="font-mono-num font-bold text-teal-300">= {item.result}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Display */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-right">
        <div className="min-h-[20px] truncate font-mono-num text-xs text-slate-400">
          {expr || ' '}
        </div>
        <div
          className={`mt-1 truncate font-mono-num text-2xl font-bold ${
            errorText ? 'text-rose-400' : 'text-white'
          }`}
        >
          {errorText ?? display}
        </div>
      </div>

      {/* Scientific + Standard Keypad */}
      <div className="grid grid-cols-5 gap-1.5 bg-slate-900 p-3 font-mono-num text-xs font-semibold">
        {/* Row 1: Mode & Scientific */}
        <button
          type="button"
          onClick={() => setSecondMode((s) => !s)}
          className={`h-9 rounded-lg border transition-colors ${
            secondMode
              ? 'border-teal-500 bg-teal-700 text-white'
              : 'border-slate-700 bg-slate-800 text-teal-300 hover:bg-slate-700'
          }`}
        >
          2nd
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'asin(' : 'sin(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? 'sin⁻¹' : 'sin'}
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'acos(' : 'cos(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? 'cos⁻¹' : 'cos'}
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'atan(' : 'tan(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? 'tan⁻¹' : 'tan'}
        </button>
        <button
          type="button"
          onClick={() => appendToken('π', false)}
          className="h-9 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700"
        >
          π
        </button>

        {/* Row 2: Powers, Roots, Logs */}
        <button
          type="button"
          onClick={() => appendToken(secondMode ? '^(3)' : '^(2)', true)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? 'x³' : 'x²'}
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'cbrt(' : 'sqrt(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? '∛x' : '√x'}
        </button>
        <button
          type="button"
          onClick={() => appendToken('^', true)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          xʸ
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'exp(' : '10^(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? 'eˣ' : '10ˣ'}
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'ln(' : 'log(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? 'ln' : 'log'}
        </button>

        {/* Row 3: Brackets, Reciprocal, Factorial, Clear */}
        <button
          type="button"
          onClick={() => appendToken('(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          (
        </button>
        <button
          type="button"
          onClick={() => appendToken(')', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          )
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? 'abs(' : '1/(', false)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          {secondMode ? '|x|' : '1/x'}
        </button>
        <button
          type="button"
          onClick={() => appendToken('!', true)}
          className="h-9 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          n!
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="h-9 rounded-lg bg-rose-700/90 text-white hover:bg-rose-600"
        >
          AC
        </button>

        {/* Row 4: 7 8 9 ÷ DEL */}
        <button
          type="button"
          onClick={() => appendToken('7', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => appendToken('8', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => appendToken('9', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => appendToken('÷', true)}
          className="h-10 rounded-lg bg-slate-700 text-sm text-teal-300 hover:bg-slate-600"
        >
          ÷
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Backspace"
          className="flex h-10 items-center justify-center rounded-lg bg-slate-700 text-amber-300 hover:bg-slate-600"
        >
          <Delete className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Row 5: 4 5 6 × ×10^ */}
        <button
          type="button"
          onClick={() => appendToken('4', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => appendToken('5', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => appendToken('6', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => appendToken('×', true)}
          className="h-10 rounded-lg bg-slate-700 text-sm text-teal-300 hover:bg-slate-600"
        >
          ×
        </button>
        <button
          type="button"
          onClick={() => appendToken('×10^(', false)}
          className="h-10 rounded-lg bg-slate-800 text-[11px] text-teal-300 hover:bg-slate-700"
          title={uz ? 'Standart shakl (×10ⁿ)' : 'Standard form (×10ⁿ)'}
        >
          ×10ⁿ
        </button>

        {/* Row 6: 1 2 3 − e */}
        <button
          type="button"
          onClick={() => appendToken('1', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => appendToken('2', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => appendToken('3', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => appendToken('−', true)}
          className="h-10 rounded-lg bg-slate-700 text-sm text-teal-300 hover:bg-slate-600"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => appendToken(secondMode ? '%' : 'e', secondMode)}
          className="h-10 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700"
        >
          {secondMode ? '%' : 'e'}
        </button>

        {/* Row 7: ± 0 . + = */}
        <button
          type="button"
          onClick={handleNegate}
          className="h-10 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          ±
        </button>
        <button
          type="button"
          onClick={() => appendToken('0', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => appendToken('.', false)}
          className="h-10 rounded-lg bg-slate-800/80 text-sm text-white hover:bg-slate-700"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => appendToken('+', true)}
          className="h-10 rounded-lg bg-slate-700 text-sm text-teal-300 hover:bg-slate-600"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleEvaluate}
          className="h-10 rounded-lg bg-teal-600 text-base font-extrabold text-white hover:bg-teal-500"
        >
          =
        </button>

        {/* Row 8: ANS quick bar */}
        <button
          type="button"
          onClick={() => appendToken('ANS', false)}
          className="col-span-5 h-8 rounded-lg border border-slate-700/80 bg-slate-800/60 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          ANS ({formatResult(ans)})
        </button>
      </div>
    </div>
  );
}
