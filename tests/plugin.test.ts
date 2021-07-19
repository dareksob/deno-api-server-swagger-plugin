import {assertEquals} from "https://deno.land/std@0.101.0/testing/asserts.ts";
import {EMethod, Route, KeyMatch} from "../src/deps.ts";
import {mockApi} from 'https://deno.land/x/deno_api_server/dev_mod.ts';
import {default as swaggerPlugin} from '../src/plugin.ts';


const info = {
    title: 'Deno swagger test',
    description: 'Testing'
};

Deno.test('Endpoint should generate basic data', async () => {
    const route = new Route('GET', '/hello');

    // create api
    const api = mockApi(route);

    // @ts-ignore: ignore mockApi error
    await swaggerPlugin(api, {info});

    await api.sendByArguments('GET', '/swagger.json');

    assertEquals(api?.lastContext?.response.status, 200);

    const body = api?.lastContext?.response.body as Record<string, unknown>;
    assertEquals(typeof body, 'object');
    assertEquals(body.openapi, '3.0.1');
    assertEquals(body.info?.title, info.title);
    assertEquals(body.info?.description, info.description);
})

Deno.test('Swagger path should contain basic route infos', async () => {
    const route = new Route('GET', '/hello');

    // create api
    const api = mockApi(route);

    // @ts-ignore: ignore mockApi error
    await swaggerPlugin(api, {info});

    await api.sendByArguments('GET', '/swagger.json');

    const body = api?.lastContext?.response.body as Record<string, unknown>;
    const paths = body?.paths;

    assertEquals(typeof paths['/hello']['get'], 'object');

    assertEquals(paths.hasOwnProperty('/swagger.json'), false, 'Swagger endpoint defined');
})


Deno.test('Plugin should hide swagger endpoint', async () => {
    const route = new Route('GET', '/hello');

    // create api
    const api = mockApi(route);

    // @ts-ignore: ignore mockApi error
    await swaggerPlugin(api, {info, allowSwaggerRoutes: true});

    await api.sendByArguments('GET', '/swagger.json');

    const body = api?.lastContext?.response.body as Record<string, unknown>;
    const paths = body?.paths;

    assertEquals(paths.hasOwnProperty('/swagger.json'), true, 'Swagger endpoint defined');
})


Deno.test('Swagger path should contain basic route infos', async () => {
    const route = new Route('GET', '/hello');

    // create api
    const api = mockApi(route);
    api.addRoute(
        new Route(EMethod.POST, '/hello')
    )

    // @ts-ignore: ignore mockApi error
    await swaggerPlugin(api, {info});

    await api.sendByArguments('GET', '/swagger.json');

    const body = api?.lastContext?.response.body as Record<string, unknown>;
    const paths = body?.paths;

    assertEquals(paths['/hello'].hasOwnProperty('get'), true, 'Should have get method');
    assertEquals(paths['/hello'].hasOwnProperty('post'), true, 'Should have post method');
})


Deno.test('Swagger path should be extend with details by props', async () => {
    const route = new Route('GET', '/hello');
    route.prop('swagger', {
        tags: ['testing'],
        summary: 'any desc'
    })

    // create api
    const api = mockApi(route);

    // @ts-ignore: ignore mockApi error
    await swaggerPlugin(api, {info});

    await api.sendByArguments('GET', '/swagger.json');

    const body = api?.lastContext?.response.body as Record<string, unknown>;
    const paths = body?.paths;

    const helloPath = paths['/hello']['get'];

    assertEquals(typeof helloPath, 'object');
    assertEquals(helloPath.tags, ['testing']);
})


Deno.test('Swagger describe KeyMatch props', async () => {
    const route = new Route('POST', new KeyMatch(
        '/get/:id/as/:view',
        {
            id: {type: 'Number'},
            view: {type: 'Any'}
        }
    ));

    // create api
    const api = mockApi(route);

    api
        .addRoute(
            new Route(EMethod.GET, new KeyMatch('/cat/:name', {name: {type: 'String'}}))
                .prop('swagger', {
                    tags: ['cat'],
                    summary: 'get cat by name',
                    description: 'resolve cat by name with data',
                    responses: {
                        '404': {
                            description: 'Not found cat'
                        }
                    }
                })
        )

    // @ts-ignore: ignore mockApi error
    await swaggerPlugin(api, {info});

    await api.sendByArguments('GET', '/swagger.json');

    const body = api?.lastContext?.response.body as Record<string, unknown>;
    const paths = body?.paths;

    const path = paths['/get/{id}/as/{view}']['post'];

    assertEquals(typeof path, 'object');
    assertEquals(path.parameters.length, 2);
    assertEquals(path.parameters[0], {
        in: 'path',
        name: 'id',
        required: true,
        schema: {
            type: 'number'
        }
    });

    assertEquals(path.parameters[1], {
        in: 'path',
        name: 'view',
        required: true,
        schema: {
            type: 'string'
        }
    });

    // extra
    const catPaths = paths['/cat/{name}'];
    assertEquals(Object.keys(catPaths), ['get']);
    assertEquals(catPaths['get'].responses, {
        '404': {
            description: 'Not found cat'
        }
    });
})
