'use client';

import { forwardRef } from 'react';

const BASE = 'w-full rounded-xl px-4 py-2.5 text-sm transition-colors outline-none';
const STYLE = { background: '#1E1B15', border: '1px solid rgba(210,181,106,.2)', color: '#F7F4EC' };
const FOCUS_STYLE = { borderColor: '#D2B56A' };

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AdminInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs" style={{ color: 'rgba(247,244,236,.45)', letterSpacing: '.05em' }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={BASE}
        style={STYLE}
        onFocus={e => Object.assign(e.currentTarget.style, FOCUS_STYLE)}
        onBlur={e => Object.assign(e.currentTarget.style, { borderColor: 'rgba(210,181,106,.2)' })}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: '#A8543A' }}>{error}</p>}
    </div>
  )
);
AdminInput.displayName = 'AdminInput';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function AdminTextarea({ label, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs" style={{ color: 'rgba(247,244,236,.45)', letterSpacing: '.05em' }}>
          {label}
        </label>
      )}
      <textarea
        className={`${BASE} resize-none`}
        style={STYLE}
        onFocus={e => Object.assign(e.currentTarget.style, FOCUS_STYLE)}
        onBlur={e => Object.assign(e.currentTarget.style, { borderColor: 'rgba(210,181,106,.2)' })}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function AdminSelect({ label, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs" style={{ color: 'rgba(247,244,236,.45)', letterSpacing: '.05em' }}>
          {label}
        </label>
      )}
      <select
        className={`${BASE} cursor-pointer`}
        style={{ ...STYLE, appearance: 'none' }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
