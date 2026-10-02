export type HackathonTrack = 
  | 'AI for Social Good'
  | 'Climate & Sustainability'
  | 'HealthTech & Bio'
  | 'Civic & Community Tech'
  | 'Hardware & Embedded IoT'
  | 'Open Innovation';

export interface ProjectMember {
  name: string;
  role: string;
  avatar?: string;
  github?: string;
}

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  track: HackathonTrack;
  techStack: string[];
  members: ProjectMember[];
  githubUrl?: string;
  liveDemoUrl?: string;
  videoUrl?: string;
  tableNumber: string;
  votes: number;
  featured?: boolean;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string; // e.g., "2026-10-02T18:00:00"
  endTime: string;
  category: 'Keynote' | 'Workshop' | 'Meal' | 'Deadline' | 'Activity' | 'Mentorship';
  speaker?: string;
  day: 1 | 2 | 3;
}

export interface TeamPost {
  id: string;
  authorName: string;
  authorEmail: string;
  authorDiscord: string;
  type: 'seeking-team' | 'team-seeking-members';
  currentTeamSize?: number;
  projectIdea?: string;
  preferredTrack: HackathonTrack | 'Any';
  skillsLookingFor: string[];
  skillsOffered: string[];
  bio: string;
  createdAt: string;
}

export interface MentorTicket {
  id: string;
  teamName: string;
  tableNumber: string;
  contactHandle: string; // Slack / Discord / Phone
  topic: 'Frontend/Web' | 'Backend/API' | 'AI/ML' | 'Hardware/Embedded' | 'Mobile' | 'Design/Pitch';
  description: string;
  status: 'pending' | 'claimed' | 'resolved';
  claimedBy?: string;
  createdAt: string;
}

export interface HardwareItem {
  id: string;
  name: string;
  category: 'Microcontrollers' | 'Sensors & Modules' | 'Displays' | 'Tools & Kits';
  totalQuantity: number;
  availableQuantity: number;
  description: string;
  specs: string[];
  imageUrl?: string;
}

export interface TrackPrize {
  title: string;
  sponsor: string;
  prizeAmount: string;
  description: string;
  criteria: string[];
  tags: string[];
}
