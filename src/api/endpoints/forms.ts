import client from '../client';

export type QuestionType = 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'rating';

export interface Option {
  text: string;
  selected?: boolean;
}

export interface Question {
  _id: string;
  type: QuestionType;
  title: string;
  isRequired: boolean;
  hint?: string;
  options?: Option[];
  maxRatings?: number;
  starStep?: number;
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
  questions?: RawQuestion[];
}

interface RawOption {
  text?: unknown;
  selected?: unknown;
}

interface RawQuestion {
  _id?: unknown;
  id?: unknown;
  type?: unknown;
  title?: unknown;
  isRequired?: unknown;
  hint?: unknown;
  options?: unknown;
  maxRatings?: unknown;
  starStep?: unknown;
}

interface UpdateQuestionPayload {
  type: QuestionType;
  title: string;
  isRequired: boolean;
  hint?: string;
  options?: Option[];
  maxRatings?: number;
  starStep?: number;
}

const QUESTION_TYPES: QuestionType[] = [
  'short_answer',
  'paragraph',
  'multiple_choice',
  'checkbox',
  'rating',
];

function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === 'string' && QUESTION_TYPES.includes(value as QuestionType);
}

function mapOption(raw: RawOption): Option | null {
  if (typeof raw.text !== 'string') return null;
  return {
    text: raw.text,
    ...(typeof raw.selected === 'boolean' ? { selected: raw.selected } : {}),
  };
}

function mapQuestion(raw: RawQuestion, index: number): Question {
  return {
    _id: String(raw._id ?? raw.id ?? `q_${index}`),
    type: isQuestionType(raw.type) ? raw.type : 'short_answer',
    title: typeof raw.title === 'string' ? raw.title : '',
    isRequired: typeof raw.isRequired === 'boolean' ? raw.isRequired : false,
    ...(typeof raw.hint === 'string' ? { hint: raw.hint } : {}),
    ...(Array.isArray(raw.options)
      ? {
          options: raw.options
            .map((option) => mapOption((option ?? {}) as RawOption))
            .filter((option): option is Option => option !== null),
        }
      : {}),
    ...(typeof raw.maxRatings === 'number' ? { maxRatings: raw.maxRatings } : {}),
    ...(typeof raw.starStep === 'number' ? { starStep: raw.starStep } : {}),
  };
}

function toUpdateQuestionPayload(question: Question): UpdateQuestionPayload {
  return {
    type: question.type,
    title: question.title,
    isRequired: question.isRequired,
    ...(typeof question.hint === 'string' ? { hint: question.hint } : {}),
    ...(Array.isArray(question.options)
      ? {
          options: question.options.map((option) => ({
            text: option.text,
            ...(typeof option.selected === 'boolean' ? { selected: option.selected } : {}),
          })),
        }
      : {}),
    ...(typeof question.maxRatings === 'number' ? { maxRatings: question.maxRatings } : {}),
    ...(typeof question.starStep === 'number' ? { starStep: question.starStep } : {}),
  };
}

function mapForm(raw: RawForm): Form {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: raw.title ?? 'Untitled Form',
    questions: (raw.questions ?? []).map(mapQuestion),
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
        questions: payload.questions.map(toUpdateQuestionPayload),
      })
      .then((r) => mapForm(r.data)),

  delete: (id: string) => client.delete(`/forms/${id}`),
};
