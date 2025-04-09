import * as path from 'path';
import * as assert from 'assert';
import { MockTestRunner } from 'azure-pipelines-task-lib/mock-test';

describe("Fetch secret" , () => {
    before(() =>{

    });

    after(() =>{

    });

    it('should succeed with valid inputs', async () =>  {
        let testPath = path.join(__dirname, 'success.js');
        const runner: MockTestRunner = new MockTestRunner(testPath);
        await runner.runAsync();
        console.log(runner.stdout);
        assert.ok(runner.stdout.indexOf('SECRET_WITH_SLASHES') >= 0, "should display the secret");
    });

    it('should fail with incorrect endpoint input', async () => {
        let testPath = path.join(__dirname, 'failure.js');
        const runner: MockTestRunner = new MockTestRunner(testPath);
        await runner.runAsync();
        console.log(runner.stdout);
        console.log("printv:: ",runner.errorIssues);
        assert.ok(runner.stdout.indexOf('SECRET_WITH_SLASHES') == -1, "should not display the secret");
    });  

    it('should fail with incorrect secret variables', async () => {
        let testPath = path.join(__dirname, 'invalid_var.js');
        const runner: MockTestRunner = new MockTestRunner(testPath);
        await runner.runAsync();
        console.log(runner.stdout);
        console.log("printv:: ",runner.errorIssues);
        assert.ok(runner.errorIssues.length > 0, "should not display the secret as invalid secret variables");
    });
})