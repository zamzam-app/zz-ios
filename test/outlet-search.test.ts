import assert from 'node:assert/strict';
import {
  buildOutletsScreenModel,
  filterOutletsByQuery,
  OUTLET_SEARCH_PLACEHOLDER,
  OUTLETS_EMPTY_DEFAULT_MESSAGE,
  type SearchableOutlet,
} from '../src/screens/infrastructure/outletSearch';

type TestOutlet = SearchableOutlet & {
  outletTypeId?: string;
  rating: number;
  totalFeedback: number;
  images?: string[];
};

function createOutlet(overrides: Partial<TestOutlet> = {}): TestOutlet {
  return {
    id: 'outlet-1',
    name: 'Downtown Bakery',
    description: 'Flagship cafe with breakfast service',
    address: 'MG Road, Bengaluru',
    formId: 'FORM-001',
    outletTypeId: 'type-1',
    outletTypeName: 'Cafe',
    managerNames: ['Aisha Khan'],
    managerIds: ['manager-1'],
    rating: 4.7,
    totalFeedback: 12,
    images: [],
    qrToken: 'qr-downtown',
    ...overrides,
  };
}

function testSearchInputRenderingModel() {
  const model = buildOutletsScreenModel([createOutlet()], '', '');
  assert.equal(model.searchPlaceholder, OUTLET_SEARCH_PLACEHOLDER);
  assert.equal(model.showClearSearch, false);
}

function testFilteringOutletsByKeyword() {
  const outlets = [
    createOutlet(),
    createOutlet({
      id: 'outlet-2',
      name: 'Airport Express',
      address: 'Terminal 1, Bengaluru',
      formId: 'FORM-002',
      managerNames: ['Ravi Kumar'],
      managerIds: ['manager-2'],
      qrToken: 'qr-airport',
    }),
  ];

  assert.deepEqual(
    filterOutletsByQuery(outlets, 'airport').map((outlet) => outlet.id),
    ['outlet-2'],
  );
  assert.deepEqual(
    filterOutletsByQuery(outlets, 'mg road').map((outlet) => outlet.id),
    ['outlet-1'],
  );
  assert.deepEqual(
    filterOutletsByQuery(outlets, 'aisha').map((outlet) => outlet.id),
    ['outlet-1'],
  );
  assert.deepEqual(
    filterOutletsByQuery(outlets, 'form-001').map((outlet) => outlet.id),
    ['outlet-1'],
  );
}

function testEmptySearchResultState() {
  const model = buildOutletsScreenModel([createOutlet()], 'zzz', 'zzz');
  assert.equal(model.visibleOutlets.length, 0);
  assert.equal(model.emptyMessage, 'No outlets match your search');
}

function testClearingSearchInput() {
  const outlets = [createOutlet(), createOutlet({ id: 'outlet-2', name: 'Indiranagar Kitchen' })];

  const filteredModel = buildOutletsScreenModel(outlets, 'indi', 'indi');
  assert.equal(filteredModel.showClearSearch, true);
  assert.deepEqual(
    filteredModel.visibleOutlets.map((outlet) => outlet.id),
    ['outlet-2'],
  );

  const clearedModel = buildOutletsScreenModel(outlets, '', '');
  assert.equal(clearedModel.showClearSearch, false);
  assert.deepEqual(
    clearedModel.visibleOutlets.map((outlet) => outlet.id),
    ['outlet-1', 'outlet-2'],
  );
}

function testRegressionCoverageForExistingOutletListBehavior() {
  const outlets = [
    createOutlet({ id: 'outlet-1', name: 'Alpha' }),
    createOutlet({ id: 'outlet-2', name: 'Beta' }),
  ];

  const model = buildOutletsScreenModel(outlets, '', '');
  assert.equal(model.emptyMessage, OUTLETS_EMPTY_DEFAULT_MESSAGE);
  assert.deepEqual(
    model.visibleOutlets.map((outlet) => outlet.id),
    ['outlet-1', 'outlet-2'],
  );
  assert.notEqual(model.visibleOutlets, outlets);
}

function run() {
  testSearchInputRenderingModel();
  testFilteringOutletsByKeyword();
  testEmptySearchResultState();
  testClearingSearchInput();
  testRegressionCoverageForExistingOutletListBehavior();
  console.log('outlet-search.test.ts: ok');
}

run();
