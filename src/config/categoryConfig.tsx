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
  HelpCircle,
  Flame,
  AlertOctagon,
  Waves,
  Bath,
  Footprints,
  SunMedium
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

  // 1. Specific Vehicle / Stoppage
  if (key.includes('VEHICLE') || key.includes('TRUCK')) {
    return {
      icon: Truck,
      altIcon: Trash2,
      containerClass: 'bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600'
    };
  }

  // 2. Street Sweeping
  if (key.includes('SWEEPING') || key.includes('BROOM') || key.includes('BRUSH')) {
    return {
      icon: Sparkles,
      altIcon: Recycle,
      containerClass: 'bg-amber-50 border-amber-200',
      iconClass: 'text-amber-600'
    };
  }

  // 3. Open Burning / Waste Fire
  if (key.includes('BURN') || key.includes('FLAME') || key.includes('FIRE')) {
    return {
      icon: Flame,
      altIcon: AlertTriangle,
      containerClass: 'bg-orange-50 border-orange-200',
      iconClass: 'text-orange-600'
    };
  }

  // 4. Agricultural Runoff / Farm Debris
  if (key.includes('AGRICULTUR') || key.includes('FARM') || key.includes('RURAL_GARBAGE') || key.includes('TRACTOR')) {
    return {
      icon: Tractor,
      altIcon: Sprout,
      containerClass: 'bg-lime-50 border-lime-200',
      iconClass: 'text-lime-700'
    };
  }

  // 5. Downed Power Line / Wire / Pole Hazard
  if (key.includes('DOWNED') || (key.includes('POWER') && key.includes('LINE')) || key.includes('POLE') || key.includes('BROKEN_POLE')) {
    return {
      icon: AlertOctagon,
      altIcon: Zap,
      containerClass: 'bg-rose-50 border-rose-200',
      iconClass: 'text-rose-600'
    };
  }

  // 6. Canal / Drainage Blockage / Waterlogging
  if (key.includes('CANAL') || key.includes('DRAIN') || key.includes('CULVERT') || key.includes('WATERLOGGING')) {
    return {
      icon: Droplets,
      altIcon: Waves,
      containerClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600'
    };
  }

  // 7. General Sanitation & Waste Dump
  if (
    key.includes('SANITATION') || 
    key.includes('GARBAGE') || 
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

  // 8. Public Toilets / Sanitation Blocks
  if (key.includes('TOILET') || key.includes('BATH') || key.includes('URINAL')) {
    return {
      icon: Bath,
      altIcon: Sparkles,
      containerClass: 'bg-teal-50 border-teal-200',
      iconClass: 'text-teal-600'
    };
  }

  // 9. Roads, Potholes & Cave-ins
  if (key.includes('SINKHOLE') || key.includes('CAVE_IN')) {
    return {
      icon: AlertOctagon,
      altIcon: Construction,
      containerClass: 'bg-rose-50 border-rose-200',
      iconClass: 'text-rose-600'
    };
  }

  if (
    key.includes('ROAD') || 
    key.includes('POTHOLE') || 
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

  // 10. Water Pipe Leak & Flooding
  if (
    key.includes('WATER') || 
    key.includes('FLOOD') ||
    key === 'DROPLETS' ||
    key === 'PIPETTE'
  ) {
    return {
      icon: Droplets,
      altIcon: Pipette,
      containerClass: 'bg-sky-50 border-sky-200',
      iconClass: 'text-sky-600'
    };
  }

  // 11. Streetlighting & Traffic Electricity
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
      altIcon: SunMedium,
      containerClass: 'bg-yellow-50 border-yellow-200',
      iconClass: 'text-yellow-600'
    };
  }

  // 12. Public Health & Critical Safety Hazards
  if (
    key.includes('HEALTH') || 
    key.includes('MANHOLE') ||
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
