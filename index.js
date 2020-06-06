import SwaggerClient from "swagger-client";


class XClient {
    get specificationUrl() {
        return `${this.url}/swagger.json`;
    }

    // async get client() {
    //     await this._clientLoadPromise;
    //     if(this.specLoadError) {
    //         throw new Error(this.specLoadError);
    //     }
    // }

    constructor(url) {
        this.url = url;
        this._client = null;
        this._clientLoadPromise = new SwaggerClient(this.specificationUrl)
            .then(client => {
                this._client = client;
            })
            .catch(e => {
                const errorMessage = `Could not load OpenAPI specification from ${this.specificationUrl}`;
                console.error(errorMessage, e);
                throw e;
            });
    }

    getImage() {
        return {};
    }
}


// this.client.apis.test

export {XClient};
