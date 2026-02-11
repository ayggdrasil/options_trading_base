import { BaseEntity } from "typeorm";

export class Base<T> extends BaseEntity {

  constructor(initializeObject: Partial<T>) {
    super()

    if (initializeObject) {
      return Object.assign(this, initializeObject)
    }
  }

  // return entity type 
  static async get<T>(id: any): Promise<T> {
    return super.findOne({ where: { id } } as any) as Promise<T>
  }
}