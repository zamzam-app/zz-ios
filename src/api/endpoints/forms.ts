import client from '../client';

export type QuestionType = 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'rating';
export type UnsupportedQuestionType = 'unsupported';

export const QUESTION_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: QuestionType }> = [
  { label: 'Short Answer', value: 'short_answer' },
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Multiple Choice', value: 'multiple_choice' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Rating', value: 'rating' },
];

export const QUESTION_TYPES: QuestionType[] = QUESTION_TYPE_OPTIONS.map((option) => option.value);

export interface Option {
  text: string;
  selected?: boolean;
}

interface BaseQuestion {
  _id: string;
  title: string;
  isRequired: boolean;
  hint?: string;
  options?: Option[];
  maxRatings?: number;
  starStep?: number;
}

export interface SupportedQuestion extends BaseQuestion {
  type: QuestionType;
}

export interface UnsupportedQuestion extends BaseQuestion {
  type: UnsupportedQuestionType;
  rawType: string;
}

export type Question = SupportedQuestion | UnsupportedQuestion;

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
  type: string;
  title: string;
  isRequired: boolean;
  hint?: string;
  options?: Option[];
  maxRatings?: number;
  starStep?: number;
}

function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === 'string' && QUESTION_TYPES.includes(value as QuestionType);
}

const warnedUnknownQuestionTypes = new Set<string>();

function warnUnknownQuestionType(rawType: string) {
  if (!__DEV__ || warnedUnknownQuestionTypes.has(rawType)) return;
  warnedUnknownQuestionTypes.add(rawType);
  console.warn(`[formsApi] Unsupported question type "${rawType}" received from backend.`);
}

function mapOption(raw: RawOption): Option | null {
  if (typeof raw.text !== 'string') return null;
  return {
    text: raw.text,
    ...(typeof raw.selected === 'boolean' ? { selected: raw.selected } : {}),
  };
}

function mapQuestion(raw: RawQuestion, index: number): Question {
  const common: BaseQuestion = {
    _id: String(raw._id ?? raw.id ?? `q_${index}`),
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

  if (isQuestionType(raw.type)) {
    return {
      ...common,
      type: raw.type,
    };
  }

  const rawType = typeof raw.type === 'string' ? raw.type : String(raw.type ?? 'unknown');
  warnUnknownQuestionType(rawType);
  return {
    ...common,
    type: 'unsupported',
    rawType,
  };
}

function toUpdateQuestionPayload(question: Question): UpdateQuestionPayload {
  const type = question.type === 'unsupported' ? question.rawType : question.type;

  return {
    type,
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
