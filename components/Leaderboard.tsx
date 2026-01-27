
import React from 'react';
import { Team, Rating, Judge } from '../types';
import { RUBRIC } from '../constants';

interface LeaderboardProps {
  teams: Team[];
  ratings: Rating[];
  otherJudges: Judge[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ teams, ratings, otherJudges }) => {
  const results = teams.map(team => {
    const teamRatings = ratings.filter(r => r.teamId === team.id);
    const isDQ = teamRatings.some(r => r.isDisqualified);
    
    const calcWeighted = (scores: Record<string, number>) => {
      return RUBRIC.reduce((acc, c) => acc + (scores[c.id] * c.weight), 0);
    };

    const judgeScores = teamRatings.map(r => calcWeighted(r.scores));
    
    // No more simulation. Use real scores from the judging panel.
    const average = judgeScores.length > 0 
      ? judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length 
      : 0;

    return {
      team,
      average: isDQ ? 0 : average,
      isDQ,
      judgesCount: teamRatings.length
    };
  }).sort((a, b) => b.average - a.average);

  const winners = results.slice(0, 3).filter(r => r.average > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-20 animate-fadeIn py-8">
      <div className="text-center space-y-6">
        <div className="inline-block bg-indigo-100 text-indigo-600 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] mb-4 border border-indigo-200">
          Official Standings
        </div>
        <h2 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight leading-none">The Podium</h2>
        <p className="text-xl text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
          The top technical and creative performers of UCE GGJ 2026.
        </p>
      </div>

      {/* Podium */}
      {winners.length > 0 ? (
        <div className="flex flex-col md:flex-row items-end justify-center gap-10 md:gap-8 px-4 py-12">
          {/* Silver */}
          {winners[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-80 group animate-slideUp">
              <div className="mb-8 relative">
                <div className="w-40 h-40 rounded-[2.5rem] border-8 border-slate-100 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-700 bg-white">
                  <img src={winners[1].team.thumbnail} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-700 px-6 py-2 rounded-full font-black text-sm shadow-xl border-4 border-white">2ND</div>
              </div>
              <div className="text-center mb-8">
                <h4 className="font-black text-slate-900 text-2xl tracking-tight">{winners[1].team.gameTitle}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{winners[1].team.name}</p>
              </div>
              <div className="w-full h-40 bg-white rounded-t-[3.5rem] flex flex-col items-center justify-center border border-slate-200 shadow-xl">
                <span className="text-5xl font-black text-slate-800 tabular-nums">{winners[1].average.toFixed(1)}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Avg Score</span>
              </div>
            </div>
          )}

          {/* Gold */}
          {winners[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-96 group animate-slideUp">
              <div className="mb-10 relative scale-110 md:scale-125 z-10">
                <div className="w-48 h-48 rounded-[3.5rem] border-8 border-amber-400 overflow-hidden shadow-[0_30px_70px_rgba(251,191,36,0.3)] group-hover:scale-105 transition-transform duration-700 bg-white">
                  <img src={winners[0].team.thumbnail} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-amber-400 text-white px-8 py-2 rounded-full font-black text-2xl shadow-2xl border-4 border-white">1ST</div>
              </div>
              <div className="text-center mb-10">
                <h4 className="text-3xl font-black text-slate-900 tracking-tight">{winners[0].team.gameTitle}</h4>
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mt-2">{winners[0].team.name}</p>
              </div>
              <div className="w-full h-64 bg-slate-900 rounded-t-[4.5rem] flex flex-col items-center justify-center shadow-2xl">
                <span className="text-7xl font-black text-white tabular-nums">{winners[0].average.toFixed(1)}</span>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-3">Grand Winner</span>
              </div>
            </div>
          )}

          {/* Bronze */}
          {winners[2] && (
            <div className="order-3 md:order-3 flex flex-col items-center w-full md:w-80 group animate-slideUp">
              <div className="mb-8 relative">
                <div className="w-40 h-40 rounded-[2.5rem] border-8 border-orange-100 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-700 bg-white">
                  <img src={winners[2].team.thumbnail} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-orange-200 text-orange-800 px-6 py-2 rounded-full font-black text-sm shadow-xl border-4 border-white">3RD</div>
              </div>
              <div className="text-center mb-8">
                <h4 className="font-black text-slate-900 text-2xl tracking-tight">{winners[2].team.gameTitle}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{winners[2].team.name}</p>
              </div>
              <div className="w-full h-32 bg-white rounded-t-[3.5rem] flex flex-col items-center justify-center border border-slate-200 shadow-xl">
                <span className="text-5xl font-black text-slate-600 tabular-nums">{winners[2].average.toFixed(1)}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Avg Score</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3.5rem] p-24 text-center max-w-4xl mx-auto shadow-xl">
           <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
             <span className="text-4xl grayscale">⏳</span>
           </div>
           <h3 className="text-2xl font-black text-slate-900 mb-4">Awaiting Evaluations</h3>
           <p className="text-slate-500 font-bold">Standings will appear here as soon as the first official ratings are submitted.</p>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden mt-16">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-900 text-2xl tracking-tight">Leaderboard History</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified 2026 Standings</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.3em] text-slate-400 bg-slate-50/50">
                <th className="px-10 py-6 font-black">Rank</th>
                <th className="px-10 py-6 font-black">Team / Game</th>
                <th className="px-10 py-6 font-black">Evaluations</th>
                <th className="px-10 py-6 font-black text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((res, idx) => (
                <tr key={res.team.id} className={`group transition-all ${res.isDQ ? 'bg-rose-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-10 py-8">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                      idx === 0 && res.average > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                      idx === 1 && res.average > 0 ? 'bg-slate-100 text-slate-700 border border-slate-200' : 
                      idx === 2 && res.average > 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-10 rounded-xl overflow-hidden shadow-inner flex-shrink-0 border border-slate-200">
                         <img src={res.team.thumbnail} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{res.team.gameTitle}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{res.team.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    {res.isDQ ? (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl border border-rose-200">DISQUALIFIED</span>
                    ) : (
                      <span className="text-sm font-black text-slate-400">{res.judgesCount} Official Evaluation{res.judgesCount !== 1 ? 's' : ''}</span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-right">
                    <span className={`text-4xl font-black tabular-nums ${res.isDQ ? 'text-rose-200 line-through' : res.average === 0 ? 'text-slate-200' : 'text-slate-900'}`}>
                      {res.average.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
