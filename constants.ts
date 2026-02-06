
import { Criterion, Contestant, CompetitionConfig, CompetitionTemplate } from './types';

// --- TEMPLATE DEFINITIONS ---

const GAME_JAM_RUBRIC: Criterion[] = [
  {
    id: 'innovation',
    name: 'Innovation & Creativity',
    weight: 0.30,
    description: 'This is the most critical category.',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'A direct clone of an existing game (e.g., Flappy Bird with a different skin) with no new mechanics.' },
      { range: '4-6', label: 'Mid', text: 'Uses standard mechanics but applies them in a slightly interesting way or context.' },
      { range: '7-8', label: 'High', text: 'Introduces a clever twist on a genre or a unique mechanic not often seen.' },
      { range: '9-10', label: 'Outstanding', text: '“I’ve never played something quite like this.” A completely novel concept, mechanic, or narrative approach that takes a risk.' }
    ]
  },
  {
    id: 'design',
    name: 'Game Design & Fun Factor',
    weight: 0.25,
    description: 'Does the game make you want to keep playing?',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'The goal is unclear, controls are frustrating, or the loop is boring.' },
      { range: '4-6', label: 'Mid', text: 'The game is playable and functional, but lacks depth or excitement.' },
      { range: '7-8', label: 'High', text: 'Controls are intuitive, the goal is clear, and the player feels satisfied when succeeding.' },
      { range: '9-10', label: 'Outstanding', text: 'The game loop is addictive, pacing is excellent, and the player actively enjoys the experience (the “Just one more try” factor).' }
    ]
  },
  {
    id: 'theme',
    name: 'Theme Adherence',
    weight: 0.20,
    description: 'How well did they use the secret theme?',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'The theme seems pasted on at the last minute or is irrelevant to the game.' },
      { range: '4-6', label: 'Mid', text: 'The theme is present in the visual style or story, but not the gameplay.' },
      { range: '7-8', label: 'High', text: 'The theme is integrated into the mechanics (e.g., if the theme is “Waves,” the mechanics rely on wave physics).' },
      { range: '9-10', label: 'Outstanding', text: 'The game could not exist without the theme; it is a perfect interpretation (literal or metaphorical).' }
    ]
  },
  {
    id: 'tech',
    name: 'Technical Execution & Polish',
    weight: 0.15,
    description: 'Is it a playable prototype or a buggy mess?',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'Game crashes, critical bugs prevent finishing the level, or unplayable frame rate.' },
      { range: '4-6', label: 'Mid', text: 'Playable, but has glitches, physics errors, or clunky UI.' },
      { range: '7-8', label: 'High', text: 'Smooth performance, no game-breaking bugs, includes a Start/Restart menu.' },
      { range: '9-10', label: 'Outstanding', text: 'Feels surprisingly solid for 48 hours. Includes “juice” (screen shake, particle effects) and robust inputs.' }
    ]
  },
  {
    id: 'aesthetics',
    name: 'Aesthetics (Art & Audio)',
    weight: 0.10,
    description: 'Quality of art, animation, and audio implementation.',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'No sound, mismatched assets, or very hard to look at (UI covers gameplay).' },
      { range: '4-6', label: 'Mid', text: 'Functional art (can tell what things are), basic sound effects.' },
      { range: '7-8', label: 'High', text: 'Cohesive art style (even if simple shapes/pixel art) and sound effects that fit the actions.' },
      { range: '9-10', label: 'Outstanding', text: 'Beautiful art direction, great use of color, and immersive music/audio that elevates the mood.' }
    ]
  }
];

const HACKATHON_RUBRIC: Criterion[] = [
  {
    id: 'impact',
    name: 'Utility & Impact',
    weight: 0.30,
    description: 'Does this solve a real-world problem effectively?',
    guidelines: [
      { range: '1-3', label: 'Trivial', text: 'Solves a non-existent problem.' },
      { range: '4-6', label: 'Useful', text: 'Has potential utility for a niche group.' },
      { range: '7-8', label: 'Valuable', text: 'Clear market fit and solves a pain point.' },
      { range: '9-10', label: 'Disruptive', text: 'Game-changing solution with massive potential.' }
    ]
  },
  {
    id: 'tech',
    name: 'Technical Complexity',
    weight: 0.30,
    description: 'How difficult was the engineering challenge?',
    guidelines: [
      { range: '1-3', label: 'Simple', text: 'Basic script or no-code solution.' },
      { range: '4-6', label: 'Moderate', text: 'Standard API integration or CRUD app.' },
      { range: '7-8', label: 'Complex', text: 'Impressive algorithm or architecture.' },
      { range: '9-10', label: 'Wizardry', text: 'Cutting-edge tech stack or AI implementation.' }
    ]
  },
  {
    id: 'polish',
    name: 'UX & Polish',
    weight: 0.20,
    description: 'Is the user experience intuitive and refined?',
    guidelines: [
      { range: '1-3', label: 'Confusing', text: 'Hard to navigate or understand.' },
      { range: '4-6', label: 'Functional', text: 'Works but looks raw.' },
      { range: '7-8', label: 'Clean', text: 'Intuitive flow and good design.' },
      { range: '9-10', label: 'Seamless', text: 'Professional grade UI/UX.' }
    ]
  },
  {
    id: 'pitch',
    name: 'Presentation',
    weight: 0.20,
    description: 'Was the demo and pitch compelling?',
    guidelines: [
      { range: '1-3', label: 'Weak', text: 'Unclear value proposition.' },
      { range: '4-6', label: 'Clear', text: 'Understood what it does.' },
      { range: '7-8', label: 'Strong', text: 'Compelling narrative and demo.' },
      { range: '9-10', label: 'Inspiring', text: 'Ready for investment.' }
    ]
  }
];

