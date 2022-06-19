import {
    createSwaggerClient,
    DisplayRecord,
    ImageCollectionRecord,
    ImageTransformerRecord,
    ImageRecord,
    ImageTransformerCollectionRecord,
    createClient,
    createClientWithSwaggerClient,
} from "../index";
import {createMockServer} from "./helper";

const OPEN_API_URL = "https://raw.githubusercontent.com/colin-nolan/remote-eink/main/openapi.yml";

let server,
    swaggerClient,
    client,
    exampleDisplay,
    exampleImageCollection,
    exampleImage,
    exampleImageTransformerCollection,
    exampleImageTransformer;

// For testing against a real server
// jest.setTimeout(600000);

beforeAll(async () => {
    server = await createMockServer(OPEN_API_URL);
    swaggerClient = await createSwaggerClient(OPEN_API_URL, server.url);
    // For testing against a real server
    // swaggerClient = await createSwaggerClient("http://127.0.0.1:8080/openapi.json", "http://127.0.0.1:8080");
    client = await createClientWithSwaggerClient(swaggerClient);

    exampleDisplay = new DisplayRecord(swaggerClient, "123");
    exampleImageCollection = new ImageCollectionRecord(swaggerClient, "123");
    exampleImage = new ImageRecord(swaggerClient, "123", "black");
    exampleImageTransformerCollection = new ImageTransformerCollectionRecord(swaggerClient, "123", "456");
    exampleImageTransformer = new ImageTransformerRecord(swaggerClient, "123", "456");
});

afterAll(() => {
    server.close();
});

describe("Client", () => {
    test("can list displays", async () => {
        const displayList = await client.display.list();
        expect(displayList[0]).toBeInstanceOf(DisplayRecord);
    });

    test("can get display by ID", async () => {
        const display = await client.display.get("123");
        expect(display).toBeInstanceOf(DisplayRecord);
    });
});

describe("Display", () => {
    test("has images property", async () => {
        const images = await exampleDisplay.images;
        expect(images).toBeInstanceOf(ImageCollectionRecord);
    });

    test("has image transformers property", async () => {
        const imageTransformers = await exampleDisplay.imageTransformers;
        expect(imageTransformers).toBeInstanceOf(ImageTransformerCollectionRecord);
    });

    test("has current image", async () => {
        const currentImage = await exampleDisplay.getCurrentImage();
        expect(currentImage).toBeInstanceOf(ImageRecord);
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

    test("can get sleep status", async () => {
        const sleepStatus = await exampleDisplay.getSleepStatus();
        expect(sleepStatus).toBeBoolean();
    });

    test("can set sleep status", async () => {
        await exampleDisplay.setSleepStatus(true);
        await exampleDisplay.setSleepStatus(false);
    });

    test("can put device to sleep", async () => {
        await exampleDisplay.sleep();
    });

    test("can wake device", async () => {
        await exampleDisplay.wake();
    });
});

describe("Image", () => {
    // Prism fails if asked to create mock data for image/*
    test.skip("has data", async () => {
        const data = await exampleImage.getData();
        expect(data).toBeInstanceOf(File);
    });

    // The encoder does not correctly encode File objects (it results in "[object File]") so skipping test
    test.skip("data can be set", async () => {
        // Not supported by current test setup
    });

    test("has metadata", async () => {
        const data = await exampleImage.getMetadata();
        expect(data).toBeInstanceOf(Object);
    });

    test("set metadata", async () => {
        await exampleImage.setMetadata({rotation: 123});
    });
});

describe("Image Transformer", () => {
    test("has details", async () => {
        const details = await exampleImageTransformer.getDetails();
        expect(Object.keys(details)).toEqual(
            expect.arrayContaining(["id", "description", "active", "position", "configuration"])
        );
    });

    test("can be updated", async () => {
        const details = await exampleImageTransformer.getDetails();
        details["active"] = true;
        details["position"] = 42;
        details["configuration"] = {new: "configuration"};
        await exampleImageTransformer.update(details);
    });
});

describe("Image collection", () => {
    // Prism "Cannot find serializer for multipart/form-data"
    test.skip("can get image by ID", async () => {
        const image = await exampleImageCollection.get("123");
        expect(image).toBeInstanceOf(ImageRecord);
    });

    test("can list images", async () => {
        const images = await exampleImageCollection.list();
        expect(images).toBeArray();
        expect(images).toSatisfyAll((record) => record instanceof ImageRecord);
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
        // global.TextEncoder = TextEncoder
        // global.TextDecoder = TextDecoder

        const request = new Request(
            // TODO: Use controlled image file location
            "https://i.imgur.com/fHyEMsl.jpg"
        );
        const response = await fetch(request);
        const arrayBuffer = await response.arrayBuffer();
        const imageFile = new File([arrayBuffer], "file.png", {
            type: "image/jpg",
        });
        await exampleImageCollection.add(imageFile, () => {});
    });
});

describe("Image transformer collection", () => {
    test("can list image transformers", async () => {
        const transformers = await exampleImageTransformerCollection.list();
        expect(transformers).toBeArray();
        expect(transformers).toSatisfyAll((record) => record instanceof ImageTransformerRecord);
    });

    test("can get image transformer by ID", async () => {
        const image = await exampleImageTransformerCollection.get("123");
        expect(image).toBeInstanceOf(ImageTransformerRecord);
    });
});
