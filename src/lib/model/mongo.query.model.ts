export class MongoQueryModel {
  limit!: number;
  skip!: number;
  sort!: QueryObjectModel;
  select!: QueryObjectModel;
  filter!: QueryObjectModel;
  populate!: QueryObjectModel | QueryObjectModel[];

  addSort(sort: QueryObjectModel): void {
    this.sort = {...this.sort, ...sort}
  }

  addSelect(select: QueryObjectModel): void {
    this.select = {...this.select, ...select}
  }

  addFilter(filter: QueryObjectModel): void {
    this.filter = {...this.filter, ...filter}
  }

  addPopulate(populate: QueryObjectModel | QueryObjectModel[]): void {
    if (this.populate instanceof Array) {
      if (populate instanceof Array) {
        this.populate = [...this.populate, ...populate];
      } else {
        this.populate.push(populate);
      }
    } else {
      if (populate instanceof Array) {
        populate.push(this.populate);
        this.populate = populate;
      }
      else {
        if (populate.path === this.populate.path) {
          this.populate = populate;
        } else {
          this.populate = [this.populate, populate];
        }
      }
    }
  }
}

export class QueryObjectModel {
  [key: string]: string | number | Date | any;
}
