import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  MapPin, 
  AlertCircle, 
  Check, 
  Layers, 
  FileText, 
  User, 
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Eye,
  Info,
  Image as ImageIcon,
  Navigation
} from 'lucide-react';
import { HazardCategory, PriorityLevel, CrisisIncident, ScannerData } from '../types';
import { ZONES } from '../mockData';
import { reverseGeocodeCoordinates, getCurrentUserLocation } from '../services/locationService';
import { VoiceGrievanceInput } from './VoiceGrievanceInput';
import { normalizeImageSrc, handleImageError } from '../utils/imageUtils';

interface CitizenIngestionPanelProps {
  onSubmitIncident: (incidentData: Partial<CrisisIncident>) => void;
  isDispatching: boolean;
  onSelectZone: (zone: string, lat: number, lng: number) => void;
  activeZone: string;
}

const SAMPLE_HAZARD_PREVIEWS = [
  {
    category: 'DEEP_POTHOLE' as HazardCategory,
    title: 'Severe Rim-Impact Pothole on Commuter Road',
    url: 'https://images.unsplash.com/photo-1584463699031-c4c0b629c135?auto=format&fit=crop&w=800&q=80',
    depth: '16.4 cm deep',
    area: '0.9 sq. meters',
    confidence: '95%',
    riskText: 'Severe Rim Hazard - 95% AI Match',
    priority: 'P2_URGENT' as PriorityLevel,
    desc: 'Jagged edge pothole on main transit lane with exposed subgrade aggregate. Causes vehicular wheel damage and swerving hazard.',
    anomalies: ['Pavement Delamination', 'Exposed Base Aggregate', 'Traffic Flow Impact']
  },
  {
    category: 'STRUCTURAL_SINKHOLE' as HazardCategory,
    title: 'Catastrophic Road Cave-in / Sinkhole',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    depth: '1.65 meters depth',
    area: '3.2 sq. meters',
    confidence: '98%',
    riskText: 'Severity: Severe Sinkhole - 98% AI Match',
    priority: 'P1_CRITICAL' as PriorityLevel,
    desc: 'Deep sub-surface ground cavern collapse near pedestrian crossing. Immediate risk of pavement failure under transit vehicles.',
    anomalies: ['Sub-grade Cavity Void', 'Perimeter Shear Fractures', 'Structural Subsidence']
  },
  {
    category: 'FLOODING_WATER_MAIN' as HazardCategory,
    title: 'Pressurized Water Main Leak & Road Flooding',
    url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    depth: '30 cm surface pooling',
    area: '48.0 sq. meters',
    confidence: '96%',
    riskText: 'Hydrostatic Rupture - 96% AI Match',
    priority: 'P1_CRITICAL' as PriorityLevel,
    desc: 'High-pressure distribution main breach causing street-level inundation and erosion of roadway foundation.',
    anomalies: ['Sub-base Liquefaction', 'Active Water Pressure', 'Intersection Inundation']
  },
  {
    category: 'DOWNED_POWER_LINE' as HazardCategory,
    title: 'Downed Electrical Cable on Traffic Lane',
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    depth: 'Surface Hazard',
    area: '15m perimeter',
    confidence: '99%',
    riskText: 'High-Voltage Hazard - 99% AI Match',
    priority: 'P1_CRITICAL' as PriorityLevel,
    desc: 'Live high-voltage conductor lying on highway surface. Immediate electrocution risk and road blockage.',
    anomalies: ['Live Line Arcing Danger', 'Multi-lane Obstruction', 'Immediate Public Safety Risk']
  }
];

