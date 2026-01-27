
import { Criterion, Team, Judge } from './types';

export const RUBRIC: Criterion[] = [
  {
    id: 'innovation',
    name: 'Innovation & Creativity',
    weight: 0.30,
    description: 'This is the most critical category. Is the concept novel or a direct clone?',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'A direct clone of an existing game (e.g., Flappy Bird with a different skin) with no new mechanics.' },
      { range: '4-6', label: 'Mid', text: 'Uses standard mechanics but applies them in a slightly interesting way or context.' },
      { range: '7-8', label: 'High', text: 'Introduces a clever twist on a genre or a unique mechanic not often seen.' },
      { range: '9-10', label: 'Outstanding', text: '"I’ve never played something quite like this." A completely novel concept, mechanic, or narrative approach.' }
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
      { range: '9-10', label: 'Outstanding', text: 'The game loop is addictive, pacing is excellent, and the player actively enjoys the experience ("Just one more try").' }
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
      { range: '7-8', label: 'High', text: 'The theme is integrated into the mechanics (e.g., if the theme is "Waves," mechanics rely on wave physics).' },
      { range: '9-10', label: 'Outstanding', text: 'The game could not exist without the theme; it is a perfect interpretation (literal or metaphorical).' }
    ]
  },
  {
    id: 'technical',
    name: 'Technical Execution & Polish',
    weight: 0.15,
    description: 'Is it a playable prototype or a buggy mess?',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'Game crashes, critical bugs prevent finishing the level, or unplayable frame rate.' },
      { range: '4-6', label: 'Mid', text: 'Playable, but has glitches, physics errors, or clunky UI.' },
      { range: '7-8', label: 'High', text: 'Smooth performance, no game-breaking bugs, includes a Start/Restart menu.' },
      { range: '9-10', label: 'Outstanding', text: 'Feels surprisingly solid for 48 hours. Includes "juice" (screen shake, particle effects) and robust inputs.' }
    ]
  },
  {
    id: 'aesthetics',
    name: 'Aesthetics (Art & Audio)',
    weight: 0.10,
    description: 'Visual and auditory cohesion.',
    guidelines: [
      { range: '1-3', label: 'Low', text: 'No sound, mismatched assets, or very hard to look at (UI covers gameplay).' },
      { range: '4-6', label: 'Mid', text: 'Functional art (can tell what things are), basic sound effects.' },
      { range: '7-8', label: 'High', text: 'Cohesive art style (even if simple shapes/pixel art) and sound effects that fit the actions.' },
      { range: '9-10', label: 'Outstanding', text: 'Beautiful art direction, great use of color, and immersive music/audio that elevates the mood.' }
    ]
  }
];

export const TEAMS: Team[] = [
  { id: 't1', name: 'CyberWizards', gameTitle: 'Neon Nexus', description: 'A fast-paced neon platformer with rhythm-based combat.', thumbnail: 'https://picsum.photos/seed/neon/800/450' },
  { id: 't2', name: 'Gravity Goblins', gameTitle: 'Orbital Strike', description: 'Physics-based orbital combat where you play as the planet.', thumbnail: 'https://picsum.photos/seed/gravity/800/450' },
  { id: 't3', name: 'The Pixel Pirates', gameTitle: 'Rum Runners', description: 'Procedural sea-faring adventure with a unique trading mechanic.', thumbnail: 'https://picsum.photos/seed/pirate/800/450' },
  { id: 't4', name: 'Code Crushers', gameTitle: 'Syntax Error', description: 'Puzzle game set inside a computer where you fix logic gates.', thumbnail: 'https://picsum.photos/seed/code/800/450' },
  { id: 't5', name: 'Dream Weavers', gameTitle: 'Somnia', description: 'Surreal exploration in a dreamscape with gravity-shifting puzzles.', thumbnail: 'https://picsum.photos/seed/dream/800/450' }
];

export const INITIAL_OTHER_JUDGES: Judge[] = [];
