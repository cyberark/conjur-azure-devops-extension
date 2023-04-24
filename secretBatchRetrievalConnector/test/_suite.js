"use strict";
exports.__esModule = true;
var path = require("path");
var assert = require("assert");
var ttm = require("azure-pipelines-task-lib/mock-test");
describe("Fetch secret", function () {
    before(function () {
    });
    after(function () {
    });
    it('should succeed with valid inputs', function (done) {
        this.timeout(10000);
        var tp = path.join(__dirname, 'success.js');
        var tr = new ttm.MockTestRunner(tp);
        tr.run();
        console.log(tr.stdout);
        assert.ok(tr.stdout.indexOf('SECRET_WITH_SLASHES') >= 0, "should display the secret");
        done();
    });
    it('should fail with incorrect endpoint input', function (done) {
        this.timeout(10000);
        var tp = path.join(__dirname, 'failure.js');
        var tr = new ttm.MockTestRunner(tp);
        tr.run();
        console.log(tr.stdout);
        console.log("printv:: ", tr.errorIssues);
        assert.ok(tr.stdout.indexOf('SECRET_WITH_SLASHES') == -1, "should not display the secret");
        done();
    });
    it('should fail with incorrect secret variables', function (done) {
        this.timeout(10000);
        var tp = path.join(__dirname, 'invalid_var.js');
        var tr = new ttm.MockTestRunner(tp);
        tr.run();
        console.log(tr.stdout);
        console.log("printv:: ", tr.errorIssues);
        assert.ok(tr.errorIssues.length > 0, "should not display the secret as invalid secret variables");
        done();
    });
});
