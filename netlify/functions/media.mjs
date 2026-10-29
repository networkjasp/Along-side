// GET /media/<key>: images uploaded through the Website Manager.
import { getStore } from '@netlify/blobs';
import { handleMedia } from '../lib/cms.mjs';

export default async (req) => handleMedia(req, { mediaStore: getStore('site-media') });

export const config = { path: '/media/*', method: 'GET' };
