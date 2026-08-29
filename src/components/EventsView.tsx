import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Award,
  ChevronRight,
  UserCheck,
  Search,
  Filter
} from 'lucide-react';
import { CleanlinessCampaign, SAMPLE_CAMPAIGNS } from './SwachhataDriveModal';

interface EventsViewProps {
  onSelectCampaign?: (campaign: CleanlinessCampaign) => void;
  onOpenCampaignModal?: (campaign: CleanlinessCampaign) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  onSelectCampaign,
  onOpenCampaignModal
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UPCOMING' | 'REGISTERED' | 'PAST'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [joinedDriveIds, setJoinedDriveIds] = useState<Record<string, boolean>>({
    'market-drive-1': true
  });
  const [volunteerKarmaPoints, setVolunteerKarmaPoints] = useState<number>(350);

  const toggleJoinDrive = (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    setJoinedDriveIds(prev => {
      const newState = !prev[campaignId];
      if (newState) {
        setVolunteerKarmaPoints(p => p + 50);
      } else {
        setVolunteerKarmaPoints(p => Math.max(0, p - 50));
      }
      return { ...prev, [campaignId]: newState };
    });
  };

  const filteredCampaigns = SAMPLE_CAMPAIGNS.filter(camp => {
    // Search query
    const matchSearch =
      camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.ward.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    // Filter tab
    if (selectedFilter === 'REGISTERED') {
      return Boolean(joinedDriveIds[camp.id]);
    }
    if (selectedFilter === 'UPCOMING') {
      return !camp.dateStr.toLowerCase().includes('past');
    }
    if (selectedFilter === 'PAST') {
      return camp.dateStr.toLowerCase().includes('past');
    }
    return true;
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
            🌿
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              Ward 4 Cleanliness Drives & SBM Campaigns
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Citizen volunteer drives, mega plastic-free events & spot cleanups
            </p>
          </div>
        </div>

        {/* Volunteer Karma Points Badge */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
          <Award className="w-4 h-4 text-blue-600" />
          <div className="text-right">
            <span className="text-xs font-black text-slate-900 block leading-tight">
              {volunteerKarmaPoints}
            </span>
            <span className="text-[9px] font-semibold text-slate-500 uppercase">Karma Pts</span>
          </div>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drives by name, landmark, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: `All Drives (${SAMPLE_CAMPAIGNS.length})` },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'REGISTERED', label: `Registered (${Object.values(joinedDriveIds).filter(Boolean).length})` },
            { id: 'PAST', label: 'Past Completed' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedFilter(chip.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedFilter === chip.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drives List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No matching drives found</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Try adjusting your search query or view all available community campaigns.
          </p>
          <button
            onClick={() => {
              setSelectedFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Show All Drives
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const isJoined = Boolean(joinedDriveIds[campaign.id]);
            const volunteerCount = campaign.registeredCount + (isJoined && campaign.id !== 'market-drive-1' ? 1 : 0);

            return (
              <div
                key={campaign.id}
                onClick={() => {
                  onSelectCampaign?.(campaign);
                  onOpenCampaignModal?.(campaign);
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-400 transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                        {campaign.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {campaign.ward}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                      {campaign.title}
                    </h3>
                  </div>

                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0 border border-slate-200">
                    {campaign.dateStr}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {campaign.tagline}
                </p>

                {/* Details Strip */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{campaign.locationName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{campaign.timeStr}</span>
                  </div>
                </div>

                {/* Safety Kit & SBM Perks Note */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate text-[11px]">Includes SBM Safety Kit & Certificate</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px] shrink-0">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{volunteerCount} / {campaign.maxTarget} Volunteers</span>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleJoinDrive(e, campaign.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isJoined
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Registered as Volunteer ✓</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        <span>Join This Cleanliness Drive</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCampaignModal?.(campaign);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
