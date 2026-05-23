import client from '../../client';
import { mapListSafely } from '../mapListSafely';

import { mapCustomCake, mapUploadedCakeImage } from './uploadMappers';
import type { RawCustomCake, RawUploadedCakeImage } from './uploadMappers';

export const cakeApi = {
  listCustomCakes: () =>
    client
      .get<{ data: RawCustomCake[] } | RawCustomCake[]>('/custom-cakes', { params: { limit: 50 } })
      .then((r) => {
        const raw = Array.isArray(r.data)
          ? r.data
          : ((r.data as { data: RawCustomCake[] }).data ?? []);
        return mapListSafely(raw, 'custom-cakes', mapCustomCake);
      }),

  listUploadedCakes: () =>
    client
      .get<
        { data: RawUploadedCakeImage[] } | RawUploadedCakeImage[]
      >('/uploaded-cakes', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data)
          ? r.data
          : ((r.data as { data: RawUploadedCakeImage[] }).data ?? []);
        return mapListSafely(raw, 'uploaded-cakes', mapUploadedCakeImage);
      }),
};
