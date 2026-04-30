import type { AnchorHTMLAttributes, ReactNode } from 'react';

interface BlackBorderButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  invert?: boolean;
}

const BlackBorderButtonLink = ({
  children,
  className = '',
  invert = false,
  rel = 'noreferrer noopener',
  target = '_blank',
  ...props
}: BlackBorderButtonLinkProps) => {
  const baseColor = invert ? 'bg-white' : 'bg-black';
  const childColor = invert
    ? 'border-white bg-black text-white'
    : 'border-black bg-white text-black';

  return (
    <a
      className={`inline-flex cursor-pointer rounded-xl border-0 p-0 text-[17px] font-bold no-underline ${baseColor} ${className}`}
      rel={rel}
      target={target}
      {...props}
    >
      <span
        className={`box-border inline-flex -translate-y-[0.2em] items-center rounded-xl border-2 px-6 py-3 transition-transform duration-100 ease-in hover:-translate-y-[0.33em] active:translate-y-0 ${childColor}`}
      >
        {children}
      </span>
    </a>
  );
};

export default BlackBorderButtonLink;
