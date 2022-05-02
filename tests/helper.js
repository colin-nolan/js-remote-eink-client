import {createServer} from "@stoplight/prism-http-server";
import {getHttpOperationsFromSpec} from "@stoplight/prism-cli/dist/operations";
import {createLogger} from "@stoplight/prism-core";
import * as portfinder from "portfinder";

// Based off the example of using (experimental) JS API:
// https://github.com/stoplightio/prism/tree/master/packages/http-server
export async function createMockServer(openApiUrl) {
    const operations = await getHttpOperationsFromSpec(openApiUrl);

    const server = createServer(operations, {
        components: {
            logger: createLogger("TestLogger"),
        },
        cors: true,
        config: {
            checkSecurity: true,
            validateRequest: true,
            validateResponse: true,
            mock: {dynamic: false},
            errors: false,
        },
    });
    let port = await portfinder.getPortPromise();
    await server.listen(port);

    return {
        url: `http://localhost:${port}`,
        close: server.close.bind(server),
    };
}
