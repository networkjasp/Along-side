// GET /api/content: public portfolio + founder photo (hidden projects excluded).
import { getStore } from '@netlify/blobs';
import { handlePublicContent } from '../lib/cms.mjs';
import { defaults } from '../lib/defaults.mjs';

export default async () =>
  handlePublicContent({ contentStore: getStore({ name: 'site-content', consistency: 'strong' }), defaults });

export const config = { path: '/api/content', method: 'GET' };
