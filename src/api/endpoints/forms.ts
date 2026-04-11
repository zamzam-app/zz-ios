import client from '../client';

export type QuestionType = 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'rating';

export interface Option {
  text: string;
}

export interface Question {
  _id: string;
  type: QuestionType;
  title: string;
  isRequired: boolean;
  hint?: string;
  options?: Option[];
  maxRatings?: number;
}

export interface Form {
  id: string;
  title: string;
  questions: Question[];
}

interface RawForm {
  _id?: string;
  id?: string;
  title?: string;
  questions?: Question[];
}

function mapForm(raw: RawForm): Form {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: raw.title ?? 'Untitled Form',
    questions: raw.questions ?? [],
  };
}

export const formsApi = {
  list: () =>
    client
      .get<{ data: RawForm[] } | RawForm[]>('/forms', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawForm[] }).data ?? [];
        return raw.map(mapForm);
      }),

  getById: (id: string) =>
    client.get<RawForm>(`/forms/${id}`).then((r) => mapForm(r.data)),

  create: () =>
    client
      .post<RawForm>('/forms', { title: 'Untitled Form', questions: [] })
      .then((r) => mapForm(r.data)),

  update: (id: string, payload: { title: string; questions: Question[] }) =>
    client
      .patch<RawForm>(`/forms/${id}`, {
        title: payload.title,
        questions: payload.questions.map(({ _id, ...q }) => q),
      })
      .then((r) => mapForm(r.data)),

  delete: (id: string) => client.delete(`/forms/${id}`),
};
