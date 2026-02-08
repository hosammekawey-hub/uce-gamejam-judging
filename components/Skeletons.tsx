
import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200/20 rounded-xl ${className}`} />
);

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Fake Navbar */}
      <div className="bg-white/80 border-b border-slate-200 h-20 sticky top-0 z-50 px-4 sm:px-6 lg:px-8 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-3">
             <Skeleton className="w-10 h-10 rounded-xl bg-indigo-100/50" />
             <Skeleton className="h-6 w-48 bg-slate-200/50" />
          </div>
          <div className="flex gap-4">
             <Skeleton className="h-8 w-24 rounded-xl bg-slate-200/50" />
             <Skeleton className="h-8 w-24 rounded-xl bg-slate-200/50" />
             <Skeleton className="h-8 w-10 rounded-xl bg-slate-200/50" />
          </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Header */}
          <div className="flex justify-between items-end">
             <div className="space-y-4">
                 <Skeleton className="h-16 w-96 rounded-[1rem] bg-slate-300/30" />
                 <Skeleton className="h-6 w-64 bg-slate-200/50" />
             </div>
             <Skeleton className="h-14 w-48 rounded-2xl bg-slate-200/50" />
          </div>

          {/* Status Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Skeleton className="h-48 rounded-[2.5rem] w-full bg-white border border-slate-100 shadow-sm" />
              <Skeleton className="h-48 rounded-[2.5rem] w-full lg:col-span-2 bg-white border border-slate-100 shadow-sm" />
          </div>

          {/* Grid */}
          <div className="space-y-8">
              <Skeleton className="h-10 w-64 bg-slate-200/50" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  <div className="h-96 rounded-[3rem] bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      <Skeleton className="h-48 w-full rounded-none bg-slate-200/30" />
                      <div className="p-10 space-y-4 flex-1">
                          <Skeleton className="h-6 w-3/4 bg-slate-200/50" />
                          <Skeleton className="h-4 w-1/2 bg-slate-200/30" />
                      </div>
                  </div>
                  <div className="h-96 rounded-[3rem] bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      <Skeleton className="h-48 w-full rounded-none bg-slate-200/30" />
                      <div className="p-10 space-y-4 flex-1">
                          <Skeleton className="h-6 w-3/4 bg-slate-200/50" />
                          <Skeleton className="h-4 w-1/2 bg-slate-200/30" />
                      </div>
                  </div>
                  <div className="h-96 rounded-[3rem] bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      <Skeleton className="h-48 w-full rounded-none bg-slate-200/30" />
                      <div className="p-10 space-y-4 flex-1">
                          <Skeleton className="h-6 w-3/4 bg-slate-200/50" />
                          <Skeleton className="h-4 w-1/2 bg-slate-200/30" />
                      </div>
                  </div>
              </div>
          </div>
      </main>
    </div>
  );
};

export const CardSkeleton = () => (
    <div className="h-[200px] bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-6 animate-pulse relative overflow-hidden">
        <div className="h-8 w-2/3 bg-slate-800 rounded-lg"/>
        <div className="h-4 w-1/3 bg-slate-800 rounded-lg opacity-50"/>
        <div className="absolute bottom-8 left-8 right-8 h-10 bg-slate-800 rounded-xl opacity-30"/>
    </div>
);
