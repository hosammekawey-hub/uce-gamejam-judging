
import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EventProvider, useEvent } from './contexts/EventContext';
import { CompetitionConfig, Contestant, GlobalSettings } from './types';
import { COMPETITION_TEMPLATES } from './constants';

import Dashboard from './components/Dashboard';
import RatingForm from './components/RatingForm';
import Leaderboard from './components/Leaderboard';
import UserPortal from './components/Login';
import EntryManagement from './components/TeamManagement';
import JudgeManagement from './components/JudgeManagement';
import CompetitionSetup from './components/CompetitionSetup';
import AdminPanel from './components/AdminPanel';
import EventShell from './components/EventShell';

// --- WRAPPERS FOR COMPONENTS TO CONSUME CONTEXT ---

const DashboardWrapper = () => {
    const { config, contestants, ratings, judges, userRole, updateConfig, updateSettings, deleteEvent } = useEvent();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Check if organizer needs to complete setup
    if (userRole === 'organizer' && !config.isSetupComplete) {
        return <Navigate to="setup" replace />;
    }

    const currentJudgeId = useMemo(() => {
        if (!user) return 'guest';
        const j = judges.find(j => j.userId === user.id);
        return j ? j.id : user.id;
    }, [user, judges]);

    return (
        <Dashboard
            title={config.title}
            competitionId={config.competitionId}
            rubric={config.rubric}
            teams={contestants}
            ratings={ratings}
            currentJudge={currentJudgeId}
            currentRole={userRole}
            otherJudges={judges}
            onSelectTeam={(team) => navigate(`rate/${team.id}`)}
            tieBreakers={config.tieBreakers}
            onUpdateConfig={updateConfig}
            onUpdateSettings={updateSettings}
            onDeleteEvent={userRole === 'organizer' ? deleteEvent : undefined}
            canEditRubric={userRole === 'organizer'}
            eventSettings={{
                visibility: config.visibility,
                registration: config.registration,
                viewPass: config.viewPass,
                organizerPass: config.organizerPass,
                judgePass: config.judgePass
            }}
        />
    );
};

const SetupWrapper = () => {
    const { config, updateSettings, deleteEvent } = useEvent();
    const navigate = useNavigate();

    return (
        <CompetitionSetup
            onComplete={async (c) => {
                await updateSettings({ ...c, isSetupComplete: true });
                navigate('../');
            }}
            onCancel={async () => {
                await deleteEvent();
            }}
            templates={COMPETITION_TEMPLATES}
        />
    );
};

const RatingWrapper = () => {
    const { teamId } = useParams();
    const { contestants, ratings, config, userRole, upsertRating, judges } = useEvent();
    const { user } = useAuth();
    const navigate = useNavigate();

    const team = contestants.find(t => t.id === teamId);
    
    const currentJudgeId = useMemo(() => {
        if (!user) return 'guest';
        const j = judges.find(j => j.userId === user.id);
        return j ? j.id : user.id;
    }, [user, judges]);

    const activeRating = useMemo(() => {
        if (!team) return undefined;
        
        if (userRole === 'judge') {
          return ratings.find(r => r.teamId === team.id && r.judgeId === currentJudgeId);
        }
        
        // Aggregate for others
        const teamRatings = ratings.filter(r => r.teamId === team.id);
        if (teamRatings.length === 0) return undefined;

        const avgScores: any = {};
        config.rubric.forEach(c => avgScores[c.id] = 0);
        teamRatings.forEach(r => {
            config.rubric.forEach(c => avgScores[c.id] += (r.scores[c.id] || 0));
        });
        config.rubric.forEach(c => avgScores[c.id] = avgScores[c.id] / teamRatings.length);

        const feedbackList = teamRatings.filter(r => r.feedback?.trim()).map(r => `--- ${r.judgeId} ---\n${r.feedback}`);
        
        return {
            teamId: team.id,
            judgeId: 'AGGREGATE',
            scores: avgScores,
            feedback: feedbackList.join('\n\n'),
            isDisqualified: teamRatings.some(r => r.isDisqualified),
            lastUpdated: Date.now()
        } as any;
    }, [team, ratings, currentJudgeId, userRole, config]);

    if (!team) return <div>Team not found</div>;

    return (
        <RatingForm
            team={team}
            rubric={config.rubric}
            judgeName={currentJudgeId}
            currentRole={userRole}
            existingRating={activeRating}
            onSave={async (r) => {
                await upsertRating(r);
                navigate('../');
            }}
            onCancel={() => navigate('../')}
        />
    );
};

const LeaderboardWrapper = () => {
    const { contestants, ratings, config } = useEvent();
    return <Leaderboard teams={contestants} ratings={ratings} rubric={config.rubric} />;
};

const EntriesWrapper = () => {
    const { contestants, userRole, addContestant, removeContestant, config } = useEvent();
    const { user } = useAuth();
    
    // Filter for contestant view
    const visibleTeams = (userRole === 'contestant' && user) 
        ? contestants.filter(c => c.userId === user.id) 
        : contestants;

    return (
        <EntryManagement
            teams={visibleTeams}
            currentRole={userRole}
            onAddTeam={addContestant}
            onRemoveTeam={removeContestant}
            fullState={userRole === 'organizer' ? { teams: contestants, config, ratings: [], judges: [] } : undefined}
        />
    );
};

const JudgesWrapper = () => {
    const { judges, contestants, ratings, removeJudge } = useEvent();
    return <JudgeManagement judges={judges} teams={contestants} ratings={ratings} onRemoveJudge={removeJudge} />;
};

const PortalWrapper = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <UserPortal
            initialUser={user}
            onEnterEvent={(role, compId, config, u) => {
                // If organizer login via portal, store pass in session for Gateway
                if (role === 'organizer' && config?.organizerPass) {
                    sessionStorage.setItem(`org_${compId}`, config.organizerPass);
                }
                navigate(`/event/${compId}`);
            }}
            onAdminLogin={() => navigate('/admin')}
        />
    );
};

// --- MAIN APP ---

const App: React.FC = () => {
  return (
    <BrowserRouter>
        <AuthProvider>
            <Routes>
                <Route path="/" element={<PortalWrapper />} />
                <Route path="/admin" element={<AdminPanel initialSettings={{judgePass:'', organizerPass:'', templates:COMPETITION_TEMPLATES}} onUpdateSettings={() => {}} onLogout={() => {}} />} />
                
                <Route path="/event/:eventId" element={<EventProvider><EventShell /></EventProvider>}>
                    <Route index element={<DashboardWrapper />} />
                    <Route path="setup" element={<SetupWrapper />} />
                    <Route path="rate/:teamId" element={<RatingWrapper />} />
                    <Route path="leaderboard" element={<LeaderboardWrapper />} />
                    <Route path="entries" element={<EntriesWrapper />} />
                    <Route path="judges" element={<JudgesWrapper />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
