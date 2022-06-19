import SwaggerClient from "swagger-client";

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

export class Record {
    constructor(swaggerClient) {
        if (!(swaggerClient instanceof SwaggerClient)) {
            throw new TypeError(`Incorrect SwaggerClient type: ${typeof swaggerClient}`);
        }
        this._swaggerClient = swaggerClient;
    }
}

// Client (base record)
export class ClientRecord extends Record {
    get display() {
        return new DisplayCollectionRecord(this._swaggerClient);
    }
}

// Display
export class DisplayRecord extends Record {
    get images() {
        return new ImageCollectionRecord(this._swaggerClient, this.displayId);
    }

    get imageTransformers() {
        return new ImageTransformerCollectionRecord(this._swaggerClient, this.displayId);
    }

    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.displayId = displayId;
    }

    // GET /display/{displayId}/current-image
    async getCurrentImage() {
        const response = await this._swaggerClient.apis.default.getDisplayCurrentImage({displayId: this.displayId});
        return handleResponse(
            response,
            (response) => new ImageRecord(this._swaggerClient, this.displayId, response.body.id),
            (_) => null
        );
    }

    // PUT /display/{displayId}/current-image
    async setCurrentImage(identifierOrImage) {
        const identifier = identifierOrImage instanceof ImageRecord ? identifierOrImage.imageId : identifierOrImage;
        const response = await this._swaggerClient.apis.default.getDisplayImages({
            displayId: this.displayId,
            id: identifier,
        });
        return handleResponse(response);
    }

    // DELETE /display/{displayId}/current-image
    async clearCurrentImage() {
        const response = await this._swaggerClient.apis.default.deleteDisplayCurrentImage({displayId: this.displayId});
        return handleResponse(response, (_) => {});
    }

    // PUT /display/{displayId}/sleep
    async getSleepStatus() {
        const response = await this._swaggerClient.apis.default.getDisplaySleep({displayId: this.displayId});
        return handleResponse(
            response,
            (response) => response.body,
            (_) => null
        );
    }

    // PUT /display/{displayId}/sleep
    async setSleepStatus(status) {
        const response = await this._swaggerClient.apis.default.putDisplaySleep(
            {displayId: this.displayId},
            {
                requestBody: status,
            }
        );
        return handleResponse(response, (_) => {});
    }

    // PUT /display/{displayId}/sleep (true)
    async sleep() {
        return this.setSleepStatus(true);
    }

    // PUT /display/{displayId}/sleep (false)
    async wake() {
        return this.setSleepStatus(false);
    }
}

// Image on display
export class ImageRecord extends Record {
    get url() {
        return `${this._swaggerClient.url}/display/${this.displayId}/image/${this.imageId}/data`;
    }

    constructor(swaggerClient, displayId, imageId) {
        super(swaggerClient);
        this.imageId = imageId;
        this.displayId = displayId;
    }

    // GET /display/{displayId}/image/{imageId}/data
    async getData() {
        const response = await this._swaggerClient.apis.default.getDisplayImageData({
            displayId: this.displayId,
            imageId: this.imageId,
        });
        return handleResponse(
            response,
            async (data) =>
                new File([await data.data.arrayBuffer()], response.url, {
                    type: data.type,
                })
        );
    }

    // PUT /display/{displayId}/image/{imageId}/data
    async setData(imageFile) {
        const response = await this._swaggerClient.apis.default.putDisplayImageData(
            {
                displayId: this.displayId,
                imageId: this.imageId,
            },
            {
                requestBody: imageFile,
                requestInterceptor: (request) => {
                    // The client really should be able to work out the specific content type but instead uses the
                    // wildcard type
                    if (request.headers["Content-Type"] === "image/*" && imageFile.type !== "") {
                        request.headers["Content-Type"] = imageFile.type;
                    }
                    console.log(request);
                    return request;
                },
            }
        );
        return handleResponse(response);
    }

    // GET /display/{displayId}/image/{imageId}/metadata
    async getMetadata() {
        const response = await this._swaggerClient.apis.default.getDisplayImageMetadata({
            displayId: this.displayId,
            imageId: this.imageId,
        });
        return handleResponse(response, (x) => x.body);
    }

    // PUT /display/{displayId}/image/{imageId}/metadata
    async setMetadata(metadata) {
        const response = await this._swaggerClient.apis.default.putDisplayImageMetadata(
            {
                displayId: this.displayId,
                imageId: this.imageId,
            },
            {
                requestBody: metadata,
            }
        );
        return handleResponse(response);
    }
}

