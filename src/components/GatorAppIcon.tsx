import React from 'react';

interface GatorAppIconProps {
  className?: string;
  size?: number | string;
}

export const GatorAppIcon: React.FC<GatorAppIconProps> = ({
  className = 'w-10 h-10',
  size,
}) => {
  return (
    <img
      src="/HacksIcon.svg"
      alt="GatorAccess Mascot Icon"
      width={size}
      height={size}
      className={`w-full h-full object-cover block select-none rounded-[22%] ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};
