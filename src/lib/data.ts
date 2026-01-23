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
  // Simulate network latency (optional, currently instant for SSG)
  return INSIGHTS_DATA;
};
