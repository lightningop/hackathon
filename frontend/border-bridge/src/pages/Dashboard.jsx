import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertCircle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { getPersons } from '../lib/api';

const priorityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const vulnerabilityStyles = {
  "CRITICAL": "bg-red-50 text-red-700 border-red-200 ring-red-600/10",
  "HIGH": "bg-red-50 text-red-700 border-red-200 ring-red-600/10",
  "MEDIUM": "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
  "LOW": "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20"
};

function statusToLabel(currentStatus) {
  const map = {
    'REGISTERED': 'New',
    'IN_REVIEW': 'In Progress',
    'REFERRED': 'Referred',
    'TRANSFERRED': 'Transferred',
    'CLOSED': 'Closed',
  };
  return map[currentStatus] || currentStatus;
}

function CaseCard({ caseData, onClick }) {
  const { caseId, firstName, lastName, nationality, currentStatus, createdAt, triagePriority } = caseData;
  const priority = triagePriority || 'MEDIUM';
  const vStyle = vulnerabilityStyles[priority] || vulnerabilityStyles["MEDIUM"];
  const fullName = `${firstName} ${lastName}`;
  const status = statusToLabel(currentStatus);

  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer overflow-hidden isolate"
    >
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
              {fullName}
            </h3>
            <p className="text-sm font-medium text-gray-500 mt-0.5">{caseId}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${vStyle}`}>
            {priority} Priority
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{nationality || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="truncate">{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(priority === 'CRITICAL' || priority === 'HIGH') ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <div className={`w-2 h-2 rounded-full ${priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          )}
          <span className="text-sm font-medium text-gray-700">{status}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transform group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getPersons();
        if (!cancelled) {
          setPersons(data.persons || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load cases');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Sort by AI triage priority (CRITICAL → HIGH → MEDIUM → LOW) then newest first
  const sortedCases = [...persons].sort((a, b) => {
    const wA = priorityWeights[a.triagePriority] || 2;
    const wB = priorityWeights[b.triagePriority] || 2;
    if (wB !== wA) return wB - wA;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Active Cases</h1>
          <p className="text-gray-500 mt-1">Manage and review incoming case files.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-sm font-medium text-gray-600">Total Active:</span>
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md">
            {persons.length}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-500">Loading cases...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {!loading && !error && persons.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium">No cases found</p>
          <p className="mt-1">Register a new person via the Intake form to get started.</p>
        </div>
      )}

      {!loading && !error && persons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCases.map((person) => (
            <CaseCard 
              key={person._id} 
              caseData={person} 
              onClick={() => navigate(`/case/${person.caseId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
