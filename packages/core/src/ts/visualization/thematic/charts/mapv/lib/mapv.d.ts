import type { MapVDataSet, MapVDataItem } from '../ts/types'
declare const mapv: {
    DataSet: new (data?: MapVDataItem[]) => MapVDataSet
    BaseLayer: new (...args: any[]) => any
    [key: string]: any
}
export default mapv
