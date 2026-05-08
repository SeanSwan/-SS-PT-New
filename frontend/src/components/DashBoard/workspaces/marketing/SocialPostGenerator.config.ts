/**
 * Social post composer configuration.
 * Keeps platform limits and hashtag suggestions out of the active UI surface.
 */

import type { PlatformConfig, SocialPlatform } from './marketing.types';

export const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    maxChars: 2200,
    color: '#E4405F',
    bestTimes: 'Tue/Thu 11am-1pm, Sat 9-11am',
  },
  facebook: {
    name: 'Facebook',
    maxChars: 63206,
    color: '#1877F2',
    bestTimes: 'Wed 11am-1pm, Fri 10-11am',
  },
  youtube: {
    name: 'YouTube',
    maxChars: 5000,
    color: '#FF0000',
    bestTimes: 'Thu/Fri 12-3pm, Sat 9-11am',
  },
  bluesky: {
    name: 'BlueSky',
    maxChars: 300,
    color: '#0085FF',
    bestTimes: 'Mon-Fri 8-10am, 6-9pm',
  },
  tiktok: {
    name: 'TikTok',
    maxChars: 2200,
    color: '#00F2EA',
    bestTimes: 'Tue/Thu 7-9pm, Sun 12-3pm',
  },
};

export const HASHTAG_SUGGESTIONS: Record<string, string[]> = {
  brand: ['#SwanStudios', '#SwanCoach', '#TrainWithSwan', '#SwanFitness'],
  niche: ['#PersonalTraining', '#GolfFitness', '#YouthAthlete', '#FitnessCoach', '#StrengthTraining'],
  trending: ['#FitnessMotivation', '#TransformationTuesday', '#FitLife', '#GolfLife', '#WorkoutOfTheDay'],
};
