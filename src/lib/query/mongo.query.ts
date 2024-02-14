import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MongoQueryModel, QueryObjectModel } from '../model';
import { StringUtils } from '../utils/string.util';
import { StringValidator } from '../utils/string.validator';
import * as url from 'url';

export interface MongoQueryOptions {
  search?: { key: string; paths: string[] };
}

export const MongoQueryParser = (): MethodDecorator => {
  return (_target, _key, descriptor: TypedPropertyDescriptor<any>) => {
    const original = descriptor.value;
    descriptor.value = async function (...props: any) {
      const queryProps = props[0]
      const anotherProps = props.slice(1);
      const query: MongoQueryModel = parse(queryProps);
      return await original.apply(this, [query, ...anotherProps]);
    };
    return descriptor;
  };
};

export const MongoQuery: (data?: MongoQueryOptions) => ParameterDecorator =
    createParamDecorator(
        (data: MongoQueryOptions, ctx: ExecutionContext): MongoQueryModel => {
          const query = ctx.getArgByIndex(0).query;
          return parse(query, data);
        },
    );

function parse(query: any, data?: MongoQueryOptions): MongoQueryModel {
  const def_limit = 100;
  const def_skip = 0;
  const def_page = 1;

  const result: MongoQueryModel = new MongoQueryModel();

  result.limit = getIntKey(query, 'limit', def_limit);
  result.skip = query.page
    ? getSkipFromPage(query, def_page, result.limit)
    : getIntKey(query, 'skip', def_skip);
  result.select = getSelect(query, {});
  result.sort = getSort(query, {});
  result.populate = getPopulate(query, []);
  result.filter = data?.search
      ? getSearch(query, data.search)
      : getFilter(query, {});

  return result;
}
function getSearch(
    query: any,
    data: { key: string; paths: string[] },
): QueryObjectModel {
  const key = data.key;
  const paths = data.paths;
  if (query[key]) {
    const search = query[key];
    const filter = paths.map((path) => ({
      [path]: { $regex: search, $options: 'i' },
    }));
    return { $or: filter };
  } else {
    return getFilter(query, {})
  }
}
function getIntKey(query: any, key: string, def: number): number {
  if (!query[key] || !StringValidator.isInt(query[key])) {
    return def;
  }
  return +query[key];
}

function getSkipFromPage(query: any, def: number, limit: number): number {
  const page = getIntKey(query, 'page', def);
  return page > 1 ? (page - 1) * limit : 0;
}

function getSelect(query: any, def: QueryObjectModel): QueryObjectModel {
  if (!query.select) return def;
  return StringUtils.splitString(query.select, ',').reduce(
    (obj: { [x: string]: number }, key: string) => {
      const cleanKey: string = StringUtils.cleanString(key, /[^A-z0-9_.]/g);
      obj[cleanKey] = key.startsWith('-') ? 0 : 1;
      return obj;
    },
    {}
  );
}

function getSort(query: any, def: QueryObjectModel): QueryObjectModel {
  if (!query.sort) return def;
  return StringUtils.splitString(query.sort, ',').reduce(
    (obj: { [x: string]: number }, key: string) => {
      const cleanKey: string = StringUtils.cleanString(key, /[^A-z0-9_.]/g);
      obj[cleanKey] = key.startsWith('-') ? -1 : 1;
      return obj;
    },
    {}
  );
}

function getPopulate(
  query: any,
  def: QueryObjectModel[]
): QueryObjectModel | QueryObjectModel[] {
  if (!query.populate) return def;

  if (query.populate instanceof Array) {
    return query.populate.map((populate: any) =>
      getPopulate({ populate }, def)
    );
  }

  const [path, select, filter] = query.populate.split(';');

  const result: QueryObjectModel = { path };

  if (select && select !== 'all') {
    result.select = getSelect({ select }, {});
  }
  if (filter) {
    result.match = getFilter(url.parse(`?${filter}`, true).query, {});
  }

  return result;
}

