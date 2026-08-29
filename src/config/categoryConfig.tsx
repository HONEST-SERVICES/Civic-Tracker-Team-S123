import React from 'react';
import { 
  Trash2, 
  Recycle, 
  Construction, 
  AlertTriangle, 
  Droplets, 
  Pipette, 
  Zap, 
  Lightbulb, 
  ShieldAlert, 
  Stethoscope, 
  Building2, 
  Landmark, 
  Home, 
  Building, 
  Tractor, 
  TreePine, 
  Sprout,
  Radio,
  Truck,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { DepartmentType } from '../types';

export interface CategoryIconStyle {
  icon: React.ComponentType<{ className?: string }>;
  altIcon?: React.ComponentType<{ className?: string }>;
  containerClass: string;
  iconClass: string;
}

export function getCategoryStyle(categoryOrDeptOrIcon: string): CategoryIconStyle {
  const key = (categoryOrDeptOrIcon || '').toUpperCase();

  // SANITATION & WASTE
  if (
    key.includes('SANITATION') || 
    key.includes('GARBAGE') || 
    key.includes('SWEEPING') || 
    key.includes('WASTE') ||
    key === 'TRASH2' ||
    key === 'RECYCLE'
  ) {
    return {
      icon: Trash2,
      altIcon: Recycle,
      containerClass: 'bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600'
    };
  }

  // ROADS & POTHOLES
  if (
    key.includes('ROAD') || 
    key.includes('POTHOLE') || 
    key.includes('SINKHOLE') || 
    key.includes('PUBLIC_WORKS') ||
    key === 'CONSTRUCTION' ||
    key === 'ALERTTRIANGLE'
  ) {
    return {
      icon: Construction,
      altIcon: AlertTriangle,
      containerClass: 'bg-amber-50 border-amber-200',
      iconClass: 'text-amber-600'
    };
  }

  // WATER SUPPLY & DRAINAGE
  if (
    key.includes('WATER') || 
    key.includes('DRAIN') || 
    key.includes('CANAL') || 
    key.includes('MANHOLE') || 
    key.includes('FLOOD') ||
    key === 'DROPLETS' ||
    key === 'PIPETTE'
  ) {
    return {
      icon: Droplets,
      altIcon: Pipette,
      containerClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600'
    };
  }

  // STREETLIGHTING & ELECTRICITY
  if (
    key.includes('LIGHT') || 
    key.includes('ELECTRIC') || 
    key.includes('POWER') || 
    key.includes('SIGNAL') ||
    key === 'ZAP' ||
    key === 'LIGHTBULB' ||
    key === 'RADIO'
  ) {
    return {
      icon: Zap,
      altIcon: Lightbulb,
      containerClass: 'bg-yellow-50 border-yellow-200',
      iconClass: 'text-yellow-600'
    };
  }

  // PUBLIC HEALTH & ENCROACHMENT
  if (
    key.includes('HEALTH') || 
    key.includes('TOILET') || 
    key.includes('SBM') || 
    key.includes('ENCROACH') ||
    key === 'STETHOSCOPE' ||
    key === 'SHIELDALERT'
  ) {
    return {
      icon: ShieldAlert,
      altIcon: Stethoscope,
      containerClass: 'bg-rose-50 border-rose-200',
      iconClass: 'text-rose-600'
    };
  }

  // Default Fallback
  return {
    icon: Building2,
    altIcon: Landmark,
    containerClass: 'bg-slate-50 border-slate-200',
    iconClass: 'text-slate-600'
  };
}

export interface SectorStyle {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  altIcon: React.ComponentType<{ className?: string }>;
}

export function getSectorStyle(sectorDomain: string): SectorStyle {
  const d = sectorDomain.toUpperCase();
  if (d.includes('URBAN') || d.includes('CORE') || d === 'URBAN_ROAD') {
    return {
      name: 'Urban Core',
      icon: Building2,
      altIcon: Landmark
    };
  }
  if (d.includes('SUBURBAN') || d.includes('BELT') || d === 'SANITATION_WATER') {
    return {
      name: 'Suburban Belt',
      icon: Home,
      altIcon: Building
    };
  }
  if (d.includes('RURAL') || d.includes('PERIPHERY') || d === 'RURAL_SUBURBAN') {
    return {
      name: 'Rural Periphery',
      icon: Tractor,
      altIcon: TreePine
    };
  }
  return {
    name: 'All Sectors',
    icon: Layers,
    altIcon: Building2
  };
}

export const CategoryIcon: React.FC<{
  categoryOrDeptOrIcon: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  useAltIcon?: boolean;
}> = ({ categoryOrDeptOrIcon, className = '', size = 'md', useAltIcon = false }) => {
  const style = getCategoryStyle(categoryOrDeptOrIcon);
  const IconComponent = useAltIcon && style.altIcon ? style.altIcon : style.icon;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base'
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5.5 h-5.5'
  }[size];

  return (
    <div className={`${sizeClasses} rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${style.containerClass} ${className}`}>
      <IconComponent className={`${iconSizes} ${style.iconClass}`} />
    </div>
  );
};
