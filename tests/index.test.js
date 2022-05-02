import {createClient, createXWithClient, XDisplayRecord, XImageCollectionRecord, XImageRecord} from "../index";

const OPEN_API_URL = "https://raw.githubusercontent.com/colin-nolan/remote-eink/main/openapi.yml";

let server, swaggerClient, client, exampleDisplay, exampleImageCollection, exampleImage;

jest.setTimeout(600000);

beforeAll(async () => {
    // FIXME
    // server = await createMockServer(OPEN_API_URL);
    // swaggerClient = await createClient(OPEN_API_URL, server.url);
    swaggerClient = await createClient("http://127.0.0.1:8080/openapi.json", "http://127.0.0.1:8080");
    client = await createXWithClient(swaggerClient);

    exampleDisplay = new XDisplayRecord(swaggerClient, "123");
    exampleImageCollection = new XImageCollectionRecord(swaggerClient, "123");
    exampleImage = new XImageRecord(swaggerClient, "123", "456");
});

afterAll(() => {
    server.close();
});

describe("Client", () => {
    test("can list displays", async () => {
        const displayList = await client.display.list();
        expect(displayList[0]).toBeInstanceOf(XDisplayRecord);
    });

    test("can get display by ID", async () => {
        const display = await client.display.getById("123");
        expect(display).toBeInstanceOf(XDisplayRecord);
    });
});

describe("Display", () => {
    test("has current image", async () => {
        const currentImage = await exampleDisplay.getCurrentImage();
        expect(currentImage).toBeInstanceOf(XImageRecord);
    });

    describe("can set current image", () => {
        test("using ID", async () => {
            await exampleDisplay.setCurrentImage("123");
        });

        test("using image", async () => {
            await exampleDisplay.setCurrentImage(exampleImage);
        });
    });

    test("can clear current image", async () => {
        await exampleDisplay.clearCurrentImage();
    });
});

describe("Image collection", () => {
    // FIXME: wait for server support
    // test("can get image by ID", async () => {
    //     const image = await exampleImageCollection.getById("123");
    //     expect(image).toBeInstanceOf(XImageRecord);
    // });

    test("can list images", async () => {
        const images = await exampleImageCollection.list();
        expect(images).toBeArray();
        expect(images).toSatisfyAll((record) => record instanceof XImageRecord);
    });

    describe("can delete image", () => {
        test("using ID", async () => {
            await exampleImageCollection.delete("123");
        });

        test("using image", async () => {
            await exampleImageCollection.delete(exampleImage);
        });
    });

    test("can add image", async () => {
        const {TextEncoder, TextDecoder} = require("util");
        global.TextEncoder = TextEncoder;
        global.TextDecoder = TextDecoder;

        // Simulate a call to Dropbox or other service that can
        // return an image as an ArrayBuffer.
        // var xhr = new XMLHttpRequest();
        // xhr.open("GET", "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png");
        // xhr.responseType = "arraybuffer";
        // var arrayBuffer;
        // xhr.onload = function (e) {
        //     // Obtain a blob: URL for the image data.
        //     arrayBuffer = new Uint8Array(this.response);
        //     console.log(arrayBuffer);
        //     // var blob = new Blob([arrayBufferView], {type: "image/jpeg"});
        // };
        // xhr.send();
        const request = new Request(
            "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
        );
        const response = await fetch(request);
        const arrayBuffer = await response.arrayBuffer();

        // import Blob from "fetch-blob";
        // global.Blob = Blob;
        // const abc = require("web-streams-polyfill");
        // const Blob = require("blob-polyfill").Blob;

        // const aFileParts = [93048032489, 98389384239, 23498324239]; // an array consisting of image bytes
        // const myPetImage = new Blob(aFileParts, {type: "image/jpeg"}); // the blob
        // const arrayBuffer = await myPetImage.arrayBuffer();
        // const arrayBuffer = new Uint8Array([]);

        // const arrayBuffer = await myPetImage.arrayBuffer();
        // console.log(arrayBuffer);

        await exampleImageCollection.add(arrayBuffer, () => {});
    });
});
