import { Insight } from '@/types/schema';

/**
 * MOCK DATABASE LAYER
 * Currently serves static data. 
 * In Phase 3 (Scalability), this will be replaced by an API call to the Go/Node Backend.
 */

export const INSIGHTS_DATA: Insight[] = [
  { 
    id: "insight-01",
    title: "Holistic Well-being", 
    description: "“Holistic well-being is the art of tending to every layer of our being—body, mind, and soul. True healing is not in fragments, but in weaving balance, where inner peace and outer strength walk hand in hand.”", 
    mediaUrl: "/assets/wellbeing.jpg",
    mediaType: 'image',
    order: 1
  },
  { 
    id: "insight-02",
    title: "Physical & Mental Health", 
    description: "“Physical and mental health are two strings of the same melody—when one falls out of tune, the harmony is lost. Healing, in the eyes of a therapist, is not just curing pain but nurturing both body and mind to dance together in balance.”", 
    mediaUrl: "/assets/health.jpg",
    mediaType: 'image',
    order: 2
  },
  { 
    id: "insight-03",
    title: "Mind-Body Harmony", 
    description: "“When mind and body move as one, life finds its natural rhythm. Harmony between thought and breath creates a sanctuary where strength and serenity can flourish side by side.”", 
    mediaUrl: "/assets/harmony.mp4",
    mediaType: 'video',
    order: 3
  },
  { 
    id: "insight-04",
    title: "Ethics & Empathy", 
    description: "“Ethics is the compass, empathy the heart—together they guide healing with integrity and compassion. True care is not only knowing what is right, but also feeling what another feels.”", 
    mediaUrl: "/assets/ethics.jpg",
    mediaType: 'image',
    order: 4
  },
  { 
    id: "insight-05",
    title: "Talk Freely, Live Happily", 
    description: "“Unspoken words weigh down the soul, but honest expression sets it free. In sharing openly, we invite healing, connection, and the simple joy of living without silence as a burden.”", 
    mediaUrl: "/assets/happiness.mp4",
    mediaType: 'video',
    order: 5
  }
];

// Simulation of an Async Database Fetch (Phase 1 Requirement)
export const fetchInsights = async (): Promise<Insight[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/insights`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) return data;
      }
    } catch (err) {
      console.warn('Failed to fetch insights from API, using fallback data.', err);
    }
  }
  return INSIGHTS_DATA;
};

// Landing Page Content (Decoupled)
export const LANDING_CONTENT = [
  {
    id: 'method',
    title: "Our Unique 'Focused Anonymity' Method",
    content: "Traditional video calls can be distracting. We've designed a unique experience to remove that anxiety and help you focus entirely on your conversation. When our session begins, I remain off-camera. Instead, your screen will display a peaceful, meditative visual to act as a calming anchor for your thoughts. Your camera is your choice, always. Your comfort is the priority."
  },
  {
    id: 'about',
    title: "Your Guide on the Side",
    content: "I am not a licensed therapist or a psychologist. I am a mentor and a guide, trained in the art of listening. My belief is that you already hold the answers you're looking for. My role is to walk beside you, listen without judgment, and ask thoughtful questions that help you see your own path more clearly. This is a partnership built on trust, respect, and our shared goal of finding your clarity."
  }
];
