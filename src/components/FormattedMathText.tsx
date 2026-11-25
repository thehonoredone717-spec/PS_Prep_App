import { Fragment } from 'react';

interface FormattedMathTextProps {
  text: string;
}

const MATH_TOKEN_RE =
  /(\^(?:\((?:[^()]|\([^()]*\))*\)|[a-zA-Z0-9−+\-]+)|\b[a-zA-Z]_[a-zA-Z0-9]+\b)/g;

export function FormattedMathText({ text }: FormattedMathTextProps) {
  const parts: Array<{ kind: 'text' | 'sup' | 'sub'; value: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, idx) });
    }

    const token = match[0];
    if (token.startsWith('^')) {
      let exp = token.slice(1);
      if (exp.startsWith('(') && exp.endsWith(')')) {
        exp = exp.slice(1, -1);
      }
      parts.push({ kind: 'sup', value: exp });
    } else {
      const [base, sub] = token.split('_');
      parts.push({ kind: 'text', value: base });
      parts.push({ kind: 'sub', value: sub });
    }

    lastIndex = idx + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) });
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === 'sup') {
          return (
            <sup key={i} className="ml-0.5 text-[0.75em] font-semibold text-teal-800">
              {part.value}
            </sup>
          );
        }
        if (part.kind === 'sub') {
          return (
            <sub key={i} className="ml-0.5 text-[0.75em] font-semibold text-teal-800">
              {part.value}
            </sub>
          );
        }
        return <Fragment key={i}>{part.value}</Fragment>;
      })}
    </>
  );
}
