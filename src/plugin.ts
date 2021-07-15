import {Api, Route, EMethod, IRoute, KeyMatch} from "./deps.ts";

interface ISwaggerInfo {
  title: string,
  description: string,
  version: string,
  termsOfService?: string,
  contact?: {
    email: string,
  },
  license?: {
    name: string,
    url: string,
  }
}

interface ISwaggerServer {
  url: string,
}

interface ISwaggerExternalDocs {
  description?: string,
  url: string,
}

interface ISwaggerTag {
  name: string,
  url: string,
  externalDocs?: ISwaggerExternalDocs
}

interface ISwaggerParameterSchema {
  type: string,
}

interface ISwaggerRouteParameter {
  name: string,
  in: string | 'query' | 'path' | 'header',
  description?: string,
  required: boolean,
  style?: 'form' | 'json',
  explode?: boolean,
  schema: ISwaggerParameterSchema
}

interface ISwaggerPath {
  tags: string[],
  summary?: string,
  description?: string,
  operationId?: string,
  parameters: ISwaggerRouteParameter[],
  responses: TSwaggerResponses,
}

interface ISwaggerResponse {
  description: string
}

type TSwaggerResponses = Record<string, ISwaggerResponse>;

interface ISwaggerProp extends ISwaggerPath {}

type TSwaggerPath = Record<string, ISwaggerPath>;
type TSwaggerPaths = Record<string, TSwaggerPath>;

type TObject = Record<string, any>;

interface IConfig {
  serverUrl?: URL | string,
  info: ISwaggerInfo,
  servers?: ISwaggerServer[],
  tags?: ISwaggerTag[],
  basePath?: string,
  allowSwaggerRoutes?: boolean,
}

const validSchemaTypes = ['string', 'array', 'object', 'integer', 'number'];

/**
 * convert api server path with swagger placeholders
 * @param uri
 */
function getUri(uri: string): string {
  return uri.replace(/\:([a-z-A-Z0-9_-]+)/gm, '{$1}');
}

export default function plugin(api: Api, config: IConfig) {
  const routePropName = 'swagger';
  const basePath = config?.basePath || '';
  const swaggerUri = `${basePath}/swagger.json`;
  const jsonEndpointRoute = new Route(EMethod.GET, swaggerUri);

  // config servers
  const servers: ISwaggerServer[] = Array.isArray(config?.servers)
    ? [ ...config.servers ]
    : [];

  if (config?.serverUrl) {
    servers.push({ url: `${config?.serverUrl}` });
  }
  servers.push({ url: api.host });

  jsonEndpointRoute.addPipe(async ({response}) => {
    const paths: TSwaggerPaths = {};

    api.routes.forEach((route: IRoute) => {
      const uri = getUri(route.matcher.uri);
      const routePaths: TSwaggerPath = paths[uri] ? paths[uri] :  {};

      if (route instanceof Route) {
        // assign path infos
        route.methods.forEach((method: string) => {
          const parameters = [];

          // add parameters by keymatch
          if (route.matcher instanceof KeyMatch) {
            const describe = route.matcher.describe;

            for (const name in describe) {
              const keyDescribe = describe[name];

              const type = `${keyDescribe.type}`.toLowerCase();

              const param: TObject = {
                in: 'path',
                name,
                required: true,
                schema: {
                  type: 'string',
                }
              };

              if (validSchemaTypes.includes(type)) {
                param.schema = {
                  type,
                };
              }

              parameters.push(param as ISwaggerRouteParameter);
            }
          }

          const swaggerPath: ISwaggerPath = {
            tags: [],
            parameters,
            responses: {
              '200': {
                description: 'OK'
              }
            }
          };

          // extend swagger path information by property
          if (route.props.has(routePropName)) {
            const p = route.props.get(routePropName) as ISwaggerProp;

            if (Array.isArray(p?.tags)) {
              swaggerPath.tags = p?.tags;
            }

            if (Array.isArray(p?.parameters)) {
              swaggerPath.parameters = [
                ...swaggerPath.parameters,
                ...p?.parameters
              ];
            }
          }

          routePaths[`${method}`.toLowerCase()] = swaggerPath;
        })
      }

      paths[uri] = routePaths; // check if exists
    });

    // hide swagger optional
    if (!config.allowSwaggerRoutes) {
      delete paths[swaggerUri];
    }

    response.body = {
      openapi: "3.0.1",
      info: config.info,
      tags: config.tags,
      servers,
      paths,
    }
  });

  api.addRoute(jsonEndpointRoute);
}