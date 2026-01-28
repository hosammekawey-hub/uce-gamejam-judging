import React, { useState, useMemo } from 'react';
import { Team, Rating, ScoreSet, UserRole } from '../types';
import { RUBRIC } from '../constants';

interface RatingFormProps {
  team: Team;
  judgeName: string;
  currentRole: UserRole;
  existingRating?: Rating;
  onSave: (rating: Rating) => void;
  onCancel: () => void;
}

const RatingForm: React.FC<RatingFormProps> = ({ team, judgeName, currentRole, existingRating, onSave, onCancel }) => {
  const isReadOnly = currentRole === 'organizer';

  const [scores, setScores] = useState<ScoreSet>(() => {
    if (existingRating) return existingRating.scores;
    const initial: ScoreSet = {};
    RUBRIC.forEach(c => initial[c.id] = 5); // Default to middle
    return initial;
  });

  const [feedback, setFeedback] = useState(existingRating?.feedback || '');
  const [isDisqualified, setIsDisqualified] = useState(existingRating?.isDisqualified || false);

  const weightedTotal = useMemo(() => {
    return RUBRIC.reduce((acc, c) => {
      return acc + (scores[c.id] * c.weight);
    }, 0);
  }, [scores]);

  const handleScoreChange = (id: string, val: number) => {
    if (isReadOnly) return;
    setScores(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    onSave({
      teamId: team.id,
      judgeId: judgeName,
      scores,
      feedback,
      isDisqualified,
      lastUpdated: Date.now()
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-slideUp pb-20">
      {isReadOnly && (
        <div className="bg-amber-100 border-2 border-amber-200 p-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-lg">
          <span className="text-2xl">📊</span>
          <p className="text-amber-800 font-black uppercase tracking-widest text-sm">
            Organizer Mode: Viewing Average Scores & Aggregated Feedback
          </p>
        </div>
      )}

      {/* Team Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-3 h-full bg-indigo-600" />
        <div className="flex items-center gap-8 mb-6 md:mb-0">
          <div className="h-32 w-32 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner flex-shrink-0">
            <img src={team.thumbnail} className="h-full w-full object-cover" alt={team.gameTitle} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-2 block">Scorecard Entry</span>
            <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">{team.gameTitle}</h2>
            <p className="text-slate-500 font-bold mt-1 text-lg">Team: <span className="text-indigo-600">{team.name}</span></p>
          </div>
        </div>
        <div className="bg-slate-950 p-8 rounded-[2rem] text-center min-w-[200px] shadow-2xl">
          <p className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em] mb-2">{isReadOnly ? 'Avg Weighted' : 'Weighted Total'}</p>
          <div className={`text-6xl font-black ${isDisqualified ? 'text-rose-500 line-through' : 'text-white'}`}>
            {weightedTotal.toFixed(1)}<span className="text-slate-500 text-2xl font-normal ml-1">/10</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16">
        <div className="space-y-20">
          {RUBRIC.map((criterion) => (
            <div key={criterion.id} className="relative">
              {/* Criterion Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="max-w-xl">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black text-xl shadow-lg">
                      {RUBRIC.indexOf(criterion) + 1}
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{criterion.name}</h3>
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-indigo-100">
                      {criterion.weight * 100}% Weight
                    </span>
                  </div>
                  <p className="text-slate-600 font-bold leading-relaxed">{criterion.description}</p>
                </div>
                <div className="flex flex-col items-center md:items-end">
                   <div className="text-5xl font-black text-indigo-600 px-8 py-4 bg-white border-2 border-indigo-100 rounded-[1.5rem] shadow-xl">
                    {scores[criterion.id]}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">{isReadOnly ? 'Avg Points' : 'Points Awarded'}</span>
                </div>
              </div>

              {/* Range Input & Rubric Visualizer */}
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 md:p-12 space-y-12">
                {!isReadOnly && (
                  <div className="px-6">
                    <input 
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={scores[criterion.id]}
                      onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value))}
                      className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all shadow-inner border border-slate-200"
                    />
                    <div className="flex justify-between mt-6">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <div key={n} className="flex flex-col items-center gap-2">
                          <div className={`w-2 h-3 rounded-full transition-all ${scores[criterion.id] === n ? 'h-6 bg-indigo-600' : 'bg-slate-200'}`} />
                          <span className={`text-sm font-black transition-all ${scores[criterion.id] === n ? 'text-indigo-600 scale-125' : 'text-slate-300'}`}>
                            {n}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {criterion.guidelines.map((guide, idx) => {
                    const [min, maxStr] = guide.range.split('-');
                    const max = maxStr ? parseInt(maxStr) : parseInt(min);
                    const rangeMin = parseInt(min);
                    const isActive = scores[criterion.id] >= rangeMin && scores[criterion.id] <= max;
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => !isReadOnly && handleScoreChange(criterion.id, rangeMin)}
                        className={`p-6 rounded-[2rem] border-4 transition-all duration-300 flex flex-col h-full transform ${
                        isActive 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-600/30 scale-[1.05] z-10' 
                          : 'bg-slate-50 border-transparent text-slate-500 opacity-60 flex flex-col justify-between'
                      } ${!isReadOnly ? 'cursor-pointer hover:opacity-100 hover:border-slate-200' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>{guide.label}</span>
                          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-black/10 tabular-nums">{guide.range}</span>
                        </div>
                        <p className="text-sm leading-relaxed font-bold flex-1">{guide.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-10 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Qualitative Feedback</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isReadOnly ? 'Aggregated Comments' : 'Constructive Comments'}</span>
          </div>
          <textarea 
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "No judge comments provided yet." : "What stood out to you? Any advice for the developers?"}
            className={`w-full h-48 px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none text-slate-800 font-bold text-lg placeholder:text-slate-300 ${isReadOnly ? 'cursor-default opacity-100' : ''}`}
          />
          
          <div className="pt-6">
            <label className={`group flex items-start gap-6 p-8 rounded-[2rem] border-4 transition-all ${
              isDisqualified ? 'bg-rose-50 border-rose-500 shadow-xl shadow-rose-500/10' : 'bg-slate-50 border-transparent'
            } ${!isReadOnly ? 'cursor-pointer hover:border-slate-200' : 'cursor-default'}`}>
              <div className="relative flex items-center mt-1">
                <input 
                  type="checkbox" 
                  checked={isDisqualified}
                  disabled={isReadOnly}
                  onChange={(e) => setIsDisqualified(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-10 rounded-2xl border-2 transition-all flex items-center justify-center ${
                  isDisqualified ? 'bg-rose-600 border-rose-600 shadow-xl shadow-rose-600/30' : 'bg-white border-slate-300 group-hover:border-slate-400'
                }`}>
                  {isDisqualified && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className={`block text-xl font-black uppercase tracking-tight ${isDisqualified ? 'text-rose-600' : 'text-slate-900'}`}>
                  Disqualification Warning
                </span>
                <span className={`text-base font-bold mt-1 block ${isDisqualified ? 'text-rose-400' : 'text-slate-500'}`}>
                  Check if submission violates competition rules (offensive content, plagiarism).
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-6 py-12">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-6 bg-white border-2 border-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-50 transition-all active:scale-95 text-xs"
          >
            {isReadOnly ? 'Back to Dashboard' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button 
              type="submit"
              className="flex-[2] py-6 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-2xl active:scale-95 text-xs hover:bg-indigo-600"
            >
              Submit Official Scores
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RatingForm;