import SwaggerClient from "swagger-client";

class Upload {
    constructor(promise, abort) {
        this.promise = promise;
        this.abort = abort;
    }
}

function handleUnexpectedServerResponse(response) {
    throw new Error(`Operation failed: ${response}`);
}

function handleResponse(response, success, notFound, other) {
    if (success === undefined) {
        success = () => {};
    }
    if (notFound === undefined) {
        notFound = handleUnexpectedServerResponse;
    }
    if (other === undefined) {
        other = handleUnexpectedServerResponse;
    }
    switch (response.status) {
        case 200:
            return success(response);
        case 404:
            return notFound(response);
        default:
            return other(response);
    }
}

export class XRecord {
    constructor(swaggerClient) {
        if (!(swaggerClient instanceof SwaggerClient)) {
            throw new TypeError(`Incorrect SwaggerClient type: ${typeof swaggerClient}`);
        }
        // TODO: look if this could be a real protected
        this._swaggerClient = swaggerClient;
    }
}

export class XImageRecordData {
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
}

export class XImageRecord extends XRecord {
    // get display() {
    //     return new XDisplayRecord(this._swaggerClient, this.displayId);
    // }

    constructor(swaggerClient, displayId, imageId) {
        super(swaggerClient);
        this.id = imageId;
        this.displayId = displayId;
    }

    async getData() {
        // XXX: This is a very heavyweight way of finding the URL, as swagger certainly knows how to calculate it
        ///     without issuing any requests!
        const response = this._swaggerClient.apis.default.getDisplayImageById({
            displayId: this.displayId,
            imageId: this.id,
        });
        return handleResponse(response, (_) => new XImageRecordData(this.id, response.url));
    }
}

// export class XDisplayRecordData {
//     constructor(id, currentImage, images) {
//         this.id = id;
//         this.currentImage = currentImage;
//         this.images = images;
//     }
// }

export class XDisplayRecord extends XRecord {
    get images() {
        return new XImageCollectionRecord(this._swaggerClient, this.id);
    }

    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.id = displayId;
    }

    async getCurrentImage() {
        const response = await this._swaggerClient.apis.default.getDisplayCurrentImage({displayId: this.id});
        return handleResponse(
            response,
            (response) => new XImageRecord(this._swaggerClient, this.id, response.body.id),
            (_) => null
        );
    }

    async setCurrentImage(identifierOrImage) {
        const identifier = identifierOrImage instanceof XImageRecord ? identifierOrImage.id : identifierOrImage;
        const response = await this._swaggerClient.apis.default.getDisplayImages({displayId: this.id, id: identifier});
        handleResponse(response);
    }

    async clearCurrentImage() {
        const response = await this._swaggerClient.apis.default.deleteDisplayCurrentImage({displayId: this.id});
        return handleResponse(response, (_) => {});
    }
}

export class XImageCollectionRecord extends XRecord {
    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.id = displayId;
    }

    // FIXME: needs server-side support!
    // async getById(id) {
    //     const response = await this._swaggerClient.apis.default.getDisplayImage({
    //         displayId: this.displayId,
    //         imageId: id,
    //     });
    //     return handleResponse(
    //         response,
    //         (_) => new XImageRecord(this._swaggerClient, this.displayId, id),
    //         (_) => null
    //     );
    // }

    async list() {
        const response = await this._swaggerClient.apis.default.getDisplayImages({displayId: this.id});
        return handleResponse(response, (response) =>
            response.body.map((x) => new XImageRecord(this._swaggerClient, this.id, x.id))
        );
    }

    async add(imageFile, onProgress) {
        const response = await this._swaggerClient.apis.default.postDisplayImage(
            {
                displayId: this.id,
            },
            {
                requestBody: {
                    data: imageFile,
                    metadata: {rotate: 90},
                },
                // requestContentType: "multipart/form-data",
                requestInterceptor: (x) => {
                    console.log(x);
                    return x;
                },
            }
        );
        return handleResponse(response, (_) => {});

        // const request = new XMLHttpRequest();
        // // FIXME: get from swagger
        // request.open("POST", `${process.env.REACT_APP_API_URL}/display/msf/image/${identifier}`);
        //
        // if (onProgress) {
        //     request.upload.onprogress = onProgress;
        // }
        //
        // const promise = new Promise((resolve, reject) => {
        //     request.onload = function () {
        //         if (request.status >= 200 && request.status < 300) {
        //             resolve(identifier);
        //         } else {
        //             reject(request.status, request.responseText);
        //         }
        //     };
        //     request.send(imageFile);
        // });
        //
        // return new Upload(promise, request.abort);
    }

    async delete(imageOrIdentifier) {
        const imageIdentifier = imageOrIdentifier instanceof XImageRecord ? imageOrIdentifier.id : imageOrIdentifier;
        const response = await this._swaggerClient.apis.default.deleteDisplayImageById({
            displayId: this.id,
            imageId: imageIdentifier,
        });
        return handleResponse(response, (_) => {});
    }
}

export class XDisplayCollectionRecord extends XRecord {
    async getById(id) {
        const response = await this._swaggerClient.apis.default.getDisplayById({displayId: id});
        return handleResponse(response, (_) => new XDisplayRecord(this._swaggerClient, id));
    }

    async list() {
        const response = await this._swaggerClient.apis.default.getDisplays();
        return handleResponse(response, (response) =>
            response.body.map((x) => new XDisplayRecord(this._swaggerClient, x.id))
        );
    }

    // async getData() {
    //     return await this.list()
    //         .then(async displays => await Promise.all(displays.map(async display => display.getData())));
    // }
}

export class X extends XRecord {
    get display() {
        return new XDisplayCollectionRecord(this._swaggerClient);
    }

    // async getData() {
    //     return await this.display.getData();
    // }
}

export async function createX(swaggerUrl, baseUrl) {
    const client = await createClient(swaggerUrl, baseUrl);
    return createXWithClient(client);
}

export async function createXWithClient(client) {
    return new X(client);
}

export async function createClient(swaggerUrl, baseUrl) {
    const client = await new SwaggerClient(swaggerUrl);
    client.url = baseUrl;
    return client;
}
