import * as tl from 'azure-pipelines-task-lib/task';
import { getHandlerFromToken, WebApi } from "azure-devops-node-api";
import { ITaskApi } from "azure-devops-node-api/TaskApi";
import { TaskHubOidcToken } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import Q = require('q');
import fetch from "node-fetch";

const CLIENT_ASSERTION_TYPE : string = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
const GRANT_TYPE = "client_credentials";
const ADO_RESOURCE : string = "499b84ac-1321-427f-aa17-267ca6975798/.default";

async function getFederatedToken(connectedServiceName : string): Promise<string> {
    const projectId: string = tl.getVariable("System.TeamProjectId") || "";
    const hub: string = tl.getVariable("System.HostType") || "";
    const planId: string = tl.getVariable('System.PlanId') || "";
    const jobId: string = tl.getVariable('System.JobId') || "";
    let uri = tl.getVariable("System.CollectionUri") || tl.getVariable("System.TeamFoundationServerUri");
 
    if (!uri) {
        throw new Error("Uri is not defined");
    }
    const token = getSystemAccessToken();
    const authHandler = getHandlerFromToken(token);
    const connection = new WebApi(uri, authHandler);
    const oidc_token: string = await initOIDCToken(
        connection,
        projectId,
        hub,
        planId,
        jobId,
        connectedServiceName,
        0,
        2000);
    // console.log("oidc_token:: ", decodeFromBase64(oidc_token));
    tl.setSecret(oidc_token);
    
    return oidc_token;
}

function getSystemAccessToken(): string {
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

function initOIDCToken(connection: WebApi, projectId: string, hub: string, planId: string, jobId: string, serviceConnectionId: string, retryCount: number, timeToWait: number): Q.Promise<string> {
    var deferred = Q.defer<string>();
    connection.getTaskApi().then(
        (taskApi: ITaskApi) => {
            taskApi.createOidcToken({}, projectId, hub, planId, jobId, serviceConnectionId).then(
    (response: TaskHubOidcToken | null) => {  // Explicitly type response as TaskHubOidcToken or null
        if (response != null) {
            tl.debug('Got OIDC token');
            deferred.resolve(response.oidcToken);
        } else if (response?.oidcToken == null) {
            if (retryCount < 3) {
                let waitedTime = timeToWait;
                retryCount += 1;
                setTimeout(() => {
                    deferred.resolve(initOIDCToken(connection, projectId, hub, planId, jobId, serviceConnectionId, retryCount, waitedTime));
                }, waitedTime);
            } else {
                deferred.reject('CouldNotFetchAccessTokenforAAD');
            }
        }
    },
    (error) => {
        deferred.reject('CouldNotFetchAccessTokenforAAD' + " " + error);
    }
);
        }
    );

    return deferred.promise;
}

export async function getFederatedWorkloadIdentityAccessToken(serviceConnectionName: string) : Promise<string | undefined>{
    const oidcToken = await getFederatedToken(serviceConnectionName);
    let tenant = tl.getEndpointAuthorizationParameterRequired(serviceConnectionName, "TenantId");
    let entraURI = "https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token";
    let clientId = tl.getEndpointAuthorizationParameterRequired(serviceConnectionName, "ServicePrincipalId");

    let body: { [key: string]: string } = {
        'scope': ADO_RESOURCE,
        'client_id': clientId,
        'client_assertion_type': CLIENT_ASSERTION_TYPE,
        'client_assertion': oidcToken,
        'grant_type': GRANT_TYPE
    };

    let formBody = Object.keys(body)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(body[key]))
    .join('&');

    return await fetch(entraURI, {
        method: 'POST', 
        body: formBody,
        headers: 
        {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(async response => {
        var tokenObject = await (response?.json()) as {access_token: string};

        if (!tokenObject?.access_token){
            throw new Error(tl.loc("Error_FederatedTokenAquisitionFailed"));
        }
        // console.log("access_token:: ", decodeFromBase64(tokenObject.access_token));
        tl.setSecret(tokenObject.access_token);
        return tokenObject.access_token;
    });
}

function decodeFromBase64(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString();
}
