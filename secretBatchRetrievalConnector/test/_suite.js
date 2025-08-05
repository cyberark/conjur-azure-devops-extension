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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const assert = __importStar(require("assert"));
const mock_test_1 = require("azure-pipelines-task-lib/mock-test");
describe("Fetch secret", () => {
    before(() => {
    });
    after(() => {
    });
    it('should succeed with valid inputs', () => __awaiter(void 0, void 0, void 0, function* () {
        let testPath = path.join(__dirname, 'success.js');
        const runner = new mock_test_1.MockTestRunner(testPath);
        yield runner.runAsync();
        console.log(runner.stdout);
        assert.ok(runner.stdout.indexOf('SECRET_WITH_SLASHES') >= 0, "should display the secret");
    }));
    it('should fail with incorrect endpoint input', () => __awaiter(void 0, void 0, void 0, function* () {
        let testPath = path.join(__dirname, 'failure.js');
        const runner = new mock_test_1.MockTestRunner(testPath);
        yield runner.runAsync();
        console.log(runner.stdout);
        console.log("printv:: ", runner.errorIssues);
        assert.ok(runner.stdout.indexOf('SECRET_WITH_SLASHES') == -1, "should not display the secret");
    }));
    it('should fail with incorrect secret variables', () => __awaiter(void 0, void 0, void 0, function* () {
        let testPath = path.join(__dirname, 'invalid_var.js');
        const runner = new mock_test_1.MockTestRunner(testPath);
        yield runner.runAsync();
        console.log(runner.stdout);
        console.log("printv:: ", runner.errorIssues);
        assert.ok(runner.errorIssues.length > 0, "should not display the secret as invalid secret variables");
    }));
});
