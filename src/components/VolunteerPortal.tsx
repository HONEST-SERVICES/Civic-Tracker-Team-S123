import React, { useState } from 'react';
import { 
  HeartHandshake, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ThumbsUp, 
  ShieldCheck, 
  Award, 
  Star, 
  Filter, 
  AlertTriangle, 
  Search, 
  Sparkles,
  Users,
  Compass,
  Check,
  Flame,
  MessageSquare
} from 'lucide-react';
import { CrisisIncident, UserProfile, PublicFacility } from '../types';
import { INITIAL_PUBLIC_FACILITIES } from '../mockData';
import { updateComplaintInFirestore, ratePublicFacility } from '../services/firebase';

interface VolunteerPortalProps {
  incidents: CrisisIncident[];
  currentUser: UserProfile | null;
  onRefresh?: () => void;
}

export const VolunteerPortal: React.FC<VolunteerPortalProps> = ({
  incidents,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'VERIFY' | 'SANITATION' | 'LEADERBOARD'>('VERIFY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<PublicFacility[]>(INITIAL_PUBLIC_FACILITIES);
  const [selectedFacilityForRating, setSelectedFacilityForRating] = useState<string | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);

  const ward = currentUser?.assignedWard || 'Ward 4 - Central Zone';
  const volunteerName = currentUser?.name || 'Swachhata Doot';

  // Filter complaints
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch = (inc.title + ' ' + inc.description + ' ' + inc.location.address).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || inc.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const unverifiedCount = filteredIncidents.filter(i => !(i.verifiedByVolunteers && i.verifiedByVolunteers.length > 0)).length;
  const verifiedCount = filteredIncidents.filter(i => (i.verifiedByVolunteers && i.verifiedByVolunteers.length > 0)).length;

  const handleVerifyIncident = async (incident: CrisisIncident) => {
    setVerifyingId(incident.id);
    try {
      const currentVerified = incident.verifiedByVolunteers || [];
      if (!currentVerified.includes(volunteerName)) {
        const updated = [...currentVerified, volunteerName];
        await updateComplaintInFirestore(incident.id, {
          verifiedByVolunteers: updated
        });
        setFeedbackMsg(`✓ Spot-check confirmed for "${incident.title}". Ward Officer alerted!`);
      } else {
        setFeedbackMsg(`You have already verified this incident.`);
      }
    } catch (err) {
      console.warn('Verification error:', err);
    } finally {
      setVerifyingId(null);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleUpvoteIncident = async (incident: CrisisIncident) => {
    setUpvotingId(incident.id);
    try {
      const newVotes = (incident.communityUpvotes || 0) + 1;
      await updateComplaintInFirestore(incident.id, {
        communityUpvotes: newVotes
      });
      setFeedbackMsg(`👍 Upvoted urgency for "${incident.title}". Community Priority increased!`);
    } catch (err) {
      console.warn('Upvote error:', err);
    } finally {
      setUpvotingId(null);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleRateFacility = async (facId: string) => {
    try {
      await ratePublicFacility(facId, ratingVal);
      setFacilities(prev => prev.map(f => f.id === facId ? { ...f, rating: Number(((f.rating * (f.totalRatings || 1) + ratingVal) / ((f.totalRatings || 1) + 1)).toFixed(1)), totalRatings: (f.totalRatings || 1) + 1 } : f));
      setFeedbackMsg(`★ ${ratingVal}-Star Cleanliness review submitted for facility!`);
      setSelectedFacilityForRating(null);
    } catch (err) {
      console.warn('Rating facility err:', err);
    } finally {
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Volunteer Hero Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-emerald-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <HeartHandshake className="w-3.5 h-3.5" />
                Swachhata Doot • Volunteer Hub
              </span>
              <span className="bg-white/10 text-emerald-200 text-xs font-bold px-2 py-0.5 rounded border border-white/10">
                {ward}
              </span>
              <span className="bg-amber-400/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded border border-amber-400/30 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Rank: Tier-1 Champion
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {volunteerName} • Community Vigilance Desk
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              Empowering active citizens to spot-check reported hazards, upvote neighborhood emergencies, and review local sanitation hygiene to accelerate municipal action.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-black/30 p-3 rounded-xl border border-white/10">
            <div className="text-center px-2">
              <span className="text-2xl font-black text-amber-400">{unverifiedCount}</span>
              <p className="text-[10px] text-amber-200 uppercase font-semibold">Needs Spot-Check</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-black text-emerald-400">{verifiedCount}</span>
              <p className="text-[10px] text-emerald-200 uppercase font-semibold">Verified Active</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-black text-teal-300">450</span>
              <p className="text-[10px] text-teal-200 uppercase font-semibold">SBM Karma Pts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('VERIFY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'VERIFY'
              ? 'bg-[#2d7a70] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Ward Spot-Check Queue ({filteredIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SANITATION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'SANITATION'
              ? 'bg-[#2d7a70] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>SBM Toilet & Facility Audits ({facilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LEADERBOARD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'LEADERBOARD'
              ? 'bg-[#2d7a70] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Volunteer Impact Leaderboard</span>
        </button>
      </div>

      {/* TAB 1: SPOT-CHECK VERIFICATION QUEUE */}
      {activeTab === 'VERIFY' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search neighborhood hazards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2d7a70]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Filter:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="ALL">All Hazard Categories</option>
                <option value="DEEP_POTHOLE">Deep Potholes</option>
                <option value="GARBAGE_DUMP">Garbage Dumps</option>
                <option value="OPEN_MANHOLES">Open Manholes</option>
                <option value="WATERLOGGING">Waterlogging</option>
                <option value="STREETLIGHT_OUTAGE">Streetlight Outages</option>
                <option value="PUBLIC_TOILET_CLEANING">Public Toilet Issues</option>
              </select>
            </div>
          </div>

          {/* Incidents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.map((incident) => {
              const isVerified = (incident.verifiedByVolunteers || []).length > 0;
              const hasUserVerified = (incident.verifiedByVolunteers || []).includes(volunteerName);

              return (
                <div
                  key={incident.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        incident.priority === 'P1_CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : incident.priority === 'P2_URGENT'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {incident.priority.replace('_', ' ')}
                      </span>

                      {/* Status pill */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        incident.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : incident.status === 'IN_PROGRESS'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {incident.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{incident.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{incident.description}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-[#2d7a70] shrink-0" />
                      <span className="truncate">{incident.location.address}</span>
                    </div>

                    {/* Verification Status */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1">
                        {isVerified ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified by {incident.verifiedByVolunteers?.length} Doot(s)</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Unverified Spot-Check</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-600 font-bold">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        <span>{incident.communityUpvotes || 0} Upvotes</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={hasUserVerified || verifyingId === incident.id}
                      onClick={() => handleVerifyIncident(incident)}
                      className={`flex-1 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        hasUserVerified
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{hasUserVerified ? '✓ Verified by You' : verifyingId === incident.id ? 'Verifying...' : 'Verify on Ground'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={upvotingId === incident.id}
                      onClick={() => handleUpvoteIncident(incident)}
                      className="px-3 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition flex items-center gap-1 cursor-pointer"
                      title="Upvote community priority"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>+1</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SANITATION AUDITS */}
      {activeTab === 'SANITATION' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.map((fac) => (
              <div key={fac.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#2d7a70] flex items-center justify-center text-xl shrink-0">
                      {fac.type === 'TOILET' ? '🚻' : '♻️'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{fac.name}</h4>
                      <p className="text-xs text-slate-500">{fac.location.address || fac.ward}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    fac.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {fac.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{fac.rating.toFixed(1)} / 5.0</span>
                    <span className="text-[10px] text-slate-400">({fac.totalRatings || 1} audits)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{fac.timings || '24/7 Open'}</span>
                </div>

                {/* Spot Audit Trigger */}
                {selectedFacilityForRating === fac.id ? (
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Rate Cleanliness & Water:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingVal(star)}
                            className="p-1 cursor-pointer hover:scale-125 transition"
                          >
                            <Star className={`w-4 h-4 ${star <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRateFacility(fac.id)}
                        className="flex-1 h-8 rounded-lg bg-[#2d7a70] text-white text-xs font-bold hover:bg-[#23635b] transition cursor-pointer"
                      >
                        Submit Audit Review
                      </button>
                      <button
                        onClick={() => setSelectedFacilityForRating(null)}
                        className="px-3 h-8 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedFacilityForRating(fac.id);
                      setRatingVal(5);
                    }}
                    className="w-full h-8 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#2d7a70] text-xs font-bold border border-teal-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Conduct Spot Cleanliness Audit</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === 'LEADERBOARD' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Swachhata Doot Honor Roll</h3>
              <p className="text-xs text-slate-500">Top community volunteers in Ward 4 & Central District</p>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Monthly Cycle: August 2026
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {[
              { rank: 1, name: 'Ananya Sen', verified: 38, karma: 1140, badge: '🏆 Golden Broom' },
              { rank: 2, name: 'Sangit Sharma', verified: 26, karma: 780, badge: '⭐ Ward 4 Star' },
              { rank: 3, name: 'Harpreet Singh', verified: 19, karma: 570, badge: '🌱 Green Sentinel' },
              { rank: 4, name: 'Pooja Verma', verified: 14, karma: 420, badge: '🎯 Spot-Check Pro' },
            ].map((user) => (
              <div key={user.rank} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    user.rank === 1 ? 'bg-amber-400 text-slate-950' : user.rank === 2 ? 'bg-slate-200 text-slate-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    #{user.rank}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{user.name}</span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.2 rounded border border-teal-200">
                        {user.badge}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">{user.verified} Hazards Verified & Audited</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-[#2d7a70] text-sm">{user.karma} pts</span>
                  <p className="text-[10px] text-slate-400">Karma Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
