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

// @ts-ignore
await swaggerPlugin(api, {
  info: {
    title: 'super api',
    description: 'my super api',
    version: 'v0.0.0'
  }
});

await api.sendByArguments('GET', '/swagger.json');

const body = api?.lastContext?.response.body as Record<string, any>;

const target = './output-test.tmp.json';
await Deno.writeTextFile(target, JSON.stringify(body));