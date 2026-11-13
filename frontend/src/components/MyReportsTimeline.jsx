import React, { useState, useEffect } from 'react';

export default function MyReportsTimeline() {
  const [userReports, setUserReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Automatically fetch reports from the backend database
  useEffect(() => {
    fetch('http://127.0.0')
      .then((res) => res.json())
      .then((data) => {
        setUserReports(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Timeline retrieval fault:", err);
        setLoading(false);
      });
  }, []);

  const getStatusStyle = (status) => {
    const designs = {
      reported: 'bg-blue-50 text-blue-700 border-blue-200',
      alert_sent: 'bg-purple-50 text-purple-700 border-purple-200',
      assigned: 'bg-amber-50 text-amber-700 border-amber-200',
      cleaned: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    return designs[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-[75vh] p-6 shadow-xl rounded-2xl border border-slate-200 mt-2">
      <header className="flex items-center space-x-3 mb-6 border-b pb-4">
        <div className="bg-emerald-100 p-2.5 rounded-xl text-xl">📋</div>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">My Historical Reports</h1>
          <p className="text-xs text-gray-500 font-medium">Track your cleanup timelines feed</p>
        </div>
      </header>

      {loading ? (
        <div className="p-16 text-center text-sm font-semibold text-slate-400 animate-pulse">
          Retrieving timeline records...
        </div>
      ) : (
        <div className="space-y-4">
          {userReports.map((report) => (
            <div 
              key={report.report_id} 
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Token ID</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">#CR-{report.report_id}</span>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border uppercase tracking-wider ${getStatusStyle(report.status)}`}>
                  {report.status ? report.status.replace('_', ' ') : 'reported'}
                </span>
              </div>

              {/* Image Preview inside Timeline Card */}
              {report.image_path && (
                <div className="w-full h-32 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img 
                    src={`http://127.0.0{report.image_path}`} 
                    alt="Evidence Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="text-xs space-y-1">
                <p className="text-slate-700"><strong>Category:</strong> <span className="text-emerald-700 font-bold">{report.category}</span></p>
                <p className="text-slate-500 truncate"><strong>Location:</strong> {report.address || 'Gwalior Ward'}</p>
              </div>
            </div>
          ))}

          {userReports.length === 0 && (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-2">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-bold text-slate-400">You haven't filed any cleanup requests yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
