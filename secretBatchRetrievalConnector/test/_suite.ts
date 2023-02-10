import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe("Fetch secret" , () => {
    before(() =>{

    });

    after(() =>{

    });

    it('should succeed with valid inputs', function(done: Mocha.Done) {
        this.timeout(10000);

        let tp = path.join(__dirname, 'success.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        console.log(tr.stdout);
        assert.ok(tr.stdout.indexOf('SECRET_WITH_SLASHES') >= 0, "should display the secret");
        done();
    });

    it('should fail with incorrect input', function(done: Mocha.Done) {
        this.timeout(10000);

        let tp = path.join(__dirname, 'failure.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        console.log(tr.stdout);
        console.log("printv:: ",tr.errorIssues);
        assert.ok(tr.stdout.indexOf('SECRET_WITH_SLASHES') == -1, "should not display the secret");
        done();
    });  
})