function getFilter(query: any, def: QueryObjectModel): QueryObjectModel {
  delete query.limit;
  delete query.skip;
  delete query.page;
  delete query.select;
  delete query.sort;
  delete query.populate;
  if (!query) return def;
  return Object.keys(query).reduce((obj: any, key: string) => {
    const queryValue = query[key];
    if (queryValue instanceof Array) {
      const allSimpleFilters: string[] = queryValue.filter((item: string) =>
        isSimpleFilter(item)
      );

      const filterSimpleValues = getArrayValue(key, allSimpleFilters);
      if (filterSimpleValues.length) {
        obj.$and = [...(obj.$and || []), ...filterSimpleValues];
      }

      const allORFilters: string[] = queryValue
        .filter((item: string) => isORFilter(item))
        .map((item) => item.split(','))
        .reduce((arr, item) => {
          arr = [...arr, ...item];
          return arr;
        }, []);

      const filterORValues = getArrayValue(key, [...allORFilters]);

      if (filterORValues.length) {
        obj.$or = [...(obj.$or || []), ...filterORValues];
      }
      return obj;
    } else if (isORFilter(queryValue)) {
      const value = getArrayValue(key, queryValue.split(','));
      if (value.length) {
        obj.$or = [...(obj.$or || []), ...value];
      }
      return obj;
    }

    const value = getSimpleFilterValue(queryValue);
    if (value !== null) {
      const cleanKey: string = StringUtils.cleanString(key, /[^A-z0-9_.]/g);
      obj[cleanKey] = value;
    }
    return obj;
  }, {});
}

function getArrayValue(key: string, filter: string[]): object[] {
  if (!filter || !filter.length) return [];
  const cleanKey: string = StringUtils.cleanString(key, /[^A-z0-9_.]/g);
  return filter.map((item) => ({ [cleanKey]: getSimpleFilterValue(item) }));
}

function getSimpleFilterValue(
  filter: string
): string | number | boolean | Date | object | null {
  if (!filter) return null;

  if (isComparisonFilter(filter)) {
    const first_dot_index: number = filter.indexOf(':');
    const operator: string = filter.substring(0, first_dot_index);
    const value: string = filter.substring(first_dot_index + 1);
    if (!value) {
      return null;
    }
    return { [`$${operator}`]: getSimpleFilterValue(value) };
  }

  if (isElementFilter(filter)) {
    const first_dot_index: number = filter.indexOf(':');
    const operator: string = filter.substring(0, first_dot_index);
    const value: string = filter.substring(first_dot_index + 1);
    if (!value) {
      return null;
    }

    if (operator === 'exists') {
      return getElementExists(value);
    }

    return getElementType(value);
  }

  if (
    StringValidator.isISODate(filter) ||
    StringValidator.isISODateTime(filter)
  ) {
    return new Date(filter);
  }

  if (StringValidator.isNumberString(filter)) {
    return +filter;
  }

  if (filter === 'true' || filter === 'false') {
    return filter === 'true';
  }

  const value = StringUtils.cleanString(filter, /[^\w\s@.-:\u0600-\u06FF]/g);
  let $regex = value;

  if (filter.indexOf('*') === -1) {
    return filter;
  }

  if (filter.startsWith('*')) {
    $regex = `^${value}`;
    if (filter.endsWith('*')) {
      $regex = $regex.substring(1);
    }
  } else if (filter.endsWith('*')) {
    $regex = `${value}$`;
  }
  return {
    $regex,
    $options: 'i',
  };
}

function isComparisonFilter(filter: string): boolean {
  return (
    filter.startsWith('eq:') ||
    filter.startsWith('gt:') ||
    filter.startsWith('gte:') ||
    filter.startsWith('in:') ||
    filter.startsWith('lt:') ||
    filter.startsWith('lte:') ||
    filter.startsWith('ne:') ||
    filter.startsWith('nin:')
  );
}

function isElementFilter(filter: string): boolean {
  return filter.startsWith('exists:') || filter.startsWith('type:');
}

function isSimpleFilter(value: string): boolean {
  return StringUtils.testString(value, /^([\w\s@.\-:]{1,}[\w@.\-:])$/);
}

function isORFilter(filter: string): boolean {
  if (filter.indexOf(',') === -1) return false;
  return StringUtils.testString(filter, /^(([\w\s@.-:],?){1,}[\w@.-:])$/);
}

function getElementExists(value: string) {
  if (['true', 'false'].indexOf(value) === -1) {
    return null;
  }
  return { $exists: value === 'true' };
}

function getElementType(value: string) {
  const validTypes: string[] = [
    'double',
    'string',
    'object',
    'array',
    'binData',
    'objectId',
    'bool',
    'date',
    'null',
    'regex',
    'javascript',
    'int',
    'timestamp',
    'long',
    'decimal',
    'minKey',
    'maxKey',
  ];

  if (validTypes.indexOf(value) === -1) {
    return null;
  }
  return { $type: value };
}
