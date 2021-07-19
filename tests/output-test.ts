import {EMethod, Route, KeyMatch} from "../src/deps.ts";
import {mockApi} from 'https://deno.land/x/deno_api_server/dev_mod.ts';
import { default as swaggerPlugin } from '../src/plugin.ts';


const route = new Route('POST', new KeyMatch(
    '/get/:id/as/:view',
    {
      id: { type: 'Number' },
      view: { type: 'Any' }
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

    .addRoute(
        new Route(EMethod.POST, new KeyMatch('/cat/:name', {name: {type: 'String'}}))
            .prop('swagger', {
                tags: ['cat'],
                summary: 'create cat by name',
                description: 'create cat by name with data',
                responses: {
                    '404': {
                        description: 'Not found cat'
                    }
                }
            })
    )

// @ts-ignore: ignore mockApi
await swaggerPlugin(api, {
  info: {
    title: 'super api',
    description: 'my super api',
    version: 'v0.0.0'
  }
});

await api.sendByArguments('GET', '/swagger.json');

const body = api?.lastContext?.response.body as Record<string, unknown>;

const target = './output-test.tmp.json';
await Deno.writeTextFile(target, JSON.stringify(body));