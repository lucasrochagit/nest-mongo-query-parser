<h1 align="center">Nest Mongo Query Parser</h1>
<p align="center">A MongoDB query string parser to be used in applications developed with NestJS.</p>

[![License][license-image]][license-url]
[![NPM Version][npm-image]][npm-url]
[![Dependencies][dependencies-image]][dependencies-url]
[![Contributors][contributors-image]][contributors-url]
[![NPM Downloads][npm-downloads-image]][npm-downloads-url]

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/lucasrochacc)

## Summary

- [Prerequisites](#prerequisites)
- [Installing](#installing)
- [Usage](#usage)
- [Examples](#examples)
- [Explain the Resources](#explain-the-resources)
  - [Queries with @MongoQuery() | @MongoQueryParser()](#queries-with-mongoquery--mongoqueryparser)
    - [Pagination](#pagination)
    - [Ordering](#ordering)
    - [Select](#select)
    - [Filters](#filters)
      - [Simple Filters](#simple-filters)
      - [Partial Filters](#partial-filters)
      - [Comparison Filters](#comparison-filters)
      - [Element Filters](#element-filters)
      - [AND | OR Filters](#and--or-filters)
    - [Populate](#populate)
  - [Others Resources](#others-resources)
    - [Add query params in code](#add-query-params-in-code)
- [Rules](#rules)
- [Observations](#observations)
- [Practical Examples](#practical-examples)
- [Upcoming Features](#upcoming-features)
- [License](#license)
- [Authors](#authors)

## Prerequisites

As the name of the library suggests, it was built to work together with the NestJS framework.

## Installing

Use the follow command:

`npm i --save nest-mongo-query-parser`

## Usage

There are two ways to use the parsers available in this library: as a ParamDecorator or as a MethodDecorator.

If you want to use it as a ParamDecorator, just add the tag referring to the Parser to be used as a method parameter.
Example:

```ts
import { Get } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ResourceService } from './resource.service';
import { MongoQuery, MongoQueryModel } from 'nest-mongo-query-parser';

@Controller('resources')
export class ResourceController {
  constructor(private readonly _service: ResourceService) {}

  @Get()
  public find(@MongoQuery() query: MongoQueryModel) {
    return this._service.find(query);
  }
}
```

It can also be used as a MethodDecorator. Just use the tag referring to the Parser to be used as the method decorator.
Example:

```ts
import { Injectable } from '@nestjs/common';
import { MongoQueryParser, MongoQueryModel } from 'nest-mongo-query-parser';

@Injectable()
export class ResourceService {
  @MongoQueryParser()
  public find(query: MongoQueryModel) {
    return [];
  }
}
```

NOTE: When using the library as a MethodDecorator, you can receive other arguments in the method in question, but the query has to be passed as the first argument of the function, so that the treatment is done properly.

## Examples

##### Request: http://localhost:3000/resources

##### Query:

```json
{
  "limit": 100,
  "skip": 0,
  "select": {},
  "sort": {},
  "populate": [],
  "filter": {}
}
```

##### Request: http://localhost:3000/resources?limit=10&page=2&select=\_id,name,age&sort=-created_at&age=gt:30

##### Query:

```json
{
  "limit": 10,
  "skip": 10,
  "select": {
    "_id": 1,
    "name": 1,
    "age": 1
  },
  "sort": {
    "created_at": -1
  },
  "populate": [],
  "filter": {
    "age": {
      "$gt": 30
    }
  }
}
```

## Explain the Resources

## Queries with @MongoQuery() | @MongoQueryParser()

### Pagination

The paging feature is very useful for clients who will consume your API. It is through this feature that applications
can define the data limit in a query, as well as define which page to be displayed. Each time a page of an application
is selected, it means that some resources have been displaced (data offset or skip data).

There is a mathematical rule that relates page number to resource offset. Basically:

`offset = (page - 1) * limit, where page > 0.`

This means that for a limit of 10 elements per page:

- To access page 1, the offset will be equal to = (1 - 1) \* 10, so offset = 0
- To access page 2, the offset will be equal to = (2 - 1) \* 10, so offset = 10
- To access page 3, the offset will be equal to = (3 - 1) \* 10, so offset = 20

And so on.

With this library, it is possible to use pagination with the `page` parameter, or using the `skip` manually. By default,
the `limit` value is `100` and `skip` value is `0`.

Example:

##### Request: http://localhost:3000/resources?limit=10&page=3

##### Query:

```json
{
  "limit": 10,
  "skip": 20
}
```

##### Request: http://localhost:3000/resources?limit=10&skip=20

##### Query:

```json
{
  "limit": 10,
  "skip": 20
}
```

### Ordering

To work with ordering, you need to specify one or more sorting parameters, and whether you want the sorting to be
ascending or descending. For ascending ordering, just put the name of the ordering parameter. For descending ordering,
you need to put a "-" symbol before the name of the ordering parameter. Example:

##### Request: http://localhost:3000/resources?sort=created_at

##### Query:

```json
{
  "sort": {
    "created_at": 1
  }
}
```

##### Request: http://localhost:3000/resources?sort=-created_at

##### Query:

```json
{
  "sort": {
    "created_at": -1
  }
}
```

##### Request: http://localhost:3000/resources?sort=-age,name

##### Query:

```json
{
  "sort": {
    "age": -1,
    "name": 1
  }
}
```

In multiple-parameter ordering, the first ordering parameter has higher priority than the second, and so on. In the
example above, the ordering will be given primarily by the `age` parameter, in descending order. If there are two or
more objects with the same value in `age`, then those objects will be sorted by `name` in ascending order.

### Select

With this library, you can choose which parameters should be returned by the API. However, Mongo has a peculiarity: you
can also specify which parameters you don't want to be returned. The logic is similar to ordering: to specify which
parameters are to be returned, simply enter the parameter name; and to specify which parameters should not be returned,
just place a "-" symbol before the parameter.

Example:

##### Request: http://localhost:3000/resources?select=\_id,name,age

##### Query:

```json
{
  "select": {
    "_id": 1,
    "name": 1,
    "age": 1
  }
}
```

##### Request: http://localhost:3000/resources?select=-\_id,-created_at,-updated_at

##### Query:

```json
{
  "select": {
    "_id": 0,
    "created_at": 0,
    "updated_at": 0
  }
}
```

It is interesting to use one or the other in your queries, as one is complementary to the other. If you want almost all
parameters except a few, use the option to ignore parameters. If you want some parameters, and ignore the others, use
the option to select the ones you want.

### Filters

Now let's go to the most complex part of the library: the filters. There are several ways to apply filters in this
library, so I'm going to break this topic down into subtopics for every possible filter approach.

#### Simple Filters

Simple filters are equality filters. Basically it's set key=value. All filter parameters are defined as string, so there
are some validations that are done on these values.

1. If the value is a string number, it is transformed into a number, either integer or float/double (up to 16 decimal
   places);

2. If the value is in yyyy-MM-dd format or yyyy-MM-ddThh:mm:ss.sZ format, it is transformed into a Date object;

3. If the value is 'true' or 'false', it is transformed into a boolean value, according to your value;

4. Otherwise, the value is considered as a string.

Example:

##### Request: http://localhost:3000/resources?name=John%20Doe&age=31&birth_date=1990-01-01

##### Query:

```
{
  "filter": {
    "name": "John Doe",
    "age": 31,
    "birth_date": 1990-01-01T00:00:00.000Z
  }
}
```

#### MultiLevel Filters

You can specify multilevel filters. This means that, if you have an object that has a field that is another object, you
can perform a search with filters through the parameters of the internal object. Example:

##### Object

```json
{
  "_id": "613532a350857c1c8d1d10d9",
  "name": "Filippo Nyles",
  "age": 28,
  "current_job": {
    "title": "Budget/Accounting Analyst III",
    "salary": 4776.8
  }
}
```

##### Request: http://localhost:3000/resources?current_job.title=Budget/Accounting%20Analyst%20III

##### Query:

```json
{
  "filter": {
    "current_job.title": "Budget/Accounting Analyst III"
  }
}
```

#### Partial Filters

Partial filters are a way to search a string type value for a part of the value. There are three ways to use partial
filters. Making an analogy with javascript, it would be like using the `startsWith`, `endsWith` and `includes` methods,
where:

- startsWith: search for a string-type value that starts with a given substring. To do this, just add a "\*" at the
  beginning of the substring.
- endsWith: search for a string-type value that ends with a given substring. To do this, just add a "\*" at the end of
  the substring.
- includes: search for a string value that contains a specific substring. To do this, just add a "\*" at the beginning
  and end of the substring.

Example:

##### Request: http://localhost:3000/resources?name=_Lu&email=gmail.com_&job=_Developer_

##### Query:

```JSON
{
  "filter": {
    "name": {
      "$regex": "^Lu",
      "$options": "i"
    },
    "email": {
      "$regex": "gmail.com$",
      "$options": "i"
    },
    "job": {
      "$regex": "Developer",
      "$options": "i"
    }
  }
}

```

#### Comparison Filters

Comparison operators are specific filtering options to check whether a parameter has a value. It is possible to check
not only equality, but other mathematical operators, such as: ">", ">=", "<", "<=", "!=". In addition, you can use
comparison operators to check whether an element is in an array.

According to the [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query-comparison/), the
available comparison operators are:

- $eq: Matches values that are equal to a specified value.
- $gt: Matches values that are greater than a specified value.
- $gte: Matches values that are greater than or equal to a specified value.
- $in: Matches any of the values specified in an array.
- $lt: Matches values that are less than a specified value.
- $lte: Matches values that are less than or equal to a specified value.
- $ne: Matches all values that are not equal to a specified value.
- $nin: Matches none of the values specified in an array.

To use these operators, just pass the comparator tag without the "$" symbol. Example:

##### Request: http://localhost:3000/resources?age=gt:30

##### Query:

```JSON
{
  "filter": {
    "age": {
      "$gt": 30
    }
  }
}

```

I won't put an example with all operators here, but you can test arithmetic comparison operators on parameters with
values of type string or number, or test the operators of `$in` and `$nin` on parameters of type array.

#### Element Filters

Element filters are filters used to deal with parameters that make up the entity's schema. There are two types of
element filter possibilities:

- $exists: returns elements that have or do not have a specific field

- $type: returns elements whose field has a specific type.

Example:

##### Request: http://localhost:3000/resources?created_at=exists:true&updated_at=exists:false&jobs=type:array

##### Query:

```JSON
{
  "filter": {
    "created_at": {
      "$exists": true
    },
    "updated_at": {
      "$exists": false
    },
    "jobs": {
      "$type": "array"
    }
  }
}

```

The $exists filter only works with `true` or `false` values. If a different value is entered, the filter will be
ignored.

The same goes for the $type filter, which only works with valid type values defined in
the [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query/type/#mongodb-query-op.-type) (
except deprecated ones):

```JSON
 {
  "validTypes": [
    "double",
    "string",
    "object",
    "array",
    "binData",
    "objectId",
    "bool",
    "date",
    "null",
    "regex",
    "javascript",
    "int",
    "timestamp",
    "long",
    "decimal",
    "minKey",
    "maxKey"
  ]
}

```

#### AND | OR filters

Finally, it is possible to use filters with AND | OR operator. The usage logic follows the arithmetic rule.

To use the AND operator, you must pass the same value twice in a query. Example:

##### Request: http://localhost:3000/resources?age=gt:30&age=lt:50

##### Query:

```JSON
{
  "filter": {
    "$and": [
      {
        "age": {
          "$gt": 30
        }
      },
      {
        "age": {
          "$lt": 50
        }
      }
    ]
  }
}

```

To use the OR operator, you must enter the values separated by a comma. Example:

##### Request: http://localhost:3000/resources?age=30,50

##### Query:

```JSON
{
  "filter": {
    "$or": [
      {
        "age": 30
      },
      {
        "age": 50
      }
    ]
  }
}

```

### Populate

If any collection uses references to other objects, in some operations it is interesting to return this information
populated in the object in a single request. For this, the library supports the `populate` feature.

There are three ways to add the `populate` parameter to the query string:

- Specifying only the field to be populated:

##### Request: http://localhost:3000/resources?populate=jobs

##### Query:

```json
{
  "populate": {
    "path": "jobs"
  }
}
```

- Specifying the field to be populated and which fields should be returned:

##### Request: http://localhost:3000/resources?populate=jobs;title,salary

##### Query:

```json
{
  "populate": {
    "path": "jobs",
    "select": {
      "title": 1,
      "salary": 1
    }
  }
}
```

- Specifying the field to be populated, which fields should be returned and a resource filter (useful parameter when the
  populated field is a list):

##### Request: http://localhost:3000/resources?populate=jobs;title,salary;salary=gt:3000

##### Query:

```json
{
  "populate": {
    "path": "job",
    "select": {
      "title": 1,
      "salary": 1
    },
    "match": {
      "salary": {
        "$gt": 3000
      }
    }
  }
}
```

- Specifying more than one field to be populated:

##### Request: http://localhost:3000/resources?populate=jobs&populate=currentJob

##### Query:

```json
{
  "populate": [
    {
      "path": "jobs"
    },
    {
      "path": "currentJob"
    }
  ]
}
```

There are some rules to consider in populate. The populate must be specified as follows:
`populate=field;select;filter`. Soon:

1. If you specify only the field to be populated, all field parameters will be returned, and if it is an array, all
   array elements will be returned;
2. If you want to specify which parameters are to be returned from the populated field, you need to specify which fields
   are to be returned;
3. If you want to filter the populated parameters, you need to specify the parameters that should be returned. If you
   want to return all object parameters, the `select` parameter must be informed as `all`.
   Example: `populate=jobs;all;salary=gt:3000`

## Others Resources

### Add query params in code

Sometimes, we need to add some parameters to the ordering, selection, filters and even population objects in the query
in the code, for some cases that we need to inform some query params that weren't informed by the client. For that, 
this new feature has been added.

To use it, it's simple: just call the method corresponding to the resource you want to add. The methods signatures are:

```ts
interface MongoQueryModel {
    addSort(sort: QueryObjectModel): void

    addSelect(select: QueryObjectModel): void

    addFilter(filter: QueryObjectModel): void

    addPopulate(populate: QueryObjectModel | QueryObjectModel[]): void
}
```

An example of use: let's assume that we have the following MongoQueryModel object, and that it is assigned to a variable
called "object".

```ts
const object: MongoQueryModel = {
    filter: {age: {$gte: 30}},
    sort: {created_at: -1},
    select: {name: 1, age: 1},
    populate: {path: 'job'}
}
```

- To add a new filter, just call the `addFilter()` method. Then, we have:

`object.addFilter({ "name": { "$regex": "Smith", "$options": "i" }})`

- To add a new sorting parameter, just call the object's `addSort()` method. Then, we have:

`object.addSort({ age: 1 })`

- To add a new selection parameter, just call the object's `addSelect()` method. Then, we have:

`object.addSelect({ gender: 1})`

- To add a new population parameter, just call the object's `addPopulate()` method. Then, we have:

`object.addPopulate({ path: address })`

So the final object variable would become:

```ts
const model: MongoQueryModel = {
    filter: {age: {$gte: 30}, name: {$regex: 'Smith', $options: "i"}},
    sort: {created_at: -1, age: 1},
    select: {name: 1, age: 1, gender: 1},
    populate: [{path: 'job'}, {path: 'address'}],
}
```

**Rules**:

1. Priority will be given to fields that are added using the methods of the MongoQueryModel object. Therefore, if you
   add a new parameter whose key already exists in the filter, it will be replaced by the new value to be added.
   So if you have the filter `{ age: {$gte: 30 }, name: { $regex: 'Smith', $options: 'i' } }` and add the
   filter `{age: 10}`, the final result of the filter will be `{ age: 10, name: { $regex: 'Smith', $options: 'i' } }`

   This rule is valid for all query parameters with type ObjectQueryModel.

2. For the populate property, we have a few more rules:
    * For cases where the current populate is an array:
        * If populate param to be informed in the `addPopulate()` method is an array, both arrays will be merged. So if
          you
          have populate param as `[{ path: 'job' }, { path: 'address'}]` and call the method with the
          parameter `[{ path: 'school_address' }, { path: 'job_address' }]`, the final result will
          be `[{ path: 'job' }, { path: 'address'},{ path: 'school_address' }, { path: 'job_address' }}]`. 
        * If populate informed in the `addPopulate()` method is an object, it will be transformed into an array, and the
          current value will be added to the new values. So if you have the populate param
          as `[{ path: job }, { path: address}]` and call the method
          with the
          parameter `[{ path: job_address }]`, the final result will
          be `[{ path: job },{ path: address }, { path : job_address }}]`
   * For cases where the current populate is an object:

     * If the populate param to be informed in the `addPopulate()` method is an array, the current value will be added to the
       new
       values. So if you have the populate `{ path: job }` and call the method with the
       parameter `[{ path: school_address }, { path: job_address }]`, the final result will
       be `[{ path: school_address }, { path : job_address }}, { path: job }]`

     * If the populate informed in the `addPopulate()` method is an object, the main rule will be checked and, if they
       differ,
       an array will be formed with both current and new populate values. So if you have the populate `{ path: job }`
       and call the method with the parameter `{ path: 'address'}`, the
       final result
       will be `[{ path: job }, { path: address}}]`. And if you have the populate `{ path: job }` and call the method
       with the
       parameter `{ path: 'job', select: 'all'}`, the final result
       will
       be `{ path: 'job', select: 'all'}`
   * For all populate array cases (defined in code or coming from client), duplicated paths will not be verified.

## Rules

- For pagination, you should use `limit`, `skip` and `page` only;
- For ordination, you should use `sort` only;
- For select, you should use `select` only;
- For populate, you should use `populate`only;
- Anything other than `limit`, `skip`, `page`, `sort`, `select` and `populate` will be considered a filter;
- Parameters never contain characters that don't fit the regex `/[^A-z0-9_.]/g`;
- Filter values never contain characters that don't fit the regex `/[^\w\s@.-:\u0600-\u06FF]/g`;
  - `\u0600-\u06FF` contains arabic characters

## Observations

This library is generic. This means that it handles the query based on the query object itself. Therefore, it is not
possible to control events such as filter parameters with types incompatible with the types defined in the base. Use
proper queries for your API, to prevent implementation errors from being thrown into your app.

## Practical Examples

Check out how the configuration of the library in an API works in practice
in [this project](https://github.com/lucasrochagit/template-nestjs-with-mongodb).

## License

Distributed under the Apache License 2.0. See `LICENSE` for more information.

<!-- CONTACT -->

## Authors

- **Lucas Rocha** - _Initial Work_. </br></br>
  [![LinkedIn](https://img.shields.io/static/v1?label=linkedin&message=@lucasrochacc&color=0A66C2)](https://www.linkedin.com/in/lucasrochacc/)
  [![Github](https://img.shields.io/static/v1?label=github&message=@lucasrochagit&color=black)](https://github.com/lucasrochagit/)

- **Felipe Freitas** - _Maintainer_. </br></br>
  [![LinkedIn](https://img.shields.io/static/v1?label=linkedin&message=@felipefreitas96&color=0A66C2)](https://www.linkedin.com/in/felipefreitas96/)
  [![Github](https://img.shields.io/static/v1?label=github&message=@felipefreitas96&color=black)](https://github.com/felipefreitas96/)

[//]: # 'These are reference links used in the body of this note.'
[node.js]: https://nodejs.org
[npm.js]: https://www.npmjs.com/
[license-image]: https://img.shields.io/badge/license-Apache%202.0-blue.svg
[license-url]: https://github.com/lucasrochagit/nest-mongo-query-parser/blob/main/LICENSE
[npm-image]: https://img.shields.io/npm/v/nest-mongo-query-parser.svg?color=red&logo=npm
[npm-url]: https://npmjs.org/package/nest-mongo-query-parser
[npm-downloads-image]: https://img.shields.io/npm/dm/nest-mongo-query-parser.svg
[npm-downloads-url]: https://npmjs.org/package/nest-mongo-query-parser
[dependencies-image]: https://shields.io/badge/dependencies-2-green
[dependencies-url]: https://shields.io/badge/dependencies-2-green
[releases-image]: https://img.shields.io/github/release-date/lucasrochagit/nest-mongo-query-parser.svg
[releases-url]: https://github.com/lucasrochagit/nest-mongo-query-parser/releases
[contributors-image]: https://img.shields.io/github/contributors/lucasrochagit/nest-mongo-query-parser.svg?color=green
[contributors-url]: https://github.com/lucasrochagit/nest-mongo-query-parser/graphs/contributors
[issues-image]: https://img.shields.io/github/issues/lucasrochagit/nest-mongo-query-parser.svg
