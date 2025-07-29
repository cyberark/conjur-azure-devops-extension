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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFederatedWorkloadIdentityAccessToken = getFederatedWorkloadIdentityAccessToken;
const tl = __importStar(require("azure-pipelines-task-lib/task"));
const azure_devops_node_api_1 = require("azure-devops-node-api");
const Q = require("q");
const node_fetch_1 = __importDefault(require("node-fetch"));
const CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
const GRANT_TYPE = "client_credentials";
const ADO_RESOURCE = "499b84ac-1321-427f-aa17-267ca6975798/.default";
function getFederatedToken(connectedServiceName) {
    return __awaiter(this, void 0, void 0, function* () {
        const projectId = tl.getVariable("System.TeamProjectId") || "";
        const hub = tl.getVariable("System.HostType") || "";
        const planId = tl.getVariable('System.PlanId') || "";
        const jobId = tl.getVariable('System.JobId') || "";
        let uri = tl.getVariable("System.CollectionUri") || tl.getVariable("System.TeamFoundationServerUri");
        if (!uri) {
            throw new Error("Uri is not defined");
        }
        const token = getSystemAccessToken();
        const authHandler = (0, azure_devops_node_api_1.getHandlerFromToken)(token);
        const connection = new azure_devops_node_api_1.WebApi(uri, authHandler);
        const oidc_token = yield initOIDCToken(connection, projectId, hub, planId, jobId, connectedServiceName, 0, 2000);
        // console.log("oidc_token:: ", decodeFromBase64(oidc_token));
        tl.setSecret(oidc_token);
        return oidc_token;
    });
}
function getSystemAccessToken() {
    tl.debug('Getting credentials for account feeds');
    let auth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
    if (auth && auth.scheme === 'OAuth') {
        tl.debug('Got auth token, setting it as secret so it does not print in console log');
        tl.setSecret(auth.parameters['AccessToken']);
        return auth.parameters['AccessToken'];
    }
    tl.warning('FeedTokenUnavailable');
    return '';
}
function initOIDCToken(connection, projectId, hub, planId, jobId, serviceConnectionId, retryCount, timeToWait) {
    var deferred = Q.defer();
    connection.getTaskApi().then((taskApi) => {
        taskApi.createOidcToken({}, projectId, hub, planId, jobId, serviceConnectionId).then((response) => {
            if (response != null) {
                tl.debug('Got OIDC token');
                deferred.resolve(response.oidcToken);
            }
            else if ((response === null || response === void 0 ? void 0 : response.oidcToken) == null) {
                if (retryCount < 3) {
                    let waitedTime = timeToWait;
                    retryCount += 1;
                    setTimeout(() => {
                        deferred.resolve(initOIDCToken(connection, projectId, hub, planId, jobId, serviceConnectionId, retryCount, waitedTime));
                    }, waitedTime);
                }
                else {
                    tl.setResult(tl.TaskResult.Failed, 'CouldNotFetchAccessTokenforAAD');
                    deferred.reject('CouldNotFetchAccessTokenforAAD');
                }
            }
        }, (error) => {
            tl.setResult(tl.TaskResult.Failed, 'CouldNotFetchAccessTokenforAAD' + " " + error);
            deferred.reject('CouldNotFetchAccessTokenforAAD' + " " + error);
        });
    });
    return deferred.promise;
}
function getFederatedWorkloadIdentityAccessToken(serviceConnectionName) {
    return __awaiter(this, void 0, void 0, function* () {
        const oidcToken = yield getFederatedToken(serviceConnectionName);
        let tenant = tl.getEndpointAuthorizationParameterRequired(serviceConnectionName, "TenantId");
        let entraURI = "https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token";
        let clientId = tl.getEndpointAuthorizationParameterRequired(serviceConnectionName, "ServicePrincipalId");
        let body = {
            'scope': ADO_RESOURCE,
            'client_id': clientId,
            'client_assertion_type': CLIENT_ASSERTION_TYPE,
            'client_assertion': oidcToken,
            'grant_type': GRANT_TYPE
        };
        let formBody = Object.keys(body)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(body[key]))
            .join('&');
        return yield (0, node_fetch_1.default)(entraURI, {
            method: 'POST',
            body: formBody,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response) => __awaiter(this, void 0, void 0, function* () {
            var tokenObject = yield (response === null || response === void 0 ? void 0 : response.json());
            if (!(tokenObject === null || tokenObject === void 0 ? void 0 : tokenObject.access_token)) {
                throw new Error(tl.loc("Error_FederatedTokenAquisitionFailed"));
            }
            // console.log("access_token:: ", decodeFromBase64(tokenObject.access_token));
            tl.setSecret(tokenObject.access_token);
            return tokenObject.access_token;
        }));
    });
}
function decodeFromBase64(encoded) {
    return Buffer.from(encoded, 'base64').toString();
}
