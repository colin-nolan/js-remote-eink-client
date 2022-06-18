import {createClient, createXWithClient, XDisplayRecord, XImageCollectionRecord, XImageRecord} from "../index";
import {createMockServer} from "./helper";
import { TextEncoder, TextDecoder } from 'util'


const OPEN_API_URL = "https://raw.githubusercontent.com/colin-nolan/remote-eink/main/openapi.yml";

let server, swaggerClient, client, exampleDisplay, exampleImageCollection, exampleImage;

jest.setTimeout(600000);

beforeAll(async () => {
    // FIXME
    server = await createMockServer(OPEN_API_URL);
    swaggerClient = await createClient(OPEN_API_URL, server.url);
    // swaggerClient = await createClient("http://127.0.0.1:8080/openapi.json", "http://127.0.0.1:8080");
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

    // The encoder does not correctly encode File objects (it results in "[object File]") so disabled test
    test.skip("can add image", async () => {
        global.TextEncoder = TextEncoder
        global.TextDecoder = TextDecoder

        const request = new Request(
            // TODO: Use controlled image file location
            "https://i.imgur.com/fHyEMsl.jpg"
        );
        const response = await fetch(request);
        const arrayBuffer = await response.arrayBuffer();
        const imageFile = new File([arrayBuffer], 'file1.txt', {
          type: 'image/jpg',
        });
        await exampleImageCollection.add(imageFile, () => {});
    });
});
