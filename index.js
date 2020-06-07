import SwaggerClient from "swagger-client";

class Upload {
    constructor(promise, abort) {
        this.promise = promise;
        this.abort = abort;
    }
}

class XRecord {
    constructor(swaggerClient) {
        this._swaggerClient = swaggerClient;
    }
}


class XImageRecord extends XRecord {
    get display() {
        return new XDisplayRecord(swaggerClient, this.displayId);
    }

    constructor(swaggerClient, displayId, imageId) {
        super(swaggerClient);
        this.id = imageId;
        this.displayId = displayId;
    }

    async getData() {
        return {
            "id": this.id,
            // XXX: This is a very heavyweight way of finding the URL, as swagger certainly knows how to calculate it
            ///     without issuing any requests!
            "url": (await this._request()).url
        };
    }

    _request() {
        return this._swaggerClient.apis.default.getDisplayImageById({"displayId": this.displayId, "imageId": this.id});
    }
}


class XDisplayRecord extends XRecord {
    get image() {
        return new XImageCollectionRecord(this._swaggerClient, this.id);
    }

    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.id = displayId;
    }

    async getData() {
        const response = await this._request();
        return {
            "id": this.id,
            "currentImage": response.body.currentImage ? response.body.currentImage.id : null,
            "images": response.body.images.map(x => x.id)
        };
    }

    async getCurrentImage() {
        const response = await this._request();
        if(!response.currentImage) {
            return null;
        }
        return new XImageRecord(this._swagger_client, this.id, response.currentImage.id);
    }

    _request() {
        return this._swaggerClient.apis.default.getDisplayById({"displayId": this.id});
    }
}


class XImageCollectionRecord extends XRecord {
    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.displayId = displayId;
    }

    async getById(id) {
        // Check if the image exists (TODO: better handle exception)
        const response = await this._swaggerClient.apis.default.getDisplayImageById(
            {"displayId": this.displayId, "imageId": id});
        return new XImageRecord(this._swaggerClient, this.displayId, id);
    }

    async list() {
        const response = await this._swaggerClient.apis.default.getDisplayImages({"displayId": this.displayId});
        return response.body.map(x =>new XImageRecord(this._swaggerClient, this.displayId, x.id));
    }

    async getData() {
        return await this.list().then(async images => await Promise.all(images.map(async image => image.getData())));
    }

    add(identifier, imageFile, onProgress) {
        const request = new XMLHttpRequest();
        // FIXME: get from swagger
        request.open("POST", `${process.env.REACT_APP_API_URL}/display/msf/image/${identifier}`);

        if(onProgress) {
            request.upload.onprogress = onProgress;
        }

        const promise = new Promise((resolve, reject) => {
            request.onload = function() {
                if (request.status >= 200 && request.status < 300) {
                    resolve(identifier);
                }
                else {
                    reject(request.status, request.responseText);
                }
            };
            request.send(imageFile);
        });

        return new Upload(promise, request.abort);
    }

    async delete(identifier) {
        const request = new XMLHttpRequest();
        request.open("DELETE", `${process.env.REACT_APP_API_URL}/display/msf/image/${identifier}`);
        request.send();
        // FIXME: promise
    }
}


class XDisplayCollectionRecord extends XRecord {
    async getById(id) {
        // Check if the image exists
        const response = await this._swaggerClient.apis.default.getDisplayById({"displayId": id});
        return new XDisplayRecord(this._swaggerClient, response.body.id);
    }

    async list() {
        const response = await this._swaggerClient.apis.default.getDisplays();
        return response.body.map(x =>new XDisplayRecord(this._swaggerClient, x.id));
    }

    async getData() {
        return await this.list()
            .then(async displays => await Promise.all(displays.map(async display => display.getData())));
    }
}


class X extends XRecord {
    get display() {
        return new XDisplayCollectionRecord(this._swaggerClient);
    }

    async getData() {
        return await this.display.getData();
    }
}


async function buildX(url) {
    const client = await new SwaggerClient(`${url}/openapi.json`);
    return new X(client);
}


export {buildX};
