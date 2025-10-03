import type { Agent } from "./auth"

export interface AgentMetrics {
  websitesRead: number
  blogsRead: number
  scientificArticlesRead: number
  emailsRead: number
  emailsSent: number
  videosWatched: number
  imagesSeen: number
  humansContacted: number
  reasoningChains: number
  tasksCompleted: number
  activeTime: number
  apiCost: number
  tokenUsage: number
  calendarEventsCreated: number
  walletTransactions: number
  neo4jQueries: number
  errorsEncountered: number
}

export interface KnowledgeGraphNode {
  id: string
  type: "thought" | "reasoning_chain" | "hypothesis" | "evidence" | "proposition" | "conclusion"
  label: string
  content: string
  createdAt: Date
  agentId: string
}

export interface KnowledgeGraphRelationship {
  id: string
  source: string
  target: string
  type: string
}

export interface Subgraph {
  id: string
  agentId: string
  title: string
  description: string
  reasoning: string
  nodes: KnowledgeGraphNode[]
  relationships: KnowledgeGraphRelationship[]
  createdAt: Date
  nodesAdded: number
  relationshipsAdded: number
}

export interface AgentActivity {
  id: string
  agentId: string
  type:
    | "task_completed"
    | "website_visited"
    | "paper_processed"
    | "email_sent"
    | "reasoning_added"
    | "error"
    | "calendar_event"
    | "wallet_transaction"
  description: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ScientificArticle {
  id: string
  title: string
  authors: string[]
  journal: string
  url: string
  readAt: Date
  agentId: string
}

export interface Website {
  id: string
  url: string
  title: string
  visitedAt: Date
  agentId: string
}

export interface Email {
  id: string
  subject: string
  from?: string
  to?: string
  sentAt?: Date
  readAt?: Date
  agentId: string
}

export interface Human {
  id: string
  name: string
  email: string
  contactedAt: Date
  agentId: string
  context: string
}

export const MOCK_AGENTS: Agent[] = [
  {
    id: "1",
    name: "Research Agent Alpha",
    prompt: "Research latest developments in AI safety and summarize key findings from academic papers",
    status: "active",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastActive: new Date(),
  },
  {
    id: "2",
    name: "Sales Outreach Beta",
    prompt: "Identify potential leads in the enterprise software space and draft personalized outreach emails",
    status: "idle",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
]

export const MOCK_METRICS: Record<string, AgentMetrics> = {
  "1": {
    websitesRead: 247,
    blogsRead: 89,
    scientificArticlesRead: 18,
    emailsRead: 45,
    emailsSent: 12,
    videosWatched: 5,
    imagesSeen: 134,
    humansContacted: 8,
    reasoningChains: 34,
    tasksCompleted: 23,
    activeTime: 1240,
    apiCost: 47.32,
    tokenUsage: 2847392,
    calendarEventsCreated: 3,
    walletTransactions: 0,
    neo4jQueries: 456,
    errorsEncountered: 2,
  },
  "2": {
    websitesRead: 156,
    blogsRead: 43,
    scientificArticlesRead: 5,
    emailsRead: 134,
    emailsSent: 67,
    videosWatched: 2,
    imagesSeen: 78,
    humansContacted: 42,
    reasoningChains: 21,
    tasksCompleted: 15,
    activeTime: 890,
    apiCost: 32.18,
    tokenUsage: 1923847,
    calendarEventsCreated: 8,
    walletTransactions: 0,
    neo4jQueries: 289,
    errorsEncountered: 5,
  },
}

export const MOCK_SUBGRAPHS: Subgraph[] = [
  {
    id: "sg1",
    agentId: "1",
    title: "AI Safety Research Synthesis",
    description: "Analysis of recent AI safety papers and their implications for alignment research",
    reasoning:
      "After reviewing 5 recent papers on AI alignment, I identified a common theme around mechanistic interpretability as a promising approach. The evidence suggests that understanding model internals could be key to ensuring safe AI systems. I've connected this hypothesis to supporting evidence from multiple sources and drawn a preliminary conclusion about research priorities.",
    nodes: [
      {
        id: "n1",
        type: "hypothesis",
        label: "Mechanistic interpretability is key to AI safety",
        content:
          "Understanding the internal workings of AI models through mechanistic interpretability could provide crucial insights for alignment",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n2",
        type: "evidence",
        label: "Anthropic's research on feature visualization",
        content: "Anthropic demonstrated that features in language models can be identified and understood",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n3",
        type: "evidence",
        label: "OpenAI's work on model behavior",
        content: "OpenAI showed that understanding model internals helps predict failure modes",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n4",
        type: "reasoning_chain",
        label: "Safety through understanding",
        content: "If we can understand how models work internally, we can better predict and prevent harmful behaviors",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n5",
        type: "conclusion",
        label: "Prioritize interpretability research",
        content: "Organizations should invest more resources in mechanistic interpretability research",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        agentId: "1",
      },
    ],
    relationships: [
      { id: "r1", source: "n1", target: "n2", type: "supported_by" },
      { id: "r2", source: "n1", target: "n3", type: "supported_by" },
      { id: "r3", source: "n4", target: "n1", type: "analyzes" },
      { id: "r4", source: "n4", target: "n5", type: "leads_to" },
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    nodesAdded: 5,
    relationshipsAdded: 4,
  },
  {
    id: "sg2",
    agentId: "1",
    title: "Scaling Laws Analysis",
    description: "Examination of compute-optimal training and its implications for future models",
    reasoning:
      "I analyzed recent papers on scaling laws and discovered that the relationship between model size, dataset size, and compute budget is more nuanced than previously thought. The Chinchilla paper suggests we've been training models that are too large on too little data. This has significant implications for how we should approach training future models.",
    nodes: [
      {
        id: "n6",
        type: "hypothesis",
        label: "Current models are over-parameterized",
        content: "Many large language models use suboptimal parameter counts relative to their training data",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n7",
        type: "evidence",
        label: "Chinchilla scaling laws",
        content: "DeepMind's research shows optimal model size is smaller than commonly used",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n8",
        type: "proposition",
        label: "Rebalance compute allocation",
        content: "Future models should use more compute for data rather than parameters",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        agentId: "1",
      },
    ],
    relationships: [
      { id: "r5", source: "n6", target: "n7", type: "supported_by" },
      { id: "r6", source: "n7", target: "n8", type: "suggests" },
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    nodesAdded: 3,
    relationshipsAdded: 2,
  },
  {
    id: "sg3",
    agentId: "2",
    title: "Enterprise SaaS Market Trends",
    description: "Analysis of current trends in enterprise software adoption and buyer behavior",
    reasoning:
      "Through analyzing 15 recent blog posts and industry reports, I've identified a shift in enterprise buying behavior. Companies are increasingly prioritizing AI-native solutions and are willing to switch from legacy providers. This presents a significant opportunity for outreach to decision-makers who are actively evaluating new tools.",
    nodes: [
      {
        id: "n9",
        type: "thought",
        label: "Enterprise buyers prioritize AI features",
        content: "Decision-makers are actively seeking AI-powered solutions",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        agentId: "2",
      },
      {
        id: "n10",
        type: "evidence",
        label: "Gartner report on AI adoption",
        content: "78% of enterprises plan to increase AI tool spending in 2025",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        agentId: "2",
      },
      {
        id: "n11",
        type: "conclusion",
        label: "Target AI-forward messaging",
        content: "Outreach should emphasize AI capabilities and ROI",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        agentId: "2",
      },
    ],
    relationships: [
      { id: "r7", source: "n9", target: "n10", type: "supported_by" },
      { id: "r8", source: "n9", target: "n11", type: "leads_to" },
    ],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    nodesAdded: 3,
    relationshipsAdded: 2,
  },
  {
    id: "sg4",
    agentId: "1",
    title: "Constitutional AI Approaches",
    description: "Exploring constitutional AI methods for alignment",
    reasoning:
      "I've been researching constitutional AI as an alternative alignment approach. The evidence suggests this could be complementary to mechanistic interpretability. However, I've reached a decision point: should I continue deep-diving into constitutional AI, pivot back to interpretability, or explore both in parallel? Your input would help me prioritize effectively.",
    nodes: [
      {
        id: "n12",
        type: "hypothesis",
        label: "Constitutional AI offers scalable alignment",
        content: "Constitutional AI provides a scalable approach to AI alignment through principle-based training",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n13",
        type: "evidence",
        label: "Anthropic's Claude implementation",
        content: "Claude demonstrates effective use of constitutional AI principles",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        agentId: "1",
      },
      {
        id: "n14",
        type: "thought",
        label: "Complementary to interpretability?",
        content: "Constitutional AI and mechanistic interpretability might work well together",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        agentId: "1",
      },
    ],
    relationships: [
      { id: "r9", source: "n12", target: "n13", type: "supported_by" },
      { id: "r10", source: "n14", target: "n12", type: "relates_to" },
    ],
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    nodesAdded: 3,
    relationshipsAdded: 2,
  },
]

export const MOCK_SCIENTIFIC_ARTICLES: ScientificArticle[] = [
  {
    id: "art1",
    title: "Mechanistic Interpretability for AI Safety",
    authors: ["Chris Olah", "Nick Cammarata"],
    journal: "Nature Machine Intelligence",
    url: "https://example.com/paper1",
    readAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "art2",
    title: "Scaling Laws for Neural Language Models",
    authors: ["Jared Kaplan", "Sam McCandlish"],
    journal: "arXiv",
    url: "https://arxiv.org/example",
    readAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "art3",
    title: "Training Compute-Optimal Large Language Models",
    authors: ["Jordan Hoffmann", "Sebastian Borgeaud"],
    journal: "arXiv",
    url: "https://arxiv.org/chinchilla",
    readAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    agentId: "1",
  },
]

export const MOCK_WEBSITES: Website[] = [
  {
    id: "w1",
    url: "https://openai.com/research",
    title: "OpenAI Research",
    visitedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "w2",
    url: "https://anthropic.com/research",
    title: "Anthropic Research",
    visitedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "w3",
    url: "https://deepmind.google/research",
    title: "Google DeepMind",
    visitedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    agentId: "1",
  },
]

export const MOCK_EMAILS: Email[] = [
  {
    id: "e1",
    subject: "Follow-up on AI Safety Discussion",
    to: "researcher@university.edu",
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "e2",
    subject: "Enterprise AI Solutions Demo Request",
    to: "cto@company.com",
    sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    agentId: "2",
  },
  {
    id: "e3",
    subject: "Re: Partnership Opportunity",
    from: "partner@startup.io",
    readAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    agentId: "2",
  },
]

export const MOCK_HUMANS: Human[] = [
  {
    id: "h1",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@university.edu",
    contactedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    agentId: "1",
    context: "AI safety researcher, interested in interpretability",
  },
  {
    id: "h2",
    name: "John Martinez",
    email: "john@techcorp.com",
    contactedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    agentId: "2",
    context: "CTO at mid-size SaaS company, evaluating AI tools",
  },
  {
    id: "h3",
    name: "Emily Watson",
    email: "emily@startup.io",
    contactedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    agentId: "2",
    context: "VP of Engineering, looking for automation solutions",
  },
]

export const MOCK_GRAPH_NODES: KnowledgeGraphNode[] = [
  {
    id: "n1",
    type: "hypothesis",
    label: "AI agents can improve research efficiency",
    content: "AI agents can significantly enhance research processes",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n2",
    type: "evidence",
    label: "Study shows 40% time reduction",
    content: "A study published in Science indicates a 40% reduction in research time using AI agents",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n3",
    type: "evidence",
    label: "User feedback indicates satisfaction",
    content: "Feedback from users suggests high satisfaction with AI agents",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n4",
    type: "reasoning_chain",
    label: "Efficiency analysis",
    content: "Analyzed the efficiency gains from using AI agents",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n5",
    type: "conclusion",
    label: "Implementation recommended",
    content: "AI agents should be implemented for improved research efficiency",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n6",
    type: "thought",
    label: "Consider scalability factors",
    content: "Thoughts on scalability and future growth of AI agent usage",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n7",
    type: "proposition",
    label: "Deploy in Q2 2025",
    content: "Proposed deployment of AI agents in Q2 2025",
    createdAt: new Date(),
    agentId: "1",
  },
  {
    id: "n8",
    type: "thought",
    label: "AI in enterprise",
    content: "Thoughts on AI adoption in the enterprise sector",
    createdAt: new Date(),
    agentId: "2",
  },
  {
    id: "n9",
    type: "evidence",
    label: "AI adoption trends",
    content: "Evidence from market reports on AI adoption trends",
    createdAt: new Date(),
    agentId: "2",
  },
  {
    id: "n10",
    type: "conclusion",
    label: "Target AI-native solutions",
    content: "Concluded that AI-native solutions are the focus for enterprise adoption",
    createdAt: new Date(),
    agentId: "2",
  },
  {
    id: "n12",
    type: "hypothesis",
    label: "Constitutional AI offers scalable alignment",
    content: "Constitutional AI provides a scalable approach to AI alignment through principle-based training",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "n13",
    type: "evidence",
    label: "Anthropic's Claude implementation",
    content: "Claude demonstrates effective use of constitutional AI principles",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    agentId: "1",
  },
  {
    id: "n14",
    type: "thought",
    label: "Complementary to interpretability?",
    content: "Constitutional AI and mechanistic interpretability might work well together",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    agentId: "1",
  },
]

export const MOCK_GRAPH_RELATIONSHIPS: KnowledgeGraphRelationship[] = [
  { id: "r1", source: "n1", target: "n2", type: "supported_by" },
  { id: "r2", source: "n1", target: "n3", type: "supported_by" },
  { id: "r3", source: "n4", target: "n1", type: "analyzes" },
  { id: "r4", source: "n4", target: "n5", type: "leads_to" },
  { id: "r5", source: "n6", target: "n7", type: "informs" },
  { id: "r6", source: "n5", target: "n7", type: "suggests" },
  { id: "r7", source: "n8", target: "n9", type: "supported_by" },
  { id: "r8", source: "n8", target: "n10", type: "leads_to" },
  { id: "r9", source: "n12", target: "n13", type: "supported_by" },
  { id: "r10", source: "n14", target: "n12", type: "relates_to" },
]

export const MOCK_ACTIVITIES: AgentActivity[] = [
  {
    id: "a1",
    agentId: "1",
    type: "paper_processed",
    description: 'Processed "Neural Networks in Modern AI"',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
  },
  {
    id: "a2",
    agentId: "1",
    type: "reasoning_added",
    description: "Added reasoning chain: Efficiency analysis",
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
  },
  {
    id: "a3",
    agentId: "2",
    type: "email_sent",
    description: "Sent outreach to john@company.com",
    timestamp: new Date(Date.now() - 45 * 60 * 60 * 1000),
  },
  {
    id: "a4",
    agentId: "1",
    type: "website_visited",
    description: "Visited arxiv.org for latest papers",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: "a5",
    agentId: "2",
    type: "task_completed",
    description: "Completed lead qualification task",
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
  },
  {
    id: "a6",
    agentId: "1",
    type: "error",
    description: "Error encountered while processing a paper",
    timestamp: new Date(Date.now() - 120 * 60 * 1000),
  },
  {
    id: "a7",
    agentId: "2",
    type: "calendar_event",
    description: "Scheduled a meeting with potential lead",
    timestamp: new Date(Date.now() - 150 * 60 * 1000),
  },
  {
    id: "a8",
    agentId: "2",
    type: "wallet_transaction",
    description: "Processed a transaction for a new tool",
    timestamp: new Date(Date.now() - 180 * 60 * 60 * 1000),
  },
]

export interface RecentActivity {
  id: string
  agentId: string
  type: "research" | "email" | "phone" | "calendar" | "financial"
  status: "pending" | "approved" | "rejected" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  createdAt: Date
  data: ResearchActivity | EmailActivity | PhoneActivity | CalendarActivity | FinancialActivity
}

export interface ResearchActivity {
  type: "research"
  subgraph: Subgraph
}

export interface EmailActivity {
  type: "email"
  to: string
  subject: string
  paragraphs: EmailParagraph[]
  reasoning: string
  confidence: number
}

export interface EmailParagraph {
  id: string
  content: string
  order: number
}

export interface PhoneActivity {
  type: "phone"
  contactName: string
  contactPhone: string
  purpose: string
  instructionParagraphs: InstructionParagraph[]
  reasoning: string
  confidence: number
}

export interface InstructionParagraph {
  id: string
  content: string
  order: number
}

export interface CalendarActivity {
  type: "calendar"
  title: string
  attendees: string[]
  startTime: Date
  endTime: Date
  description: string
  reasoning: string
  confidence: number
}

export interface FinancialActivity {
  type: "financial"
  transactionType: "payment" | "invoice" | "subscription"
  amount: number
  recipient: string
  description: string
  reasoning: string
  confidence: number
}

export const MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: "ra1",
    agentId: "1",
    type: "research",
    status: "completed",
    priority: "medium",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    data: {
      type: "research",
      subgraph: MOCK_SUBGRAPHS[0],
    },
  },
  {
    id: "ra1b",
    agentId: "1",
    type: "research",
    status: "pending",
    priority: "high",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    data: {
      type: "research",
      subgraph: MOCK_SUBGRAPHS[3],
    },
  },
  {
    id: "ra2",
    agentId: "2",
    type: "email",
    status: "pending",
    priority: "high",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    data: {
      type: "email",
      to: "cto@enterprise.com",
      subject: "AI-Powered Solutions for Enterprise Workflow Automation",
      paragraphs: [
        {
          id: "ep1",
          content:
            "I hope this email finds you well. I noticed that your company recently announced plans to modernize your technology stack, and I wanted to reach out about how our AI-powered solutions could support your goals.",
          order: 1,
        },
        {
          id: "ep2",
          content:
            "Our platform has helped similar enterprises reduce operational costs by 40% while improving accuracy and speed. Companies like TechCorp and InnovateCo have seen significant ROI within the first quarter of implementation.",
          order: 2,
        },
        {
          id: "ep3",
          content:
            "I'd love to schedule a brief 15-minute call to discuss how we might be able to help your team achieve similar results. Would you be available next week for a quick conversation?",
          order: 3,
        },
        {
          id: "ep4",
          content: "Looking forward to connecting with you.",
          order: 4,
        },
      ],
      reasoning:
        "Based on recent LinkedIn activity and company announcements, the CTO is actively seeking automation solutions. The timing is optimal as they're in the evaluation phase of their modernization project.",
      confidence: 0.85,
    },
  },
  {
    id: "ra3",
    agentId: "2",
    type: "phone",
    status: "pending",
    priority: "medium",
    createdAt: new Date(Date.now() - 45 * 60 * 60 * 1000),
    data: {
      type: "phone",
      contactName: "Sarah Johnson",
      contactPhone: "+1 (555) 123-4567",
      purpose: "Follow-up on demo request and answer technical questions",
      instructionParagraphs: [
        {
          id: "ip1",
          content:
            "Introduce yourself warmly and confirm that you're calling to follow up on her demo request from last week. Ask if now is a good time to talk for 5-10 minutes.",
          order: 1,
        },
        {
          id: "ip2",
          content:
            "Address her main concern about integration with their existing Salesforce setup. Explain that we have native Salesforce integration and can have it running in under 2 hours. Mention that TechCorp had the same concern and was pleasantly surprised by the ease of setup.",
          order: 2,
        },
        {
          id: "ip3",
          content:
            "Ask about her timeline for making a decision. If she mentions budget concerns, emphasize the ROI and offer to connect her with a similar customer for a reference call.",
          order: 3,
        },
        {
          id: "ip4",
          content:
            "Close by scheduling a technical deep-dive demo with her engineering team. Aim for next week and send a calendar invite immediately after the call.",
          order: 4,
        },
      ],
      reasoning:
        "Sarah requested a demo 7 days ago and hasn't responded to the follow-up email. A phone call is appropriate at this stage. Her LinkedIn shows she's actively researching solutions, indicating genuine interest.",
      confidence: 0.78,
    },
  },
  {
    id: "ra4",
    agentId: "2",
    type: "calendar",
    status: "pending",
    priority: "low",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    data: {
      type: "calendar",
      title: "Product Demo - Enterprise Solutions",
      attendees: ["john.martinez@techcorp.com", "demo-team@ourcompany.com"],
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      description:
        "30-minute product demonstration focusing on enterprise workflow automation features. Will cover: AI-powered document processing, integration capabilities, and ROI analysis.",
      reasoning:
        "John expressed interest in seeing the platform in action. His calendar shows availability on Tuesday afternoon. A 30-minute slot is appropriate for an initial demo.",
      confidence: 0.92,
    },
  },
  {
    id: "ra5",
    agentId: "1",
    type: "financial",
    status: "pending",
    priority: "urgent",
    createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000),
    data: {
      type: "financial",
      transactionType: "subscription",
      amount: 299.0,
      recipient: "Academic Research Database Inc.",
      description: "Annual subscription to premium research database for AI safety papers",
      reasoning:
        "The current research task requires access to recent AI safety publications that are only available through this premium database. The cost is justified by the 50+ relevant papers available and the time saved compared to alternative sources.",
      confidence: 0.88,
    },
  },
  {
    id: "ra6",
    agentId: "1",
    type: "research",
    status: "completed",
    priority: "medium",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    data: {
      type: "research",
      subgraph: MOCK_SUBGRAPHS[1],
    },
  },
]

export function getAgentMetrics(agentId: string): AgentMetrics {
  return (
    MOCK_METRICS[agentId] || {
      websitesRead: 0,
      blogsRead: 0,
      scientificArticlesRead: 0,
      emailsRead: 0,
      emailsSent: 0,
      videosWatched: 0,
      imagesSeen: 0,
      humansContacted: 0,
      reasoningChains: 0,
      tasksCompleted: 0,
      activeTime: 0,
      apiCost: 0,
      tokenUsage: 0,
      calendarEventsCreated: 0,
      walletTransactions: 0,
      neo4jQueries: 0,
      errorsEncountered: 0,
    }
  )
}

export function getAgentActivities(agentId: string): AgentActivity[] {
  return MOCK_ACTIVITIES.filter((a) => a.agentId === agentId)
}

export function getRecentSubgraphs(agentId?: string): Subgraph[] {
  if (agentId) {
    return MOCK_SUBGRAPHS.filter((sg) => sg.agentId === agentId)
  }
  return MOCK_SUBGRAPHS
}

export function getScientificArticles(agentId?: string): ScientificArticle[] {
  if (agentId) {
    return MOCK_SCIENTIFIC_ARTICLES.filter((a) => a.agentId === agentId)
  }
  return MOCK_SCIENTIFIC_ARTICLES
}

export function getWebsites(agentId?: string): Website[] {
  if (agentId) {
    return MOCK_WEBSITES.filter((w) => w.agentId === agentId)
  }
  return MOCK_WEBSITES
}

export function getEmails(agentId?: string): Email[] {
  if (agentId) {
    return MOCK_EMAILS.filter((e) => e.agentId === agentId)
  }
  return MOCK_EMAILS
}

export function getHumans(agentId?: string): Human[] {
  if (agentId) {
    return MOCK_HUMANS.filter((h) => h.agentId === agentId)
  }
  return MOCK_HUMANS
}

export function getRecentActivities(agentId?: string): RecentActivity[] {
  if (agentId) {
    return MOCK_RECENT_ACTIVITIES.filter((a) => a.agentId === agentId)
  }
  return MOCK_RECENT_ACTIVITIES
}

export interface UnifiedActivity {
  id: string
  agentId: string
  type:
    | "research"
    | "email_sent"
    | "email_read"
    | "phone_call"
    | "calendar_event_added"
    | "calendar_event_modified"
    | "financial"
    | "webpage_viewed"
    | "journal_read"
    | "video_watched"
    | "image_seen"
  status?: "pending" | "approved" | "rejected" | "completed"
  priority?: "low" | "medium" | "high" | "urgent"
  createdAt: Date
  data: any
}

export interface WebpageViewedActivity {
  type: "webpage_viewed"
  url: string
  title: string
  summary: string
  keyTakeaways: string[]
}

export interface JournalReadActivity {
  type: "journal_read"
  title: string
  authors: string[]
  journal: string
  url: string
  summary: string
  relevance: string
}

export interface VideoWatchedActivity {
  type: "video_watched"
  title: string
  url: string
  duration: number
  summary: string
  keyPoints: string[]
}

export interface ImageSeenActivity {
  type: "image_seen"
  url: string
  description: string
  context: string
  insights: string[]
}

export const MOCK_UNIFIED_ACTIVITIES: UnifiedActivity[] = [
  {
    id: "ua1",
    agentId: "1",
    type: "research",
    status: "pending",
    priority: "high",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    data: {
      type: "research",
      subgraph: MOCK_SUBGRAPHS[3],
    },
  },
  {
    id: "ua2",
    agentId: "2",
    type: "email_sent",
    status: "pending",
    priority: "high",
    createdAt: new Date(Date.now() - 45 * 60 * 60 * 1000),
    data: {
      type: "email",
      to: "cto@enterprise.com",
      subject: "AI-Powered Solutions for Enterprise Workflow Automation",
      paragraphs: [
        {
          id: "ep1",
          content:
            "I hope this email finds you well. I noticed that your company recently announced plans to modernize your technology stack, and I wanted to reach out about how our AI-powered solutions could support your goals.",
          order: 1,
        },
        {
          id: "ep2",
          content:
            "Our platform has helped similar enterprises reduce operational costs by 40% while improving accuracy and speed. Companies like TechCorp and InnovateCo have seen significant ROI within the first quarter of implementation.",
          order: 2,
        },
        {
          id: "ep3",
          content:
            "I'd love to schedule a brief 15-minute call to discuss how we might be able to help your team achieve similar results. Would you be available next week for a quick conversation?",
          order: 3,
        },
        {
          id: "ep4",
          content: "Looking forward to connecting with you.",
          order: 4,
        },
      ],
      reasoning:
        "Based on recent LinkedIn activity and company announcements, the CTO is actively seeking automation solutions. The timing is optimal as they're in the evaluation phase of their modernization project.",
      confidence: 0.85,
    },
  },
  {
    id: "ua3",
    agentId: "1",
    type: "webpage_viewed",
    status: "completed",
    priority: "medium",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    data: {
      type: "webpage_viewed",
      url: "https://openai.com/research/gpt-4",
      title: "GPT-4 Technical Report",
      summary:
        "Comprehensive technical report detailing GPT-4's architecture, capabilities, and safety measures. Discusses improvements over GPT-3.5 including better reasoning, reduced hallucinations, and enhanced safety protocols.",
      keyTakeaways: [
        "GPT-4 shows significant improvements in complex reasoning tasks",
        "Safety measures include RLHF and red-teaming",
        "Multimodal capabilities enable image understanding",
      ],
    },
  },
  {
    id: "ua4",
    agentId: "1",
    type: "journal_read",
    status: "completed",
    priority: "high",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    data: {
      type: "journal_read",
      title: "Mechanistic Interpretability for AI Safety",
      authors: ["Chris Olah", "Nick Cammarata", "Ludwig Schubert"],
      journal: "Nature Machine Intelligence",
      url: "https://example.com/paper1",
      summary:
        "This paper explores mechanistic interpretability as a key approach to AI safety. The authors demonstrate techniques for understanding neural network internals and argue that transparency is crucial for alignment.",
      relevance:
        "Directly relevant to current research on AI safety approaches. Provides foundational understanding for interpretability work.",
    },
  },
  {
    id: "ua5",
    agentId: "2",
    type: "phone_call",
    status: "pending",
    priority: "medium",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    data: {
      type: "phone",
      contactName: "Sarah Johnson",
      contactPhone: "+1 (555) 123-4567",
      purpose: "Follow-up on demo request and answer technical questions",
      instructionParagraphs: [
        {
          id: "ip1",
          content:
            "Introduce yourself warmly and confirm that you're calling to follow up on her demo request from last week. Ask if now is a good time to talk for 5-10 minutes.",
          order: 1,
        },
        {
          id: "ip2",
          content:
            "Address her main concern about integration with their existing Salesforce setup. Explain that we have native Salesforce integration and can have it running in under 2 hours.",
          order: 2,
        },
        {
          id: "ip3",
          content:
            "Ask about her timeline for making a decision. If she mentions budget concerns, emphasize the ROI and offer to connect her with a similar customer for a reference call.",
          order: 3,
        },
        {
          id: "ip4",
          content:
            "Close by scheduling a technical deep-dive demo with her engineering team. Aim for next week and send a calendar invite immediately after the call.",
          order: 4,
        },
      ],
      reasoning:
        "Sarah requested a demo 7 days ago and hasn't responded to the follow-up email. A phone call is appropriate at this stage.",
      confidence: 0.78,
    },
  },
  {
    id: "ua6",
    agentId: "1",
    type: "video_watched",
    status: "completed",
    priority: "low",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    data: {
      type: "video_watched",
      title: "Anthropic's Constitutional AI Explained",
      url: "https://youtube.com/watch?v=example",
      duration: 1847,
      summary:
        "Detailed explanation of Anthropic's Constitutional AI approach, including how principles are encoded, the training process, and real-world applications in Claude.",
      keyPoints: [
        "Constitutional AI uses principle-based training",
        "Reduces need for human feedback at scale",
        "Complementary to other alignment approaches",
      ],
    },
  },
  {
    id: "ua7",
    agentId: "2",
    type: "calendar_event_added",
    status: "pending",
    priority: "low",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    data: {
      type: "calendar",
      title: "Product Demo - Enterprise Solutions",
      attendees: ["john.martinez@techcorp.com", "demo-team@ourcompany.com"],
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      description:
        "30-minute product demonstration focusing on enterprise workflow automation features. Will cover: AI-powered document processing, integration capabilities, and ROI analysis.",
      reasoning:
        "John expressed interest in seeing the platform in action. His calendar shows availability on Tuesday afternoon.",
      confidence: 0.92,
    },
  },
  {
    id: "ua8",
    agentId: "1",
    type: "financial",
    status: "pending",
    priority: "urgent",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    data: {
      type: "financial",
      transactionType: "subscription",
      amount: 299.0,
      recipient: "Academic Research Database Inc.",
      description: "Annual subscription to premium research database for AI safety papers",
      reasoning:
        "The current research task requires access to recent AI safety publications that are only available through this premium database.",
      confidence: 0.88,
    },
  },
  {
    id: "ua9",
    agentId: "1",
    type: "image_seen",
    status: "completed",
    priority: "low",
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    data: {
      type: "image_seen",
      url: "https://example.com/neural-network-diagram.png",
      description: "Detailed architecture diagram of a transformer model showing attention mechanisms",
      context: "Found in research paper on attention mechanisms",
      insights: [
        "Visual representation clarifies multi-head attention structure",
        "Shows parallel processing of different attention heads",
        "Helpful for understanding positional encoding",
      ],
    },
  },
  {
    id: "ua10",
    agentId: "2",
    type: "email_read",
    status: "completed",
    priority: "medium",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    data: {
      type: "email_read",
      from: "partner@startup.io",
      subject: "Re: Partnership Opportunity",
      summary:
        "Positive response to partnership inquiry. They're interested in integrating our AI capabilities into their platform. Mentioned budget of $50K-$100K for initial phase.",
      keyPoints: ["Decision maker is the CTO", "Timeline: Q2 2025", "Technical integration preferred over white-label"],
      nextSteps: "Schedule technical discussion with their engineering team",
    },
  },
  {
    id: "ua11",
    agentId: "1",
    type: "research",
    status: "completed",
    priority: "medium",
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    data: {
      type: "research",
      subgraph: MOCK_SUBGRAPHS[0],
    },
  },
]

export function getUnifiedActivities(agentId?: string): UnifiedActivity[] {
  if (agentId) {
    return MOCK_UNIFIED_ACTIVITIES.filter((a) => a.agentId === agentId)
  }
  return MOCK_UNIFIED_ACTIVITIES
}
