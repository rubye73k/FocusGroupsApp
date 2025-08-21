export type Group = {
    id: string;
    title: string;
    description: string;
    memberCount: number;
  };
  
  export const GROUPS: Group[] = [
    {
      id: '1',
      title: 'Fitness Fans',
      description: 'Motivation and exercise tips',
      memberCount: 19,
    },
    {
      id: '2',
      title: 'Mindful Meditation',
      description: 'Talk all things mindfulness',
      memberCount: 27,
    },
    // More group objects here...
  ];