export const CitizenIngestionPanel: React.FC<CitizenIngestionPanelProps> = ({
  onSubmitIncident,
  isDispatching,
  onSelectZone,
  activeZone
}) => {
  const [category, setCategory] = useState<HazardCategory>('DEEP_POTHOLE');
  const [title, setTitle] = useState<string>('Severe Tire-Damaging Pothole on Commuter Way');
  const [description, setDescription] = useState<string>('Deep rim-breaking pothole in outer lane with sharp exposed aggregate. Vehicles swerving into oncoming traffic.');
  const [selectedZone, setSelectedZone] = useState<string>(activeZone || 'Sector 4');
  const [address, setAddress] = useState<string>('Sector 4 / Main Boulevard & 4th Avenue');
  const [lat, setLat] = useState<number>(31.253);
  const [lng, setLng] = useState<number>(75.703);
  const [reporterName, setReporterName] = useState<string>('Citizen Mobile App #509');
  const [voiceNoteData, setVoiceNoteData] = useState<{ hasVoiceNote: boolean; audioNoteBase64: string }>({
    hasVoiceNote: false,
    audioNoteBase64: ''
  });
  
  // Clean Image Preview State
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(SAMPLE_HAZARD_PREVIEWS[0].url);
  const [anomalyBadgeText, setAnomalyBadgeText] = useState<string>(SAMPLE_HAZARD_PREVIEWS[0].riskText);
  const [depthText, setDepthText] = useState<string>(SAMPLE_HAZARD_PREVIEWS[0].depth);
  const [areaText, setAreaText] = useState<string>(SAMPLE_HAZARD_PREVIEWS[0].area);
  const [detectedAnomalies, setDetectedAnomalies] = useState<string[]>(SAMPLE_HAZARD_PREVIEWS[0].anomalies);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSample = (sample: typeof SAMPLE_HAZARD_PREVIEWS[0]) => {
    setCategory(sample.category);
    setTitle(sample.title);
    setDescription(sample.desc);
    setSelectedImageUrl(sample.url);
    setAnomalyBadgeText(sample.riskText);
    setDepthText(sample.depth);
    setAreaText(sample.area);
    setDetectedAnomalies(sample.anomalies);

    const zoneObj = ZONES.find(z => z.id === selectedZone) || ZONES[3];
    const newLat = Number((zoneObj.lat + (Math.random() - 0.5) * 0.003).toFixed(5));
    const newLng = Number((zoneObj.lng + (Math.random() - 0.5) * 0.003).toFixed(5));
    setLat(newLat);
    setLng(newLng);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setSelectedImageUrl(url);
        setAnomalyBadgeText('AI Analysis: Verified Civic Hazard - 94% confidence');
        setDepthText('Estimated ~14 cm');
        setAreaText('Approx. 1.2 sq. meters');
        setDetectedAnomalies(['Surface Discontinuity', 'High Friction Loss', 'Public Road Obstruction']);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  const autoGeocode = async (targetLat: number, targetLng: number) => {
    setIsGeocoding(true);
    try {
      const geo = await reverseGeocodeCoordinates(targetLat, targetLng);
      if (geo && geo.formattedAddress) {
        setAddress(geo.formattedAddress);
      }
      if (geo && geo.wardId) {
        setSelectedZone(geo.wardId);
      }
    } catch (err) {
      console.warn('Geocoding notice:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGPSCapture = async () => {
    setIsGeocoding(true);
    try {
      const coords = await getCurrentUserLocation();
      setLat(coords.lat);
      setLng(coords.lng);
      await autoGeocode(coords.lat, coords.lng);
      onSelectZone(selectedZone, coords.lat, coords.lng);
    } catch (err) {
      console.warn('GPS capture notice:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
    const z = ZONES.find(item => item.id === zoneId);
    if (z) {
      const newLat = Number((z.lat + (Math.random() - 0.5) * 0.003).toFixed(5));
      const newLng = Number((z.lng + (Math.random() - 0.5) * 0.003).toFixed(5));
      setLat(newLat);
      setLng(newLng);
      onSelectZone(zoneId, newLat, newLng);
      autoGeocode(newLat, newLng);
    }
  };

  const resetGrievanceForm = () => {
    setCategory('DEEP_POTHOLE');
    setTitle('Severe Tire-Damaging Pothole on Commuter Way');
    setDescription('Deep rim-breaking pothole in outer lane with sharp exposed aggregate. Vehicles swerving into oncoming traffic.');
    setSelectedImageUrl(SAMPLE_HAZARD_PREVIEWS[0].url);
    setAnomalyBadgeText(SAMPLE_HAZARD_PREVIEWS[0].riskText);
    setDepthText(SAMPLE_HAZARD_PREVIEWS[0].depth);
    setAreaText(SAMPLE_HAZARD_PREVIEWS[0].area);
    setDetectedAnomalies(SAMPLE_HAZARD_PREVIEWS[0].anomalies);
    setVoiceNoteData({ hasVoiceNote: false, audioNoteBase64: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatching) return;

    const isCritical = category === 'STRUCTURAL_SINKHOLE' || category === 'DOWNED_POWER_LINE';
    const priority: PriorityLevel = isCritical ? 'P1_CRITICAL' : 'P2_URGENT';
    const risk = isCritical ? Math.floor(Math.random() * 8 + 90) : Math.floor(Math.random() * 15 + 72);

    const scannerData: ScannerData = {
      detectedAnomalies,
      boundingBoxes: [
        { x: 25, y: 30, w: 50, h: 45, label: 'Verified Road Hazard', confidence: 0.94 }
      ],
      depthEstimate: depthText,
      surfaceArea: areaText,
      structuralIntegrityScore: 100 - risk
    };

    const newIncident: Partial<CrisisIncident> = {
      title: title.trim() || `${category.replace(/_/g, ' ')} Issue`,
      description: description.trim(),
      hasVoiceNote: voiceNoteData.hasVoiceNote,
      audioNoteBase64: voiceNoteData.audioNoteBase64,
      category,
      priority,
      status: 'OPEN',
      riskScore: risk,
      location: {
        lat,
        lng,
        zone: selectedZone,
        address
      },
      imageUrl: selectedImageUrl,
      scannerData,
      reporterName
    };

    onSubmitIncident(newIncident);
    resetGrievanceForm();
  };

  return (
    <aside className="w-full lg:w-[380px] xl:w-[410px] flex-shrink-0 flex flex-col bg-slate-950 border-r border-slate-800 h-full overflow-hidden text-sm">
      {/* Clean GovTech Section Header */}
      <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">
              Citizen Reporting & Ingestion
            </h2>
            <p className="text-xs text-slate-400">
              Public Works Auto-Triage Portal
            </p>
          </div>
        </div>

        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
          Public Ingestion
        </span>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
        {/* Section 1: Photo & AI Verification */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Hazard Photo & Verification</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Take live photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Upload from gallery"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Gallery</span>
              </button>
            </div>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              id="camera-capture-input-ingestion"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              id="gallery-upload-input-ingestion"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Clean Photo Preview Box */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 w-full h-48 sm:h-56 shadow-sm group">
            <img
              src={normalizeImageSrc(selectedImageUrl)}
              alt="Civic hazard triage"
              className="w-full h-full object-cover"
              onError={handleImageError}
              referrerPolicy="no-referrer"
            />

            {/* AI Anomaly Detection Badge */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-slate-700 text-slate-200 text-xs font-medium backdrop-blur-sm shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate">{anomalyBadgeText}</span>
              </div>
            </div>

            {/* Bottom Photo Telemetry Info Bar */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-slate-300 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-800 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-medium">Depth: {depthText}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-200 font-medium">Area: {areaText}</span>
              </div>
              <span className="text-emerald-400 font-medium text-[11px]">AI Verified</span>
            </div>
          </div>

          {/* Quick Scenario Sample Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-medium">Select Sample Hazard Report:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {SAMPLE_HAZARD_PREVIEWS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer flex items-center gap-2 ${
                    category === sample.category && selectedImageUrl === sample.url
                      ? 'bg-blue-950/40 border-blue-500/60 text-slate-100 shadow-sm'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={normalizeImageSrc(sample.url)}
                    alt={sample.title}
                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                    onError={handleImageError}
                    referrerPolicy="no-referrer"
                  />
                  <div className="overflow-hidden min-w-0">
                    <div className="font-medium truncate text-xs text-slate-200">
                      {sample.category === 'STRUCTURAL_SINKHOLE' ? 'Road Cave-in' : sample.category.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {sample.priority === 'P1_CRITICAL' ? 'P1 Critical' : 'P2 Urgent'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Hazard Category Radio Grid */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Hazard Category</span>
          </label>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'DEEP_POTHOLE', label: 'Deep Pothole', priority: 'P2 Urgent' },
              { id: 'STRUCTURAL_SINKHOLE', label: 'Road Cave-in / Void', priority: 'P1 Critical' },
              { id: 'FLOODING_WATER_MAIN', label: 'Water Main Leak', priority: 'P1 Critical' },
              { id: 'DOWNED_POWER_LINE', label: 'Downed Power Line', priority: 'P1 Critical' },
              { id: 'TRAFFIC_SIGNAL_FAILURE', label: 'Signal / Light Outage', priority: 'P2 Urgent' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as HazardCategory)}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between ${
                  category === cat.id
                    ? 'bg-slate-800 text-slate-100 border-blue-500/70 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="font-medium text-xs text-slate-200">{cat.label}</div>
                  <div className="text-[10px] text-slate-400">{cat.priority}</div>
                </div>
                {category === cat.id && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Location & GPS Tagging */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>Location & Reverse Geocoding</span>
            </label>
            <button
              type="button"
              onClick={handleGPSCapture}
              disabled={isGeocoding}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded transition cursor-pointer"
            >
              {isGeocoding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3" />
              )}
              <span>{isGeocoding ? 'Geocoding...' : 'GPS Auto-Fill'}</span>
            </button>
          </div>

          <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Municipal Sector / Ward:</span>
              <select
                value={selectedZone}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <div>
                <span className="text-slate-400">Coordinates: </span>
                <span className="text-blue-400 font-mono">{lat.toFixed(4)}° N, {lng.toFixed(4)}° E</span>
              </div>
              {isGeocoding && (
                <span className="text-[10px] text-teal-400 animate-pulse">
                  Lookup running...
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium">Street Address / Landmark (Auto-filled):</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Cinema Road, Outside Verad Gate, Ward 4"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Citizen Notes & Multimodal Voice Description */}
        <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <VoiceGrievanceInput
            value={description}
            onChange={setDescription}
            onAudioChange={setVoiceNoteData}
            placeholder="Provide relevant details or tap 'Voice Dictation' to speak..."
          />
        </div>

        {/* Section 5: Reporter Details */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Reporter:</span>
          </div>
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className="bg-transparent border-none text-right text-slate-200 text-xs focus:outline-none w-48 font-medium"
          />
        </div>

        {/* Action Button: Clean Blue/Indigo Button */}
        <div className="pt-2">
          <button
            type="submit"
            id="submit-to-dispatcher-btn"
            disabled={isDispatching}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isDispatching ? (
              <>
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                <span>Evaluating & Dispatching Crew...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Submit & Dispatch Municipal Crew</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-500 mt-1.5">
            Routes report through Autonomous AI Dispatcher & updates live GIS grid
          </p>
        </div>
      </form>
    </aside>
  );
};