const PITCH_RUBRIC: Criterion[] = [
  {
    id: 'market',
    name: 'Market Opportunity',
    weight: 0.25,
    description: 'Is there a large, accessible market for this?',
    guidelines: [
      { range: '1-3', label: 'Small', text: 'Niche or shrinking market.' },
      { range: '4-6', label: 'Viable', text: 'Sustainable but limited growth.' },
      { range: '7-8', label: 'Large', text: 'Significant growth potential.' },
      { range: '9-10', label: 'Massive', text: 'Billion-dollar total addressable market.' }
    ]
  },
  {
    id: 'product',
    name: 'Product/Solution',
    weight: 0.25,
    description: 'Is the solution feasible and unique?',
    guidelines: [
      { range: '1-3', label: 'Vague', text: 'Unclear how it works.' },
      { range: '4-6', label: 'Standard', text: 'Similar to existing competitors.' },
      { range: '7-8', label: 'Strong', text: 'Clear competitive advantage.' },
      { range: '9-10', label: 'Defensible', text: 'Proprietary tech or deep moat.' }
    ]
  },
  {
    id: 'model',
    name: 'Business Model',
    weight: 0.25,
    description: 'Is there a clear path to revenue?',
    guidelines: [
      { range: '1-3', label: 'Unclear', text: 'No idea how to make money.' },
      { range: '4-6', label: 'Plausible', text: 'Standard monetization strategy.' },
      { range: '7-8', label: 'Solid', text: 'Validated unit economics.' },
      { range: '9-10', label: 'Scalable', text: 'High margin, viral growth model.' }
    ]
  },
  {
    id: 'team',
    name: 'Team & Delivery',
    weight: 0.25,
    description: 'Can this team execute the vision?',
    guidelines: [
      { range: '1-3', label: 'Inexperienced', text: 'Lack key skills.' },
      { range: '4-6', label: 'Capable', text: 'Decent background but gaps exist.' },
      { range: '7-8', label: 'Strong', text: 'Proven track record.' },
      { range: '9-10', label: 'Unicorn', text: 'Perfect founder-market fit.' }
    ]
  }
];

const ART_RUBRIC: Criterion[] = [
  {
    id: 'technique',
    name: 'Technique & Skill',
    weight: 0.30,
    description: 'Mastery of the medium and tools.',
    guidelines: [
      { range: '1-3', label: 'Amateur', text: 'Visible errors, lack of control.' },
      { range: '4-6', label: 'Competent', text: 'Solid understanding of basics.' },
      { range: '7-8', label: 'Advanced', text: 'High degree of difficulty executed well.' },
      { range: '9-10', label: 'Masterful', text: 'Virtuoso level display of skill.' }
    ]
  },
  {
    id: 'composition',
    name: 'Composition',
    weight: 0.30,
    description: 'Arrangement of visual elements.',
    guidelines: [
      { range: '1-3', label: 'Unbalanced', text: 'Eye wanders, lacks focus.' },
      { range: '4-6', label: 'Standard', text: 'Follows basic rules of thirds.' },
      { range: '7-8', label: 'Dynamic', text: 'Effective use of space and flow.' },
      { range: '9-10', label: 'Iconic', text: 'Perfect balance and visual hierarchy.' }
    ]
  },
  {
    id: 'concept',
    name: 'Concept',
    weight: 0.20,
    description: 'Originality and depth of the idea.',
    guidelines: [
      { range: '1-3', label: 'Cliché', text: 'Overused trope.' },
      { range: '4-6', label: 'Clear', text: 'Idea is communicated well.' },
      { range: '7-8', label: 'Thoughtful', text: 'Layers of meaning or narrative.' },
      { range: '9-10', label: 'Profound', text: 'Deeply philosophical or unique perspective.' }
    ]
  },
  {
    id: 'impact',
    name: 'Emotional Impact',
    weight: 0.20,
    description: 'Does the piece provoke a reaction?',
    guidelines: [
      { range: '1-3', label: 'Flat', text: 'Leaves the viewer indifferent.' },
      { range: '4-6', label: 'Pleasant', text: 'Nice to look at.' },
      { range: '7-8', label: 'Moving', text: 'Evokes a specific mood.' },
      { range: '9-10', label: 'Powerful', text: 'Unforgettable visceral reaction.' }
    ]
  }
];

