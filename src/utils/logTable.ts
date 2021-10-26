import { table } from 'table'

export default (data: Record<string, any>) => console.log(table(Object.entries(data)))
