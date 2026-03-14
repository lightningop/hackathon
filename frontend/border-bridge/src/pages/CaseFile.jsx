import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  Languages,
  Users,
  AlertCircle,
  Shield,
  Heart,
  FileText,
  Sparkles,
  Clock,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getPersonByCaseId } from '../lib/api';

function StatusBadge({ status, type }) {
  const styles = {
    warning: "bg-amber-100 text-amber-800 ring-amber-600/20",
    danger: "bg-red-100 text-red-800 ring-red-600/10",
    success: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
    default: "bg-gray-100 text-gray-800 ring-gray-500/10"
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[type] || styles.default}`}>
      {status}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function statusToVulnerability(flags = {}) {
  if (flags.medicalEmergency || flags.traffickingIndicator) return 'Critical';
  if (flags.unaccompaniedMinor || flags.familySeparated) return 'High';
  return 'Medium';
}

function statusLabel(currentStatus) {
  const map = {
    'REGISTERED': 'Registered',
    'IN_REVIEW': 'In Review',
    'REFERRED': 'Referred',
    'TRANSFERRED': 'Transferred',
    'CLOSED': 'Closed',
  };
  return map[currentStatus] || currentStatus;
}

export default function CaseFile() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [caseFile, setCaseFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getPersonByCaseId(id);
        if (!cancelled) {
          setPerson(data.person);
          setCaseFile(data.caseFile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load case file');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-3 text-gray-500">Loading case file...</span>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Case Not Found</h2>
          <p className="text-gray-600">{error || `No case found with ID "${id}"`}</p>
        </div>
      </div>
    );
  }

  const fullName = `${person.firstName} ${person.lastName}`;
  const vulnerability = statusToVulnerability(person.flags);
  const age = person.dateOfBirth
    ? Math.floor((Date.now() - new Date(person.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const dob = person.dateOfBirth ? new Date(person.dateOfBirth).toISOString().split('T')[0] : 'Unknown';
  const genderMap = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Non-binary', PREFER_NOT_TO_SAY: 'Prefer not to say' };

  const triageBrief = caseFile?.triageBrief;
  const aiSummary = triageBrief?.summary || '';
  const urgentNeeds = triageBrief?.topNeeds || [];

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gray-500" />
                {person.caseId}
              </span>
              <StatusBadge status={statusLabel(person.currentStatus)} type="success" />
              <StatusBadge status={`Vulnerability: ${vulnerability}`} type={vulnerability === 'Critical' ? 'danger' : vulnerability === 'High' ? 'warning' : 'default'} />
              <StatusBadge status={person.caseType.replace('_', ' ')} type="default" />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Intake: {new Date(person.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* AI Summary Section */}
        {aiSummary && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-xl shadow-sm border border-indigo-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Sparkles className="w-32 h-32 text-indigo-600" />
            </div>
            <div className="px-6 py-4 border-b border-indigo-100/50 flex items-center gap-2 relative z-10">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-indigo-900">AI Triage Summary</h3>
              {triageBrief?.priorityLevel && (
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${
                  triageBrief.priorityLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  triageBrief.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  triageBrief.priorityLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {triageBrief.priorityLevel}
                </span>
              )}
            </div>
            <div className="p-6 relative z-10">
              <p className="text-indigo-950/80 leading-relaxed text-lg">
                {aiSummary}
              </p>
              {triageBrief?.recommendedSteps?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">Recommended Steps:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-indigo-800">
                    {triageBrief.recommendedSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demographics */}
          <SectionCard title="Demographics" icon={User}>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Age / DOB</p>
                <p className="text-base font-medium text-gray-900">
                  {age !== null ? `${age} years (${dob})` : dob}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><User className="w-4 h-4"/> Gender</p>
                <p className="text-base font-medium text-gray-900">{genderMap[person.gender] || person.gender}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><MapPin className="w-4 h-4"/> Nationality</p>
                <p className="text-base font-medium text-gray-900">{person.nationality || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><Languages className="w-4 h-4"/> Language</p>
                <p className="text-base font-medium text-gray-900">{person.languages?.join(', ') || 'Unknown'}</p>
              </div>
            </div>
          </SectionCard>

          {/* Protection Flags */}
          <SectionCard title="Protection Flags" icon={Shield}>
            <div className="space-y-3">
              {Object.entries({
                'Medical Emergency': person.flags?.medicalEmergency,
                'Unaccompanied Minor': person.flags?.unaccompaniedMinor,
                'Trafficking Indicator': person.flags?.traffickingIndicator,
                'Asylum Claim': person.flags?.asylumClaim,
                'Family Separated': person.flags?.familySeparated,
              }).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${value ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}>
                    {value ? 'YES' : 'No'}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Urgent Needs */}
          <SectionCard title="Urgent Needs & Service Tracking" icon={Heart} className="md:col-span-2">
            <div className="flex flex-wrap gap-3">
              {urgentNeeds.map((need, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 font-semibold text-sm shadow-sm">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  {need}
                </span>
              ))}
              {urgentNeeds.length === 0 && <span className="text-gray-500 italic">No urgent needs identified</span>}
            </div>
          </SectionCard>

          {/* Case Notes */}
          {caseFile?.notes?.length > 0 && (
            <SectionCard title="Case Notes" icon={FileText} className="md:col-span-2">
              <div className="space-y-3">
                {caseFile.notes.map((note, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">
                        {note.author?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">{note.role}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
