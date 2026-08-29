import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Clock, 
  Share2, 
  Flame,
  Shirt,
  Leaf
} from 'lucide-react';

export interface CleanlinessCampaign {
  id: string;
  title: string;
  category: string;
  tagline: string;
  ward: string;
  locationName: string;
  dateStr: string;
  timeStr: string;
  registeredCount: number;
  maxTarget: number;
  organizer: string;
  leaderBadge: string;
  objectives: string[];
  equipmentProvided: string[];
  bannerGradient: string;
}

export const SAMPLE_CAMPAIGNS: CleanlinessCampaign[] = [
  {
    id: 'market-drive-1',
    title: 'Sunday Mega Plastic-Free Market Drive',
    category: 'MoHUA Special CTU Market Cleanliness Drive',
    tagline: 'Eliminating Single-Use Plastics & Spot Segregation across 140+ Vendor Stalls',
    ward: 'Ward 4 - Central Zone',
    locationName: 'Verad Gate Sabzi Mandi & Wholesale Market Plaza',
    dateStr: 'Sunday, 31 August 2026',
    timeStr: '07:00 AM - 10:30 AM IST',
    registeredCount: 48,
    maxTarget: 100,
    organizer: 'Ward 4 SBM Nodal Desk & Swachhata Doot Youth Brigade',
    leaderBadge: 'MoHUA CTU Gold Certified',
    objectives: [
      'Single-use plastic bag replacement with eco-jute bags for shoppers & fruit vendors',
      'Desilting & spot-cleaning of perimeter stormwater runoff drains',
      'Geotagging persistent commercial black-spots for automated municipal bobcat clearance',
      'Awareness kiosk distribution of Swachhata QR feedback badges'
    ],
    equipmentProvided: [
      'High-Visibility Reflective Safety Vest (MoHUA Swachhata Doot)',
      'Heavy-duty puncture-resistant work gloves & trash grabber tongs',
      'Dual-color segregation bio-bags (Wet & Dry)',
      'Refreshment hydration kit & SBM digital certificate of honor'
    ],
    bannerGradient: 'from-[#0d5c52] to-[#166534]'
  },
  {
    id: 'drain-drive-2',
    title: 'Ward 4 Stormwater Drain Awareness Campaign',
    category: 'Urban Flood Prevention & Desilting Action',
    tagline: 'Community desilting spot-checks & zero-plastic gutter grates',
    ward: 'Ward 4 - Central Zone',
    locationName: 'Community Hall, Sector 3 Plaza',
    dateStr: 'Friday, 5 September 2026',
    timeStr: '05:00 PM - 07:30 PM IST',
    registeredCount: 32,
    maxTarget: 60,
    organizer: 'Ward 4 Municipal Engineering Division & Resident Welfare Assoc.',
    leaderBadge: 'Pre-Monsoon Preparedness',
    objectives: [
      'Surveying clogged rainwater inlets before evening monsoon spells',
      'Tagging unauthorized commercial debris dumps blocking catch-basins',
      'Community pledge against open disposal of construction sludge'
    ],
    equipmentProvided: [
      'Safety goggles & rubber boots',
      'Drain audit clipboards & mobile GIS logger',
      'Hydration pack & participation badge'
    ],
    bannerGradient: 'from-[#1e3a8a] to-[#0d5c52]'
  }
];

interface SwachhataDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: CleanlinessCampaign;
  onRegisteredSuccess?: (campaignId: string) => void;
}

export const SwachhataDriveModal: React.FC<SwachhataDriveModalProps> = ({
  isOpen,
  onClose,
  campaign = SAMPLE_CAMPAIGNS[0],
  onRegisteredSuccess
}) => {
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [participantCount, setParticipantCount] = useState<number>(campaign.registeredCount);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleToggleJoin = () => {
    if (!isJoined) {
      setIsJoined(true);
      setParticipantCount(prev => prev + 1);
      setToastMsg('🎉 Congratulations! You are registered for the Cleanliness Drive. Kit will be issued at Gate No. 2.');
      setShowToast(true);
      if (onRegisteredSuccess) onRegisteredSuccess(campaign.id);
      setTimeout(() => setShowToast(false), 4500);
    } else {
      setIsJoined(false);
      setParticipantCount(prev => Math.max(0, prev - 1));
      setToastMsg('Registration cancelled.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`Join the ${campaign.title} in ${campaign.ward} on ${campaign.dateStr}! Let's make our city 100% clean.`);
      setToastMsg('📋 Campaign link copied to clipboard!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative z-[9999] bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800">
        
        {/* Banner Header */}
        <div className={`p-5 bg-gradient-to-r ${campaign.bannerGradient} text-white relative flex-shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1.5 pr-8">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block border border-white/30">
              {campaign.category}
            </span>
            <h2 className="text-lg sm:text-xl font-black leading-tight">
              {campaign.title}
            </h2>
            <p className="text-xs text-teal-100 line-clamp-2">
              {campaign.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-white/20 text-xs">
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>{campaign.dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-teal-200" />
              <span>{campaign.timeStr}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg font-bold text-amber-300">
              <Users className="w-3.5 h-3.5" />
              <span>{participantCount} / {campaign.maxTarget} Volunteers</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Toast feedback */}
          {showToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in slide-in-from-top-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Location & Assembly Point */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <MapPin className="w-4 h-4" />
              <span>Assembly & Staging Location</span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {campaign.locationName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Jurisdiction: {campaign.ward} • Assembly Point: Gate No. 2, Swachhata Helpdesk
            </p>
          </div>

          {/* Drive Objectives */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Key Focus Objectives</span>
            </h4>
            <div className="space-y-1.5">
              {campaign.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment Provided */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-blue-600" />
              <span>Safety Gear & Kit Provided by MoHUA</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {campaign.equipmentProvided.map((eq, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="line-clamp-2">{eq}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Volunteer Recognition */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Swachh Survekshan Karma Credit</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400">+50 Points to Volunteer Leaderboard Profile</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded-md">
              Verified
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={handleToggleJoin}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-sm ${
              isJoined
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isJoined ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Registered as Volunteer ✓ (Tap to Leave)</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-blue-300" />
                <span>Join Cleanliness Drive</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