const SCIENCE_FAIR_RUBRIC: Criterion[] = [
  {
    id: 'method',
    name: 'Scientific Method',
    weight: 0.35,
    description: 'Hypothesis, variables, and controls.',
    guidelines: [
      { range: '1-3', label: 'Flawed', text: 'Major gaps in logic or procedure.' },
      { range: '4-6', label: 'Followed', text: 'Standard procedure followed correctly.' },
      { range: '7-8', label: 'Rigorous', text: 'Well-controlled and replicable.' },
      { range: '9-10', label: 'Publication', text: 'Academic journal quality methodology.' }
    ]
  },
  {
    id: 'analysis',
    name: 'Data & Analysis',
    weight: 0.25,
    description: 'Interpretation of results.',
    guidelines: [
      { range: '1-3', label: 'Weak', text: 'Data does not support conclusions.' },
      { range: '4-6', label: 'Basic', text: 'Simple charts and surface observations.' },
      { range: '7-8', label: 'Insightful', text: 'Statistical analysis and deep understanding.' },
      { range: '9-10', label: 'Groundbreaking', text: 'Novel insights derived from complex data.' }
    ]
  },
  {
    id: 'creativity',
    name: 'Creativity',
    weight: 0.20,
    description: 'Originality of the question or approach.',
    guidelines: [
      { range: '1-3', label: 'Textbook', text: 'Standard baking soda volcano.' },
      { range: '4-6', label: 'Interesting', text: 'Good twist on a known experiment.' },
      { range: '7-8', label: 'Original', text: 'Unique question or novel apparatus.' },
      { range: '9-10', label: 'Genius', text: 'Completely new field of inquiry.' }
    ]
  },
  {
    id: 'display',
    name: 'Display & Speech',
    weight: 0.20,
    description: 'Clarity of communication.',
    guidelines: [
      { range: '1-3', label: 'Messy', text: 'Hard to read or follow.' },
      { range: '4-6', label: 'Clear', text: 'Organized board and decent explanation.' },
      { range: '7-8', label: 'Professional', text: 'Polished visuals and articulate answers.' },
      { range: '9-10', label: 'Expert', text: 'Communicates complex ideas simply.' }
    ]
  }
];

const COOKING_RUBRIC: Criterion[] = [
  {
    id: 'taste',
    name: 'Taste & Flavor',
    weight: 0.40,
    description: 'Balance of seasoning and flavor profile.',
    guidelines: [
      { range: '1-3', label: 'Bland/Bad', text: 'Over/under seasoned or unpleasant.' },
      { range: '4-6', label: 'Good', text: 'Tasty but lacks depth.' },
      { range: '7-8', label: 'Delicious', text: 'Complex, well-balanced flavors.' },
      { range: '9-10', label: 'Exquisite', text: 'Perfect harmony of flavors.' }
    ]
  },
  {
    id: 'texture',
    name: 'Texture & Doneness',
    weight: 0.30,
    description: 'Execution of cooking technique.',
    guidelines: [
      { range: '1-3', label: 'Poor', text: 'Soggy, tough, or burnt.' },
      { range: '4-6', label: 'Acceptable', text: 'Edible but minor flaws.' },
      { range: '7-8', label: 'Spot-on', text: 'Perfectly cooked components.' },
      { range: '9-10', label: 'Masterful', text: 'Textural contrast is sublime.' }
    ]
  },
  {
    id: 'plating',
    name: 'Presentation',
    weight: 0.20,
    description: 'Visual appeal of the dish.',
    guidelines: [
      { range: '1-3', label: 'Messy', text: 'Thrown on the plate.' },
      { range: '4-6', label: 'Neat', text: 'Clean but simple.' },
      { range: '7-8', label: 'Artistic', text: 'Thoughtful arrangement and color.' },
      { range: '9-10', label: 'Restaurant', text: 'Michelin-star level plating.' }
    ]
  },
  {
    id: 'creativity',
    name: 'Creativity',
    weight: 0.10,
    description: 'Use of ingredients and innovation.',
    guidelines: [
      { range: '1-3', label: 'Safe', text: 'Standard recipe.' },
      { range: '4-6', label: 'Tweaked', text: 'Small personal touch.' },
      { range: '7-8', label: 'Inventive', text: 'Unexpected flavor combinations.' },
      { range: '9-10', label: 'Visionary', text: 'Redefines the dish.' }
    ]
  }
];

