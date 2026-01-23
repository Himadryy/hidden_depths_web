/**
 * ARCHITECTURAL CONTRACT: Phase 1
 * Define the shape of data to ensure decoupling between Frontend and Future Backend.
 */

export type MediaType = 'image' | 'video';

export interface Insight {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: MediaType;
  
  // Future-proofing for Phase 1 Database Scaling
  // These fields allow for sorting/filtering without breaking the UI
  order?: number; 
  tags?: string[];
  isActive?: boolean;
}
