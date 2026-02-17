export interface Skill {
  id: string;
  name: string;
  description: string;
  tools: string[];
  triggers: ('heartbeat' | 'manual')[];
  instructions: string;
}
