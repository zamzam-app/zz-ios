"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const outletSearch_1 = require("../src/screens/infrastructure/outletSearch");
function createOutlet(overrides = {}) {
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
    const model = (0, outletSearch_1.buildOutletsScreenModel)([createOutlet()], '', '');
    strict_1.default.equal(model.searchPlaceholder, outletSearch_1.OUTLET_SEARCH_PLACEHOLDER);
    strict_1.default.equal(model.showClearSearch, false);
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
    strict_1.default.deepEqual((0, outletSearch_1.filterOutletsByQuery)(outlets, 'airport').map((outlet) => outlet.id), ['outlet-2']);
    strict_1.default.deepEqual((0, outletSearch_1.filterOutletsByQuery)(outlets, 'mg road').map((outlet) => outlet.id), ['outlet-1']);
    strict_1.default.deepEqual((0, outletSearch_1.filterOutletsByQuery)(outlets, 'aisha').map((outlet) => outlet.id), ['outlet-1']);
    strict_1.default.deepEqual((0, outletSearch_1.filterOutletsByQuery)(outlets, 'form-001').map((outlet) => outlet.id), ['outlet-1']);
}
function testEmptySearchResultState() {
    const model = (0, outletSearch_1.buildOutletsScreenModel)([createOutlet()], 'zzz', 'zzz');
    strict_1.default.equal(model.visibleOutlets.length, 0);
    strict_1.default.equal(model.emptyMessage, 'No outlets match your search');
}
function testClearingSearchInput() {
    const outlets = [
        createOutlet(),
        createOutlet({ id: 'outlet-2', name: 'Indiranagar Kitchen' }),
    ];
    const filteredModel = (0, outletSearch_1.buildOutletsScreenModel)(outlets, 'indi', 'indi');
    strict_1.default.equal(filteredModel.showClearSearch, true);
    strict_1.default.deepEqual(filteredModel.visibleOutlets.map((outlet) => outlet.id), ['outlet-2']);
    const clearedModel = (0, outletSearch_1.buildOutletsScreenModel)(outlets, '', '');
    strict_1.default.equal(clearedModel.showClearSearch, false);
    strict_1.default.deepEqual(clearedModel.visibleOutlets.map((outlet) => outlet.id), ['outlet-1', 'outlet-2']);
}
function testRegressionCoverageForExistingOutletListBehavior() {
    const outlets = [
        createOutlet({ id: 'outlet-1', name: 'Alpha' }),
        createOutlet({ id: 'outlet-2', name: 'Beta' }),
    ];
    const model = (0, outletSearch_1.buildOutletsScreenModel)(outlets, '', '');
    strict_1.default.equal(model.emptyMessage, outletSearch_1.OUTLETS_EMPTY_DEFAULT_MESSAGE);
    strict_1.default.deepEqual(model.visibleOutlets.map((outlet) => outlet.id), ['outlet-1', 'outlet-2']);
    strict_1.default.notEqual(model.visibleOutlets, outlets);
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
