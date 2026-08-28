import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Truck, 
  Camera, 
  Sparkles, 
  Crosshair, 
  AlertTriangle,
  ArrowLeft,
  Trash2,
  ShieldAlert,
  Droplets,
  Lightbulb,
  Building,
  ChevronRight,
  User,
  Star,
  Compass,
  FileText,
  Check,
  Phone,
  Navigation,
  Send,
  Radio,
  Layers
} from 'lucide-react';
import { CrisisIncident, HazardCategory, PriorityLevel, DepartmentType, GeminiVisionResult } from '../types';
import { SWACHHATA_CATEGORIES } from '../mockData';
import { analyzeHazardWithGeminiVision } from '../services/geminiService';

interface CitizenPortalProps {
  incidents: CrisisIncident[];
  onSubmitIncident: (incidentData: Partial<CrisisIncident>) => Promise<void>;
  isDispatching: boolean;
  onOpenOfficerLogin?: () => void;
  activeScreen?: 'HOME' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS';
  onNavigate?: (screen: 'HOME' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS') => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  incidents,
  onSubmitIncident,
  isDispatching,
  onOpenOfficerLogin,
  activeScreen = 'HOME',
  onNavigate
}) => {
  const [currentView, setCurrentView] = useState<'HOME' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS'>(activeScreen);
  const [selectedCategory, setSelectedCategory] = useState<HazardCategory>('DEEP_POTHOLE');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState<boolean>(false);
  const [visionResult, setVisionResult] = useState<GeminiVisionResult | null>(null);
  const [landmark, setLandmark] = useState<string>('Cinema Road, Outside Verad Gate');
  const [reporterName, setReporterName] = useState<string>('Sangit');
  const [reporterPhone, setReporterPhone] = useState<string>('+91 98765 43210');
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [lastSubmittedId, setLastSubmittedId] = useState<string>('');
  const [trackedIncident, setTrackedIncident] = useState<CrisisIncident | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Sync external navigation prop
  useEffect(() => {
    if (activeScreen) {
      setCurrentView(activeScreen);
    }
  }, [activeScreen]);

  // Selected Pin Coordinates on Map
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 31.2530,
    lng: 75.7030
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  // Desktop Live Map Ref
  const desktopMapContainerRef = useRef<HTMLDivElement>(null);
  const desktopMapInstanceRef = useRef<L.Map | null>(null);
  const desktopMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Most recent open or active complaint for the hero banner
  const activeComplaint = incidents.find(i => i.status !== 'RESOLVED') || incidents[0];

  // Mobile / Form Leaflet map setup for complaint form
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [selectedCoords.lat, selectedCoords.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    const pinIconHtml = `
      <div class="relative cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="w-8 h-8 rounded-full bg-[#2d7a70] border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs animate-bounce">
          📍
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinIconHtml,
      className: 'citizen-gps-pin',
      iconSize: [32, 32]
    });

    const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);

    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      setSelectedCoords({ lat: Number(position.lat.toFixed(4)), lng: Number(position.lng.toFixed(4)) });
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setSelectedCoords({ lat: Number(e.latlng.lat.toFixed(4)), lng: Number(e.latlng.lng.toFixed(4)) });
    });

    pinMarkerRef.current = marker;
    mapInstanceRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentView]);

  // Desktop Overview Live Map
  useEffect(() => {
    if (!desktopMapContainerRef.current) return;
    if (desktopMapInstanceRef.current) return;

    const map = L.map(desktopMapContainerRef.current, {
      center: [31.253, 75.703],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    desktopMarkersLayerRef.current = markersGroup;
    desktopMapInstanceRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 350);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      desktopMapInstanceRef.current = null;
    };
  }, []);

  // Update markers on desktop live map
  useEffect(() => {
    const map = desktopMapInstanceRef.current;
    const group = desktopMarkersLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    incidents.forEach((inc) => {
      const isResolved = inc.status === 'RESOLVED';
      const isCritical = inc.priority === 'P1_CRITICAL';

      const iconHtml = `
        <div class="relative cursor-pointer transition-transform hover:scale-110">
          <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white ${
            isResolved
              ? 'bg-emerald-600 text-white'
              : isCritical
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-[#2d7a70] text-white'
          }">
            ${isResolved ? '✓' : isCritical ? '!' : '●'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'desktop-citizen-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([inc.location.lat, inc.location.lng], { icon: customIcon })
        .addTo(group)
        .on('click', () => {
          setTrackedIncident(inc);
        });
    });
  }, [incidents]);

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setPhotoUrl(result);
      
      // Auto-trigger Gemini 2.5 Flash Vision Analysis
      setIsAnalyzingVision(true);
      try {
        const visionData = await analyzeHazardWithGeminiVision(result, file.type || 'image/jpeg');
        setVisionResult(visionData);
        
        // Auto-select detected category if valid
        if (visionData.category && SWACHHATA_CATEGORIES.some(c => c.id === visionData.category)) {
          setSelectedCategory(visionData.category);
        }
      } catch (err) {
        console.warn('Vision analysis failed:', err);
      } finally {
        setIsAnalyzingVision(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId as HazardCategory);
    setCurrentView('FORM');
    onNavigate?.('FORM');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatching) return;

    const catObj = SWACHHATA_CATEGORIES.find(c => c.id === selectedCategory);
    const department: DepartmentType = visionResult?.recommendedDepartment || catObj?.department || 'PUBLIC_WORKS';
    
    const isCritical = selectedCategory === 'OPEN_MANHOLES' || selectedCategory === 'DOWNED_POWER_LINE' || selectedCategory === 'STRUCTURAL_SINKHOLE';
    const priority: PriorityLevel = visionResult?.priority || (isCritical ? 'P1_CRITICAL' : 'P2_URGENT');
    const riskScore = visionResult?.riskScore || (isCritical ? 92 : 74);

    const uniqueId = `W0488610C${Math.floor(Math.random() * 899999 + 100000)}`;

    const incidentData: Partial<CrisisIncident> = {
      id: uniqueId,
      title: visionResult?.hazardName || catObj?.name || 'Civic Infrastructure Complaint',
      description: landmark ? `${landmark}. Citizen reported via Swachhata-MoHUA.` : 'Citizen reported civic grievance.',
      category: selectedCategory,
      priority,
      status: 'OPEN',
      department,
      riskScore,
      location: {
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        zone: 'Ward 4 - Sector 4',
        address: landmark || 'Ward 4, G.T. Road'
      },
      imageUrl: photoUrl || 'https://images.unsplash.com/photo-1584463699031-c4c0b629c135?auto=format&fit=crop&w=800&q=80',
      reporterName: reporterName || 'Sangit',
      createdAt: Date.now(),
      aiSummary: visionResult?.hazardDescription,
      actionDirectives: visionResult?.safetyDirectives,
      scannerData: visionResult ? {
        detectedAnomalies: visionResult.anomaliesDetected || [visionResult.hazardName],
        boundingBoxes: [],
        structuralIntegrityScore: 100 - riskScore
      } : undefined
    };

    await onSubmitIncident(incidentData);
    setSubmittedSuccess(true);
    setLastSubmittedId(uniqueId);
    setPhotoUrl(null);
    setVisionResult(null);
    setCurrentView('HOME');
    onNavigate?.('HOME');
    setTimeout(() => setSubmittedSuccess(false), 8000);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Road': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">🛣️</div>;
      case 'Trash2': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">🗑️</div>;
      case 'Truck': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">🚛</div>;
      case 'Sparkles': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">🧹</div>;
      case 'ShieldAlert': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">⚠️</div>;
      case 'Droplets': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">💧</div>;
      case 'Lightbulb': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">💡</div>;
      default: return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">🏢</div>;
    }
  };

  return (
    <div className="w-full flex-1 bg-slate-100 overflow-y-auto pb-24 md:pb-8 font-sans">
      {/* 
        ========================================================================
        DESKTOP LAYOUT (md and above) -> 2-COLUMN FULL-WIDTH DASHBOARD 
        ========================================================================
      */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 py-6">
        {/* Top Real-time Firestore Sync Badge & Greeting Header */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-[#2d7a70]/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                alt="Citizen profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#2d7a70] tracking-tight">
                  Good Afternoon, Welcome {reporterName}
                </h2>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>Live Firestore Sync</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Swachhata-MoHUA Central Portal • Citizen Redressal & Rapid Field Dispatch Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">Ward 4 - Central Zone</p>
              <p className="text-[11px] text-slate-500">{incidents.length} Registered Grievances</p>
            </div>
            <button
              onClick={onOpenOfficerLogin}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5 text-[#2d7a70]" />
              <span>Staff Desk</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {submittedSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#2d7a70] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Grievance Successfully Synced to Live Firestore Database!</p>
              <p className="text-xs text-slate-700 mt-0.5">
                Ticket ID: <span className="font-mono font-bold text-[#2d7a70]">{lastSubmittedId}</span> is visible instantly on the Ward 4 Officer GIS Map and assigned for remediation.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (Col 6/12): Report Issue Form & Category Selector */}
          <div className="md:col-span-6 space-y-6">
            {/* 1. Category Quick Selector Tiles */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2d7a70]" />
                  <span>1. Choose Grievance Category</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">8 Standard MoHUA Types</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {SWACHHATA_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as HazardCategory)}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                        isSelected
                          ? 'bg-teal-50/80 border-[#2d7a70] text-[#2d7a70] shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getCategoryIcon(cat.icon)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#2d7a70]' : 'text-slate-800'}`}>
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{cat.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Photo, Pin, & Details Submission Form */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#2d7a70]" />
                <span>2. Geo-Photo & Location Details</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo Dropzone */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Capture or Attach Photo of Hazard:
                    </label>
                    {isAnalyzingVision && (
                      <span className="text-[11px] font-semibold text-teal-700 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Gemini 2.5 Flash Analyzing...
                      </span>
                    )}
                  </div>

                  {photoUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden h-44">
                        <img
                          src={photoUrl}
                          alt="Hazard"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isAnalyzingVision && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white flex-col gap-2 p-4 text-center">
                            <Sparkles className="w-6 h-6 text-teal-300 animate-spin" />
                            <p className="text-xs font-bold">Scanning pavement anomalies & hazard severity...</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-2 right-2 bg-white text-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold shadow cursor-pointer flex items-center gap-1 hover:bg-slate-50 transition"
                        >
                          <Camera className="w-3 h-3 text-[#2d7a70]" />
                          <span>Change Photo</span>
                        </button>
                      </div>

                      {/* Vision Result Diagnostic Card */}
                      {visionResult && !isAnalyzingVision && (
                        <div className="p-3 bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl space-y-1.5 text-xs text-slate-800 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-teal-900">
                              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                              <span>Gemini 2.5 Flash Assessment</span>
                            </div>
                            <span className="bg-teal-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              Risk {visionResult.riskScore}/100
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-900">
                            {visionResult.hazardName}
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                            <span className="bg-white/80 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                              Dept: {visionResult.recommendedDepartment}
                            </span>
                            <span className="bg-white/80 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                              Crew: {visionResult.recommendedCrew}
                            </span>
                            <span className="bg-white/80 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                              ETA: ~{visionResult.estimatedRepairTimeMinutes}m
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                        isDragOver ? 'border-[#2d7a70] bg-teal-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <Camera className="w-5 h-5 text-[#2d7a70] mb-1" />
                      <p className="text-xs font-bold text-slate-800">Click to upload or drag & drop photo</p>
                      <p className="text-[11px] text-slate-500">Auto-triggers Gemini 2.5 Flash Vision & Geo-tagging</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                    className="hidden"
                  />
                </div>

                {/* Draggable Location Pin & Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Location Pin (Drag on Map):
                    </label>
                    <span className="text-[11px] font-mono text-[#2d7a70] font-semibold">
                      {selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° E
                    </span>
                  </div>

                  <div
                    ref={mapContainerRef}
                    className="w-full h-36 rounded-xl border border-slate-200 overflow-hidden relative z-0"
                  />
                </div>

                {/* Street / Landmark input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Street / Landmark Description:
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Cinema Road, Outside Verad Gate, Ward 4"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d7a70]"
                    required
                  />
                </div>

                {/* Citizen Name & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Citizen Name</label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Mobile Phone</label>
                    <input
                      type="text"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="w-full h-11 rounded-xl bg-[#2d7a70] hover:bg-[#23635b] active:bg-[#1b4b45] text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span>Transmitting to Firestore & Auto-Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Grievance to Municipal Board</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN (Col 6/12): Active Complaint Status & Live Ward Map & List */}
          <div className="md:col-span-6 space-y-6">
            {/* 1. Active Grievance Hero Banner */}
            {activeComplaint && (
              <div className="bg-gradient-to-br from-[#24665d] to-[#2d7a70] rounded-2xl p-5 text-white shadow-sm space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Live Active Grievance
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {activeComplaint.title}
                    </h3>
                    <p className="text-xs font-mono text-teal-200">
                      ID: {activeComplaint.id} • {activeComplaint.location.zone}
                    </p>
                  </div>

                  <button
                    onClick={() => setTrackedIncident(activeComplaint)}
                    className="px-3.5 py-1.5 rounded-full bg-white text-[#2d7a70] text-xs font-bold shadow-sm hover:bg-teal-50 transition cursor-pointer flex-shrink-0"
                  >
                    View Status
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-teal-50 bg-black/15 px-3 py-2 rounded-xl">
                  <MapPin className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <span className="truncate">{activeComplaint.location.address}</span>
                </div>

                {/* 4-Step Resolution Mini Stepper */}
                <div className="pt-2 border-t border-teal-600/60 flex items-center justify-between text-xs text-teal-100">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Registered</span>
                  </div>
                  <span className="text-teal-400">→</span>
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <Truck className="w-3.5 h-3.5 text-amber-300" />
                    <span>{activeComplaint.status === 'RESOLVED' ? 'Resolved' : activeComplaint.assignedUnitName || 'Assigned to Crew'}</span>
                  </div>
                  <span className="text-teal-400">→</span>
                  <div className="flex items-center gap-1.5 text-teal-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{activeComplaint.status === 'RESOLVED' ? 'Closed' : `ETA: ~${activeComplaint.etaMinutes || 15}m`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Ward 4 Live Grievance Map */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2d7a70]" />
                  <span>Ward 4 Real-Time Geospatial Map</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {incidents.filter(i => i.status !== 'RESOLVED').length} Active Hazards
                </span>
              </div>

              <div
                ref={desktopMapContainerRef}
                className="w-full h-56 rounded-xl border border-slate-200 overflow-hidden relative z-0"
              />
              <p className="text-[11px] text-slate-500">
                Click any marker on the map to inspect live redressal stage and crew notes.
              </p>
            </div>

            {/* 3. Live Registered Complaints List */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Recent Complaints Stream ({incidents.length})
                </h3>
                <span className="text-xs text-slate-500">Auto-Synced</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {incidents.map((ticket) => {
                  const isResolved = ticket.status === 'RESOLVED';
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setTrackedIncident(ticket)}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#2d7a70] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2d7a70]">{ticket.id}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-600 truncate">{ticket.location.address}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{ticket.title}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isResolved ? 'Resolved' : 'In Progress'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        MOBILE LAYOUT (< md) -> AUTHENTIC SWACHHATA MOBILE FLOW 
        ========================================================================
      */}
      <div className="block md:hidden max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Top Success Banner */}
        {submittedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#2d7a70] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-slate-900">Complaint Registered Successfully!</p>
              <p className="text-xs text-slate-700 mt-0.5">
                Complaint ID: <span className="font-mono font-bold text-[#2d7a70]">{lastSubmittedId}</span> has been dispatched to Ward 4 Sanitary Inspector / Asst. Engineer.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 1: AUTHENTIC SWACHHATA CITIZEN HOME */}
        {currentView === 'HOME' && (
          <div className="space-y-4">
            {/* 1. Welcome Card */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-[#2d7a70]/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                  alt="Citizen profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-[#2d7a70] tracking-tight">
                  Good Afternoon, Welcome {reporterName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Here are today's action for you
                </p>
              </div>
              <div className="flex flex-col items-end text-xs text-slate-400">
                <span className="font-semibold text-slate-700">Ward 4</span>
                <span>Central Zone</span>
              </div>
            </div>

            {/* 2. Active Complaint Status Banner (Swachhata Teal Gradient) */}
            {activeComplaint && (
              <div className="bg-gradient-to-br from-[#24665d] to-[#2d7a70] rounded-2xl p-4 text-white shadow-sm space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-teal-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{activeComplaint.category === 'DEEP_POTHOLE' ? 'Pothole / Road Void reported' : `${activeComplaint.title} reported`}</span>
                    </p>
                    <p className="text-xs font-mono text-teal-200 tracking-wider">
                      ID: {activeComplaint.id}
                    </p>
                  </div>
                  <button
                    onClick={() => setTrackedIncident(activeComplaint)}
                    className="px-3.5 py-1.5 rounded-full bg-white text-[#2d7a70] text-xs font-bold shadow-sm hover:bg-teal-50 transition cursor-pointer flex-shrink-0"
                  >
                    View Status
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-teal-50 bg-black/10 backdrop-blur-xs px-3 py-2 rounded-xl">
                  <MapPin className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <span className="truncate">{activeComplaint.location.address}</span>
                </div>

                {/* Progress Stepper Mini */}
                <div className="pt-2 border-t border-teal-600/60 flex items-center justify-between text-[11px] text-teal-100">
                  <div className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Registered</span>
                  </div>
                  <span className="text-teal-400">→</span>
                  <div className="flex items-center gap-1 font-semibold text-white">
                    <Truck className="w-3.5 h-3.5 text-amber-300" />
                    <span>{activeComplaint.status === 'RESOLVED' ? 'Resolved' : activeComplaint.assignedUnitName ? 'Crew Assigned' : 'Triage Queue'}</span>
                  </div>
                  <span className="text-teal-400">→</span>
                  <div className="flex items-center gap-1 text-teal-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{activeComplaint.status === 'RESOLVED' ? 'Closed' : `ETA: ~${activeComplaint.etaMinutes || 15}m`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Dashboard Quick Action 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Card 1: Post a Complaint (Soft Emerald Gradient) */}
              <div
                onClick={() => {
                  setCurrentView('CATEGORIES');
                  onNavigate?.('CATEGORIES');
                }}
                className="bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] border border-emerald-200/90 rounded-2xl p-4 flex flex-col justify-between h-36 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-white/90 shadow-xs flex items-center justify-center text-[#2d7a70]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2d7a70] transition">
                    Post a Complaint
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    We are committed to receiving your complaint
                  </p>
                </div>
              </div>

              {/* Card 2: My Active Complaints (Soft Amber Gradient) */}
              <div
                onClick={() => {
                  setCurrentView('COMPLAINTS');
                  onNavigate?.('COMPLAINTS');
                }}
                className="bg-gradient-to-br from-[#fff8e1] to-[#ffe0b2] border border-amber-200/90 rounded-2xl p-4 flex flex-col justify-between h-36 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-white/90 shadow-xs flex items-center justify-center text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition">
                    My Complaints ({incidents.length})
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    Track live resolution & field work orders
                  </p>
                </div>
              </div>

              {/* Card 3: SBM Public Toilet Locator */}
              <div
                onClick={() => {
                  alert('SBM Public Toilet Locator: Found 4 operational public toilet facilities within 600 meters of Ward 4.');
                }}
                className="bg-gradient-to-br from-[#fff3e0] to-[#ffe0b2] border border-orange-200/90 rounded-2xl p-4 flex flex-col justify-between h-36 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-white/90 shadow-xs flex items-center justify-center text-orange-600">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-700 transition">
                    SBM Toilet Locator
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    Find the nearest clean toilet
                  </p>
                </div>
              </div>

              {/* Card 4: Swachh Survekshan & Ward Inspection */}
              <div
                onClick={() => {
                  if (onOpenOfficerLogin) {
                    onOpenOfficerLogin();
                  } else {
                    alert('Swachh Survekshan 2026: Ward 4 ranking score is 94.2% based on civic response efficiency.');
                  }
                }}
                className="bg-gradient-to-br from-[#e0f2f1] to-[#b2dfdb] border border-teal-200/90 rounded-2xl p-4 flex flex-col justify-between h-36 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-white/90 shadow-xs flex items-center justify-center text-[#2d7a70]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2d7a70] transition">
                    Swachh Survekshan
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    Answer simple questions & feedback
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Officer Access Strip for Demo */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#2d7a70]">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Municipal Officer Desk</p>
                  <p className="text-[11px] text-slate-500">Ward 4 Sanitary Inspector & Assistant Engineer Portal</p>
                </div>
              </div>
              <button
                onClick={onOpenOfficerLogin}
                className="px-3 py-1.5 bg-[#2d7a70] hover:bg-[#23635b] text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                Staff Login
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: CHOOSE CATEGORY */}
        {currentView === 'CATEGORIES' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#2d7a70] px-4 py-3.5 text-white flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentView('HOME');
                  onNavigate?.('HOME');
                }}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold tracking-tight">Choose Category</h2>
                <p className="text-xs text-teal-100">Post a complaint</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {SWACHHATA_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-[#2d7a70] transition truncate">
                        {cat.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2d7a70] flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: COMPLAINT SUBMISSION FORM */}
        {currentView === 'FORM' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#2d7a70] px-4 py-3.5 text-white flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentView('CATEGORIES');
                  onNavigate?.('CATEGORIES');
                }}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold tracking-tight">Post Grievance</h2>
                <p className="text-xs text-teal-100">
                  {SWACHHATA_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Civic Infrastructure'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Photo Upload Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Capture / Upload Geo-Tagged Photo
                  </label>
                  {isAnalyzingVision && (
                    <span className="text-[11px] font-semibold text-teal-700 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Gemini 2.5 Flash Analyzing...
                    </span>
                  )}
                </div>

                {photoUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden group">
                      <img
                        src={photoUrl}
                        alt="Hazard preview"
                        className="w-full h-48 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isAnalyzingVision ? (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white flex-col gap-2 p-4 text-center">
                          <Sparkles className="w-6 h-6 text-teal-300 animate-spin" />
                          <p className="text-xs font-bold">Scanning pavement anomalies & hazard severity...</p>
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Photo Attached</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#2d7a70]" />
                        <span>Retake Photo</span>
                      </button>
                    </div>

                    {/* Vision Diagnostic Assessment */}
                    {visionResult && !isAnalyzingVision && (
                      <div className="p-3 bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl space-y-1.5 text-xs text-slate-800 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-teal-900">
                            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                            <span>Gemini 2.5 Flash Assessment</span>
                          </div>
                          <span className="bg-teal-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            Risk {visionResult.riskScore}/100
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-900">
                          {visionResult.hazardName}
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                          <span className="bg-white/80 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                            Dept: {visionResult.recommendedDepartment}
                          </span>
                          <span className="bg-white/80 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                            Crew: {visionResult.recommendedCrew}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center min-h-[140px] ${
                      isDragOver ? 'border-[#2d7a70] bg-teal-50/60' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#2d7a70] shadow-xs mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Tap to take photo of civic issue</p>
                    <p className="text-xs text-slate-500 mt-0.5">Auto-triggers Gemini 2.5 Flash Vision Assessment</p>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </div>

              {/* Location & GPS Leaflet Map Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Incident Location Pin
                  </label>
                  <span className="text-xs font-mono text-[#2d7a70] font-semibold">
                    {selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° E
                  </span>
                </div>

                <div
                  ref={mapContainerRef}
                  className="w-full h-44 rounded-xl border border-slate-200 overflow-hidden relative z-0"
                />
                <p className="text-[11px] text-slate-500">
                  Drag the pin or click on the map to set the exact street location.
                </p>
              </div>

              {/* Landmark Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Street / Landmark Description</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Cinema Road, Outside Verad Gate, Ward 4"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d7a70]"
                  required
                />
              </div>

              {/* Citizen Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Your Name</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Mobile Number</label>
                  <input
                    type="text"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isDispatching}
                className="w-full h-12 rounded-xl bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[48px] mt-2"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span>Registering with Ward 4 Redressal...</span>
                  </>
                ) : (
                  <span>Submit Grievance to Municipal Board</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* VIEW 4: MY COMPLAINTS LIST */}
        {currentView === 'COMPLAINTS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentView('HOME');
                    onNavigate?.('HOME');
                  }}
                  className="p-1 rounded-full hover:bg-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-700" />
                </button>
                <h2 className="text-base font-bold text-slate-900">
                  My Registered Complaints ({incidents.length})
                </h2>
              </div>
              <button
                onClick={() => {
                  setCurrentView('CATEGORIES');
                  onNavigate?.('CATEGORIES');
                }}
                className="text-xs font-bold text-[#2d7a70] bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 cursor-pointer"
              >
                + New Complaint
              </button>
            </div>

            <div className="space-y-3">
              {incidents.map((ticket) => {
                const isResolved = ticket.status === 'RESOLVED';
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setTrackedIncident(ticket)}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#2d7a70] transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#2d7a70]">
                            {ticket.id}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 font-medium truncate max-w-[160px]">
                            {ticket.location.address}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {ticket.title}
                        </h4>
                      </div>

                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isResolved ? 'Resolved' : 'Assigned'}
                      </span>
                    </div>

                    {ticket.imageUrl && (
                      <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={ticket.imageUrl}
                          alt={ticket.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">Inspector: <strong className="text-slate-800 font-medium">{ticket.assignedUnitName || 'Triage in Queue'}</strong></span>
                      </div>
                      <span className="text-[#2d7a70] font-bold text-[11px] flex items-center gap-0.5">
                        Track <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: COMPLAINT STATUS TRACKING & RATING DRAWER (Shared by Mobile & Desktop) */}
      {trackedIncident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="bg-[#2d7a70] p-4 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-xs font-mono text-teal-200 font-bold">{trackedIncident.id}</span>
                <h3 className="text-base font-bold">{trackedIncident.title}</h3>
              </div>
              <button
                onClick={() => setTrackedIncident(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 4-Step Resolution Stepper */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Grievance Redressal Progress (Live Sync)
                </h4>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Step 1: Registered */}
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 w-5 h-5 rounded-full bg-[#2d7a70] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Complaint Registered</p>
                      <p className="text-[11px] text-slate-500">Auto-logged in Ward 4 Central Grid</p>
                    </div>
                  </div>

                  {/* Step 2: Assigned */}
                  <div className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                      trackedIncident.assignedUnitName ? 'bg-[#2d7a70] text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {trackedIncident.assignedUnitName ? '✓' : '2'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Assigned to Ward Inspector</p>
                      <p className="text-[11px] text-slate-500">
                        {trackedIncident.assignedUnitName || 'Pending crew assignment'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: In Remediation */}
                  <div className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                      trackedIncident.status === 'IN_PROGRESS' || trackedIncident.status === 'RESOLVED' ? 'bg-[#2d7a70] text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {trackedIncident.status === 'RESOLVED' ? '✓' : '3'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Field Remediation Underway</p>
                      <p className="text-[11px] text-slate-500">
                        {trackedIncident.status === 'RESOLVED' ? 'Repairs completed on site' : `Crew en route (ETA ~${trackedIncident.etaMinutes || 12} mins)`}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Resolved */}
                  <div className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                      trackedIncident.status === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {trackedIncident.status === 'RESOLVED' ? '✓' : '4'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Grievance Resolved & Verified</p>
                      <p className="text-[11px] text-slate-500">
                        {trackedIncident.status === 'RESOLVED' ? 'Photologged fix approved by Ward Engineer' : 'Awaiting final inspection photolog'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proof of Fix (if resolved) */}
              {trackedIncident.status === 'RESOLVED' && trackedIncident.proofOfFixUrl && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Proof of Fix Uploaded by Ward Inspector</span>
                  </p>
                  <img
                    src={trackedIncident.proofOfFixUrl}
                    alt="Proof of fix"
                    className="w-full h-40 object-cover rounded-lg border border-emerald-300"
                    referrerPolicy="no-referrer"
                  />
                  {trackedIncident.officerNotes && (
                    <p className="text-xs text-slate-700 bg-white p-2 rounded-md border border-emerald-200">
                      <strong>Engineer Note:</strong> {trackedIncident.officerNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Citizen Rating for Resolved Ticket */}
              {trackedIncident.status === 'RESOLVED' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2.5">
                  <p className="text-xs font-bold text-slate-800">
                    Rate the redressal speed and work quality:
                  </p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setRatingSubmitted(true);
                        }}
                        className="p-1 text-amber-400 hover:scale-125 transition cursor-pointer"
                      >
                        <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                  {ratingSubmitted && (
                    <p className="text-xs text-emerald-700 font-semibold">
                      Thank you for your valuable feedback!
                    </p>
                  )}
                </div>
              )}

              {/* Location summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Incident Details</p>
                <p className="text-slate-600">{trackedIncident.description}</p>
                <p className="text-slate-500 font-mono text-[11px] pt-1">
                  Location: {trackedIncident.location.address} ({trackedIncident.location.lat.toFixed(4)}°, {trackedIncident.location.lng.toFixed(4)}°)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