export const COMPETITION_TEMPLATES: CompetitionTemplate[] = [
  { 
      id: 'gamejam', 
      label: 'Game Jam', 
      icon: '🎮', 
      description: 'Video game development competitions.', 
      rubric: GAME_JAM_RUBRIC,
      tieBreakers: [
          { title: 'Scope Management', question: 'Which team aimed for a realistic scope and finished it, versus a team that tried too much and left it half-baked?' },
          { title: 'The "Wow" Moment', question: 'Which game had a specific moment that made the judges smile or react?' },
          { title: 'Completeness', question: 'Which game feels like a complete "vertical slice" (Start Screen -> Gameplay -> Win/Loss State)?' }
      ]
  },
  { 
      id: 'hackathon', 
      label: 'Hackathon', 
      icon: '💻', 
      description: 'Software engineering & prototype events.', 
      rubric: HACKATHON_RUBRIC,
      tieBreakers: [
          { title: 'Feasibility', question: 'Which project is technically more feasible to deploy tomorrow?' },
          { title: 'Code Quality', question: 'If you looked at the repository, which one is structured better?' },
          { title: 'Demo Quality', question: 'Which live demo worked flawlessly without "smoke and mirrors"?' }
      ]
  },
  { 
      id: 'pitch', 
      label: 'Startup Pitch', 
      icon: '🚀', 
      description: 'Business ideas and investment pitches.', 
      rubric: PITCH_RUBRIC,
      tieBreakers: [
          { title: 'Investability', question: 'If you had $10k of your own money, which team would you back?' },
          { title: 'Founder Fit', question: 'Which team understands their specific customer pain point better?' },
          { title: 'Go-to-Market', question: 'Which team has a clearer, more realistic strategy to get their first 100 users?' }
      ]
  },
  { 
      id: 'art', 
      label: 'Art & Design', 
      icon: '🎨', 
      description: 'Visual arts, photography, or design.', 
      rubric: ART_RUBRIC,
      tieBreakers: [
          { title: 'Detail', question: 'Which piece holds up better under close scrutiny of details?' },
          { title: 'Risk', question: 'Which artist took a bigger creative risk?' },
          { title: 'Longevity', question: 'Which piece would you still find interesting to look at in a year?' }
      ]
  },
  { 
      id: 'science', 
      label: 'Science Fair', 
      icon: '🔬', 
      description: 'Academic and scientific research projects.', 
      rubric: SCIENCE_FAIR_RUBRIC,
      tieBreakers: [
          { title: 'Data Integrity', question: 'Which student understands their error margins and data limitations better?' },
          { title: 'Independence', question: 'Which project seems driven more by the student\'s own curiosity rather than external help?' },
          { title: 'Journal', question: 'Which project kept a more thorough lab notebook/log?' }
      ]
  },
  { 
      id: 'cooking', 
      label: 'Culinary', 
      icon: '🍳', 
      description: 'Cooking, baking, or food tasting.', 
      rubric: COOKING_RUBRIC,
      tieBreakers: [
          { title: 'Repeatability', question: 'Which dish would you order again immediately?' },
          { title: 'Complexity', question: 'Which dish required more technical precision to execute correctly?' },
          { title: 'Mouthfeel', question: 'Which dish had a more pleasant texture profile?' }
      ]
  },
];

// Fallback for types, though we should prefer templates now.
export const DEFAULT_RUBRIC = GAME_JAM_RUBRIC; 

export const DEFAULT_CONFIG: CompetitionConfig = {
  competitionId: '',
  title: 'My Event 2026',
  typeDescription: 'Game Jam',
  organizerPass: '',
  judgePass: '',
  rubric: DEFAULT_RUBRIC,
  isSetupComplete: false,
  tieBreakers: COMPETITION_TEMPLATES[0].tieBreakers, // Default to Game Jam
  visibility: 'public',
  registration: 'closed'
};

export const DEFAULT_CONTESTANTS: Contestant[] = [
  { id: 'c1', name: 'Participant A', title: 'Entry #1', description: 'Description of the first entry.', thumbnail: '' },
  { id: 'c2', name: 'Participant B', title: 'Entry #2', description: 'Description of the second entry.', thumbnail: '' },
  { id: 'c3', name: 'Participant C', title: 'Entry #3', description: 'Description of the third entry.', thumbnail: '' }
];
