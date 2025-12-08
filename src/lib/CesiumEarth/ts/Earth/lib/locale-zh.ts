import { JulianDate, } from "cesium";

// cesium时钟时间格式化函数
function CesiumTimeFormatter(datetime: JulianDate) {
  const julianDT = new JulianDate();
  JulianDate.addHours(datetime, 8, julianDT);
  const gregorianDT = JulianDate.toGregorianDate(julianDT);
  const hour = gregorianDT.hour + '';
  const minute = gregorianDT.minute + '';
  const second = gregorianDT.second + '';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

// cesium时钟日期格式化函数
function CesiumDateFormatter(datetime: JulianDate) {
  const julianDT = new JulianDate();
  JulianDate.addHours(datetime, 8, julianDT);
  const gregorianDT = JulianDate.toGregorianDate(julianDT);
  const month = gregorianDT.month + '';
  const day = gregorianDT.day + '';
  // const dateStr = new Intl.DateTimeFormat('zh-CN',
  // { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  // .format(new Date(datetime.dayNumber))
  return `${gregorianDT.year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
}

// cesium时间轴格式化函数
function CesiumDateTimeFormatter(datetime: JulianDate) {
  const julianDT = new JulianDate();
  JulianDate.addHours(datetime, 8, julianDT);
  const gregorianDT = JulianDate.toGregorianDate(julianDT);
  const year = gregorianDT.year + '';
  const month = gregorianDT.month + '';
  const day = gregorianDT.day + '';
  const hour = gregorianDT.hour + '';
  const minute = gregorianDT.minute + '';
  const seconds = gregorianDT.second + '';
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
}

export {
  CesiumTimeFormatter,
  CesiumDateFormatter,
  CesiumDateTimeFormatter
};
