import React, { useState } from 'react';

function ReportDetailModal({ report, onClose, userRole, onStatusUpdate }) {
  if (!report) return null;
  
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const response = await fetch(`http://127.0.0{report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        onStatusUpdate(); // Trigger list refresh in the parent view
        onClose(); // Shut the modal overlay
      }
    } catch (error) {
      console.error("Failed to post status update:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">Detailed View: #REP-{report.id}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white border-0 bg-transparent text-xl font-bold cursor-pointer">&times;</button>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm text-slate-600">
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Complaint Category</span>
            <p className="text-base font-medium text-slate-900">{report.waste_type || report.type}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Status</span>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                report.status === 'Cleaned' || report.status === 'Resolved'
                  ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>{report.status || 'Pending'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Reported On</span>
              <p className="text-slate-900 font-medium">{report.created_at || 'Today'}</p>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Geotagged Coordinates</span>
            <p className="font-mono text-emerald-700 bg-slate-50 p-2 rounded border border-slate-200 mt-1">{report.coordinates}</p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Additional Landmark Remarks</span>
            <p className="bg-slate-50 p-3 rounded italic text-slate-700 border border-slate-200 mt-1">
              {report.remarks || "No descriptive remarks provided for this location."}
            </p>
          </div>
        </div>

        {/* Modal Footer (Conditional Admin/Officer Workflow Routing Actions) */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded hover:bg-slate-300 border-0 cursor-pointer">
            Close Panel
          </button>
          
          {/* Renders Action Controls Only If the Signed-In Account is an Officer or Admin */}
          {(userRole === 'gov' || userRole === 'admin') && (
            <div className="flex gap-2">
              <button 
                disabled={updating}
                onClick={() => handleStatusChange('Assigned')} 
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs border-0 cursor-pointer disabled:opacity-50"
              >
                Assign Crew
              </button>
              <button 
                disabled={updating}
                onClick={() => handleStatusChange('Cleaned')} 
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded text-xs border-0 cursor-pointer disabled:opacity-50"
              >
                Mark Cleaned
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ReportDetailModal;
