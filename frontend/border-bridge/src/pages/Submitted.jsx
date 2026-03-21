import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function Submitted() {
    const location = useLocation();
    const person = location.state?.person || null;
    const caseFile = location.state?.caseFile || null;

    const caseId = person?.caseId || 'UNKNOWN';
    const fullName = person ? `${person.firstName} ${person.lastName}` : 'Unknown';
    const caseUrl = `${window.location.origin}/case/${caseId}`;

    if (!person) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12">
                <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <AlertCircle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">No Submission Data</h1>
                    <p className="text-gray-600 mb-6">
                        It looks like you navigated here directly. Please submit an intake form first.
                    </p>
                    <Link
                        to="/intake"
                        className="inline-flex justify-center px-6 py-3 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Go to Intake Form
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12 print:bg-white print:p-0 print:py-0">
            <style>
                {`
                    @media print {
                        body { background: white; margin: 0; padding: 0; }
                        .no-print { display: none !important; }
                        .print-only { display: block !important; }
                        .print-container {
                            display: flex !important;
                            flex-direction: column !important;
                            align-items: center !important;
                            justify-content: center !important;
                            height: 100vh !important;
                            width: 100vw !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                    }
                `}
            </style>

            <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-8 print-container">
                <div className="text-center mb-6 no-print">
                    <CheckCircle className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Submitted Successfully!</h1>
                    <p className="text-gray-600">
                        {fullName}'s intake has been saved to the database.
                    </p>
                </div>

                {/* Triage Brief (if AI generated one) */}
                {caseFile?.triageBrief?.summary && (
                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg no-print">
                        <h3 className="text-sm font-semibold text-indigo-900 mb-1">AI Triage Summary</h3>
                        <p className="text-sm text-indigo-800">{caseFile.triageBrief.summary}</p>
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded ${
                            caseFile.triageBrief.priorityLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            caseFile.triageBrief.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            caseFile.triageBrief.priorityLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                            Priority: {caseFile.triageBrief.priorityLevel}
                        </span>
                    </div>
                )}

                {/* QR Code Section - This is the main part we want to print */}
                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center print:border-none print:mt-0 print:bg-white print:p-0">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 hidden print:block mb-6">BorderBridge Case File</h2>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 no-print">Case File Access</h2>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-4 print:border-none print:shadow-none print:p-0">
                        <QRCodeSVG 
                            value={caseUrl} 
                            size={200} 
                            level={"H"}
                            includeMargin={false}
                        />
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center gap-2 print:mt-8">
                        <h3 className="text-xl font-bold text-gray-900 hidden print:block">{fullName}</h3>
                        <span className="text-lg font-mono bg-gray-200 text-gray-900 px-4 py-2 rounded-md print:bg-white print:border print:border-gray-300 print:text-xl">
                            ID: {caseId}
                        </span>
                    </div>

                    <p className="text-sm text-gray-500 mt-4 max-w-sm no-print">
                        Scan this QR code with any mobile device to instantly access this person's secure Case File.
                    </p>

                    <div className="flex items-center gap-3 mt-6 no-print">
                        <button 
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-md hover:bg-indigo-100 transition-colors border border-indigo-200"
                        >
                            Print QR Code
                        </button>
                        <Link 
                            to={`/case/${caseId}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-md hover:bg-emerald-100 transition-colors border border-emerald-200"
                        >
                            Open File <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                <div className="text-center mt-8 no-print flex justify-center w-full">
                    <Link 
                        to="/"
                        className="inline-flex justify-center w-full max-w-xs px-6 py-3 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Return to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Submitted;