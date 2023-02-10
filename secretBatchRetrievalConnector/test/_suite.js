"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const assert = __importStar(require("assert"));
const ttm = __importStar(require("azure-pipelines-task-lib/mock-test"));
describe("Fetch secret", () => {
    before(() => {
    });
    after(() => {
    });
    it('should succeed with valid inputs', function (done) {
        this.timeout(10000);
        let tp = path.join(__dirname, 'success.js');
        let tr = new ttm.MockTestRunner(tp);
        tr.run();
        console.log(tr.stdout);
        assert.ok(tr.stdout.indexOf('SECRET_WITH_SLASHES') >= 0, "should display the secret");
        done();
    });
    it('should fail with incorrect input', function (done) {
        this.timeout(10000);
        let tp = path.join(__dirname, 'failure.js');
        let tr = new ttm.MockTestRunner(tp);
        tr.run();
        console.log(tr.stdout);
        console.log("printv:: ", tr.errorIssues);
        assert.ok(tr.stdout.indexOf('SECRET_WITH_SLASHES') == -1, "should not display the secret");
        done();
    });
});
