import { DateTime } from "luxon";
import Decimal from 'decimal.js';

import sina from "./sina.js";

const tz = "Asia/Shanghai";

const search = async (kw, _type=['11', '31', '33', '41']) =>
  (await sina.search(kw, _type)).map(i => ({
    source_id: i['code_full'],
    code: i['code'].toUpperCase(),
    name: i['name_cn'],
    type: i['type'], 
  }));

const parseUsDate = (dt, year) => {
  const arr = dt.replace(/(A|P)M/, ' $1M').split(' ');
  arr.splice(2, 0, year);
  return DateTime.fromMillis(Date.parse(arr.join(' ')), { zone: tz });
};

const realtime = async (ids) => {
  if (ids.length === 0) return [];
  const res = await sina.realtime(ids);
  const ret = [];
  res.forEach(i => {
    const r = {
      source_id: i.code_full,
      source_name: i.name,
      last: i.closing,
      change: i.delta ?? i.closing.minus(i.last_closing),
      volume: i.volume ?? null,
    };
    if (!!i.datetime) {
      r.time = parseUsDate(i.datetime, i.year);
    } else {
      r.time = DateTime.fromISO(`${i.date}T${i.time}`, { zone: 'Asia/Shanghai' })
    }
    if (r.last.equals(0)) {
        r.change = Decimal(0);
        r.change_percent = Decimal(0);
    } else if (!!i.percent) {
      r.change_percent = i.percent;
    } else {
      r.change_percent = r.change.dividedBy(i.last_closing).times(100);
    }
    const openCmp = DateTime.now().setZone(tz).minus({ minutes: 2 });
    r.is_open = r.time.diff(openCmp).toObject().milliseconds > 0;
    if (!r.is_open && !!i.after_hour_percent) {
      r.after_hour_price = i.after_hour_price;
      r.after_hour_percent = i.after_hour_percent;
      r.after_hour_change = i.after_hour_delta;
      r.after_hour_datetime = parseUsDate(i.after_hour_datetime, i.year);
    }
    ret.push(r);
  });
  return ret  
};

//const history = sina.history;

export default { search,  realtime };
