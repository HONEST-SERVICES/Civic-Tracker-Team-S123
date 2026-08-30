import React, { useState } from 'react';
import { normalizeImageSrc, getUserInitial } from '../utils/imageUtils';
import { getUserInitials } from '../utils/userUtils';

interface UserAvatarProps {
  photoURL?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  initialsClassName?: string;
  showTwoInitials?: boolean;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-lg',
  custom: ''
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoURL,
  name,
  size = 'md',
  className = '',
  initialsClassName = '',
  showTwoInitials = false
}) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const sizeClass = SIZE_CLASSES[size];

  const displayName = name || 'Citizen';
  const initialText = showTwoInitials ? getUserInitials(displayName) : getUserInitial(displayName);
  const normalizedSrc = photoURL ? normalizeImageSrc(photoURL) : null;

  if (normalizedSrc && !hasError) {
    return (
      <div className={`relative rounded-full overflow-hidden shrink-0 ${sizeClass} ${className}`}>
        <img
          src={normalizedSrc}
          alt={displayName}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center rounded-full shadow-xs shrink-0 select-none ${sizeClass} ${className}`}
      title={displayName}
    >
      <span className={`leading-none ${initialsClassName}`}>{initialText}</span>
    </div>
  );
};