// Image transformer
export class ImageTransformerRecord extends Record {
    constructor(swaggerClient, displayId, imageTransformerId) {
        super(swaggerClient);
        this.imageTransformerId = imageTransformerId;
        this.displayId = displayId;
    }

    // GET /display/{displayId}/image-transformer/{imageTransformerId}
    async getDetails() {
        const response = await this._swaggerClient.apis.default.getDisplayImageTransformer({
            displayId: this.displayId,
            imageTransformerId: this.imageTransformerId,
        });
        return handleResponse(response, (response) => response.body);
    }

    // PUT /display/{displayId}/image-transformer/{imageTransformerId}
    async update(properties) {
        const response = await this._swaggerClient.apis.default.putDisplayImageTransformer(
            {
                displayId: this.displayId,
                imageTransformerId: this.imageTransformerId,
            },
            {
                requestBody: properties,
            }
        );
        return handleResponse(response, (_) => {});
    }
}

// Displays
export class DisplayCollectionRecord extends Record {
    // GET /display
    async list() {
        const response = await this._swaggerClient.apis.default.getDisplays();
        return handleResponse(response, (response) =>
            response.body.map((x) => new DisplayRecord(this._swaggerClient, x.id))
        );
    }

    // GET /display/{displayId}
    async get(id) {
        const response = await this._swaggerClient.apis.default.getDisplay({displayId: id});
        return handleResponse(response, (_) => new DisplayRecord(this._swaggerClient, id));
    }
}

// Images on display
export class ImageCollectionRecord extends Record {
    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.displayId = displayId;
    }

    // GET /display/{displayId}/image
    async list() {
        const response = await this._swaggerClient.apis.default.getDisplayImages({displayId: this.displayId});
        return handleResponse(response, (response) =>
            response.body.map((x) => new ImageRecord(this._swaggerClient, this.displayId, x.id))
        );
    }

    // GET /display/{displayId}/image/{imageId}
    async get(id) {
        const response = await this._swaggerClient.apis.default.getDisplayImage({
            displayId: this.displayId,
            imageId: id,
        });
        return handleResponse(
            response,
            (_) => new ImageRecord(this._swaggerClient, this.displayId, id),
            (_) => null
        );
    }

    // PUT /display/{displayId}/image/{imageId}
    async add(imageFile, metadata = {}) {
        const response = await this._swaggerClient.apis.default.postDisplayImage(
            {
                displayId: this.displayId,
            },
            {
                requestBody: {
                    data: imageFile,
                    metadata: metadata,
                },
            }
        );
        return handleResponse(response, (_) => {});
    }

    // DELETE /display/{displayId}/image/{imageId}
    async delete(imageOrIdentifier) {
        const imageIdentifier =
            imageOrIdentifier instanceof ImageRecord ? imageOrIdentifier.imageId : imageOrIdentifier;
        const response = await this._swaggerClient.apis.default.deleteDisplayImage({
            displayId: this.displayId,
            imageId: imageIdentifier,
        });
        return handleResponse(response, (_) => {});
    }
}

// Images on display
export class ImageTransformerCollectionRecord extends Record {
    constructor(swaggerClient, displayId) {
        super(swaggerClient);
        this.displayId = displayId;
    }

    // GET /display/{displayId}/image-transformer
    async list() {
        const response = await this._swaggerClient.apis.default.getDisplayImageTransformers({
            displayId: this.displayId,
        });
        return handleResponse(response, (response) =>
            response.body.map((x) => new ImageTransformerRecord(this._swaggerClient, this.displayId, x.id))
        );
    }

    // GET /display/{displayId}/image-transformer/{imageTransformerId}
    async get(id) {
        const response = await this._swaggerClient.apis.default.getDisplayImageTransformer({
            displayId: this.displayId,
            imageTransformerId: id,
        });
        return handleResponse(
            response,
            (_) => new ImageTransformerRecord(this._swaggerClient, this.displayId, id),
            (_) => null
        );
    }
}

export async function createClient(swaggerUrl, baseUrl) {
    const client = await createSwaggerClient(swaggerUrl, baseUrl);
    return createClientWithSwaggerClient(client);
}

export async function createClientWithSwaggerClient(swaggerClient) {
    return new ClientRecord(swaggerClient);
}

export async function createSwaggerClient(swaggerUrl, baseUrl) {
    const client = await new SwaggerClient(swaggerUrl);
    client.url = baseUrl;
    return client;
}
